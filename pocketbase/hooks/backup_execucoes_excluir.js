/**
 * Endpoint de exclusão de execuções de backup com auditoria append-only e integridade referencial
 * Rota: POST /backend/v1/backup/execucoes/excluir
 *
 * Requisitos:
 * - Corpo: { execucaoId | execucaoIds[], justificativa }
 * - Justificativa obrigatória (mínimo de 10 caracteres)
 * - RBAC: apenas perfis 'admin' e 'suporte'
 * - Multi-tenant: apenas execuções pertencentes à organização do usuário
 * - Exclusão em cascata coerente: remover avaliações vinculadas à execução
 * - Desvincular ocorrências sem quebrar referências
 * - Registro append-only na audit_log sem dados sensíveis
 * - Resposta: { ok: true, excluidas: N }
 */

routerAdd(
  'POST',
  '/backend/v1/backup/execucoes/excluir',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError(
        'Apenas perfis Administrador e Suporte têm permissão para excluir execuções de backup.',
      )
    }

    const body = e.requestInfo().body || {}
    const rawIds = []
    if (Array.isArray(body.execucaoIds)) {
      for (let i = 0; i < body.execucaoIds.length; i++) {
        const idTrim = String(body.execucaoIds[i] || '').trim()
        if (idTrim && rawIds.indexOf(idTrim) === -1) {
          rawIds.push(idTrim)
        }
      }
    } else if (body.execucaoId || body.id) {
      const idTrim = String(body.execucaoId || body.id || '').trim()
      if (idTrim) rawIds.push(idTrim)
    }

    if (rawIds.length === 0) {
      return e.badRequestError(
        'Identificador de execução (execucaoId ou execucaoIds) não informado.',
      )
    }

    const justificativa = String(body.justificativa || body.motivo || body.observacao || '').trim()
    if (!justificativa || justificativa.length < 10) {
      return e.badRequestError(
        'A justificativa da exclusão é obrigatória e deve ter pelo menos 10 caracteres.',
      )
    }

    const userOrgId = auth.getString('organization') || ''
    let excluidasCount = 0
    let avaliacoesExcluidasCount = 0
    let ocorrenciasDesvinculadasCount = 0
    const idsProcessados = []

    for (let i = 0; i < rawIds.length; i++) {
      const currentId = rawIds[i]
      let execRec = null
      try {
        execRec = $app.findRecordById('backup_execucoes', currentId)
      } catch (_) {
        // Se registro não existir, ignora e prossegue
        continue
      }

      if (!execRec) continue

      const execOrgId = execRec.getString('organization')
      if (systemRole !== 'admin' && userOrgId !== execOrgId) {
        return e.forbiddenError('Acesso restrito à própria organização.')
      }

      const orgAlvo = execOrgId || userOrgId

      // 1. Remover avaliações vinculadas à execução
      try {
        const avals = $app.findRecordsByFilter(
          'backup_avaliacoes',
          `organization = '${orgAlvo}' && execucao = '${currentId}'`,
          '',
          200,
          0,
        )
        for (let j = 0; j < avals.length; j++) {
          try {
            $app.delete(avals[j])
            avaliacoesExcluidasCount++
          } catch (_) {}
        }
      } catch (_) {}

      // 2. Desvincular ocorrências sem quebrar referências
      try {
        const ocs = $app.findRecordsByFilter(
          'backup_ocorrencias',
          `organization = '${orgAlvo}' && execucao = '${currentId}'`,
          '',
          200,
          0,
        )
        for (let k = 0; k < ocs.length; k++) {
          try {
            const oc = ocs[k]
            oc.set('execucao', null)
            $app.save(oc)
            ocorrenciasDesvinculadasCount++
          } catch (_) {}
        }
      } catch (_) {}

      // 3. Excluir a execução
      try {
        $app.delete(execRec)
        excluidasCount++
        idsProcessados.push(currentId)
      } catch (_) {}
    }

    if (excluidasCount === 0 && rawIds.length > 0) {
      return e.notFoundError('Nenhuma execução correspondente foi encontrada para exclusão.')
    }

    // 4. Auditoria append-only
    const nowIso = new Date().toISOString()
    const targetOrgId = userOrgId || (idsProcessados.length > 0 ? '' : '')
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('organization', targetOrgId)
      auditRec.set('user', auth.id)
      auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
      auditRec.set('user_email', auth.getString('email'))
      auditRec.set('action', 'BACKUP_EXECUTION_DELETED')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Exclusão de ${excluidasCount} execução(ões) de backup pelo operador. Justificativa: "${justificativa}". Removidas ${avaliacoesExcluidasCount} avaliação(ões) vinculadas; ${ocorrenciasDesvinculadasCount} ocorrência(s) desvinculadas.`,
      )
      auditRec.set('metadata', {
        execucoes_ids: idsProcessados,
        total_excluidas: excluidasCount,
        avaliacoes_excluidas: avaliacoesExcluidasCount,
        ocorrencias_desvinculadas: ocorrenciasDesvinculadasCount,
        justificativa: justificativa,
        operador_role: systemRole,
        executado_em: nowIso,
      })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      excluidas: excluidasCount,
      detalhes: {
        avaliacoes_excluidas: avaliacoesExcluidasCount,
        ocorrencias_desvinculadas: ocorrenciasDesvinculadasCount,
        ids: idsProcessados,
      },
    })
  },
  $apis.requireAuth(),
)
