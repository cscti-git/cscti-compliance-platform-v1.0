migrate(
  (app) => {
    // -------------------------------------------------------------
    // Migração 0055: Cancelar falsas ocorrências geradas pelo NOC
    // Atualiza via raw SQL / query PocketBase para contornar restrições de select
    // -------------------------------------------------------------

    try {
      const ocCol = app.findCollectionByNameOrId('backup_ocorrencias')
      const statusField = ocCol.fields.getByName('status')
      const allowedValues =
        statusField && statusField.values
          ? statusField.values
          : ['aberta', 'em_analise', 'resolvida']

      const targetStatus = allowedValues.includes('cancelada') ? 'cancelada' : 'resolvida'
      const agora = new Date().toISOString()
      const justificativa =
        'Resolvida/Cancelada automaticamente: falso alarme decorrente de regressão no parse do e-mail do NOC. Todas as 4 VMs foram processadas com sucesso.'

      // Atualizar via SQL direto para garantir execução imediata e idempotente
      const sql = `
        UPDATE backup_ocorrencias
        SET status = {:status},
            resolucao = {:resolucao},
            resolvida_automaticamente = 1,
            resolvida_em = {:resolvida_em},
            updated = {:updated}
        WHERE id = 'omax04dxehok1tg'
           OR (titulo LIKE '%NOC detectou inconformidade%' AND evidencia = 'sl3hneeebmrzc4b')
      `
      app
        .db()
        .newQuery(sql)
        .bind({
          status: targetStatus,
          resolucao: justificativa,
          resolvida_em: agora,
          updated: agora,
        })
        .execute()

      // Auditoria append-only
      try {
        const auditCol = app.findCollectionByNameOrId('audit_log')
        const auditRec = new Record(auditCol)
        auditRec.set('organization', '8kl8n6vz64lnxgb')
        auditRec.set('action', 'NOC_FALSA_OCORRENCIA_RESOLVIDA_0055')
        auditRec.set('entity', 'Backup e Continuidade')
        auditRec.set(
          'detail',
          `Falsa ocorrência de inconformidade do NOC (ID #omax04dxehok1tg) resolvida/cancelada automaticamente. Motivo: Todas as 4 VMs operaram com sucesso.`,
        )
        auditRec.set('metadata', {
          migracao: '0055_cancelar_falsas_ocorrencias_noc',
          ocorrencia_id: 'omax04dxehok1tg',
          status_aplicado: targetStatus,
          resolvida_em: agora,
        })
        app.save(auditRec)
      } catch (_) {}

      console.log(
        `[0055_cancelar_falsas_ocorrencias_noc] Ocorrência atualizada para ${targetStatus}.`,
      )
    } catch (err) {
      console.log('[0055_cancelar_falsas_ocorrencias_noc] Erro:', err)
    }
  },
  (app) => {
    // Reversão no-op
  },
)
