/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0040: Normalização de case em confronto_escopo (backup_execucoes e backup_avaliacoes)
 *
 * Converte todos os valores de `modalidade` nos itens de `comprovado` e `exigencias`
 * (e `pendencias`, se houver) para minúsculo ('local' / 'nuvem' / 'replicacao').
 */
migrate(
  (app) => {
    console.log('[0040_normalizar_case_confronto_escopo] Iniciando normalização de case...')

    const normalizarJson = (valor) => {
      if (valor === null || valor === undefined) return null
      if (typeof valor === 'string') {
        const s = valor.trim()
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
          try {
            return JSON.parse(s)
          } catch (_) {
            return null
          }
        }
        return null
      }
      try {
        return JSON.parse(JSON.stringify(valor))
      } catch (_) {
        return null
      }
    }

    const normalizarObjetoConfronto = (conf) => {
      if (!conf || typeof conf !== 'object') return { modificado: false, resultado: conf }
      let alterado = false
      const clone = JSON.parse(JSON.stringify(conf))

      // 1. Normalizar comprovado
      if (Array.isArray(clone.comprovado)) {
        for (let i = 0; i < clone.comprovado.length; i++) {
          const item = clone.comprovado[i]
          if (item && item.modalidade) {
            const modMin = String(item.modalidade).toLowerCase().trim()
            if (item.modalidade !== modMin) {
              item.modalidade = modMin
              alterado = true
            }
          }
        }
      }

      // 2. Normalizar exigencias
      if (Array.isArray(clone.exigencias)) {
        for (let i = 0; i < clone.exigencias.length; i++) {
          const item = clone.exigencias[i]
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

      // 3. Normalizar pendencias
      if (Array.isArray(clone.pendencias)) {
        for (let i = 0; i < clone.pendencias.length; i++) {
          const item = clone.pendencias[i]
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

      // 4. Normalizar modalidades_plano se houver
      if (Array.isArray(clone.modalidades_plano)) {
        for (let i = 0; i < clone.modalidades_plano.length; i++) {
          const modMin = String(clone.modalidades_plano[i]).toLowerCase().trim()
          if (clone.modalidades_plano[i] !== modMin) {
            clone.modalidades_plano[i] = modMin
            alterado = true
          }
        }
      }

      return { modificado: alterado, resultado: clone }
    }

    let totalExecucoesAlteradas = 0
    let totalAvaliacoesAlteradas = 0

    // 1. Processar backup_execucoes
    try {
      const execs = app.findRecordsByFilter('backup_execucoes', '', '-created', 1000, 0)
      console.log(`[0040] Verificando ${execs.length} registros em backup_execucoes...`)
      for (let i = 0; i < execs.length; i++) {
        const ex = execs[i]
        const conf = normalizarJson(ex.get('confronto_escopo'))
        if (!conf) continue
        const { modificado, resultado } = normalizarObjetoConfronto(conf)
        if (modificado) {
          ex.set('confronto_escopo', resultado)
          app.save(ex)
          totalExecucoesAlteradas++
        }
      }
    } catch (errExecs) {
      console.error('[0040] Erro ao normalizar backup_execucoes:', errExecs?.message || errExecs)
    }

    // 2. Processar backup_avaliacoes
    try {
      const avals = app.findRecordsByFilter('backup_avaliacoes', '', '-created', 1000, 0)
      console.log(`[0040] Verificando ${avals.length} registros em backup_avaliacoes...`)
      for (let i = 0; i < avals.length; i++) {
        const av = avals[i]
        const conf = normalizarJson(av.get('confronto_escopo'))
        if (!conf) continue
        const { modificado, resultado } = normalizarObjetoConfronto(conf)
        if (modificado) {
          av.set('confronto_escopo', resultado)
          app.save(av)
          totalAvaliacoesAlteradas++
        }
      }
    } catch (errAvals) {
      console.error('[0040] Erro ao normalizar backup_avaliacoes:', errAvals?.message || errAvals)
    }

    console.log(
      `[0040_normalizar_case_confronto_escopo] Concluído com sucesso. Registros alterados: backup_execucoes=${totalExecucoesAlteradas}, backup_avaliacoes=${totalAvaliacoesAlteradas}. Total=${totalExecucoesAlteradas + totalAvaliacoesAlteradas}`,
    )

    // Auditoria append-only
    try {
      const auditCol = app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('action', 'MIGRATION_0040_NORMALIZAR_CASE')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Migração 0040 executada com sucesso. Normalizados ${totalExecucoesAlteradas} registro(s) em backup_execucoes e ${totalAvaliacoesAlteradas} em backup_avaliacoes para modalidade em minúsculo.`,
      )
      auditRec.set('metadata', {
        execucoes_alteradas: totalExecucoesAlteradas,
        avaliacoes_alteradas: totalAvaliacoesAlteradas,
        total_alterados: totalExecucoesAlteradas + totalAvaliacoesAlteradas,
      })
      app.save(auditRec)
    } catch (_) {}
  },
  (app) => {
    // Reversão não necessária para correção de caixa de texto
  },
)
