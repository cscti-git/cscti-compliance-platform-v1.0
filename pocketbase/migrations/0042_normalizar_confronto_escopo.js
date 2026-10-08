/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0042: Regravar confronto_escopo normalizando modalidade com JSON.parse / replace
 */
migrate(
  (app) => {
    console.log('[0042_normalizar_confronto_escopo] Iniciando migração...')

    const normalizarRawString = (str) => {
      if (!str) return null
      let alterado = false
      // Substituições seguras de modalidade maiúscula/mista para minúscula dentro do JSON
      let novo = str
      if (novo.includes('"modalidade":"LOCAL"') || novo.includes('"modalidade": "LOCAL"')) {
        novo = novo.replace(/"modalidade"\s*:\s*"LOCAL"/g, '"modalidade":"local"')
        alterado = true
      }
      if (novo.includes('"modalidade":"NUVEM"') || novo.includes('"modalidade": "NUVEM"')) {
        novo = novo.replace(/"modalidade"\s*:\s*"NUVEM"/g, '"modalidade":"nuvem"')
        alterado = true
      }
      if (
        novo.includes('"modalidade":"REPLICACAO"') ||
        novo.includes('"modalidade": "REPLICACAO"')
      ) {
        novo = novo.replace(/"modalidade"\s*:\s*"REPLICACAO"/g, '"modalidade":"replicacao"')
        alterado = true
      }
      if (
        novo.includes('"modalidade_pendente":"LOCAL"') ||
        novo.includes('"modalidade_pendente": "LOCAL"')
      ) {
        novo = novo.replace(/"modalidade_pendente"\s*:\s*"LOCAL"/g, '"modalidade_pendente":"local"')
        alterado = true
      }
      if (
        novo.includes('"modalidade_pendente":"NUVEM"') ||
        novo.includes('"modalidade_pendente": "NUVEM"')
      ) {
        novo = novo.replace(/"modalidade_pendente"\s*:\s*"NUVEM"/g, '"modalidade_pendente":"nuvem"')
        alterado = true
      }
      if (
        novo.includes('"modalidade_pendente":"REPLICACAO"') ||
        novo.includes('"modalidade_pendente": "REPLICACAO"')
      ) {
        novo = novo.replace(
          /"modalidade_pendente"\s*:\s*"REPLICACAO"/g,
          '"modalidade_pendente":"replicacao"',
        )
        alterado = true
      }
      if (novo.includes('"exigencia":"LOCAL"') || novo.includes('"exigencia": "LOCAL"')) {
        novo = novo.replace(/"exigencia"\s*:\s*"LOCAL"/g, '"exigencia":"local"')
        alterado = true
      }
      if (novo.includes('"exigencia":"NUVEM"') || novo.includes('"exigencia": "NUVEM"')) {
        novo = novo.replace(/"exigencia"\s*:\s*"NUVEM"/g, '"exigencia":"nuvem"')
        alterado = true
      }
      if (novo.includes('"exigencia":"REPLICACAO"') || novo.includes('"exigencia": "REPLICACAO"')) {
        novo = novo.replace(/"exigencia"\s*:\s*"REPLICACAO"/g, '"exigencia":"replicacao"')
        alterado = true
      }

      // Também fazer parse para garantir que objetos com chaves não exatas sejam normalizados
      try {
        const obj = JSON.parse(novo)
        let objAlterado = false

        if (Array.isArray(obj.comprovado)) {
          for (let i = 0; i < obj.comprovado.length; i++) {
            const item = obj.comprovado[i]
            if (item && item.modalidade) {
              const m = String(item.modalidade).toLowerCase().trim()
              if (item.modalidade !== m) {
                item.modalidade = m
                objAlterado = true
              }
            }
          }
        }
        if (Array.isArray(obj.exigencias)) {
          for (let i = 0; i < obj.exigencias.length; i++) {
            const item = obj.exigencias[i]
            if (item && Array.isArray(item.modalidades)) {
              for (let m = 0; m < item.modalidades.length; m++) {
                const mod = String(item.modalidades[m]).toLowerCase().trim()
                if (item.modalidades[m] !== mod) {
                  item.modalidades[m] = mod
                  objAlterado = true
                }
              }
            }
          }
        }
        if (Array.isArray(obj.pendencias)) {
          for (let i = 0; i < obj.pendencias.length; i++) {
            const item = obj.pendencias[i]
            if (item) {
              if (item.modalidade) {
                const m = String(item.modalidade).toLowerCase().trim()
                if (item.modalidade !== m) {
                  item.modalidade = m
                  objAlterado = true
                }
              }
              if (item.modalidade_pendente) {
                const m = String(item.modalidade_pendente).toLowerCase().trim()
                if (item.modalidade_pendente !== m) {
                  item.modalidade_pendente = m
                  objAlterado = true
                }
              }
              if (item.exigencia) {
                const m = String(item.exigencia).toLowerCase().trim()
                if (item.exigencia !== m) {
                  item.exigencia = m
                  objAlterado = true
                }
              }
            }
          }
        }

        if (objAlterado || alterado) {
          return JSON.stringify(obj)
        }
      } catch (_) {
        if (alterado) return novo
      }

      return alterado ? novo : null
    }

    let totalExecs = 0
    let totalAvals = 0

    // 1. Processar backup_execucoes usando app.findRecordsByFilter e app.save
    try {
      const execs = app.findRecordsByFilter('backup_execucoes', '', '', 1000, 0)
      for (let i = 0; i < execs.length; i++) {
        const ex = execs[i]
        const raw = ex.getString('confronto_escopo')
        const novo = normalizarRawString(raw)
        if (novo) {
          try {
            ex.set('confronto_escopo', JSON.parse(novo))
          } catch (_) {
            ex.set('confronto_escopo', novo)
          }
          app.save(ex)
          totalExecs++
        }
      }
    } catch (errEx) {
      console.error('[0042] Erro em backup_execucoes:', errEx?.message || errEx)
    }

    // 2. Processar backup_avaliacoes usando app.findRecordsByFilter e app.save
    try {
      const avals = app.findRecordsByFilter('backup_avaliacoes', '', '', 1000, 0)
      for (let i = 0; i < avals.length; i++) {
        const av = avals[i]
        const raw = av.getString('confronto_escopo')
        const novo = normalizarRawString(raw)
        if (novo) {
          try {
            av.set('confronto_escopo', JSON.parse(novo))
          } catch (_) {
            av.set('confronto_escopo', novo)
          }
          app.save(av)
          totalAvals++
        }
      }
    } catch (errAv) {
      console.error('[0042] Erro em backup_avaliacoes:', errAv?.message || errAv)
    }

    console.log(
      `[0042_normalizar_confronto_escopo] Concluído. Registros alterados: backup_execucoes=${totalExecs}, backup_avaliacoes=${totalAvals}. Total=${totalExecs + totalAvals}`,
    )

    try {
      const auditCol = app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('action', 'MIGRATION_0042_NORMALIZAR_CASE')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Migração 0042 normalizou ${totalExecs} execução(ões) e ${totalAvals} avaliação(ões) para modalidades em minúsculo ('local'/'nuvem'/'replicacao').`,
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
