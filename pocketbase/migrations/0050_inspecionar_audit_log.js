/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0050: Inspeção e teste real do motor de confronto e gravação no audit_log.
 */
migrate(
  (app) => {
    const orgId = '8kl8n6vz64lnxgb'
    const execs = app.findRecordsByFilter(
      'backup_execucoes',
      `organization = '${orgId}'`,
      '-created',
      5,
      0,
    )
    const fontes = app.findRecordsByFilter('backup_fontes', `organization = '${orgId}'`, '', 20, 0)
    const rotinas = app.findRecordsByFilter(
      'backup_rotinas',
      `organization = '${orgId}'`,
      '',
      20,
      0,
    )
    const assets = app.findRecordsByFilter(
      'inventory_assets',
      `organization = '${orgId}' && status = 'ativo'`,
      '',
      20,
      0,
    )

    const auditCol = app.findCollectionByNameOrId('audit_log')
    const auditRec = new Record(auditCol)
    auditRec.set('organization', orgId)
    auditRec.set('action', 'TEST_DUMP_0050')
    auditRec.set('entity', 'Diagnostico')

    // Extrair detalhes
    const execDetails = execs.map((ex) => {
      const conf = ex.get('confronto_escopo')
      return {
        id: ex.id,
        rotina: ex.getString('rotina'),
        status: ex.getString('status'),
        observacao: ex.getString('observacao'),
        confronto_escopo: conf,
      }
    })

    const fontesDetails = fontes.map((f) => ({
      id: f.id,
      ativo_inventario: f.getString('ativo_inventario'),
      caminho_identificacao: f.getString('caminho_identificacao'),
      rotina: f.getString('rotina'),
    }))

    const rotinasDetails = rotinas.map((r) => ({
      id: r.id,
      nome: r.getString('nome'),
      plano: r.getString('plano'),
    }))

    auditRec.set(
      'detail',
      `Execucoes: ${execs.length}, Fontes: ${fontes.length}, Rotinas: ${rotinas.length}`,
    )
    auditRec.set('metadata', {
      execucoes: execDetails,
      fontes: fontesDetails,
      rotinas: rotinasDetails,
    })
    app.save(auditRec)
  },
  (app) => {},
)
