/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    console.log('[0061_test_confronto_rpo] Invocando motor de confronto...')
    try {
      const orgs = app.findRecordsByFilter('organizations', '', '+created', 1, 0)
      if (orgs.length === 0) {
        console.log('[0061] Nenhuma org encontrada.')
        return
      }
      const orgId = orgs[0].id
      console.log('[0061] Testando confronto para org:', orgId)

      // Testar endpoint do confronto via Record ou simulação direta
      const assets = app.findRecordsByFilter(
        'inventory_assets',
        `organization = '${orgId}' && status = 'ativo'`,
        '+name',
        50,
        0,
      )
      console.log('[0061] Total ativos:', assets.length)
      for (let i = 0; i < assets.length; i++) {
        console.log(`[0061] Ativo: ${assets[i].getString('name')} (id: ${assets[i].id})`)
      }
    } catch (err) {
      console.error('[0061] Erro ao testar confronto:', err?.message || err)
    }
  },
  () => {},
)
