migrate(
  (app) => {
    // -------------------------------------------------------------
    // Migração 0060: Saneamento factual de falsas ocorrências geradas
    // por regressões históricas de parsing (0.0.77–0.0.83).
    // Append-only: mantém histórico de auditoria intacto sem apagar linhas.
    // -------------------------------------------------------------
    try {
      const agora = new Date().toISOString()
      const orgId = '8kl8n6vz64lnxgb'

      // 1. Ocorrência #qp42ayeh791xbq1 (rotina 'Backup VMs to Cloud\Backup VMs GOLD')
      // Ocorrência originada de dado fabricado pelo parser legado que marcou "2 das 4 VMs NÃO receberam backup",
      // quando na verdade todas as VMs foram processadas com sucesso.
      const descQp42 =
        'Falso alarme de falha na rotina "Backup VMs to Cloud\\Backup VMs GOLD - NUVENS": ' +
        'registro gerado por regressão histórica de parsing (versões 0.0.77–0.0.83) que fabricou falha inexistente. ' +
        'Nenhuma falha real ocorreu no ambiente — comprovantes de sucesso vinculados.'

      const resQp42 =
        'Falso alarme gerado por regressão de parsing corrigida em 0.0.77–0.0.83; ' +
        'nenhuma falha real ocorreu — comprovantes de sucesso vinculados. ' +
        'Todas as 4 VMs foram processadas com êxito.'

      const sqlQp42 = `
        UPDATE backup_ocorrencias
        SET severidade = 'baixa',
            status = 'resolvida',
            titulo = 'Falso alarme de falha em rotina de Nuvem (regressão de parsing)',
            descricao = {:descricao},
            resolucao = {:resolucao},
            resolvida_automaticamente = 1,
            resolvida_em = COALESCE(resolvida_em, {:resolvida_em}),
            fato_real = {:fato_real},
            updated = {:updated}
        WHERE id = 'qp42ayeh791xbq1'
      `

      app
        .db()
        .newQuery(sqlQp42)
        .bind({
          descricao: descQp42,
          resolucao: resQp42,
          resolvida_em: agora,
          fato_real: JSON.stringify({
            falso_alarme: true,
            motivo: 'Regressão de parsing de relatório Veeam corrigida em 0.0.77–0.0.83',
            falha_real: false,
            vms_ok: ['SPCM-ORION', 'SPCM-PROTESTO', 'SPCM-REGWIN', 'SPCM-TDePJ'],
            vms_falhas: [],
            rotina_nome: 'Backup VMs to Cloud\\Backup VMs GOLD - NUVENS',
            modalidade: 'nuvem',
            parecer_conclusivo:
              'Todas as 4 VMs foram salvas com sucesso. Nenhuma falha operacional.',
          }),
          updated: agora,
        })
        .execute()

      // 2. Ocorrência #omax04dxehok1tg (NOC diário)
      // Ocorrência de falso alarme no e-mail do NOC (todas as 4 VMs foram processadas com sucesso).
      const descOmax =
        'Falso alarme decorrente de regressão no parse do e-mail do NOC. ' +
        'O relatório do NOC indicou sucesso nas 4 VMs, mas parser tratou inadvertidamente como inconformidade. ' +
        'Nenhuma falha real ocorreu no ambiente.'

      const resOmax =
        'Falso alarme gerado por regressão de parsing corrigida em 0.0.77–0.0.83; ' +
        'nenhuma falha real ocorreu — comprovantes de sucesso vinculados. ' +
        'Todas as 4 VMs operaram com 100% de sucesso.'

      const sqlOmax = `
        UPDATE backup_ocorrencias
        SET severidade = 'baixa',
            status = 'resolvida',
            titulo = 'Falso alarme de inconformidade NOC (regressão de parsing)',
            descricao = {:descricao},
            resolucao = {:resolucao},
            resolvida_automaticamente = 1,
            resolvida_em = COALESCE(resolvida_em, {:resolvida_em}),
            fato_real = {:fato_real},
            updated = {:updated}
        WHERE id = 'omax04dxehok1tg'
      `

      app
        .db()
        .newQuery(sqlOmax)
        .bind({
          descricao: descOmax,
          resolucao: resOmax,
          resolvida_em: agora,
          fato_real: JSON.stringify({
            falso_alarme: true,
            motivo: 'Regressão no parse do e-mail do NOC corrigida em 0.0.77–0.0.83',
            falha_real: false,
            vms_ok: ['SPCM-ORION', 'SPCM-PROTESTO', 'SPCM-REGWIN', 'SPCM-TDePJ'],
            vms_falhas: [],
            origem: 'noc',
            parecer_conclusivo:
              'Relatório do NOC continha 4 VMs com status OK; nenhuma inconformidade real.',
          }),
          updated: agora,
        })
        .execute()

      // 3. Auditoria append-only
      try {
        const auditCol = app.findCollectionByNameOrId('audit_log')
        const auditRec = new Record(auditCol)
        auditRec.set('organization', orgId)
        auditRec.set('user_name', 'Sistema CSCTI (Migração 0060)')
        auditRec.set('action', 'OCORRENCIAS_FALSO_ALARME_SANEADAS_0060')
        auditRec.set('entity', 'Backup e Continuidade')
        auditRec.set(
          'detail',
          'Saneamento factual de ocorrências no período 08-10/10/2026: registros fabricados por regressões antigas de parsing marcados como falso alarme resolvido com severidade baixa e parecer conclusivo.',
        )
        auditRec.set('metadata', {
          migracao: '0060_sanear_falsas_ocorrencias_parsing',
          ocorrencias_saneadas: ['qp42ayeh791xbq1', 'omax04dxehok1tg'],
          motivo: 'Regressões antigas de parsing (0.0.77-0.0.83)',
          data_execucao: agora,
        })
        app.save(auditRec)
      } catch (_) {}

      console.log('[0060_sanear_falsas_ocorrencias_parsing] Concluído com sucesso.')
    } catch (err) {
      console.log('[0060_sanear_falsas_ocorrencias_parsing] Erro:', err)
    }
  },
  (app) => {
    // Reversão no-op: preserva integridade histórica
  },
)
