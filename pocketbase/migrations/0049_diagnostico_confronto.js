/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0049: Investigação diagnóstica do endpoint /backend/v1/backup/confronto
 * e simulação exata da avaliação para org 8kl8n6vz64lnxgb.
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

    console.log(
      '[0049_diagnostico] Ativos:',
      assets.length,
      'Fontes:',
      fontes.length,
      'Rotinas:',
      rotinas.length,
      'Execuções:',
      execs.length,
    )

    for (let i = 0; i < execs.length; i++) {
      const ex = execs[i]
      const conf = ex.get('confronto_escopo')
      console.log(
        `[0049_diagnostico] Exec #${ex.id} rotina=${ex.getString('rotina')} status=${ex.getString('status')}`,
      )
      console.log(
        `[0049_diagnostico] Exec #${ex.id} conf typeof:`,
        typeof conf,
        'isArray:',
        Array.isArray(conf),
      )
      if (conf) {
        try {
          const str = typeof conf === 'string' ? conf : JSON.stringify(conf)
          console.log(
            `[0049_diagnostico] Exec #${ex.id} conf len=${str.length} preview:`,
            str.substring(0, 150),
          )
        } catch (e) {
          console.log(`[0049_diagnostico] Exec #${ex.id} erro stringify:`, e.message)
        }
      }
    }

    for (let i = 0; i < fontes.length; i++) {
      const f = fontes[i]
      console.log(
        `[0049_diagnostico] Fonte #${f.id} ativo_inv=${f.getString('ativo_inventario')} rotina=${f.getString('rotina')} caminho=${f.getString('caminho_identificacao')}`,
      )
    }
  },
  (app) => {},
)
