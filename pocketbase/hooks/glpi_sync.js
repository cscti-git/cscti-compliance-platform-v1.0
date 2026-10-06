// Hook de sincronização de inventário com GLPI
// POST /backend/v1/inventory/glpi-sync

routerAdd(
  'POST',
  '/backend/v1/inventory/glpi-sync',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError(
        'Apenas perfis Administrador e Suporte podem executar a sincronização.',
      )
    }

    const body = e.requestInfo().body || {}
    let organizationId = body.organizationId || auth.getString('organization')

    if (!organizationId) {
      // Tentar pegar a primeira organização se admin não tiver vínculo explícito
      try {
        const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
        if (firstOrg.length > 0) {
          organizationId = firstOrg[0].id
        }
      } catch (_) {}
    }

    if (!organizationId) {
      return e.badRequestError('Nenhuma organização associada.')
    }

    // Se usuário não é admin da plataforma, garantir que só sincroniza a própria organização
    if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    // Buscar a integração GLPI cadastrada para esta organização
    let glpiRecord = null
    try {
      const integrations = $app.findRecordsByFilter(
        'integrations',
        `organization = '${organizationId}' && type = 'glpi'`,
        '-created',
        1,
        0,
      )
      if (integrations.length > 0) {
        glpiRecord = integrations[0]
      }
    } catch (_) {}

    const nowIso = new Date().toISOString()
    const syncRunsCol = $app.findCollectionByNameOrId('inventory_sync_runs')
    const runRecord = new Record(syncRunsCol)
    runRecord.set('organization', organizationId)
    if (glpiRecord) {
      runRecord.set('connector', glpiRecord.id)
    }
    runRecord.set('status', 'em_andamento')
    runRecord.set('started_at', nowIso)
    runRecord.set('resumo', { criados: 0, atualizados: 0, inalterados: 0, erros: 0, total_glpi: 0 })
    $app.save(runRecord)

    // Se o conector não existir ou não estiver habilitado
    if (!glpiRecord || !glpiRecord.getBool('enabled')) {
      const finishedIso = new Date().toISOString()
      const errorMsg = !glpiRecord
        ? 'Conector GLPI não cadastrado para esta organização.'
        : 'Conector GLPI está desativado nas Configurações da organização.'

      runRecord.set('status', 'erro')
      runRecord.set('error_message', errorMsg)
      runRecord.set('finished_at', finishedIso)
      $app.save(runRecord)

      // Registrar no audit_log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_log')
        const auditRec = new Record(auditCol)
        auditRec.set('organization', organizationId)
        auditRec.set('user', auth.id)
        auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
        auditRec.set('user_email', auth.getString('email'))
        auditRec.set('action', 'INVENTORY_GLPI_SYNC_FAILED')
        auditRec.set('entity', 'Inventário de Ativos')
        auditRec.set('detail', `Tentativa de sincronização GLPI cancelada: ${errorMsg}`)
        auditRec.set('metadata', { run_id: runRecord.id, status: 'erro' })
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: false,
        run_id: runRecord.id,
        status: 'erro',
        message: errorMsg,
        resumo: { criados: 0, atualizados: 0, inalterados: 0, erros: 0, total_glpi: 0 },
      })
    }

    let rawUrl = (glpiRecord.getString('glpi_url') || '').trim()
    if (!rawUrl) {
      const finishedIso = new Date().toISOString()
      const errorMsg = 'URL da API GLPI não configurada no conector.'
      runRecord.set('status', 'erro')
      runRecord.set('error_message', errorMsg)
      runRecord.set('finished_at', finishedIso)
      $app.save(runRecord)
      return e.json(200, {
        success: false,
        run_id: runRecord.id,
        status: 'erro',
        message: errorMsg,
      })
    }

    // Normalizar URL da API GLPI
    if (rawUrl.endsWith('/')) {
      rawUrl = rawUrl.slice(0, -1)
    }

    const appToken = glpiRecord.getString('glpi_app_token') || ''
    const userToken = glpiRecord.getString('glpi_user_token') || ''
    const syncLimit = glpiRecord.getInt('glpi_sync_limit') || 100

    let sessionToken = ''
    let sessionHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (appToken) {
      sessionHeaders['App-Token'] = appToken
    }
    if (userToken) {
      sessionHeaders['Authorization'] = 'user_token ' + userToken
    }

    let initSessionUrl = rawUrl.endsWith('/apirest.php')
      ? rawUrl + '/initSession'
      : rawUrl + '/apirest.php/initSession'

    // 1. Iniciar sessão GLPI
    try {
      const initRes = $http.send({
        url: initSessionUrl,
        method: 'GET',
        headers: sessionHeaders,
        timeout: 10,
      })

      if (initRes.statusCode >= 200 && initRes.statusCode < 300) {
        const json = initRes.json || {}
        sessionToken = json.session_token || ''
      } else {
        const finishedIso = new Date().toISOString()
        const sanitizedMsg = `Falha na autenticação GLPI (HTTP ${initRes.statusCode}). Verifique tokens de acesso.`
        runRecord.set('status', 'erro')
        runRecord.set('error_message', sanitizedMsg)
        runRecord.set('finished_at', finishedIso)
        $app.save(runRecord)

        // Atualizar status no conector
        glpiRecord.set('last_sync', finishedIso)
        glpiRecord.set('last_sync_status', 'erro')
        glpiRecord.set('last_sync_message', sanitizedMsg)
        $app.save(glpiRecord)

        return e.json(200, {
          success: false,
          run_id: runRecord.id,
          status: 'erro',
          message: sanitizedMsg,
          resumo: { criados: 0, atualizados: 0, inalterados: 0, erros: 1, total_glpi: 0 },
        })
      }
    } catch (netErr) {
      const finishedIso = new Date().toISOString()
      // Degradação elegante caso o servidor GLPI não esteja acessível (ex: rede local do cartório)
      const sanitizedMsg =
        'Não foi possível conectar ao servidor GLPI (tempo limite ou servidor indisponível).'
      runRecord.set('status', 'erro')
      runRecord.set('error_message', sanitizedMsg)
      runRecord.set('finished_at', finishedIso)
      $app.save(runRecord)

      glpiRecord.set('last_sync', finishedIso)
      glpiRecord.set('last_sync_status', 'erro')
      glpiRecord.set('last_sync_message', sanitizedMsg)
      $app.save(glpiRecord)

      return e.json(200, {
        success: false,
        run_id: runRecord.id,
        status: 'erro',
        message: sanitizedMsg,
        resumo: { criados: 0, atualizados: 0, inalterados: 0, erros: 1, total_glpi: 0 },
      })
    }

    // 2. Se sessão obtida com sucesso, buscar computadores / equipamentos
    let criados = 0
    let atualizados = 0
    let inalterados = 0
    let erros = 0
    let totalGlpi = 0

    try {
      const queryHeaders = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Session-Token': sessionToken,
      }
      if (appToken) {
        queryHeaders['App-Token'] = appToken
      }

      const getComputersUrl = rawUrl.endsWith('/apirest.php')
        ? `${rawUrl}/Computer?range=0-${syncLimit}`
        : `${rawUrl}/apirest.php/Computer?range=0-${syncLimit}`

      const compRes = $http.send({
        url: getComputersUrl,
        method: 'GET',
        headers: queryHeaders,
        timeout: 15,
      })

      let items = []
      if (compRes.statusCode >= 200 && compRes.statusCode < 300) {
        if (Array.isArray(compRes.json)) {
          items = compRes.json
        }
      }

      totalGlpi = items.length
      const assetsCol = $app.findCollectionByNameOrId('inventory_assets')

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const externalId = String(item.id || '')
        const assetName = item.name || `Ativo GLPI #${externalId}`

        // Mapear tipo do ativo
        let tipo = 'estacao'
        const lowerName = assetName.toLowerCase()
        const comment = (item.comment || '').toLowerCase()
        const itemType = String(item.itemtype || item._type || item.type || '').toLowerCase()
        const isVm =
          item.is_dynamic === 1 ||
          item.is_dynamic === true ||
          item.is_virtual === 1 ||
          item.is_virtual === true ||
          itemType.includes('virtualmachine') ||
          itemType.includes('vm') ||
          lowerName.includes('vm-') ||
          lowerName.includes('-vm') ||
          lowerName.startsWith('vm') ||
          lowerName.includes('virtual') ||
          comment.includes('virtual machine') ||
          comment.includes('máquina virtual') ||
          comment.includes('maquina virtual') ||
          comment.includes('vmware') ||
          comment.includes('hyper-v') ||
          comment.includes('hyperv') ||
          comment.includes('proxmox') ||
          comment.includes('kvm') ||
          comment.includes('virtualbox') ||
          comment.includes('xen')

        if (isVm) {
          tipo = 'servidor_virtualizado'
        } else if (
          lowerName.includes('srv') ||
          lowerName.includes('server') ||
          comment.includes('servidor')
        ) {
          tipo = 'servidor_aplicacao'
        } else if (
          lowerName.includes('banco') ||
          lowerName.includes('sql') ||
          lowerName.includes('db')
        ) {
          tipo = 'banco_dados'
        } else if (
          lowerName.includes('backup') ||
          lowerName.includes('nas') ||
          lowerName.includes('storage')
        ) {
          tipo = 'storage_backup'
        } else if (lowerName.includes('print') || lowerName.includes('impressora')) {
          tipo = 'impressora_multifuncional'
        } else if (
          lowerName.includes('switch') ||
          lowerName.includes('router') ||
          lowerName.includes('firewall')
        ) {
          tipo = 'equipamento_rede'
        }

        // Mapear status
        let status = 'ativo'
        if (item.is_deleted === 1 || item.is_deleted === true) {
          status = 'desativado'
        }

        // Criticidade
        let criticidade = 'media'
        if (
          tipo === 'servidor_aplicacao' ||
          tipo === 'servidor_virtualizado' ||
          tipo === 'banco_dados' ||
          tipo === 'storage_backup'
        ) {
          criticidade = 'alta'
        }

        try {
          const existing = $app.findRecordsByFilter(
            'inventory_assets',
            `organization = '${organizationId}' && external_id = '${externalId}'`,
            '',
            1,
            0,
          )

          if (existing.length > 0) {
            const rec = existing[0]
            rec.set('name', assetName)
            rec.set('tipo', tipo)
            rec.set('status', status)
            rec.set('criticidade', criticidade)
            rec.set('serial_number', item.serial || '')
            rec.set('localizacao', item.location_name || item.location || '')
            rec.set('dados_normalizados', item)
            $app.save(rec)
            atualizados++
          } else {
            const newRec = new Record(assetsCol)
            newRec.set('organization', organizationId)
            newRec.set('name', assetName)
            newRec.set('tipo', tipo)
            newRec.set('status', status)
            newRec.set('criticidade', criticidade)
            newRec.set('origem', 'glpi')
            newRec.set('external_id', externalId)
            newRec.set('serial_number', item.serial || '')
            newRec.set('localizacao', item.location_name || item.location || '')
            newRec.set(
              'descricao',
              item.comment || 'Sincronizado automaticamente via conector GLPI.',
            )
            newRec.set('dados_normalizados', item)
            $app.save(newRec)
            criados++
          }
        } catch (itemErr) {
          erros++
        }
      }

      // 3. Encerrar sessão GLPI (killSession)
      try {
        const killUrl = rawUrl.endsWith('/apirest.php')
          ? rawUrl + '/killSession'
          : rawUrl + '/apirest.php/killSession'
        $http.send({
          url: killUrl,
          method: 'GET',
          headers: queryHeaders,
          timeout: 5,
        })
      } catch (_) {}

      const finishedIso = new Date().toISOString()
      const finalStatus =
        erros > 0 ? (criados > 0 || atualizados > 0 ? 'parcial' : 'erro') : 'sucesso'
      const resumo = {
        criados: criados,
        atualizados: atualizados,
        inalterados: inalterados,
        erros: erros,
        total_glpi: totalGlpi,
      }

      runRecord.set('status', finalStatus)
      runRecord.set('resumo', resumo)
      runRecord.set('finished_at', finishedIso)
      $app.save(runRecord)

      // Atualizar conector
      glpiRecord.set('last_sync', finishedIso)
      glpiRecord.set('last_sync_status', finalStatus)
      glpiRecord.set(
        'last_sync_message',
        `Sincronizados ${totalGlpi} ativos (${criados} novos, ${atualizados} atualizados)`,
      )
      $app.save(glpiRecord)

      // Audit log
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_log')
        const auditRec = new Record(auditCol)
        auditRec.set('organization', organizationId)
        auditRec.set('user', auth.id)
        auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
        auditRec.set('user_email', auth.getString('email'))
        auditRec.set('action', 'INVENTORY_GLPI_SYNC')
        auditRec.set('entity', 'Inventário de Ativos')
        auditRec.set(
          'detail',
          `Sincronização GLPI concluída com status: ${finalStatus}. ${criados} criados, ${atualizados} atualizados.`,
        )
        auditRec.set('metadata', { run_id: runRecord.id, resumo: resumo })
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        run_id: runRecord.id,
        status: finalStatus,
        message: 'Sincronização concluída.',
        resumo: resumo,
      })
    } catch (runErr) {
      const finishedIso = new Date().toISOString()
      const sanitizedMsg = 'Falha ao processar ativos da API GLPI.'
      runRecord.set('status', 'erro')
      runRecord.set('error_message', sanitizedMsg)
      runRecord.set('finished_at', finishedIso)
      $app.save(runRecord)

      return e.json(200, {
        success: false,
        run_id: runRecord.id,
        status: 'erro',
        message: sanitizedMsg,
        resumo: {
          criados: criados,
          atualizados: atualizados,
          inalterados: inalterados,
          erros: erros + 1,
          total_glpi: totalGlpi,
        },
      })
    }
  },
  $apis.requireAuth(),
)
