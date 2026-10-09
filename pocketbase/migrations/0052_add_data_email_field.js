migrate(
  (app) => {
    // 1. Adicionar campo text data_email em backup_evidencias
    const evidCol = app.findCollectionByNameOrId('backup_evidencias')
    if (!evidCol.fields.getByName('data_email')) {
      evidCol.fields.add(
        new TextField({
          name: 'data_email',
          required: false,
        }),
      )
      app.save(evidCol)
    }

    // 2. Adicionar campo text data_email em backup_execucoes
    const execCol = app.findCollectionByNameOrId('backup_execucoes')
    if (!execCol.fields.getByName('data_email')) {
      execCol.fields.add(
        new TextField({
          name: 'data_email',
          required: false,
        }),
      )
      app.save(execCol)
    }

    // 3. Backfill: preencher a partir dos dados já gravados (ex.: data extraída do comprovante/observação)
    // Heurísticas auditáveis de extração:
    // a) Date: header no conteúdo (RFC 2822 / ISO)
    // b) INTERNALDATE / data no HTML/XML ou data_recebida
    // Se não houver como determinar de forma factual, deixar nulo - nunca inventar dado.
    function parseDateToIso(str) {
      if (!str) return null
      try {
        const d = new Date(str)
        if (!isNaN(d.getTime())) {
          return d.toISOString()
        }
      } catch (_) {}
      return null
    }

    function extractDateFromContent(text) {
      if (!text) return null
      const s = String(text)

      // Regex para Date: RFC 2822 (ex: Date: Thu, 8 Oct 2026 17:44:00 -0300 ou Date: 08 Oct 2026 16:27:00 GMT)
      const dateHeaderMatch = s.match(
        /(?:^|[\r\n])Date\s*:\s*([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s+[+-]\d{4}|\s+[A-Z]{1,4})?)/i,
      )
      if (dateHeaderMatch) {
        const iso = parseDateToIso(dateHeaderMatch[1].trim())
        if (iso) return iso
      }

      // Regex para meta date ou header simples: Date: YYYY-MM-DD...
      const isoHeaderMatch = s.match(
        /(?:^|[\r\n]|<meta[^>]*>)Date\s*[:=]\s*["']?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)/i,
      )
      if (isoHeaderMatch) {
        const iso = parseDateToIso(isoHeaderMatch[1].trim())
        if (iso) return iso
      }

      // Regex para data/hora no padrão brasileiro dd/mm/aaaa hh:mm(:ss) presente no comprovante
      const brMatch = s.match(
        /\b(\d{2})\/(\d{2})\/(\d{4})\s+(?:às\s+)?(\d{2}):(\d{2})(?::(\d{2}))?\b/,
      )
      if (brMatch) {
        const d = parseInt(brMatch[1], 10)
        const m = parseInt(brMatch[2], 10) - 1
        const y = parseInt(brMatch[3], 10)
        const h = parseInt(brMatch[4], 10)
        const min = parseInt(brMatch[5], 10)
        const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0
        // Assumindo fuso de São Paulo (UTC-3) para comprovantes de clientes brasileiros
        const utcDate = new Date(Date.UTC(y, m, d, h + 3, min, sec))
        if (!isNaN(utcDate.getTime())) {
          return utcDate.toISOString()
        }
      }

      return null
    }

    try {
      const evidencias = app.findRecordsByFilter('backup_evidencias', '', '+created', 500, 0)
      for (let i = 0; i < evidencias.length; i++) {
        const ev = evidencias[i]
        if (!ev.getString('data_email')) {
          const conteudo = ev.getString('conteudo') || ''
          const extractedIso = extractDateFromContent(conteudo)
          if (extractedIso) {
            ev.set('data_email', extractedIso)
            app.save(ev)
          }
        }
      }
    } catch (errEv) {
      console.log('[0052_add_data_email] Aviso no backfill de evidencias:', errEv)
    }

    try {
      const execucoes = app.findRecordsByFilter('backup_execucoes', '', '+created', 500, 0)
      for (let j = 0; j < execucoes.length; j++) {
        const ex = execucoes[j]
        if (!ex.getString('data_email')) {
          let isoEmail = null
          const evId = ex.getString('evidencia')
          if (evId) {
            try {
              const ev = app.findRecordById('backup_evidencias', evId)
              isoEmail = ev.getString('data_email') || null
              if (!isoEmail) {
                isoEmail = extractDateFromContent(ev.getString('conteudo'))
              }
            } catch (_) {}
          }
          if (!isoEmail) {
            isoEmail = extractDateFromContent(ex.getString('observacao'))
          }
          if (isoEmail) {
            ex.set('data_email', isoEmail)
            app.save(ex)
          }
        }
      }
    } catch (errEx) {
      console.log('[0052_add_data_email] Aviso no backfill de execucoes:', errEx)
    }
  },
  (app) => {
    try {
      const evidCol = app.findCollectionByNameOrId('backup_evidencias')
      if (evidCol.fields.getByName('data_email')) {
        evidCol.fields.removeByName('data_email')
        app.save(evidCol)
      }
    } catch (_) {}

    try {
      const execCol = app.findCollectionByNameOrId('backup_execucoes')
      if (execCol.fields.getByName('data_email')) {
        execCol.fields.removeByName('data_email')
        app.save(execCol)
      }
    } catch (_) {}
  },
)
