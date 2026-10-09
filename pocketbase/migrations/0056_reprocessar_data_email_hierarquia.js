migrate(
  (app) => {
    // Migração 0056: Reprocessar data_email das evidências e execuções de backup
    // utilizando a hierarquia estrita de extração e excluindo "Created by ... at ...".
    // 1. Data por extenso em português no corpo ("sexta-feira, 9 de outubro de 2026 08:35:08")
    // 2. Header Date: do EML completo
    // 3. Campo estruturado body.data_email
    // 4. "Gerado em" / "Generated at" (nunca "Created by ... at ...")
    // 5. Start time / End time da tabela Details (dd/mm/aaaa hh:mm)
    // 6. Assunto (último recurso)
    // Se não determinável: null (nunca inventar data)

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

    function buildUtcDateFromPtBr(dia, mes0, ano, hora, min, sec) {
      if (
        dia >= 1 &&
        dia <= 31 &&
        mes0 >= 0 &&
        mes0 <= 11 &&
        ano >= 2000 &&
        ano <= 2100 &&
        hora >= 0 &&
        hora <= 23 &&
        min >= 0 &&
        min <= 59 &&
        sec >= 0 &&
        sec <= 59
      ) {
        const utcDate = new Date(Date.UTC(ano, mes0, dia, hora + 3, min, sec))
        if (!isNaN(utcDate.getTime())) {
          return utcDate.toISOString()
        }
      }
      return null
    }

    function parseExtensoPtBrParaIso(texto) {
      if (!texto) return null
      const meses = {
        janeiro: 0,
        jan: 0,
        fevereiro: 1,
        fev: 1,
        marco: 2,
        março: 2,
        mar: 2,
        abril: 3,
        abr: 3,
        maio: 4,
        mai: 4,
        junho: 5,
        jun: 5,
        julho: 6,
        jul: 6,
        agosto: 7,
        ago: 7,
        setembro: 8,
        set: 8,
        outubro: 9,
        out: 9,
        novembro: 10,
        nov: 10,
        dezembro: 11,
        dez: 11,
      }

      const regexComSemana =
        /(?:(?:segunda|terça|terca|quarta|quinta|sexta)(?:-feira)?|sábado|sabado|domingo)?(?:[,\s]+)?(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})(?:[,\s]+(?:às|as)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i
      const m = String(texto).match(regexComSemana)
      if (m) {
        const dia = parseInt(m[1], 10)
        const mesNome = m[2].toLowerCase()
        const ano = parseInt(m[3], 10)
        const mes0 = meses[mesNome]
        if (mes0 !== undefined) {
          const hora = m[4] ? parseInt(m[4], 10) : 12
          const min = m[5] ? parseInt(m[5], 10) : 0
          const sec = m[6] ? parseInt(m[6], 10) : 0
          const iso = buildUtcDateFromPtBr(dia, mes0, ano, hora, min, sec)
          if (iso) return iso
        }
      }
      return null
    }

    function sanitizarConteudoIgnorandoJobCreation(conteudo) {
      if (!conteudo) return ''
      return String(conteudo)
        .replace(/Created\s+by\s+[^\r\n<>]+?\s+at\s+[\d\/\-\.\s\:\,]+/gi, ' ')
        .replace(/Created\s+by[^\r\n<>]+/gi, ' ')
    }

    function extrairDataEmailDefensivaHierarquia(conteudoTexto, assuntoTexto) {
      const conteudoBruto = String(conteudoTexto || '')
      const conteudoSanitizado = sanitizarConteudoIgnorandoJobCreation(conteudoBruto)

      // (1) Data por extenso em português no corpo (MAIOR PRIORIDADE)
      if (conteudoSanitizado) {
        const extensoCorpoIso = parseExtensoPtBrParaIso(conteudoSanitizado)
        if (extensoCorpoIso) return extensoCorpoIso
      }

      // (2) Header Date: do bloco de cabeçalhos EML
      if (conteudoBruto) {
        const splitHeaders = conteudoBruto.split(/\r?\n\r?\n/)
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

      // (3) Campo "Gerado em" / "Generated at" (NUNCA "Created by ... at ...")
      if (conteudoSanitizado) {
        const geradoIsoMatch = conteudoSanitizado.match(
          /(?:gerado\s+em|generated\s+at|report\s+generated(?:\s+at|\s+on)?|data(?:\s+de\s+execução|\s+do\s+relatório)?)\s*[:=\s]+["']?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)/i,
        )
        if (geradoIsoMatch && geradoIsoMatch[1]) {
          const iso = parseDateToIso(geradoIsoMatch[1].trim())
          if (iso) return iso
        }

        const geradoBrMatch = conteudoSanitizado.match(
          /(?:gerado\s+em|generated\s+at|report\s+generated(?:\s+at|\s+on)?|data(?:\s+de\s+execução|\s+do\s+relatório)?)\s*[:=\s]+["']?(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\s*(?:às|as)?\s*(\d{2}):(\d{2})(?::(\d{2}))?/i,
        )
        if (geradoBrMatch) {
          const dia = parseInt(geradoBrMatch[1], 10)
          const mes0 = parseInt(geradoBrMatch[2], 10) - 1
          const ano = parseInt(geradoBrMatch[3], 10)
          const hora = parseInt(geradoBrMatch[4], 10)
          const min = parseInt(geradoBrMatch[5], 10)
          const sec = geradoBrMatch[6] ? parseInt(geradoBrMatch[6], 10) : 0
          const iso = buildUtcDateFromPtBr(dia, mes0, ano, hora, min, sec)
          if (iso) return iso
        }

        const geradoExtensoMatch = conteudoSanitizado.match(
          /(?:gerado\s+em|generated\s+at|report\s+generated(?:\s+at|\s+on)?)\s*[:=\s]+([^\r\n<]{6,60})/i,
        )
        if (geradoExtensoMatch && geradoExtensoMatch[1]) {
          const iso = parseExtensoPtBrParaIso(geradoExtensoMatch[1])
          if (iso) return iso
        }
      }

      // (4) Start time / End time ou dd/mm/aaaa hh:mm
      if (conteudoSanitizado) {
        const startDateTimeMatch = conteudoSanitizado.match(
          /(?:start\s*time|início|inicio)\s*[:=\s]+["']?(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\s*(?:às|as)?\s*(\d{2}):(\d{2})(?::(\d{2}))?/i,
        )
        if (startDateTimeMatch) {
          const dia = parseInt(startDateTimeMatch[1], 10)
          const mes0 = parseInt(startDateTimeMatch[2], 10) - 1
          const ano = parseInt(startDateTimeMatch[3], 10)
          const hora = parseInt(startDateTimeMatch[4], 10)
          const min = parseInt(startDateTimeMatch[5], 10)
          const sec = startDateTimeMatch[6] ? parseInt(startDateTimeMatch[6], 10) : 0
          const iso = buildUtcDateFromPtBr(dia, mes0, ano, hora, min, sec)
          if (iso) return iso
        }

        const brMatch = conteudoSanitizado.match(
          /\b(\d{2})\/(\d{2})\/(\d{4})\s+(?:às\s+|as\s+)?(\d{2}):(\d{2})(?::(\d{2}))?\b/,
        )
        if (brMatch) {
          const dia = parseInt(brMatch[1], 10)
          const mes0 = parseInt(brMatch[2], 10) - 1
          const ano = parseInt(brMatch[3], 10)
          const hora = parseInt(brMatch[4], 10)
          const min = parseInt(brMatch[5], 10)
          const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0
          const iso = buildUtcDateFromPtBr(dia, mes0, ano, hora, min, sec)
          if (iso) return iso
        }
      }

      // (5) Assunto (último recurso)
      if (assuntoTexto) {
        const sAssunto = String(assuntoTexto)
        const extensoAssunto = parseExtensoPtBrParaIso(sAssunto)
        if (extensoAssunto) return extensoAssunto

        const dataAssuntoBr = sAssunto.match(
          /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})(?:\s+(?:às\s+|as\s+)?(\d{2}):(\d{2}))?\b/,
        )
        if (dataAssuntoBr) {
          const dia = parseInt(dataAssuntoBr[1], 10)
          const mes0 = parseInt(dataAssuntoBr[2], 10) - 1
          const ano = parseInt(dataAssuntoBr[3], 10)
          const hora = dataAssuntoBr[4] ? parseInt(dataAssuntoBr[4], 10) : 12
          const min = dataAssuntoBr[5] ? parseInt(dataAssuntoBr[5], 10) : 0
          const iso = buildUtcDateFromPtBr(dia, mes0, ano, hora, min, 0)
          if (iso) return iso
        }
      }

      return null
    }

    let totalEvidenciasAnalisadas = 0
    let totalEvidenciasAtualizadas = 0
    let totalExecucoesAtualizadas = 0
    let orgIdDefault = ''
    const evidenciasModificadas = []

    // 1. Reavaliar e reprocessar todas as backup_evidencias existentes
    try {
      const evidencias = app.findRecordsByFilter('backup_evidencias', '', '+created', 1000, 0)
      totalEvidenciasAnalisadas = evidencias.length

      for (let i = 0; i < evidencias.length; i++) {
        const ev = evidencias[i]
        if (!orgIdDefault) {
          orgIdDefault = ev.getString('organization') || ''
        }
        const dataAnterior = ev.getString('data_email')
        const conteudo = ev.getString('conteudo') || ''
        const assunto = ev.getString('assunto') || ''

        const novaDataIso = extrairDataEmailDefensivaHierarquia(conteudo, assunto)

        // Se a nova extração calculou um valor diferente do gravado anteriormente,
        // ou se estava vazio e agora foi determinável
        if (novaDataIso && novaDataIso !== dataAnterior) {
          ev.set('data_email', novaDataIso)
          app.save(ev)
          totalEvidenciasAtualizadas++
          evidenciasModificadas.push({
            id: ev.id,
            assunto: assunto,
            anterior: dataAnterior,
            novo: novaDataIso,
          })
        }
      }
    } catch (errEv) {
      console.log('[0056_reprocessar_data_email] Erro ao iterar evidencias:', errEv)
    }

    // 2. Propagar nova data_email para backup_execucoes vinculadas via 'evidencia'
    try {
      const execucoes = app.findRecordsByFilter('backup_execucoes', '', '+created', 1000, 0)
      for (let j = 0; j < execucoes.length; j++) {
        const ex = execucoes[j]
        if (!orgIdDefault) {
          orgIdDefault = ex.getString('organization') || ''
        }
        const dataExistenteEx = ex.getString('data_email')
        const evId = ex.getString('evidencia')

        let dataAlvoIso = null
        if (evId) {
          try {
            const ev = app.findRecordById('backup_evidencias', evId)
            dataAlvoIso = ev.getString('data_email') || null
          } catch (_) {}
        }

        if (!dataAlvoIso) {
          const obs = ex.getString('observacao') || ''
          dataAlvoIso = extrairDataEmailDefensivaHierarquia(obs, '')
        }

        if (dataAlvoIso && dataAlvoIso !== dataExistenteEx) {
          ex.set('data_email', dataAlvoIso)
          app.save(ex)
          totalExecucoesAtualizadas++
        }
      }
    } catch (errEx) {
      console.log('[0056_reprocessar_data_email] Erro ao iterar execucoes:', errEx)
    }

    // 3. Registrar na auditoria append-only (audit_log)
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
      auditRec.set('action', 'BACKUP_DATA_EMAIL_REPROCESS_0056')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Reprocessamento estrito de data_email concluído com sucesso (hierarquia com prioridade para data por extenso no corpo e exclusão estrita de criação de job Veeam). Evidências analisadas: ${totalEvidenciasAnalisadas}, atualizadas: ${totalEvidenciasAtualizadas}. Execuções sincronizadas: ${totalExecucoesAtualizadas}.`,
      )
      auditRec.set('metadata', {
        migracao: '0056_reprocessar_data_email_hierarquia',
        evidencias_analisadas: totalEvidenciasAnalisadas,
        evidencias_atualizadas: totalEvidenciasAtualizadas,
        execucoes_atualizadas: totalExecucoesAtualizadas,
        amostra_modificada: evidenciasModificadas.slice(0, 10),
        executado_em: new Date().toISOString(),
      })
      app.save(auditRec)
    } catch (errAudit) {
      console.log('[0056_reprocessar_data_email] Erro ao registrar audit_log:', errAudit)
    }

    console.log(
      `[0056_reprocessar_data_email] Concluído: ${totalEvidenciasAtualizadas} evidências e ${totalExecucoesAtualizadas} execuções atualizadas.`,
    )
  },
  (app) => {
    // Reversão no-op segura.
  },
)
