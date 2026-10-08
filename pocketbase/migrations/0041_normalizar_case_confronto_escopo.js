/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0041: Normalização de case em confronto_escopo via SQL direto / deserialização Goja
 */
migrate(
  (app) => {
    console.log('[0041_normalizar_case_confronto_escopo] Iniciando migração...')

    const normalizarJsonString = (jsonStr) => {
      if (!jsonStr) return null
      let str = ''
      if (typeof jsonStr === 'string') {
        str = jsonStr.trim()
      } else {
        try {
          str = JSON.stringify(jsonStr)
        } catch (_) {
          return null
        }
      }
      if (!str.startsWith('{') && !str.startsWith('[')) return null

      let obj = null
      try {
        obj = JSON.parse(str)
      } catch (_) {
        return null
      }
      if (!obj || typeof obj !== 'object') return null

      let alterado = false

      // 1. comprovado
      if (Array.isArray(obj.comprovado)) {
        for (let i = 0; i < obj.comprovado.length; i++) {
          const item = obj.comprovado[i]
          if (item && item.modalidade) {
            const modMin = String(item.modalidade).toLowerCase().trim()
            if (item.modalidade !== modMin) {
              item.modalidade = modMin
              alterado = true
            }
          }
        }
      }

      // 2. exigencias
      if (Array.isArray(obj.exigencias)) {
        for (let i = 0; i < obj.exigencias.length; i++) {
          const item = obj.exigencias[i]
          if (item && Array.isArray(item.modalidades)) {
            for (let m = 0; m < item.modalidades.length; m++) {
              const modMin = String(item.modalidades[m]).toLowerCase().trim()
              if (item.modalidades[m] !== modMin) {
                item.modalidades[m] = modMin
                alterado = true
              }
            }
          }
        }
      }

      // 3. pendencias
      if (Array.isArray(obj.pendencias)) {
        for (let i = 0; i < obj.pendencias.length; i++) {
          const item = obj.pendencias[i]
          if (item) {
            if (item.modalidade) {
              const modMin = String(item.modalidade).toLowerCase().trim()
              if (item.modalidade !== modMin) {
                item.modalidade = modMin
                alterado = true
              }
            }
            if (item.modalidade_pendente) {
              const modMin = String(item.modalidade_pendente).toLowerCase().trim()
              if (item.modalidade_pendente !== modMin) {
                item.modalidade_pendente = modMin
                alterado = true
              }
            }
            if (item.exigencia) {
              const modMin = String(item.exigencia).toLowerCase().trim()
              if (item.exigencia !== modMin) {
                item.exigencia = modMin
                alterado = true
              }
            }
          }
        }
      }

      // 4. modalidades_plano
      if (Array.isArray(obj.modalidades_plano)) {
        for (let i = 0; i < obj.modalidades_plano.length; i++) {
          const modMin = String(obj.modalidades_plano[i]).toLowerCase().trim()
          if (obj.modalidades_plano[i] !== modMin) {
            obj.modalidades_plano[i] = modMin
            alterado = true
          }
        }
      }

      if (alterado) {
        return JSON.stringify(obj)
      }
      return null
    }

    let totalExecs = 0
    let totalAvals = 0

    // Buscar registros via db().newQuery para pegar o texto puro da coluna no SQLite
    try {
      const execRows = []
      app.db().newQuery('SELECT id, confronto_escopo FROM backup_execucoes').all(execRows)

      for (let i = 0; i < execRows.length; i++) {
        const row = execRows[i]
        const novoJson = normalizarJsonString(row.confronto_escopo)
        if (novoJson) {
          app
            .db()
            .newQuery('UPDATE backup_execucoes SET confronto_escopo = {:json} WHERE id = {:id}')
            .bind({ json: novoJson, id: row.id })
            .execute()
          totalExecs++
        }
      }
    } catch (errDbEx) {
      console.error('[0041] Erro ao atualizar backup_execucoes:', errDbEx)
    }

    try {
      const avalRows = []
      app.db().newQuery('SELECT id, confronto_escopo FROM backup_avaliacoes').all(avalRows)

      for (let i = 0; i < avalRows.length; i++) {
        const row = avalRows[i]
        const novoJson = normalizarJsonString(row.confronto_escopo)
        if (novoJson) {
          app
            .db()
            .newQuery('UPDATE backup_avaliacoes SET confronto_escopo = {:json} WHERE id = {:id}')
            .bind({ json: novoJson, id: row.id })
            .execute()
          totalAvals++
        }
      }
    } catch (errDbAv) {
      console.error('[0041] Erro ao atualizar backup_avaliacoes:', errDbAv)
    }

    console.log(
      `[0041_normalizar_case_confronto_escopo] Registros normalizados com sucesso: backup_execucoes=${totalExecs}, backup_avaliacoes=${totalAvals}. Total=${totalExecs + totalAvals}`,
    )

    try {
      const auditCol = app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('action', 'MIGRATION_0041_NORMALIZAR_CASE')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Migração 0041 normalizou ${totalExecs} execução(ões) e ${totalAvals} avaliação(ões) para modalidades em minúsculo ('local'/'nuvem'/'replicacao').`,
      )
      auditRec.set('metadata', {
        execucoes_alteradas: totalExecs,
        avaliacoes_alteradas: totalAvals,
        total_alterados: totalExecs + totalAvals,
      })
      app.save(auditRec)
    } catch (_) {}
  },
  (app) => {},
)
