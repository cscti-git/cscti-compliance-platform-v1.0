/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Localizar usuário para teste
    const orgId = '8kl8n6vz64lnxgb'
    const users = app.findRecordsByFilter('users', `organization = '${orgId}'`, '-created', 1, 0)
    if (users.length === 0) {
      console.warn('[migracao-0051] Nenhum usuario para a org:', orgId)
      return
    }
    const testUser = users[0]

    // 2. Chamar endpoint POST /backend/v1/backup/confronto
    // No ambiente PocketBase pb_hooks / PocketBase HTTP, geramos o token JWT de teste ou chamamos via $http
    // Usamos $security.createJWT com a secret da instância ou fazemos a checagem direta dos dados do confronto
    // Também podemos invocar a rota com $http
    let statusCode = 0
    let responseBody = null
    try {
      // PocketBase v0.36 suporta createJWT ou login
      const res = $http.send({
        url: 'http://127.0.0.1:8090/backend/v1/backup/confronto',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10,
      })
      statusCode = res.statusCode
      responseBody = res.json || res.raw
    } catch (eHttp) {
      console.log('[migracao-0051] http call direct:', String(eHttp))
    }

    // Verificar também estado direto no banco para garantia factual:
    const execs = app.findRecordsByFilter(
      'backup_execucoes',
      `organization = '${orgId}'`,
      '-data_inicio',
      10,
      0,
    )
    let totalComprovadasGold = 0
    let comprovadosVms = []
    for (let i = 0; i < execs.length; i++) {
      const ex = execs[i]
      const esc = ex.get('confronto_escopo')
      if (esc && esc.comprovado && Array.isArray(esc.comprovado) && esc.comprovado.length > 0) {
        totalComprovadasGold = esc.comprovado.length
        comprovadosVms = esc.comprovado.map((c) => ({
          ativo: c.ativo_nome || c.item_comprovante,
          modalidade: c.modalidade,
          status: c.status,
        }))
        break
      }
    }

    const auditCol = app.findCollectionByNameOrId('audit_log')
    const auditRec = new Record(auditCol)
    auditRec.set('organization', orgId)
    auditRec.set('user', testUser.id)
    auditRec.set('user_name', testUser.getString('name') || testUser.getString('email'))
    auditRec.set('user_email', testUser.getString('email'))
    auditRec.set('action', 'TEST_LIVE_CONFRONTO_0051_RESULT')
    auditRec.set('entity', 'BackupConfronto')
    auditRec.set('detail', `Status: ${statusCode}, VMs comprovadas: ${totalComprovadasGold}`)
    auditRec.set('metadata', {
      statusCode,
      responseBody,
      totalComprovadasGold,
      comprovadosVms,
    })
    app.save(auditRec)
  },
  (app) => {},
)
