migrate(
  (app) => {
    // -------------------------------------------------------------
    // Migração 0053: Backfill defensivo de data_email
    // Aplica a mesma lógica rigorosa de extração factual:
    // 1) Header Date: RFC 2822 no bloco de cabeçalhos EML (antes da 1ª linha em branco)
    // 2) Header Date ISO / padrão
    // 3) Carimbo no conteúdo ("Created ... at", "Gerado em", dd/mm/aaaa hh:mm, extenso PT-BR)
    // 4) Data no assunto
    // Se não determinável: null (NUNCA inventar data)
    // Propagar para backup_execucoes vinculadas via campo 'evidencia'
    // Registrar contagem detalhada na auditoria append-only (audit_log)
    // -------------------------------------------------------------

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

    function parseExtensoPtBrParaIso(texto) {
      if (!texto) return null
      const meses = {
        janeiro: 0,
        fevereiro: 1,
        marco: 2,
        março: 2,
        abril: 3,
        maio: 4,
        junho: 5,
        julho: 6,
        agosto: 7,
        setembro: 8,
        outubro: 9,
        novembro: 10,
        dezembro: 11,
      }
      const regexExtenso =
        /\b(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})(?:[,\s]+(?:às|as)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i
      const m = String(texto).match(regexExtenso)
      if (m) {
        const dia = parseInt(m[1], 10)
        const mesNome = m[2].toLowerCase()
        const ano = parseInt(m[3], 10)
        const mes = meses[mesNome]
        if (mes !== undefined && dia >= 1 && dia <= 31 && ano >= 2000 && ano <= 2100) {
          const hora = m[4] ? parseInt(m[4], 10) : 12
          const min = m[5] ? parseInt(m[5], 10) : 0
          const sec = m[6] ? parseInt(m[6], 10) : 0
          const utcDate = new Date(Date.UTC(ano, mes, dia, hora + 3, min, sec))
          if (!isNaN(utcDate.getTime())) {
            return utcDate.toISOString()
          }
        }
      }
      return null
    }

    function extrairDataEmailDefensiva(conteudoTexto, assuntoTexto) {
      // 1) Header Date no bloco de cabeçalhos EML (antes da primeira linha em branco)
      if (conteudoTexto) {
        const splitHeaders = String(conteudoTexto).split(/\r?\n\r?\n/)
        const headerBlock = splitHeaders[0] || ''
        const headerMatch = headerBlock.match(
          /(?:^|[\r\n])Date\s*:\s*([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s+[+-]\d{4}|\s+[A-Z]{1,4})?)/i,
        )
        if (headerMatch && headerMatch[1]) {
          const iso = parseDateToIso(headerMatch[1].trim())
          if (iso) return iso
        }

        const headerIsoMatch = headerBlock.match(
          /(?:^|[\r\n])Date\s*:\s*(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)/i,
        )
        if (headerIsoMatch && headerIsoMatch[1]) {
          const iso = parseDateToIso(headerIsoMatch[1].trim())
          if (iso) return iso
        }
      }

      // 2) Carimbo no conteúdo
      if (conteudoTexto) {
        const s = String(conteudoTexto)

        const createdIsoMatch = s.match(
          /(?:created|gerado\s+em|data(?:\s+de\s+criação|\s+de\s+execução)?)\s*[:=\s]+["']?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)/i,
        )
        if (createdIsoMatch && createdIsoMatch[1]) {
          const iso = parseDateToIso(createdIsoMatch[1].trim())
          if (iso) return iso
        }

        const brMatch = s.match(
          /\b(\d{2})\/(\d{2})\/(\d{4})\s+(?:às\s+|as\s+)?(\d{2}):(\d{2})(?::(\d{2}))?\b/,
        )
        if (brMatch) {
          const d = parseInt(brMatch[1], 10)
          const m = parseInt(brMatch[2], 10) - 1
          const y = parseInt(brMatch[3], 10)
          const h = parseInt(brMatch[4], 10)
          const min = parseInt(brMatch[5], 10)
          const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0
          if (d >= 1 && d <= 31 && m >= 0 && m <= 11 && y >= 2000 && y <= 2100) {
            const utcDate = new Date(Date.UTC(y, m, d, h + 3, min, sec))
            if (!isNaN(utcDate.getTime())) {
              return utcDate.toISOString()
            }
          }
        }

        const extensoIso = parseExtensoPtBrParaIso(s)
        if (extensoIso) return extensoIso
      }

      // 3) Data no assunto
      if (assuntoTexto) {
        const sAssunto = String(assuntoTexto)
        const dataAssuntoBr = sAssunto.match(
          /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})(?:\s+(?:às\s+|as\s+)?(\d{2}):(\d{2}))?\b/,
        )
        if (dataAssuntoBr) {
          const d = parseInt(dataAssuntoBr[1], 10)
          const m = parseInt(dataAssuntoBr[2], 10) - 1
          const y = parseInt(dataAssuntoBr[3], 10)
          const h = dataAssuntoBr[4] ? parseInt(dataAssuntoBr[4], 10) : 12
          const min = dataAssuntoBr[5] ? parseInt(dataAssuntoBr[5], 10) : 0
          if (d >= 1 && d <= 31 && m >= 0 && m <= 11 && y >= 2000 && y <= 2100) {
            const utcDate = new Date(Date.UTC(y, m, d, h + 3, min, 0))
            if (!isNaN(utcDate.getTime())) {
              return utcDate.toISOString()
            }
          }
        }

        const extensoAssunto = parseExtensoPtBrParaIso(sAssunto)
        if (extensoAssunto) return extensoAssunto
      }

      return null
    }

    let totalEvidenciasAnalisadas = 0
    let totalEvidenciasAtualizadas = 0
    let totalEvidenciasIndeterminadas = 0
    let totalExecucoesAtualizadas = 0
    let orgIdDefault = ''

    // 1. Processar backup_evidencias
    try {
      const evidencias = app.findRecordsByFilter('backup_evidencias', '', '+created', 1000, 0)
      totalEvidenciasAnalisadas = evidencias.length

      for (let i = 0; i < evidencias.length; i++) {
        const ev = evidencias[i]
        if (!orgIdDefault) {
          orgIdDefault = ev.getString('organization') || ''
        }
        const dataExistente = ev.getString('data_email')
        if (!dataExistente) {
          const conteudo = ev.getString('conteudo') || ''
          const assunto = ev.getString('assunto') || ''
          const isoExtraido = extrairDataEmailDefensiva(conteudo, assunto)
          if (isoExtraido) {
            ev.set('data_email', isoExtraido)
            app.save(ev)
            totalEvidenciasAtualizadas++
          } else {
            totalEvidenciasIndeterminadas++
          }
        }
      }
    } catch (errEv) {
      console.log('[0053_backfill_data_email] Erro ao iterar evidencias:', errEv)
    }

    // 2. Propagar data_email para backup_execucoes vinculadas via 'evidencia'
    try {
      const execucoes = app.findRecordsByFilter('backup_execucoes', '', '+created', 1000, 0)
      for (let j = 0; j < execucoes.length; j++) {
        const ex = execucoes[j]
        if (!orgIdDefault) {
          orgIdDefault = ex.getString('organization') || ''
        }
        const dataExistenteEx = ex.getString('data_email')
        if (!dataExistenteEx) {
          let isoEmail = null
          const evId = ex.getString('evidencia')
          if (evId) {
            try {
              const ev = app.findRecordById('backup_evidencias', evId)
              isoEmail = ev.getString('data_email') || null
              if (!isoEmail) {
                isoEmail = extrairDataEmailDefensiva(
                  ev.getString('conteudo'),
                  ev.getString('assunto'),
                )
                if (isoEmail) {
                  ev.set('data_email', isoEmail)
                  app.save(ev)
                  totalEvidenciasAtualizadas++
                }
              }
            } catch (_) {}
          }

          if (!isoEmail) {
            const obs = ex.getString('observacao') || ''
            isoEmail = extrairDataEmailDefensiva(obs, '')
          }

          if (isoEmail) {
            ex.set('data_email', isoEmail)
            app.save(ex)
            totalExecucoesAtualizadas++
          }
        }
      }
    } catch (errEx) {
      console.log('[0053_backfill_data_email] Erro ao iterar execucoes:', errEx)
    }

    // 3. Registrar contagem na auditoria append-only (audit_log) conforme padrão dos hooks
    try {
      const auditCol = app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      if (orgIdDefault) {
        auditRec.set('organization', orgIdDefault)
      } else {
        try {
          const orgs = app.findRecordsByFilter('organizations', '', '+created', 1, 0)
          if (orgs.length > 0) auditRec.set('organization', orgs[0].id)
        } catch (_) {}
      }
      auditRec.set('action', 'BACKUP_DATA_EMAIL_BACKFILL_0053')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Backfill defensivo de data_email concluído com sucesso. Evidências analisadas: ${totalEvidenciasAnalisadas}, preenchidas: ${totalEvidenciasAtualizadas}, sem data determinável (mantidas null): ${totalEvidenciasIndeterminadas}. Execuções sincronizadas: ${totalExecucoesAtualizadas}.`,
      )
      auditRec.set('metadata', {
        migracao: '0053_backfill_data_email',
        evidencias_analisadas: totalEvidenciasAnalisadas,
        evidencias_atualizadas: totalEvidenciasAtualizadas,
        evidencias_indeterminadas: totalEvidenciasIndeterminadas,
        execucoes_atualizadas: totalExecucoesAtualizadas,
        executado_em: new Date().toISOString(),
      })
      app.save(auditRec)
    } catch (errAudit) {
      console.log('[0053_backfill_data_email] Aviso ao registrar audit_log:', errAudit)
    }

    console.log(
      `[0053_backfill_data_email] Concluído: ${totalEvidenciasAtualizadas} evidências e ${totalExecucoesAtualizadas} execuções atualizadas.`,
    )
  },
  (app) => {
    // Reversão no-op segura: campos data_email foram criados na 0052.
    // Preservar integridade dos registros.
  },
)
