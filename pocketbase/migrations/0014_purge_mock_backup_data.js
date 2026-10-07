migrate(
  (app) => {
    // Expurgo de dados fictícios e de teste do módulo Backup do CSCTI.
    // Coleções a zerar:
    // backup_evidencias, backup_execucoes, backup_avaliacoes, backup_ocorrencias,
    // backup_monitoramentos_externos, backup_fontes, backup_rotinas, backup_planos, backup_escopo
    // PRESERVAR: backup_regras_identificacao e audit_log

    const tabelasParaZerar = [
      'backup_avaliacoes',
      'backup_ocorrencias',
      'backup_monitoramentos_externos',
      'backup_execucoes',
      'backup_processamentos',
      'backup_evidencias',
      'backup_plano_requisitos',
      'backup_fontes',
      'backup_rotinas',
      'backup_planos',
      'backup_escopo',
    ]

    for (let i = 0; i < tabelasParaZerar.length; i++) {
      const tabela = tabelasParaZerar[i]
      try {
        app.db().newQuery(`DELETE FROM ${tabela}`).execute()
      } catch (err) {
        // Ignora se tabela não existir
      }
    }

    // Registrar na auditoria o expurgo
    try {
      let orgId = ''
      const orgs = app.findRecordsByFilter('organizations', '', '+created', 1, 0)
      if (orgs.length > 0) {
        orgId = orgs[0].id
      }

      const auditCol = app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      if (orgId) {
        auditRec.set('organization', orgId)
      }
      auditRec.set('action', 'BACKUP_PURGE_MOCK_DATA')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        'reinicio do monitoramento — expurgo de dados de teste/demonstração (dados fabricados por mock no código)',
      )
      auditRec.set('metadata', {
        motivo:
          'reinicio do monitoramento — expurgo de dados de teste/demonstração (dados fabricados por mock no código)',
        colecoes_zeradas: tabelasParaZerar,
        executado_em: new Date().toISOString(),
      })
      app.save(auditRec)
    } catch (_) {}
  },
  (app) => {
    // Reversão não recria dados expurgados
  },
)
