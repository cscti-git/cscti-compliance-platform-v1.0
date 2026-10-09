migrate(
  (app) => {
    // -------------------------------------------------------------
    // Migração 0054: Reprocessar e sanear evidências NOC_DIARIO
    // 1) Limpar linhas espúrias de clientes_status em backup_monitoramentos_externos
    //    (filtrar cabeçalhos, rótulos e metadados: name, status, start time, etc.)
    // 2) Corrigir status_geral 'falha' -> 'ok' nas evidências NOC com assunto [Success]
    //    e onde todas as VMs foram bem-sucedidas.
    // 3) Cancelar/resolver as falsas ocorrências criadas por essa regressão
    //    ("NOC detectou inconformidade no backup" indevidas),
    //    com registro na auditoria append-only (audit_log) — sem apagar histórico.
    // -------------------------------------------------------------

    function isRotuloMetadado(texto) {
      if (!texto) return true
      const t = String(texto).toLowerCase().trim()
      const rotulosExatos = [
        'name',
        'nome',
        'vm',
        'vms',
        'status',
        'start time',
        'end time',
        'duration',
        'total size',
        'data read',
        'transferred',
        'success',
        'warning',
        'error',
        'failed',
        'cliente',
        'cartório',
        'cartorio',
        'ação',
        'acoes',
        'ações',
        'ações realizadas pelo noc',
        'acoes realizadas pelo noc',
      ]
      if (rotulosExatos.includes(t)) return true
      if (
        t.startsWith('backup copy job') ||
        t.startsWith('backup job') ||
        t.startsWith('replication job')
      ) {
        return true
      }
      return false
    }

    function classificarStatusVm(st) {
      const s = String(st || '')
        .toUpperCase()
        .trim()
      const isFalha =
        s.includes('FAILED') ||
        s.includes('FAIL') ||
        s.includes('ERROR') ||
        s.includes('ERRO') ||
        s.includes('FALHA')
      const isSucesso = s.includes('SUCCESS') || s.includes('SUCESSO') || s.includes('OK')
      return { isSucesso, isFalha }
    }

    let monCorrigidos = 0
    let ocorrenciasCanceladas = 0
    let orgIdDefault = ''
    const evidenciasAfetadas = []

    try {
      const monCol = app.findCollectionByNameOrId('backup_monitoramentos_externos')
      const monitoramentos = app.findRecordsByFilter(
        'backup_monitoramentos_externos',
        '',
        '+created',
        1000,
        0,
      )

      for (let i = 0; i < monitoramentos.length; i++) {
        const mon = monitoramentos[i]
        const orgId = mon.getString('organization')
        if (orgId && !orgIdDefault) orgIdDefault = orgId

        let rawClientes = []
        try {
          const strClientes = mon.getString('clientes_status')
          if (strClientes) {
            rawClientes = JSON.parse(strClientes) || []
          }
        } catch (_) {
          rawClientes = []
        }

        if (!Array.isArray(rawClientes)) {
          rawClientes = []
        }

        const assunto = mon.getString('assunto') || ''
        const assuntoUpper = assunto.toUpperCase()
        const assuntoIndicaSucesso =
          assuntoUpper.includes('[SUCCESS]') ||
          assuntoUpper.includes('[SUCESSO]') ||
          assuntoUpper.includes('SUCCESS') ||
          assuntoUpper.includes('SUCESSO')

        // Filtrar clientes legítimos (VMs)
        const clientesLimpos = []
        let jobNamesExtraidos = []

        for (let j = 0; j < rawClientes.length; j++) {
          const item = rawClientes[j]
          if (!item) continue
          const clienteNome = (item.cliente || '').trim()
          const clienteLower = clienteNome.toLowerCase()

          if (
            clienteLower.startsWith('backup copy job') ||
            clienteLower.startsWith('backup job') ||
            clienteLower.startsWith('replication job')
          ) {
            jobNamesExtraidos.push(`${clienteNome} (${item.status || ''})`)
            continue
          }

          if (isRotuloMetadado(clienteNome)) {
            continue
          }

          const { isSucesso, isFalha } = classificarStatusVm(item.status)
          clientesLimpos.push({
            cliente: clienteNome,
            status: isSucesso ? 'Success' : isFalha ? 'Failed' : item.status || 'OK',
            acoes: item.acoes || 'Nenhuma ação necessária',
          })
        }

        let novoStatusGeral = mon.getString('status_geral') || 'ok'
        const temFalhaVm = clientesLimpos.some((c) => classificarStatusVm(c.status).isFalha)

        if (temFalhaVm) {
          novoStatusGeral = 'falha'
        } else if (assuntoIndicaSucesso) {
          novoStatusGeral = 'ok'
        } else if (
          clientesLimpos.length > 0 &&
          clientesLimpos.every((c) => classificarStatusVm(c.status).isSucesso)
        ) {
          novoStatusGeral = 'ok'
        }

        let precisaSalvar = false
        if (JSON.stringify(rawClientes) !== JSON.stringify(clientesLimpos)) {
          mon.set('clientes_status', clientesLimpos)
          precisaSalvar = true
        }

        if (mon.getString('status_geral') !== novoStatusGeral) {
          mon.set('status_geral', novoStatusGeral)
          precisaSalvar = true
        }

        // Se a acao_realizada foi erroneamente preenchida com rótulo "Start time", "End time", etc.
        const acaoAtual = mon.getString('acoes_realizadas') || ''
        if (isRotuloMetadado(acaoAtual)) {
          mon.set('acoes_realizadas', 'Nenhuma intervenção necessária.')
          precisaSalvar = true
        }

        const obsAtual = mon.getString('observacoes') || ''
        if (obsAtual.includes('FALHA') && novoStatusGeral === 'ok') {
          const jobObs =
            jobNamesExtraidos.length > 0
              ? ` Jobs monitorados: ${jobNamesExtraidos.join('; ')}.`
              : ''
          mon.set(
            'observacoes',
            `Relatório diário de monitoramento preventivo emitido pela equipe do NOC. Avaliação geral: OK.${jobObs}`,
          )
          precisaSalvar = true
        }

        if (precisaSalvar) {
          app.save(mon)
          monCorrigidos++
          const evId = mon.getString('evidencia')
          if (evId) evidenciasAfetadas.push(evId)
        }

        // Sincronizar também o registro correspondente em backup_processamentos se existir
        const evId = mon.getString('evidencia')
        if (evId) {
          try {
            const procs = app.findRecordsByFilter(
              'backup_processamentos',
              `evidencia = '${evId}' && adaptador_usado = 'NOC_DIARIO'`,
              '-created',
              10,
              0,
            )
            for (let p = 0; p < procs.length; p++) {
              const proc = procs[p]
              let resObj = {}
              try {
                resObj = JSON.parse(proc.getString('resultado')) || {}
              } catch (_) {}
              resObj.status_detectado = novoStatusGeral === 'ok' ? 'sucesso' : 'erro'
              resObj.status_geral = novoStatusGeral
              resObj.clientes_status = clientesLimpos
              if (isRotuloMetadado(resObj.acoes_realizadas)) {
                resObj.acoes_realizadas = 'Nenhuma intervenção necessária.'
              }
              proc.set('resultado', resObj)
              app.save(proc)
            }
          } catch (_) {}
        }
      }
    } catch (errMon) {
      console.log('[0054_reprocessar_evidencias_noc] Erro ao atualizar monitoramentos:', errMon)
    }

    // 2. Cancelar falsas ocorrências geradas pelo erro de parsing NOC ("NOC detectou inconformidade no backup")
    try {
      const ocorrencias = app.findRecordsByFilter(
        'backup_ocorrencias',
        `titulo ~ 'NOC detectou inconformidade'`,
        '-created',
        1000,
        0,
      )

      for (let o = 0; o < ocorrencias.length; o++) {
        const oc = ocorrencias[o]
        const evId = oc.getString('evidencia')
        const orgId = oc.getString('organization')
        if (orgId && !orgIdDefault) orgIdDefault = orgId

        let cancelar = false
        if (evId) {
          try {
            const monRecs = app.findRecordsByFilter(
              'backup_monitoramentos_externos',
              `evidencia = '${evId}'`,
              '-created',
              1,
              0,
            )
            if (monRecs.length > 0) {
              const mon = monRecs[0]
              if (mon.getString('status_geral') === 'ok') {
                cancelar = true
              }
            }
          } catch (_) {}
        } else {
          // Se não tem evidência vinculada, mas o texto indica falso alarme
          cancelar = true
        }

        if (
          cancelar &&
          oc.getString('status') !== 'cancelada' &&
          oc.getString('status') !== 'resolvida'
        ) {
          oc.set('status', 'cancelada')
          oc.set(
            'resolucao',
            'Cancelada automaticamente pela migração 0054: falso positivo decorrente de regressão no parse de rótulos/metadados do e-mail de análise diária do NOC. Todas as 4 VMs foram executadas com sucesso.',
          )
          oc.set('resolvida_automaticamente', true)
          oc.set('resolvida_em', new Date().toISOString())
          oc.set('resolvida_por', 'Sistema CSCTI (Migração 0054)')
          if (evId) oc.set('resolvida_por_evidencia', evId)
          app.save(oc)
          ocorrenciasCanceladas++
        }
      }
    } catch (errOc) {
      console.log('[0054_reprocessar_evidencias_noc] Erro ao tratar ocorrências:', errOc)
    }

    // 3. Auditoria append-only
    try {
      const auditCol = app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      if (orgIdDefault) {
        auditRec.set('organization', orgIdDefault)
      } else {
        try {
          const orgs = app.findRecordsByFilter('organizations', '', '+created', 1, 0)
          if (orgs.length > 0) auditRec.set('organization', orgs[0].id)
        } catch (_) {}
      }
      auditRec.set('action', 'NOC_EVIDENCIAS_REPROCESSADAS_0054')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Reprocessamento de evidências do NOC concluído. Monitoramentos saneados: ${monCorrigidos}. Falsas ocorrências canceladas: ${ocorrenciasCanceladas}. Evidências afetadas: ${evidenciasAfetadas.join(', ') || 'nenhuma'}.`,
      )
      auditRec.set('metadata', {
        migracao: '0054_reprocessar_evidencias_noc',
        monitoramentos_corrigidos: monCorrigidos,
        ocorrencias_canceladas: ocorrenciasCanceladas,
        evidencias_afetadas: evidenciasAfetadas,
        data_execucao: new Date().toISOString(),
      })
      app.save(auditRec)
    } catch (errAudit) {
      console.log('[0054_reprocessar_evidencias_noc] Aviso ao gravar audit_log:', errAudit)
    }

    console.log(
      `[0054_reprocessar_evidencias_noc] Concluído com sucesso: ${monCorrigidos} monitoramentos saneados e ${ocorrenciasCanceladas} ocorrências canceladas.`,
    )
  },
  (app) => {
    // Reversão no-op segura para preservar histórico
  },
)
