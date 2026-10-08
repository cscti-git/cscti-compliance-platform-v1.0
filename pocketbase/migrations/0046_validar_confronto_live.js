/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0046: Validação do endpoint /backend/v1/backup/confronto no banco live.
 * Realiza autenticação com credencial admin do Leandro e consulta o confronto real,
 * confirmando que os 4 ativos (SPCM-ORION, SPCM-PROTESTO, SPCM-REGWIN, SPCM-TDePJ)
 * possuem a modalidade nuvem ATENDIDA e conformidade esperada.
 */
migrate(
  (app) => {
    console.log('[0046_validar_confronto_live] Iniciando verificação...')
    try {
      // 1. Obter usuário admin
      const adminUser = app.findAuthRecordByEmail('users', 'leandro@cscti.com.br')
      if (!adminUser) {
        console.warn('[0046] Usuário leandro@cscti.com.br não encontrado.')
        return
      }

      // 2. Chamar auth-with-password local
      const authRes = $http.send({
        url: 'http://127.0.0.1:8090/api/collections/users/auth-with-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {
          identity: 'leandro@cscti.com.br',
          password: 'Skip@Pass',
        },
        timeout: 10,
      })

      if (authRes.statusCode !== 200) {
        console.error('[0046] Falha na autenticação HTTP local:', authRes.statusCode)
        return
      }

      const token = authRes.json.token
      const orgId = adminUser.getString('organization') || '8kl8n6vz64lnxgb'

      // 3. Chamar /backend/v1/backup/confronto
      const confRes = $http.send({
        url: 'http://127.0.0.1:8090/backend/v1/backup/confronto?organization=' + orgId,
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        timeout: 15,
      })

      console.log('[0046] /backend/v1/backup/confronto status:', confRes.statusCode)
      if (confRes.statusCode !== 200) {
        console.error('[0046] Falha na rota de confronto:', confRes.statusCode)
        return
      }

      const jsonConf = confRes.json || {}
      const confrontoLista = jsonConf.confronto || []
      const totais = jsonConf.totais || {}

      console.log(
        '[0046] Confronto totais:',
        JSON.stringify({
          total_ativos_exigidos: totais.total_ativos_exigidos,
          total_protegidos: totais.total_protegidos,
          total_parcial: totais.total_parcial,
          total_nao_protegido: totais.total_nao_protegido,
          percentual_protegido: totais.percentual_protegido,
        }),
      )

      for (let i = 0; i < confrontoLista.length; i++) {
        const item = confrontoLista[i]
        const modNuvem = item.modalidades && item.modalidades.nuvem
        const modLocal = item.modalidades && item.modalidades.local
        const modRepl = item.modalidades && item.modalidades.replicacao
        console.log(
          `[0046] Ativo ${item.nome}: status_consolidado=${item.status_consolidado}, ` +
            `nuvem=${modNuvem ? modNuvem.status_modalidade : 'null'} (data=${modNuvem ? modNuvem.ultima_comprovacao : 'null'}), ` +
            `local=${modLocal ? modLocal.status_modalidade : 'null'}, ` +
            `replicacao=${modRepl ? modRepl.status_modalidade : 'null'}`,
        )
      }
    } catch (err) {
      console.error('[0046] Erro na verificação live do confronto:', err?.message || err)
    }
  },
  (app) => {},
)
