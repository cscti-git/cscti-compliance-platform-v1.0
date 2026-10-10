/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const orgs = app.findRecordsByFilter('organizations', '', '+created', 1, 0)
      if (orgs.length === 0) return
      const orgId = orgs[0].id

      // Usar a mesma lógica de backup_confronto.js para testar o resultado
      // Vamos simular a chamada interna ao handler do confronto
      // Carregar os ativos exigidos
      const assets = app.findRecordsByFilter(
        'inventory_assets',
        `organization = '${orgId}' && status = 'ativo'`,
        '+name',
        50,
        0,
      )

      console.log(`[0062_confronto_check] Testando para ${assets.length} ativos...`)
      for (let i = 0; i < assets.length; i++) {
        const a = assets[i]
        console.log(
          `[0062_confronto_check] Ativo: ${a.getString('name')}, exigências: local=${a.getBool('exige_backup_local')}, nuvem=${a.getBool('exige_backup_nuvem')}, rep=${a.getBool('exige_backup_replicacao')}`,
        )
      }
    } catch (e) {
      console.error('[0062_confronto_check] Erro:', e?.message || e)
    }
  },
  () => {},
)
