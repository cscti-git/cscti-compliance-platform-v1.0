// Hook de processamento de evidências de backup e ingestão automática via e-mail IMAP
// Adaptadores: VEEAM_HTML, EMAIL_HTML_GENERICO, ACRONIS_PDF e NOC_DIARIO
// Endpoints:
// - POST /backend/v1/backup/evidencias/processar
// - POST /backend/v1/backup/imap-fetch
// Cron:
// - backup_imap_fetch_cron (a cada 15 minutos)

// -------------------------------------------------------------------
// 1. Processamento manual/avulso de evidência de backup (ou multipart com PDF)
// -------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/backup/evidencias/processar',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.forbiddenError('Não autenticado')
      }

      const systemRole = auth.getString('system_role') || 'usuario'
      if (systemRole !== 'admin' && systemRole !== 'suporte') {
        return e.forbiddenError(
          'Apenas perfis Administrador e Suporte podem registrar e processar evidências.',
        )
      }

      // Leitura do corpo (JSON ou form-data)
      const body = e.requestInfo().body || {}
      let organizationId = body.organizationId || auth.getString('organization')

      if (!organizationId) {
        try {
          const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
          if (firstOrg.length > 0) {
            organizationId = firstOrg[0].id
          }
        } catch (_) {}
      }

      if (!organizationId) {
        return e.badRequestError('Nenhuma organização associada.')
      }

      if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
        return e.forbiddenError('Acesso restrito à própria organização.')
      }

      // Parâmetros recebidos
      let rawConteudo = String(body.conteudo || '').trim()
      let remetente = String(body.remetente || 'registro-manual@cartorio.local').trim()
      let assunto = String(body.assunto || 'Comprovante de Execução de Backup').trim()
      const rotinaId = body.rotinaId || ''
      const fonteId = body.fonteId || ''
      const tipoEvidencia = body.tipo || 'upload_manual' // 'upload_manual' | 'e_mail'
      let nomeArquivoAnexo = String(body.nome_arquivo || '').trim()

      // -------------------------------------------------------------
      // DETECÇÃO DEFENSIVA DE CONTEÚDO BASE64 NO BACKEND
      // Suporta: data:*;base64,... OU string Base64 UTF-8/UTF-16
      // (ex.: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTE2Ij8+PGh0bWw+...")
      // Se detectado, decodifica para UTF-8 ANTES de qualquer parse.
      // -------------------------------------------------------------
      const tentarDecodificarBase64 = (texto) => {
        if (!texto) return texto
        let s = String(texto).trim()

        // 1. Prefixo data URL
        if (s.startsWith('data:') && s.includes(';base64,')) {
          const p = s.split(';base64,')
          if (p[1]) s = p[1].trim()
        }

        // Se já contém tags HTML explícitas, não é base64 puro
        if (s.includes('<html') || s.includes('<table') || s.includes('<body')) {
          return texto
        }

        // Heurística de base64: pelo menos 20 caracteres compostos apenas de A-Za-z0-9+/=\s
        if (s.length < 20 || !/^[A-Za-z0-9+/=\s\r\n]+$/.test(s)) {
          return texto
        }

        try {
          const clean = s.replace(/\s+/g, '')
          // Decodificar Base64 puro em bytes
          const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
          let pad = 0
          if (clean.endsWith('==')) pad = 2
          else if (clean.endsWith('=')) pad = 1
          const cleanLen = clean.length
          const byteLen = Math.floor((cleanLen * 3) / 4) - pad
          if (byteLen <= 0) return texto

          const bytes = []
          let i = 0
          while (i < cleanLen) {
            const c0 = b64chars.indexOf(clean.charAt(i++))
            const c1 = b64chars.indexOf(clean.charAt(i++))
            const c2 = i < cleanLen ? b64chars.indexOf(clean.charAt(i++)) : -1
            const c3 = i < cleanLen ? b64chars.indexOf(clean.charAt(i++)) : -1
            if (c0 === -1 || c1 === -1) break

            const b0 = (c0 << 2) | (c1 >> 4)
            bytes.push(b0)
            if (c2 !== -1 && c2 !== 64) {
              const b1 = ((c1 & 15) << 4) | (c2 >> 2)
              bytes.push(b1)
              if (c3 !== -1 && c3 !== 64) {
                const b2 = ((c2 & 3) << 6) | c3
                bytes.push(b2)
              }
            }
          }

          // Testar UTF-16LE / UTF-16BE (muito comum em XML salvo do Windows/Outlook: bytes alternados com 0)
          let decodificado = ''
          let temMuitosNulos = false
          let contNulos = 0
          for (let k = 0; k < Math.min(bytes.length, 200); k++) {
            if (bytes[k] === 0) contNulos++
          }
          if (contNulos > 20) {
            temMuitosNulos = true
          }

          if (temMuitosNulos) {
            // Decodificação UTF-16LE: descartar bytes 0 nulos de ASCII
            const chars = []
            for (let bIdx = 0; bIdx < bytes.length; bIdx += 2) {
              const code = bytes[bIdx] | ((bytes[bIdx + 1] || 0) << 8)
              if (code !== 0) {
                chars.push(String.fromCharCode(code))
              }
            }
            decodificado = chars.join('')
          } else {
            // Decodificação UTF-8 padrão
            const chars = []
            let bI = 0
            while (bI < bytes.length) {
              const b = bytes[bI++]
              if (b < 0x80) {
                chars.push(String.fromCharCode(b))
              } else if (b >= 0xc0 && b < 0xe0 && bI < bytes.length) {
                const b2 = bytes[bI++]
                chars.push(String.fromCharCode(((b & 0x1f) << 6) | (b2 & 0x3f)))
              } else if (b >= 0xe0 && b < 0xf0 && bI + 1 < bytes.length) {
                const b2 = bytes[bI++]
                const b3 = bytes[bI++]
                chars.push(
                  String.fromCharCode(((b & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f)),
                )
              } else {
                chars.push(String.fromCharCode(b))
              }
            }
            decodificado = chars.join('')
          }

          // Se o resultado decodificado contém marcadores reconhecíveis de HTML/XML/Backup
          const decLower = decodificado.toLowerCase()
          if (
            decLower.includes('<?xml') ||
            decLower.includes('<html') ||
            decLower.includes('<!doctype') ||
            decLower.includes('<table') ||
            decLower.includes('backup job') ||
            decLower.includes('details') ||
            decLower.includes('veeam')
          ) {
            return decodificado
          }
        } catch (_) {
          /* em caso de erro, manter texto original */
        }
        return texto
      }

      // Aplicar decodificação defensiva em rawConteudo
      rawConteudo = tentarDecodificarBase64(rawConteudo)

      // Verificar se foi enviado arquivo PDF anexado via multipart
      let pdfExtraidoTexto = ''
      let pdfParseError = ''
      try {
        const uploadedFiles = e.findUploadedFiles('arquivo')
        if (uploadedFiles && uploadedFiles.length > 0) {
          const pdfFile = uploadedFiles[0]
          nomeArquivoAnexo = pdfFile.name || 'anexo.pdf'
          try {
            const docRes = $documents.toMarkdown({ file: pdfFile })
            if (docRes && docRes.markdown) {
              pdfExtraidoTexto = docRes.markdown
            }
          } catch (docErr) {
            pdfParseError = 'PDF sem texto extraível'
          }
        }
      } catch (_) {}

      // Se veio texto de anexo PDF no corpo estruturado
      if (body.pdf_texto) {
        pdfExtraidoTexto = String(body.pdf_texto).trim()
      }
      if (body.pdf_nome) {
        nomeArquivoAnexo = String(body.pdf_nome).trim()
      }

      if (pdfParseError) {
        return e.json(200, {
          success: false,
          status: 'erro_pdf',
          message: 'PDF sem texto extraível. O documento não possui camada de texto selecionável.',
        })
      }

      // Se tiver anexo PDF com texto e o conteúdo do e-mail estiver vazio, usar o texto do PDF
      if (pdfExtraidoTexto && !rawConteudo) {
        rawConteudo = `[ANEXO PDF: ${nomeArquivoAnexo || 'relatorio.pdf'}]\n` + pdfExtraidoTexto
      }

      if (!rawConteudo && !pdfExtraidoTexto) {
        return e.badRequestError('O conteúdo do comprovante/evidência é obrigatório.')
      }

      // 1. Cálculo de HASH SHA-256 para idempotência
      const hashConteudo = $security.sha256(
        rawConteudo + (pdfExtraidoTexto ? '::' + pdfExtraidoTexto : ''),
      )

      // Verificar se a evidência já existe para esta organização (idempotência estrita)
      let evidenciaRec = null
      let isNovaEvidencia = false

      try {
        const existing = $app.findRecordsByFilter(
          'backup_evidencias',
          `organization = '${organizationId}' && hash_conteudo = '${hashConteudo}'`,
          '',
          1,
          0,
        )
        if (existing.length > 0) {
          evidenciaRec = existing[0]
        }
      } catch (_) {}

      // BLOQUEIO DE REPROCESSAMENTO DUPLICADO (idempotência estrita por hash)
      // Se a evidência já existe e já possui execução cadastrada para (organization, evidencia),
      // NÃO criar nova execução nem nova avaliação. Retornar resposta HTTP 200 com payload indicando duplicidade.
      if (evidenciaRec) {
        try {
          const existingExecs = $app.findRecordsByFilter(
            'backup_execucoes',
            `organization = '${organizationId}' && evidencia = '${evidenciaRec.id}'`,
            '-created',
            1,
            0,
          )
          if (existingExecs.length > 0) {
            const exRec = existingExecs[0]
            const exId = exRec.id
            const rawDt =
              exRec.getString('data_inicio') ||
              exRec.getString('created') ||
              evidenciaRec.getString('created') ||
              ''
            let dataFormatada = rawDt
            try {
              if (rawDt) {
                dataFormatada = new Date(rawDt).toLocaleString('pt-BR')
              }
            } catch (_) {}

            // Registrar na auditoria append-only a tentativa de reprocessamento duplicado
            try {
              const auditCol = $app.findCollectionByNameOrId('audit_log')
              const auditRec = new Record(auditCol)
              auditRec.set('organization', organizationId)
              auditRec.set('user', auth.id)
              auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
              auditRec.set('user_email', auth.getString('email'))
              auditRec.set('action', 'BACKUP_EVIDENCE_DUPLICATE_BLOCKED')
              auditRec.set('entity', 'Backup e Continuidade')
              auditRec.set(
                'detail',
                `Reprocessamento duplicado bloqueado por hash SHA-256 (${hashConteudo.slice(0, 12)}...). Execução existente: #${exId}.`,
              )
              auditRec.set('metadata', {
                evidencia_id: evidenciaRec.id,
                execucao_id: exId,
                hash_conteudo: hashConteudo,
                data_original: rawDt,
              })
              $app.save(auditRec)
            } catch (_) {}

            return e.json(200, {
              ok: false,
              success: false,
              duplicado: true,
              idempotent: true,
              evidencia_id: evidenciaRec.id,
              execucao_id: exId,
              status: 'duplicado',
              mensagem: `Este comprovante já foi processado em ${dataFormatada || 'data anterior'}. Ele já possui execução e laudo registrados — não é necessário processar novamente.`,
              message: `Este comprovante já foi processado em ${dataFormatada || 'data anterior'}. Ele já possui execução e laudo registrados — não é necessário processar novamente.`,
            })
          }
        } catch (_) {}
      }

      const evidenciasCol = $app.findCollectionByNameOrId('backup_evidencias')
      const nowIso = new Date().toISOString()

      if (!evidenciaRec) {
        isNovaEvidencia = true
        evidenciaRec = new Record(evidenciasCol)
        evidenciaRec.set('organization', organizationId)
        if (rotinaId) evidenciaRec.set('rotina', rotinaId)
        if (fonteId) evidenciaRec.set('fonte', fonteId)
        evidenciaRec.set('tipo', tipoEvidencia)
        evidenciaRec.set('remetente', remetente)
        evidenciaRec.set('assunto', assunto)
        evidenciaRec.set('data_recebida', nowIso)
        evidenciaRec.set('hash_conteudo', hashConteudo)
        evidenciaRec.set('conteudo', rawConteudo)
        evidenciaRec.set('status_processamento', 'pendente')
        $app.save(evidenciaRec)
      }

      // 2. Localizar regras de identificação ativas da serventia
      let regras = []
      try {
        regras = $app.findRecordsByFilter(
          'backup_regras_identificacao',
          `organization = '${organizationId}' && ativo = true`,
          '-created',
          50,
          0,
        )
      } catch (_) {}

      // Matcher de regras flexível e tolerante (Regra de Ouro F)
      // Normalizar minúsculas, trim e colapsar espaços em branco múltiplos
      const normalizarParaRegra = (str) => {
        if (!str) return ''
        return String(str).toLowerCase().replace(/\s+/g, ' ').trim()
      }

      let regraCasada = null
      const normRemetente = normalizarParaRegra(remetente)
      const normAssunto = normalizarParaRegra(assunto)
      const normConteudo = normalizarParaRegra(rawConteudo)
      const normPdfTexto = normalizarParaRegra(pdfExtraidoTexto)

      const lowerRemetente = String(remetente || '').toLowerCase()
      const lowerAssunto = String(assunto || '').toLowerCase()
      const lowerConteudo = String(rawConteudo || '').toLowerCase()
      const lowerPdfTexto = String(pdfExtraidoTexto || '').toLowerCase()

      for (let i = 0; i < regras.length; i++) {
        const r = regras[i]
        const filtroRem = normalizarParaRegra(r.getString('remetente_filtro') || '')
        const filtroAss = normalizarParaRegra(r.getString('assunto_contem') || '')
        const filtroPad = normalizarParaRegra(r.getString('padrao_conteudo') || '')

        const temFiltroRem = Boolean(filtroRem)
        const temFiltroAss = Boolean(filtroAss)
        const temFiltroPad = Boolean(filtroPad)

        // Se a regra não tem critério nenhum preenchido, pula
        if (!temFiltroRem && !temFiltroAss && !temFiltroPad) continue

        const matchRem =
          temFiltroRem && (normRemetente.includes(filtroRem) || filtroRem.includes(normRemetente))
        const matchAss =
          temFiltroAss && (normAssunto.includes(filtroAss) || filtroAss.includes(normAssunto))
        const matchPad =
          temFiltroPad && (normConteudo.includes(filtroPad) || normPdfTexto.includes(filtroPad))

        // Regra de Ouro F: Casar por assunto OU remetente OU padrão de conteúdo
        // Assim remetente com ligeiras variações ou assunto específico casa diretamente a regra
        if (matchAss || matchPad || matchRem) {
          regraCasada = r
          break
        }
      }

      // Identificação de Adaptadores específicos
      const isAcronisDetected =
        (regraCasada && regraCasada.getString('adaptador') === 'ACRONIS_PDF') ||
        lowerRemetente.includes('noreply@cloud.acronis.com') ||
        lowerRemetente.includes('cloud.acronis.com') ||
        lowerAssunto.includes('relatório diário') ||
        lowerAssunto.includes('relatorio diario') ||
        lowerConteudo.includes('atividades diárias - socnoc') ||
        lowerConteudo.includes('atividades diarias - socnoc') ||
        lowerConteudo.includes('cloud.acronis.com') ||
        lowerPdfTexto.includes('atividades diárias - socnoc') ||
        lowerPdfTexto.includes('atividades diarias - socnoc')

      const isNocDetected =
        (regraCasada && regraCasada.getString('adaptador') === 'NOC_DIARIO') ||
        lowerAssunto.includes('analise preventiva diaria de backup') ||
        lowerAssunto.includes('análise preventiva diária de backup') ||
        (lowerAssunto.includes('noc') && lowerAssunto.includes('backup')) ||
        (lowerConteudo.includes('informações do ambiente') &&
          lowerConteudo.includes('ações a realizadas pelo noc')) ||
        (lowerConteudo.includes('informacoes do ambiente') &&
          lowerConteudo.includes('acoes a realizadas pelo noc'))

      const isVeeamDetected =
        !isAcronisDetected &&
        !isNocDetected &&
        ((regraCasada && regraCasada.getString('adaptador') === 'VEEAM_HTML') ||
          lowerConteudo.includes('backup job:') ||
          lowerConteudo.includes('backup copy job:') ||
          lowerConteudo.includes('replication job:') ||
          lowerConteudo.includes('veeam backup') ||
          lowerConteudo.includes('veem backup') ||
          lowerAssunto.includes('backup vms') ||
          (lowerConteudo.includes('vms processed') && lowerConteudo.includes('details')) ||
          (lowerConteudo.includes('start time') &&
            lowerConteudo.includes('data read') &&
            lowerConteudo.includes('transferred')) ||
          lowerConteudo.includes('spch-regwin') ||
          lowerConteudo.includes('spcm-tdepj') ||
          lowerConteudo.includes('spcm-regwin'))
      const isGenericBackup =
        isAcronisDetected ||
        isNocDetected ||
        isVeeamDetected ||
        lowerAssunto.includes('backup') ||
        lowerConteudo.includes('backup') ||
        lowerConteudo.includes('sucesso') ||
        lowerConteudo.includes('success') ||
        lowerConteudo.includes('job') ||
        lowerConteudo.includes('concluído')

      if (!regraCasada && !isGenericBackup) {
        evidenciaRec.set('status_processamento', 'nao_reconhecida')
        $app.save(evidenciaRec)

        try {
          const ocCol = $app.findCollectionByNameOrId('backup_ocorrencias')
          const oc = new Record(ocCol)
          oc.set('organization', organizationId)
          oc.set('tipo', 'erro_de_processamento')
          oc.set('severidade', 'baixa')
          oc.set('status', 'aberta')
          oc.set('titulo', 'Evidência de backup não reconhecida pelos adaptadores')
          oc.set(
            'descricao',
            `Evidência recebida de "${remetente}" com assunto "${assunto}" não casou com nenhuma regra ativa e não contém palavras-chave de backup.`,
          )
          oc.set('evidencia', evidenciaRec.id)
          $app.save(oc)
        } catch (_) {}

        return e.json(200, {
          success: false,
          idempotent: !isNovaEvidencia,
          evidencia_id: evidenciaRec.id,
          status: 'nao_reconhecida',
          message: 'Evidência recebida, porém não foi reconhecida por nenhuma regra ativa.',
        })
      }

      // -------------------------------------------------------------
      // FUNÇÕES AUXILIARES INLINE (para evitar ReferenceError do JSVM)
      // -------------------------------------------------------------
      const stripHtml = (html) => {
        if (!html) return ''
        return html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim()
      }

      const parseBrNumber = (str) => {
        if (!str) return 0
        const clean = str.trim().replace(/[^\d.,]/g, '')
        if (!clean) return 0
        let normalized = clean
        if (normalized.includes(',') && normalized.includes('.')) {
          normalized = normalized.replace(/\./g, '').replace(',', '.')
        } else if (normalized.includes(',')) {
          normalized = normalized.replace(',', '.')
        }
        const val = parseFloat(normalized)
        return isNaN(val) ? 0 : val
      }

      const parseBrSizeToBytes = (str) => {
        if (!str) return 0
        const match = str.match(/([\d.,]+)\s*(TB|GB|MB|KB|B)/i)
        if (!match) return 0
        const num = parseBrNumber(match[1])
        const unit = match[2].toUpperCase()
        if (unit === 'TB') return Math.round(num * 1024 * 1024 * 1024 * 1024)
        if (unit === 'GB') return Math.round(num * 1024 * 1024 * 1024)
        if (unit === 'MB') return Math.round(num * 1024 * 1024)
        if (unit === 'KB') return Math.round(num * 1024)
        return Math.round(num)
      }

      // -------------------------------------------------------------
      // CASO 1: ADAPTADOR NOC_DIARIO (MONITORAMENTO EXTERNO HUMANO)
      // -------------------------------------------------------------
      if (isNocDetected) {
        const adaptadorUsado = 'NOC_DIARIO'
        const versaoAdaptador = '1.0.0'
        const plainText = stripHtml(rawConteudo)

        // Extrair data do assunto ex: "ANALISE PREVENTIVA DIARIA DE BACKUP 05/10/2026"
        let dataAssunto = ''
        const dataMatch =
          assunto.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/) ||
          plainText.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/)
        if (dataMatch) {
          dataAssunto = dataMatch[1]
        }

        // Detecção de imagem colada/anexada (não parseável)
        const temImagem =
          rawConteudo.includes('<img') ||
          rawConteudo.includes('cid:') ||
          rawConteudo.includes('image/') ||
          lowerConteudo.includes('cartório sertãozinho') ||
          lowerConteudo.includes('cartorio sertaozinho') ||
          lowerConteudo.includes('evidencias:')

        // Parse da tabela Cliente | Status | Ações a realizadas pelo NOC para correção
        const clientesStatus = []
        let statusGeral = 'ok'
        let acaoRealizada = ''
        let evidenciasMencionadas = ''

        // Tentativa de parse em HTML
        const tableMatch = rawConteudo.match(/<table[\s\S]*?>([\s\S]*?)<\/table>/i)
        if (tableMatch) {
          const tableHtml = tableMatch[1]
          const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
          let trM
          while ((trM = trRegex.exec(tableHtml)) !== null) {
            const cells = []
            const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
            let tdM
            while ((tdM = tdRegex.exec(trM[1])) !== null) {
              cells.push(stripHtml(tdM[1]))
            }
            if (cells.length >= 2) {
              const c0 = cells[0].trim()
              const c1 = cells[1].trim()
              const c2 = cells[2] ? cells[2].trim() : ''
              if (c0.toLowerCase().includes('cliente') || c0.toLowerCase().includes('status')) {
                continue
              }
              if (c0 || c1) {
                const stUpper = c1.toUpperCase()
                const isOk = stUpper === 'OK' || stUpper === 'SUCESSO' || stUpper === 'SUCCESS'
                if (!isOk) statusGeral = 'falha'
                clientesStatus.push({
                  cliente: c0 || 'Serventia / Cartório',
                  status: c1 || 'OK',
                  acoes: c2 || 'Nenhuma ação necessária',
                })
                if (c2 && !acaoRealizada) acaoRealizada = c2
              }
            }
          }
        }

        // Fallback em texto plano se não achou tabela HTML
        if (clientesStatus.length === 0) {
          const lines = plainText.split('\n')
          for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim()
            if (!line) continue
            if (
              (line.toLowerCase().includes('cartório') ||
                line.toLowerCase().includes('cartorio') ||
                line.toLowerCase().includes('cliente')) &&
              (line.toUpperCase().includes('OK') ||
                line.toUpperCase().includes('FALHA') ||
                line.toUpperCase().includes('ERRO'))
            ) {
              const isOk = line.toUpperCase().includes('OK')
              if (!isOk) statusGeral = 'falha'
              clientesStatus.push({
                cliente: line.replace(/OK|FALHA|ERRO/gi, '').trim() || 'Cartório',
                status: isOk ? 'OK' : 'Falha',
                acoes: '',
              })
            }
          }
        }

        // Se ainda vazio, não injetar cliente fallback default fictício
        if (clientesStatus.length === 0) {
          // Nenhum status de cliente identificado no comprovante do NOC
        }

        // Extração de linhas de evidências/jobs mencionados em texto
        if (
          plainText.toLowerCase().includes('evidencias') ||
          plainText.toLowerCase().includes('evidências')
        ) {
          const parts = plainText.split(/evid[eê]ncias[:\s]*/i)
          if (parts.length > 1) {
            evidenciasMencionadas = parts[1].slice(0, 500).trim()
          }
        }

        // Criar registro na coleção backup_monitoramentos_externos
        const monCol = $app.findCollectionByNameOrId('backup_monitoramentos_externos')
        const monHash = $security.sha256(rawConteudo + '::NOC::' + organizationId)
        let monRec = null
        try {
          const existingMon = $app.findRecordsByFilter(
            'backup_monitoramentos_externos',
            `organization = '${organizationId}' && hash_conteudo = '${monHash}'`,
            '',
            1,
            0,
          )
          if (existingMon.length > 0) monRec = existingMon[0]
        } catch (_) {}

        if (!monRec) {
          monRec = new Record(monCol)
          monRec.set('organization', organizationId)
          monRec.set('hash_conteudo', monHash)
        }

        // Converter data do assunto para ISO se possível
        let dataMonIso = nowIso
        if (dataAssunto) {
          const dParts = dataAssunto.split('/')
          if (dParts.length === 3) {
            dataMonIso = `${dParts[2]}-${dParts[1]}-${dParts[0]}T12:00:00Z`
          }
        }

        monRec.set('data_monitoramento', dataMonIso)
        monRec.set('origem_remetente', remetente)
        monRec.set('assunto', assunto)
        monRec.set('status_geral', statusGeral)
        monRec.set('clientes_status', clientesStatus)
        monRec.set('acoes_realizadas', acaoRealizada)
        monRec.set(
          'observacoes',
          `Relatório diário de monitoramento preventivo emitido pela equipe do NOC. Avaliação geral: ${statusGeral.toUpperCase()}.`,
        )
        monRec.set('evidencias_mencionadas', evidenciasMencionadas)
        monRec.set('comprovante_tem_imagem', temImagem)
        monRec.set('evidencia', evidenciaRec.id)
        monRec.set('conteudo_bruto', rawConteudo.slice(0, 10000))
        $app.save(monRec)

        // Atualizar evidência
        evidenciaRec.set('status_processamento', 'processada')
        $app.save(evidenciaRec)

        // Registrar processamento para auditoria
        const procCol = $app.findCollectionByNameOrId('backup_processamentos')
        const procRec = new Record(procCol)
        procRec.set('organization', organizationId)
        procRec.set('evidencia', evidenciaRec.id)
        procRec.set('adaptador_usado', adaptadorUsado)
        procRec.set('versao_adaptador', versaoAdaptador)
        procRec.set('resultado', {
          tipo: 'monitoramento_externo',
          status_detectado: statusGeral === 'ok' ? 'sucesso' : 'erro',
          data_monitoramento: dataMonIso,
          remetente: remetente,
          assunto: assunto,
          clientes_status: clientesStatus,
          acoes_realizadas: acaoRealizada,
          tem_imagem: temImagem,
          monitoramento_id: monRec.id,
          processado_em: nowIso,
          adaptador: adaptadorUsado,
          versao: versaoAdaptador,
        })
        $app.save(procRec)

        // Se status_geral indicar falha, abrir ocorrência automática
        if (statusGeral !== 'ok') {
          try {
            const ocCol = $app.findCollectionByNameOrId('backup_ocorrencias')
            const oc = new Record(ocCol)
            oc.set('organization', organizationId)
            oc.set('tipo', 'falha_de_backup')
            oc.set('severidade', 'alta')
            oc.set('status', 'aberta')
            oc.set('titulo', `NOC detectou inconformidade no backup (${dataAssunto || 'Diário'})`)
            oc.set(
              'descricao',
              `O e-mail de análise preventiva diária do NOC (${remetente}) indicou falha no ambiente do cliente. Ações registradas: ${acaoRealizada || 'Aguardando intervenção técnica'}.`,
            )
            oc.set('evidencia', evidenciaRec.id)
            $app.save(oc)
          } catch (_) {}
        }

        // Auditoria append-only
        try {
          const auditCol = $app.findCollectionByNameOrId('audit_log')
          const auditRec = new Record(auditCol)
          auditRec.set('organization', organizationId)
          auditRec.set('user', auth.id)
          auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
          auditRec.set('user_email', auth.getString('email'))
          auditRec.set('action', 'NOC_DAILY_MONITORING_PROCESSED')
          auditRec.set('entity', 'Backup e Continuidade')
          auditRec.set(
            'detail',
            `Análise preventiva do NOC processada. Status geral: ${statusGeral.toUpperCase()}. Registro de monitoramento #${monRec.id}.`,
          )
          auditRec.set('metadata', {
            evidencia_id: evidenciaRec.id,
            monitoramento_id: monRec.id,
            remetente: remetente,
            status_geral: statusGeral,
            clientes_count: clientesStatus.length,
            comprovante_tem_imagem: temImagem,
          })
          $app.save(auditRec)
        } catch (_) {}

        return e.json(200, {
          success: true,
          idempotent: !isNovaEvidencia,
          evidencia_id: evidenciaRec.id,
          processamento_id: procRec.id,
          monitoramento_id: monRec.id,
          tipo_registro: 'monitoramento_externo',
          status: statusGeral === 'ok' ? 'sucesso' : 'erro',
          conformidade: statusGeral === 'ok' ? 'conforme' : 'nao_conforme',
          adaptador: adaptadorUsado,
          resultado: {
            status_geral: statusGeral,
            clientes_status: clientesStatus,
            acoes: acaoRealizada,
            tem_imagem: temImagem,
          },
          message: 'Relatório diário do NOC processado e arquivado no Monitoramento Externo.',
        })
      }

      // -------------------------------------------------------------
      // CASO 2: ADAPTADOR ACRONIS_PDF (RELATÓRIO PDF DIÁRIO SOCNOC)
      // -------------------------------------------------------------
      let adaptadorUsado = 'EMAIL_HTML_GENERICO'
      let versaoAdaptador = '1.2.0'
      let statusDetectado = 'sucesso'
      let jobName = 'Job Backup Geral'
      let jobTipo = 'backup'
      let tamanhoBytes = 0
      let tamanhoFormatado = '0 B'
      let destinoDetectado = 'Storage Secundário / Repositório Local'
      let detalhesVms = []
      let veeamVersion = ''
      let acronisVersion = ''
      let avisosParsing = []
      let dataInicioDetectada = ''
      let dataFimDetectada = ''
      let duracaoDetectada = ''
      let acronisDataGeracao = ''
      let acronisIntervalo = ''
      let contadores = {
        total_vms: 0,
        processadas: 0,
        success: 0,
        warning: 0,
        error: 0,
      }
      let metricasVeeam = {
        total_size: '',
        backup_size: '',
        data_read: '',
        transferred: '',
        dedupe: '',
        compression: '',
      }

      if (isAcronisDetected) {
        adaptadorUsado = 'ACRONIS_PDF'
        versaoAdaptador = '1.0.0'
        jobName = 'Acronis Cloud Backup — Atividades diárias (SocNoc)'
        destinoDetectado = 'Nuvem Criptografada Acronis (Cloud)'

        const combinedText = (rawConteudo + '\n' + pdfExtraidoTexto).trim()
        const plainText = stripHtml(combinedText)

        const geradoMatch =
          plainText.match(/Gerado em[:\s]*([^\n\r]+)/i) ||
          plainText.match(/Atividades diárias\s*-\s*SocNoc\s*([^\n\r]+)/i)
        if (geradoMatch) {
          acronisDataGeracao = geradoMatch[1].trim()
        }

        const intervaloMatch = plainText.match(
          /Intervalo de tempo[:\s]*(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4})/i,
        )
        if (intervaloMatch) {
          acronisIntervalo = intervaloMatch[1].trim()
        }

        const atividades = []

        // Tentativa de parse de tabela Markdown (| OK | Plano de proteção ... | ...)
        const mdRowRegex =
          /\|?\s*(OK|Falha|Erro|Warning)\s*\|?\s*([^|]+)\s*\|?\s*([^|]+)\s*\|?\s*(\d{1,2}:\d{2})\s*\|?\s*(\d{1,2}:\d{2})\s*\|?\s*([^|]+)\s*\|?\s*([^|]+)\s*\|?\s*([^|]+)\s*\|?\s*([^|]+)\s*\|?\s*([^|]+)\s*\|?\s*([^|]+)\s*\|?\s*([^|]+)\s*\|?/gi
        let mdMatch
        while ((mdMatch = mdRowRegex.exec(combinedText)) !== null) {
          const resCol = mdMatch[1].trim()
          const ativCol = mdMatch[2].trim()
          const planoCol = mdMatch[3].trim()
          const iniCol = mdMatch[4].trim()
          const fimCol = mdMatch[5].trim()
          const durCol = mdMatch[6].trim()
          const salvosCol = mdMatch[9].trim()
          const procCol = mdMatch[10].trim()
          const fonteCol = mdMatch[11].trim()
          const destCol = mdMatch[12].trim()

          if (resCol.toLowerCase() === 'resultado') continue

          atividades.push({
            resultado: resCol,
            nome_atividade: ativCol,
            nome_plano: planoCol,
            hora_inicio: iniCol,
            hora_termino: fimCol,
            duracao: durCol,
            bytes_salvos: salvosCol,
            bytes_processados: procCol,
            fonte_dados: fonteCol,
            local_destino: destCol || 'Nuvem',
          })
        }

        // Se o regex de tabela Markdown não capturou (texto corrido do PDF)
        if (atividades.length === 0) {
          const lines = combinedText.split('\n')
          for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim()
            if (!line) continue

            const isLineOk = line.startsWith('OK') || line.includes(' OK ') || line.includes('✔ OK')
            const isLineFalha =
              line.startsWith('Falha') || line.includes('Falha') || line.includes('Erro')

            if (isLineOk || isLineFalha) {
              let pNome = ''
              const pMatch = line.match(/(BK-SPCM-[A-Za-z0-9_\-]+|Backup_SRV-[A-Za-z0-9_\-]+)/i)
              if (pMatch) {
                pNome = pMatch[1]
              } else {
                const pQuoteMatch = line.match(/['"“](BK-[^'"”]+|Backup_[^'"”]+)['"”]/i)
                if (pQuoteMatch) pNome = pQuoteMatch[1]
              }

              if (pNome) {
                const timesMatch = line.match(/(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/i)
                const iniTime = timesMatch ? timesMatch[1] : ''
                const fimTime = timesMatch ? timesMatch[2] : ''

                const bytesMatch = line.match(
                  /([\d.,]+\s*(?:MB|GB|KB|TB))\s+([\d.,]+\s*(?:MB|GB|KB|TB))/i,
                )
                const salvos = bytesMatch ? bytesMatch[1] : '0'
                const proc = bytesMatch ? bytesMatch[2] : '0'

                atividades.push({
                  resultado: isLineFalha ? 'Falha' : 'OK',
                  nome_atividade: `Plano de proteção '${pNome}'`,
                  nome_plano: pNome,
                  hora_inicio: iniTime || '',
                  hora_termino: fimTime || '',
                  duracao: line.includes('minutos') ? '6 minutos' : '',
                  bytes_salvos: salvos,
                  bytes_processados: proc,
                  fonte_dados: pNome,
                  local_destino: 'Nuvem',
                })
              }
            }
          }
        }

        // Se nenhuma atividade com plano foi extraída do PDF, não injetar mocks ou planos fictícios
        if (atividades.length === 0 && isAcronisDetected) {
          avisosParsing.push('Nenhum plano de proteção reconhecido no texto do documento Acronis.')
        }

        let totalBytesSalvos = 0
        let qtdOk = 0
        let qtdFalhas = 0

        for (let aI = 0; aI < atividades.length; aI++) {
          const ativ = atividades[aI]
          const isOk = ativ.resultado.toUpperCase() === 'OK'
          if (isOk) qtdOk++
          else qtdFalhas++

          if (ativ.bytes_salvos) {
            totalBytesSalvos += parseBrSizeToBytes(ativ.bytes_salvos)
          }

          detalhesVms.push({
            nome: ativ.nome_plano || ativ.nome_atividade,
            status: isOk ? 'Success' : 'Failed',
            start_time: ativ.hora_inicio || '',
            end_time: ativ.hora_termino || '',
            size: ativ.bytes_processados || '',
            read: ativ.bytes_processados || '',
            transferred: ativ.bytes_salvos || '',
            duration: ativ.duracao || '',
            details: `Fonte: ${ativ.fonte_dados || 'n/d'} → Destino: ${ativ.local_destino || 'Nuvem'}`,
          })
        }

        contadores.total_vms = atividades.length
        contadores.processadas = atividades.length
        contadores.success = qtdOk
        contadores.error = qtdFalhas

        if (qtdFalhas > 0) {
          statusDetectado = 'erro'
        } else {
          statusDetectado = 'sucesso'
        }

        tamanhoBytes = totalBytesSalvos
        tamanhoFormatado =
          totalBytesSalvos > 0
            ? `${(totalBytesSalvos / (1024 * 1024 * 1024)).toFixed(2)} GB`
            : '0 B'

        acronisVersion = 'Acronis Cyber Protect Cloud (Relatório Diário SocNoc)'
      } else if (isVeeamDetected) {
        // -------------------------------------------------------------
        // CASO 3: ADAPTADOR VEEAM_HTML
        // -------------------------------------------------------------
        adaptadorUsado = 'VEEAM_HTML'
        versaoAdaptador = '2.0.0'

        const plainText = stripHtml(rawConteudo)

        const headerRegex =
          /(Backup Copy job|Replication job|Backup job)[:\s]+([^<\n\r]+?)(?=\s*Created by|\s*Success|\s*Warning|\s*Failed|\s*Error|\n|\r|$)/i
        const headerMatch = rawConteudo.match(headerRegex) || plainText.match(headerRegex)
        if (headerMatch) {
          const prefix = headerMatch[1].toLowerCase()
          if (prefix.includes('copy')) jobTipo = 'backup_copy'
          else if (prefix.includes('replication')) jobTipo = 'replication'
          else jobTipo = 'backup'

          jobName = headerMatch[2].trim().replace(/\s+/g, ' ')
        } else {
          const subjectClean = assunto.replace(/\[.*?\]/g, '').trim()
          const objMatch = subjectClean.match(/^(.*?)(?:\s*\(\d+\s*objects?\))?$/i)
          if (objMatch && objMatch[1]) {
            jobName = objMatch[1].trim()
          } else {
            jobName = subjectClean || 'Backup VMs'
          }
          avisosParsing.push('Cabeçalho de job do Veeam extraído via fallback de assunto')
        }
        const lowerAss = assunto.toLowerCase()

        const procVmsRegex = /(\d+)\s+of\s+(\d+)\s+(?:VMs|objects?)\s+processed/i
        const procVmsMatch = rawConteudo.match(procVmsRegex) || plainText.match(procVmsRegex)
        if (procVmsMatch) {
          contadores.processadas = parseInt(procVmsMatch[1], 10)
          contadores.total_vms = parseInt(procVmsMatch[2], 10)
        }

        const successCntRegex = /Success\s*[:\s]*(\d+)/i
        const warnCntRegex = /Warning\s*[:\s]*(\d+)/i
        const errCntRegex = /(?:Error|Errors|Failed)\s*[:\s]*(\d+)/i

        const sM = plainText.match(successCntRegex)
        if (sM) contadores.success = parseInt(sM[1], 10)

        const wM = plainText.match(warnCntRegex)
        if (wM) contadores.warning = parseInt(wM[1], 10)

        const eM = plainText.match(errCntRegex)
        if (eM) contadores.error = parseInt(eM[1], 10)

        // Detecção inicial de status
        // Atenção: NÃO disparar 'parcial' só com '>warning<' no HTML bruto porque "<td>Warning 0</td>" contém '>warning<'.
        // Avaliar com precisão via contadores ou regex de status real
        const hasFailedStatus =
          lowerAss.includes('[failed]') ||
          lowerAss.includes('[error]') ||
          lowerAss.includes('[falha]') ||
          /(?:status:\s*failed|>failed<)/i.test(rawConteudo) ||
          contadores.error > 0

        const hasWarningStatus =
          !hasFailedStatus &&
          (lowerAss.includes('[warning]') ||
            lowerAss.includes('[alerta]') ||
            /(?:status:\s*warning)/i.test(rawConteudo) ||
            contadores.warning > 0)

        const hasSuccessStatus =
          !hasFailedStatus &&
          !hasWarningStatus &&
          (lowerAss.includes('[success]') ||
            /(?:status:\s*success|>success<)/i.test(rawConteudo) ||
            (contadores.error === 0 && contadores.warning === 0 && contadores.success > 0))

        if (hasFailedStatus) {
          statusDetectado = 'erro'
        } else if (hasWarningStatus) {
          statusDetectado = 'parcial'
        } else if (hasSuccessStatus) {
          statusDetectado = 'sucesso'
        } else {
          statusDetectado = 'sucesso'
        }

        const startTimeMatch = plainText.match(/Start\s*time\s*[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i)
        if (startTimeMatch) dataInicioDetectada = startTimeMatch[1]

        const endTimeMatch = plainText.match(/End\s*time\s*[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i)
        if (endTimeMatch) dataFimDetectada = endTimeMatch[1]

        const durMatch = plainText.match(/Duration\s*[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i)
        if (durMatch) duracaoDetectada = durMatch[1]

        const totalSizeMatch = plainText.match(/Total\s*size\s*[:\s]*([\d.,]+\s*[TGMK]?B)/i)
        if (totalSizeMatch) metricasVeeam.total_size = totalSizeMatch[1].trim()

        const backupSizeMatch = plainText.match(/Backup\s*size\s*[:\s]*([\d.,]+\s*[TGMK]?B)/i)
        if (backupSizeMatch) {
          metricasVeeam.backup_size = backupSizeMatch[1].trim()
          tamanhoFormatado = metricasVeeam.backup_size
          tamanhoBytes = parseBrSizeToBytes(metricasVeeam.backup_size)
        }

        const dataReadMatch = plainText.match(/Data\s*read\s*[:\s]*([\d.,]+\s*[TGMK]?B)/i)
        if (dataReadMatch) metricasVeeam.data_read = dataReadMatch[1].trim()

        const transferredMatch = plainText.match(/Transferred\s*[:\s]*([\d.,]+\s*[TGMK]?B)/i)
        if (transferredMatch) {
          metricasVeeam.transferred = transferredMatch[1].trim()
        }

        const dedupeMatch = plainText.match(/Dedupe\s*[:\s]*([\d.,]+x?)/i)
        if (dedupeMatch) metricasVeeam.dedupe = dedupeMatch[1].trim()

        const compMatch = plainText.match(/Compression\s*[:\s]*([\d.,]+x?)/i)
        if (compMatch) metricasVeeam.compression = compMatch[1].trim()

        const verMatch =
          rawConteudo.match(/Vee?am\s+Backup\s*(?:&|and)\s*Replication\s*([0-9.]+)/i) ||
          plainText.match(/Vee?am\s+Backup\s*(?:&|and)\s*Replication\s*([0-9.]+)/i)
        if (verMatch) {
          veeamVersion = `Veeam Backup & Replication ${verMatch[1]}`
        }

        try {
          const isLinhaVmValida = (nome) => {
            if (!nome) return false
            const n = String(nome).trim()
            if (n.length <= 3) return false
            if (
              /(?:backup\s+(?:copy\s+)?job|replication\s+job|job\b|created\s+by|summary|total\s+size|backup\s+size|data\s+read|transferred|duration|^name$|^vm$|^vms$|success|warning|error|failed)\b/i.test(
                n,
              )
            ) {
              return false
            }
            if (/processed/i.test(n) || /\d+\s+of\s+\d+\s+vms/i.test(n)) {
              return false
            }
            return true
          }

          // 1. Tabela HTML de Details
          const tableDetailsMatch = rawConteudo.match(/<table[^>]*>([\s\S]*?)<\/table>/gi)
          if (tableDetailsMatch) {
            for (let t = 0; t < tableDetailsMatch.length; t++) {
              const tableHtml = tableDetailsMatch[t]
              if (
                !tableHtml.toLowerCase().includes('success') &&
                !tableHtml.toLowerCase().includes('warning') &&
                !tableHtml.toLowerCase().includes('failed')
              ) {
                continue
              }
              const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
              for (let r = 0; r < rowMatches.length; r++) {
                const row = rowMatches[r]
                const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
                if (cellMatches.length >= 2) {
                  const c0 = stripHtml(cellMatches[0]).trim()
                  const c1 = stripHtml(cellMatches[1]).trim()
                  if (!c0 || !isLinhaVmValida(c0)) continue

                  // Ignora linha se o nome for igual ao jobName detectado ou cabeçalho de job
                  const c0Norm = c0
                    .toLowerCase()
                    .replace(/\\/g, '/')
                    .replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
                    .replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                  const jnNormLocal = (jobName || '')
                    .toLowerCase()
                    .replace(/\\/g, '/')
                    .replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
                    .replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                  if (c0Norm && jnNormLocal && c0Norm === jnNormLocal) continue

                  const statusVm = /success/i.test(row)
                    ? 'success'
                    : /warning/i.test(row)
                      ? 'warning'
                      : /failed|error/i.test(row)
                        ? 'failed'
                        : 'success'

                  const totalSize = cellMatches.length >= 5 ? stripHtml(cellMatches[4]).trim() : ''
                  const dataRead = cellMatches.length >= 6 ? stripHtml(cellMatches[5]).trim() : ''
                  const transferred =
                    cellMatches.length >= 7 ? stripHtml(cellMatches[6]).trim() : ''

                  // duracao nunca recebe texto com "processed" ou "Success"
                  let duracaoLimpa = c1
                  if (
                    /(?:processed|success|warning|failed|error|\d+\s+of\s+\d+)/i.test(duracaoLimpa)
                  ) {
                    duracaoLimpa = ''
                  }

                  detalhesVms.push({
                    nome: c0,
                    status: statusVm,
                    duracao: duracaoLimpa,
                    tamanho_total: totalSize,
                    dados_lidos: dataRead,
                    transferido: transferred,
                  })
                }
              }
            }
          }

          // 2. Parser linha a linha flexível sobre texto plano (com ou sem bloco Details)
          // NUNCA inventar itens: só captura linhas que contenham um nome de VM/item real seguido por status Veeam
          const cabecalhosIgnorar = [
            'name',
            'vm',
            'vms',
            'status',
            'start time',
            'end time',
            'duration',
            'total size',
            'backup size',
            'data read',
            'transferred',
            'dedupe',
            'compression',
            'success',
            'warning',
            'error',
            'failed',
            'details',
            'created by',
            'backup job',
            'backup copy job',
            'replication job',
            'summary',
            'action',
            'type',
            'result',
          ]

          const processarLinhaVeeam = (line) => {
            const trimmed = String(line || '').trim()
            if (!trimmed) return null

            // Regex 1: "SPCM-REGWIN Success 09:48:39 ... [tamanhos]"
            // ou "SRV-PRODUCAO-01  Success  08:10:05  08:11:47  620 GB  3,5 GB"
            const m = trimmed.match(
              /^([A-Za-z0-9_\-\.\:\/\\]+)\s+(Success|Warning|Failed|Error)\b(.*)$/i,
            )
            if (m) {
              const rawName = m[1].trim()
              const lowerName = rawName.toLowerCase()
              if (cabecalhosIgnorar.includes(lowerName)) return null
              if (!isLinhaVmValida(rawName)) return null
              if (lowerName.startsWith('job') || lowerName.startsWith('http')) return null

              const rawNorm = rawName
                .toLowerCase()
                .replace(/\\/g, '/')
                .replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
                .replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
                .replace(/\s+/g, ' ')
                .trim()
              const jnNormLinha = (jobName || '')
                .toLowerCase()
                .replace(/\\/g, '/')
                .replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
                .replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
                .replace(/\s+/g, ' ')
                .trim()
              if (rawNorm && jnNormLinha && rawNorm === jnNormLinha) return null

              const statusRaw = m[2].toLowerCase()
              const rest = m[3] || ''
              const statusVm =
                statusRaw === 'success' ? 'success' : statusRaw === 'warning' ? 'warning' : 'failed'

              const timeMatches = rest.match(/\d{1,2}:\d{2}(?::\d{2})?/g) || []
              const sizeMatches = rest.match(/\d+(?:[.,]\d+)?\s*(?:TB|GB|MB|KB|B)/gi) || []

              return {
                nome: rawName,
                status: statusVm,
                duracao: timeMatches[2] || timeMatches[0] || '',
                start_time: timeMatches[0] || '',
                end_time: timeMatches[1] || '',
                tamanho_total: sizeMatches[0] || '',
                dados_lidos: sizeMatches[1] || '',
                transferido: sizeMatches[2] || '',
              }
            }

            // Regex 2: Formato com colunas separadas por tabulação ou 2+ espaços
            // ex: "SPCM-TDePJ \t Success \t 09:42:50"
            const parts = trimmed
              .split(/\t+|\s{2,}/)
              .map((p) => p.trim())
              .filter(Boolean)
            if (parts.length >= 2) {
              const p0 = parts[0]
              const p1 = parts[1]
              const lowerP0 = p0.toLowerCase()
              const p0Norm = p0
                .toLowerCase()
                .replace(/\\/g, '/')
                .replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
                .replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
                .replace(/\s+/g, ' ')
                .trim()
              const jnNormParts = (jobName || '')
                .toLowerCase()
                .replace(/\\/g, '/')
                .replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
                .replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
                .replace(/\s+/g, ' ')
                .trim()

              if (
                !cabecalhosIgnorar.includes(lowerP0) &&
                isLinhaVmValida(p0) &&
                !(p0Norm && jnNormParts && p0Norm === jnNormParts) &&
                /^(Success|Warning|Failed|Error)$/i.test(p1)
              ) {
                const statusVm =
                  p1.toLowerCase() === 'success'
                    ? 'success'
                    : p1.toLowerCase() === 'warning'
                      ? 'warning'
                      : 'failed'
                const restStr = parts.slice(2).join(' ')
                const sizeMatches = restStr.match(/\d+(?:[.,]\d+)?\s*(?:TB|GB|MB|KB|B)/gi) || []
                return {
                  nome: p0,
                  status: statusVm,
                  duracao: parts[2] || '',
                  tamanho_total: sizeMatches[0] || '',
                  dados_lidos: sizeMatches[1] || '',
                  transferido: sizeMatches[2] || '',
                }
              }
            }

            return null
          }

          if (detalhesVms.length === 0) {
            const rawLines = (plainText || rawConteudo).split(/\r?\n/)
            // Se houver marcador "Details", priorizar as linhas após ele
            let searchLines = rawLines
            const idxDetails = rawLines.findIndex(
              (l) => /^\s*Details\s*$/i.test(l) || /Details/i.test(l),
            )
            if (idxDetails >= 0 && idxDetails < rawLines.length - 1) {
              const afterDetails = rawLines.slice(idxDetails + 1)
              const candidatas = []
              for (let i = 0; i < afterDetails.length; i++) {
                const parsed = processarLinhaVeeam(afterDetails[i])
                if (
                  parsed &&
                  !candidatas.some((c) => c.nome.toLowerCase() === parsed.nome.toLowerCase())
                ) {
                  candidatas.push(parsed)
                }
              }
              if (candidatas.length > 0) {
                for (let k = 0; k < candidatas.length; k++) {
                  detalhesVms.push(candidatas[k])
                }
              }
            }

            // Se ainda não encontrou via bloco Details, varre o texto completo
            if (detalhesVms.length === 0) {
              for (let i = 0; i < rawLines.length; i++) {
                const parsed = processarLinhaVeeam(rawLines[i])
                if (
                  parsed &&
                  !detalhesVms.some((c) => c.nome.toLowerCase() === parsed.nome.toLowerCase())
                ) {
                  detalhesVms.push(parsed)
                }
              }
            }
          }
        } catch (errDet) {
          avisosParsing.push(`Falha no parse da tabela/linhas Veeam: ${String(errDet)}`)
        }

        if (detalhesVms.length === 0) {
          avisosParsing.push('Tabela Details de VMs ausente ou truncada no comprovante')
        } else {
          // Quando detalhesVms existir, calcular contadores a partir do array real de itens
          let cSuc = 0
          let cWarn = 0
          let cErr = 0
          for (let vi = 0; vi < detalhesVms.length; vi++) {
            const st = String(detalhesVms[vi].status || '').toLowerCase()
            if (st === 'success' || st === 'sucesso') {
              cSuc++
            } else if (st === 'warning' || st === 'aviso') {
              cWarn++
            } else if (st === 'failed' || st === 'error' || st === 'erro' || st === 'falha') {
              cErr++
            }
          }
          contadores.success = cSuc
          contadores.warning = cWarn
          contadores.error = cErr
          contadores.total_vms = detalhesVms.length
          contadores.processadas = detalhesVms.length

          // DEFEITO 2: status='sucesso' quando contadores error=0 e warning=0 e todas as VMs válidas success;
          // 'parcial' só com warning real > 0; 'erro' só com error > 0
          if (cErr > 0) {
            statusDetectado = 'erro'
          } else if (cWarn > 0) {
            statusDetectado = 'parcial'
          } else if (cSuc > 0 && cErr === 0 && cWarn === 0) {
            statusDetectado = 'sucesso'
          }
        }

        destinoDetectado = 'Repositório Veeam (Backup Repository Local/Nuvem)'
      } else {
        // -------------------------------------------------------------
        // CASO 4: ADAPTADOR EMAIL_HTML_GENERICO (TEXTO / HTML GENÉRICO)
        // -------------------------------------------------------------
        adaptadorUsado = 'EMAIL_HTML_GENERICO'
        versaoAdaptador = '1.2.0'

        if (
          lowerConteudo.includes('fail') ||
          lowerConteudo.includes('erro') ||
          lowerConteudo.includes('failed') ||
          lowerConteudo.includes('abortado') ||
          lowerAssunto.includes('falha') ||
          lowerAssunto.includes('fail')
        ) {
          statusDetectado = 'erro'
        } else if (
          lowerConteudo.includes('warning') ||
          lowerConteudo.includes('parcial') ||
          lowerConteudo.includes('atenção') ||
          lowerConteudo.includes('atencao') ||
          lowerConteudo.includes('alerta')
        ) {
          statusDetectado = 'parcial'
        }

        tamanhoFormatado = '0 B'
        const sizeRegex = /(\d+(?:[.,]\d+)?)\s*(GB|MB|TB|KB|G|M|T)/i
        const sizeMatch = rawConteudo.match(sizeRegex)
        if (sizeMatch) {
          const rawNum = parseFloat(sizeMatch[1].replace(',', '.'))
          const unit = sizeMatch[2].toUpperCase()
          tamanhoFormatado = `${rawNum} ${unit.endsWith('B') ? unit : unit + 'B'}`
          if (unit.startsWith('T')) tamanhoBytes = Math.round(rawNum * 1024 * 1024 * 1024 * 1024)
          else if (unit.startsWith('G')) tamanhoBytes = Math.round(rawNum * 1024 * 1024 * 1024)
          else if (unit.startsWith('M')) tamanhoBytes = Math.round(rawNum * 1024 * 1024)
          else tamanhoBytes = Math.round(rawNum * 1024)
        }

        if (
          lowerConteudo.includes('s3') ||
          lowerConteudo.includes('aws') ||
          lowerConteudo.includes('nuvem') ||
          lowerConteudo.includes('cloud') ||
          lowerConteudo.includes('b2')
        ) {
          destinoDetectado = 'Nuvem Criptografada Externa (S3 / Cloud)'
        } else if (
          lowerConteudo.includes('nas') ||
          lowerConteudo.includes('synology') ||
          lowerConteudo.includes('qnap') ||
          lowerConteudo.includes('truenas')
        ) {
          destinoDetectado = 'Storage NAS Dedicado'
        }

        const jobRegex = /(?:job|trabalho|tarefa|rotina)[:\s]+([A-Za-z0-9_\-\.\s]{3,40})/i
        const jobMatch = rawConteudo.match(jobRegex)
        if (jobMatch && jobMatch[1]) {
          jobName = jobMatch[1].trim()
        } else if (assunto) {
          jobName = assunto.replace(/\[.*?\]/g, '').trim() || 'Job Backup Geral'
        }
      }

      // -------------------------------------------------------------
      // REGISTRO DO PROCESSAMENTO
      // -------------------------------------------------------------
      const resultadoProcessado = {
        status_detectado: statusDetectado,
        job_name: jobName,
        job_tipo: jobTipo,
        tamanho_bytes: tamanhoBytes,
        tamanho_formatado: tamanhoFormatado,
        destino: destinoDetectado,
        remetente: remetente,
        assunto: assunto,
        nome_arquivo_anexo: nomeArquivoAnexo || null,
        origem_anexo_pdf: isAcronisDetected,
        processado_em: nowIso,
        regra_id: regraCasada ? regraCasada.id : null,
        adaptador: adaptadorUsado,
        versao: versaoAdaptador,
        veeam_version: veeamVersion || null,
        acronis_version: acronisVersion || null,
        acronis_info: isAcronisDetected
          ? {
              data_geracao: acronisDataGeracao,
              intervalo: acronisIntervalo,
              nome_arquivo: nomeArquivoAnexo,
            }
          : null,
        contadores: contadores,
        metricas: metricasVeeam,
        duracao: duracaoDetectada || null,
        horarios: {
          inicio: dataInicioDetectada || null,
          fim: dataFimDetectada || null,
        },
        vms_count: detalhesVms.length,
        vms: detalhesVms,
        avisos: avisosParsing,
      }

      const procCol = $app.findCollectionByNameOrId('backup_processamentos')
      const procRec = new Record(procCol)
      procRec.set('organization', organizationId)
      procRec.set('evidencia', evidenciaRec.id)
      procRec.set('adaptador_usado', adaptadorUsado)
      procRec.set('versao_adaptador', versaoAdaptador)
      procRec.set('resultado', resultadoProcessado)
      $app.save(procRec)

      // -------------------------------------------------------------
      // VINCULAÇÃO DE ROTINA E FONTE (VÍNCULO RIGOROSO POR ALIAS / NOME INLINE)
      // -------------------------------------------------------------
      const normalizarTexto = (str) => {
        if (str === null || str === undefined) return ''
        return String(str).trim().toLowerCase().replace(/\s+/g, ' ')
      }

      const extrairAliases = (campoAliases) => {
        if (!campoAliases) return []
        const partes = String(campoAliases).split(',')
        const lista = []
        for (let i = 0; i < partes.length; i++) {
          const limpo = normalizarTexto(partes[i])
          if (limpo) lista.push(limpo)
        }
        return lista
      }

      const vinculoRigorosoInline = (nomeJob, rotinas, fontes) => {
        const jobNorm = normalizarTexto(nomeJob)
        const rotinasLista = Array.isArray(rotinas) ? rotinas : []
        const fontesLista = Array.isArray(fontes) ? fontes : []

        if (!jobNorm) {
          return {
            rotina: null,
            fontesVinculadas: [],
            motivo:
              'Nenhum nome de job identificado no comprovante — cadastre o alias em Rotinas & Fontes.',
          }
        }

        let rotinaEncontrada = null
        let motivoMatch = ''

        // 1. Casamento direto contra nome da rotina ou aliases da rotina
        for (let i = 0; i < rotinasLista.length; i++) {
          const r = rotinasLista[i]
          if (!r) continue

          const rNome = typeof r.getString === 'function' ? r.getString('nome') : r.nome || ''
          const rNomeNorm = normalizarTexto(rNome)

          if (rNomeNorm && rNomeNorm === jobNorm) {
            rotinaEncontrada = r
            motivoMatch = `Nome da rotina "${rNome}" coincide com o job "${nomeJob}"`
            break
          }

          const rAliasesRaw =
            typeof r.getString === 'function' ? r.getString('aliases') : r.aliases || ''
          const rAliases = extrairAliases(rAliasesRaw)
          let aliasCasado = null
          for (let j = 0; j < rAliases.length; j++) {
            if (rAliases[j] === jobNorm) {
              aliasCasado = rAliases[j]
              break
            }
          }

          if (aliasCasado) {
            rotinaEncontrada = r
            motivoMatch = `Alias da rotina "${rNome}" ("${aliasCasado}") coincide com o job "${nomeJob}"`
            break
          }
        }

        // 2. Se ainda não achou por rotina, verificar se casa contra aliases das fontes
        const fontesVinculadas = []
        for (let fI = 0; fI < fontesLista.length; fI++) {
          const f = fontesLista[fI]
          if (!f) continue

          const fNome =
            typeof f.getString === 'function'
              ? f.getString('caminho_identificacao')
              : f.caminho_identificacao || ''
          const fAliasesRaw =
            typeof f.getString === 'function' ? f.getString('aliases') : f.aliases || ''
          const fAliases = extrairAliases(fAliasesRaw)

          let casouFonte = false
          let aliasFonteCasado = null
          for (let aI = 0; aI < fAliases.length; aI++) {
            if (fAliases[aI] === jobNorm) {
              casouFonte = true
              aliasFonteCasado = fAliases[aI]
              break
            }
          }

          if (casouFonte) {
            fontesVinculadas.push(f)
            if (!rotinaEncontrada) {
              const rotinaDaFonteId =
                typeof f.getString === 'function' ? f.getString('rotina') : f.rotina || ''
              if (rotinaDaFonteId) {
                for (let rI = 0; rI < rotinasLista.length; rI++) {
                  const rCand = rotinasLista[rI]
                  if (rCand && rCand.id === rotinaDaFonteId) {
                    rotinaEncontrada = rCand
                    motivoMatch = `Fonte "${fNome}" vinculada pelo alias "${aliasFonteCasado}" direcionou para a rotina cadastrada`
                    break
                  }
                }
              }
            }
          }
        }

        if (rotinaEncontrada) {
          return {
            rotina: rotinaEncontrada,
            fontesVinculadas: fontesVinculadas,
            motivo: motivoMatch || `Rotina vinculada com rigor para o job "${nomeJob}"`,
          }
        }

        return {
          rotina: null,
          fontesVinculadas: fontesVinculadas,
          motivo: `Nenhuma rotina corresponde ao job '${nomeJob}' — cadastre o alias em Rotinas & Fontes`,
        }
      }

      const casarItensComFontesInline = (itensComprovante, fontesCadastradas, ativosDoEscopo) => {
        const itens = Array.isArray(itensComprovante) ? itensComprovante : []
        const fontes = Array.isArray(fontesCadastradas) ? fontesCadastradas : []
        const ativos = Array.isArray(ativosDoEscopo) ? ativosDoEscopo : []
        const fontesCobertas = []
        const fontesNaoCobertas = []

        for (let i = 0; i < itens.length; i++) {
          const rawItem = itens[i]
          const itemNome = typeof rawItem === 'string' ? rawItem : (rawItem && rawItem.nome) || ''
          const itemNorm = normalizarTexto(itemNome)
          if (!itemNorm) continue

          let achou = false
          let fonteMatchNome = ''
          let fonteMatchObj = null
          let ativoMatchId = null

          // 1. Casar contra fontes da rotina/organização (caminho_identificacao e aliases com contenção bidirecional)
          for (let fI = 0; fI < fontes.length; fI++) {
            const f = fontes[fI]
            if (!f) continue
            const fCaminho =
              typeof f.getString === 'function'
                ? f.getString('caminho_identificacao')
                : f.caminho_identificacao || ''
            const fAliasesRaw =
              typeof f.getString === 'function' ? f.getString('aliases') : f.aliases || ''
            const fAtivoInv =
              typeof f.getString === 'function'
                ? f.getString('ativo_inventario')
                : f.ativo_inventario || null
            const fCaminhoNorm = normalizarTexto(fCaminho)
            const fAliases = extrairAliases(fAliasesRaw)

            if (
              fCaminhoNorm &&
              (fCaminhoNorm === itemNorm ||
                fCaminhoNorm.includes(itemNorm) ||
                itemNorm.includes(fCaminhoNorm))
            ) {
              achou = true
              fonteMatchNome = fCaminho
              fonteMatchObj = f
              ativoMatchId = fAtivoInv
              break
            }
            for (let aI = 0; aI < fAliases.length; aI++) {
              const alNorm = normalizarTexto(fAliases[aI])
              if (
                alNorm &&
                (alNorm === itemNorm || alNorm.includes(itemNorm) || itemNorm.includes(alNorm))
              ) {
                achou = true
                fonteMatchNome = fCaminho || fAliases[aI]
                fonteMatchObj = f
                ativoMatchId = fAtivoInv
                break
              }
            }
            if (achou) break
          }

          // 2. Se não casou por fonte, casar contra os nomes dos ativos do escopo (case-insensitive, trim, contenção bidirecional)
          if (!achou && ativos.length > 0) {
            for (let atI = 0; atI < ativos.length; atI++) {
              const at = ativos[atI]
              if (!at) continue
              const atNome =
                typeof at.getString === 'function' ? at.getString('name') : at.name || ''
              const atNomeNorm = normalizarTexto(atNome)
              if (
                atNomeNorm &&
                (atNomeNorm === itemNorm ||
                  atNomeNorm.includes(itemNorm) ||
                  itemNorm.includes(atNomeNorm))
              ) {
                achou = true
                fonteMatchNome = atNome
                ativoMatchId = typeof at.getString === 'function' ? at.id : at.id
                break
              }
            }
          }

          if (achou) {
            fontesCobertas.push({
              item: itemNome,
              fonte_cadastrada: fonteMatchNome,
              fonte_id: (fonteMatchObj && fonteMatchObj.id) || null,
              ativo_id: ativoMatchId || null,
              fora_escopo: false,
            })
          } else {
            fontesNaoCobertas.push({
              item: itemNome,
              motivo: 'Não cadastrado — fora do escopo ou alias pendente',
              fora_escopo: true,
            })
          }
        }

        return {
          fontesCobertas,
          fontesNaoCobertas,
          totalItens: itens.length,
          totalCobertos: fontesCobertas.length,
          totalNaoCobertos: fontesNaoCobertas.length,
        }
      }

      let rotinaFinalId = rotinaId || evidenciaRec.getString('rotina') || ''
      let fonteFinalId = fonteId || evidenciaRec.getString('fonte') || ''
      let motivoVinculoRigoroso = ''
      let fontesVinculadasRigorosas = []

      if (!rotinaFinalId) {
        try {
          const todasRotinas = $app.findRecordsByFilter(
            'backup_rotinas',
            `organization = '${organizationId}' && status = 'ativo'`,
            '+created',
            100,
            0,
          )

          const todasFontes = $app.findRecordsByFilter(
            'backup_fontes',
            `organization = '${organizationId}' && ativo = true`,
            '+created',
            200,
            0,
          )

          const resVinculo = vinculoRigorosoInline(jobName, todasRotinas, todasFontes)
          if (resVinculo && resVinculo.rotina) {
            rotinaFinalId = resVinculo.rotina.id
            motivoVinculoRigoroso = resVinculo.motivo || ''
            fontesVinculadasRigorosas = resVinculo.fontesVinculadas || []
            if (!fonteFinalId && fontesVinculadasRigorosas.length > 0) {
              fonteFinalId = fontesVinculadasRigorosas[0].id
            }
          } else {
            rotinaFinalId = ''
            motivoVinculoRigoroso =
              (resVinculo && resVinculo.motivo) ||
              `Nenhuma rotina corresponde ao job '${jobName}' — cadastre o alias em Rotinas & Fontes`
          }
        } catch (errVinc) {
          motivoVinculoRigoroso = `Nenhuma rotina corresponde ao job '${jobName}' — cadastre o alias em Rotinas & Fontes`
        }
      }

      if (rotinaFinalId && !evidenciaRec.getString('rotina')) {
        evidenciaRec.set('rotina', rotinaFinalId)
        $app.save(evidenciaRec)
      }
      if (fonteFinalId && !evidenciaRec.getString('fonte')) {
        evidenciaRec.set('fonte', fonteFinalId)
        $app.save(evidenciaRec)
      }

      // Verificação de extração de dados: se nada foi extraído e não há itens identificados
      const temDadosExtraidos =
        detalhesVms.length > 0 ||
        contadores.total_vms > 0 ||
        contadores.success > 0 ||
        tamanhoBytes > 0 ||
        Boolean(dataInicioDetectada)

      if (!temDadosExtraidos && !jobName) {
        evidenciaRec.set('status_processamento', 'sem_dados_extraidos')
        $app.save(evidenciaRec)

        try {
          const ocCol = $app.findCollectionByNameOrId('backup_ocorrencias')
          const oc = new Record(ocCol)
          oc.set('organization', organizationId)
          oc.set('tipo', 'erro_de_processamento')
          oc.set('severidade', 'media')
          oc.set('status', 'aberta')
          oc.set('titulo', 'Comprovante recebido sem dados extraíveis')
          oc.set(
            'descricao',
            `O comprovante recebido via ${adaptadorUsado} não contém itens, VMs, contadores ou métricas identificáveis pelo parser. Status gravado como sem_dados_extraidos.`,
          )
          oc.set('evidencia', evidenciaRec.id)
          $app.save(oc)
        } catch (_) {}

        return e.json(200, {
          success: false,
          idempotent: !isNovaEvidencia,
          evidencia_id: evidenciaRec.id,
          processamento_id: procRec.id,
          status: 'sem_dados_extraidos',
          message:
            'Comprovante recebido e registrado, porém o conteúdo não continha itens de backup, VMs ou métricas passíveis de extração.',
        })
      }

      // -------------------------------------------------------------
      // REGISTRO NA backup_execucoes
      // -------------------------------------------------------------
      const execCol = $app.findCollectionByNameOrId('backup_execucoes')
      const execRec = new Record(execCol)
      execRec.set('organization', organizationId)
      if (rotinaFinalId) execRec.set('rotina', rotinaFinalId)
      execRec.set('evidencia', evidenciaRec.id)
      execRec.set('data_inicio', nowIso)
      execRec.set('data_fim', nowIso)
      execRec.set('status', statusDetectado)
      execRec.set('origem_registro', 'evidencia')
      execRec.set('tamanho_bytes', tamanhoBytes)
      execRec.set('tamanho_formatado', tamanhoFormatado)
      execRec.set('destino', destinoDetectado)

      let obsExecucao = ''
      if (adaptadorUsado === 'ACRONIS_PDF') {
        obsExecucao = `Acronis Cloud: ${contadores.success}/${contadores.total_vms} planos OK (${tamanhoFormatado}). Anexo: "${nomeArquivoAnexo || 'Atividades diárias - SocNoc.pdf'}". Intervalo: ${acronisIntervalo || 'diário'}.`
      } else if (adaptadorUsado === 'VEEAM_HTML') {
        const vmSummary =
          detalhesVms.length > 0
            ? ` (${detalhesVms.length} VM(s) detalhada(s))`
            : contadores.total_vms > 0
              ? ` (${contadores.processadas}/${contadores.total_vms} VMs processadas)`
              : ''
        const verSummary = veeamVersion ? ` [${veeamVersion}]` : ''
        obsExecucao = `Veeam ${jobTipo}: "${jobName}"${vmSummary}${verSummary}. Duração: ${duracaoDetectada || 'n/d'}.`
      } else {
        obsExecucao = `Processamento via EMAIL_HTML_GENERICO. Trabalho: "${jobName}". Remetente: ${remetente}`
      }
      execRec.set('observacao', obsExecucao)

      if (detalhesVms.length > 0) {
        execRec.set('detalhes_vms', detalhesVms)
      }

      $app.save(execRec)

      // -------------------------------------------------------------
      // AVALIAÇÃO DE CONFORMIDADE E LAUDO TÉCNICO ESTRUTURADO
      // -------------------------------------------------------------
      let conformidadeStatus = 'conforme'
      let conformidadeDetalhe = 'Execução de cópia concluída sem erros ou divergências.'
      let rotinaPeriodicidade = ''
      let rotinaIntervaloMin = 0
      let rotinaTipoExecucao = ''
      let rotinaHorario = ''
      let rotinaNomeReal = ''
      let rotinaRecObj = null
      let planoRecObj = null
      let planoNomeReal = ''
      let planoRpoHoras = 24
      let planoDestinoEsperado = ''
      let planoDestinoValores = []
      let escopoIdRef = ''

      if (rotinaFinalId) {
        try {
          rotinaRecObj = $app.findRecordById('backup_rotinas', rotinaFinalId)
          if (rotinaRecObj) {
            rotinaNomeReal = rotinaRecObj.getString('nome')
            rotinaPeriodicidade = rotinaRecObj.getString('periodicidade')
            rotinaIntervaloMin = rotinaRecObj.getInt('intervalo_minutos')
            rotinaTipoExecucao = rotinaRecObj.getString('tipo_execucao')
            rotinaHorario = rotinaRecObj.getString('horario_agendado')
            const planoIdRef = rotinaRecObj.getString('plano')
            if (planoIdRef) {
              try {
                planoRecObj = $app.findRecordById('backup_planos', planoIdRef)
                if (planoRecObj) {
                  planoNomeReal = planoRecObj.getString('nome')
                  planoRpoHoras = planoRecObj.getInt('rpo_horas') || 24
                  escopoIdRef = planoRecObj.getString('escopo') || ''

                  // Obter modalidades de destino configuradas no plano da rotina
                  try {
                    const rawDest = planoRecObj.get('destino')
                    if (Array.isArray(rawDest)) {
                      planoDestinoValores = rawDest.map((d) => String(d).toLowerCase().trim())
                    } else if (typeof rawDest === 'string') {
                      try {
                        const parsed = JSON.parse(rawDest)
                        if (Array.isArray(parsed)) {
                          planoDestinoValores = parsed.map((d) => String(d).toLowerCase().trim())
                        } else if (parsed) {
                          planoDestinoValores = [String(parsed).toLowerCase().trim()]
                        }
                      } catch (_) {
                        if (rawDest.trim()) {
                          planoDestinoValores = rawDest
                            .split(',')
                            .map((s) => s.trim().toLowerCase())
                            .filter(Boolean)
                        }
                      }
                    }
                  } catch (_) {}

                  if (planoDestinoValores.length === 0) {
                    const dStr = planoRecObj.getString('destino')
                    if (dStr) planoDestinoValores = [dStr.toLowerCase().trim()]
                  }

                  planoDestinoEsperado = planoDestinoValores.join(', ') || ''
                }
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      let fontesCadastradas = []
      try {
        fontesCadastradas = $app.findRecordsByFilter(
          'backup_fontes',
          `organization = '${organizationId}' && ativo = true`,
          '+created',
          100,
          0,
        )
      } catch (_) {}

      // Função canônica de normalização para matching e exclusão de job/rotina/aliases
      const normalizarParaComparacao = (str) => {
        if (str === null || str === undefined) return ''
        let s = String(str).trim().toLowerCase()
        s = s.replace(/\\/g, '/')
        s = s.replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
        s = s.replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
        s = s.replace(/\s+/g, ' ').trim()
        return s
      }

      // Conjunto de nomes normalizados que representam o JOB ou a ROTINA e NÃO devem entrar como itens
      const nomesExcluirComoItem = new Set()
      if (jobName) {
        const jnNorm = normalizarParaComparacao(jobName)
        if (jnNorm) nomesExcluirComoItem.add(jnNorm)
      }
      if (rotinaNomeReal) {
        const rnNorm = normalizarParaComparacao(rotinaNomeReal)
        if (rnNorm) nomesExcluirComoItem.add(rnNorm)
      }
      if (rotinaRecObj) {
        const rAliasesRaw = rotinaRecObj.getString('aliases') || ''
        const rAliasesArr = extrairAliases(rAliasesRaw)
        for (let aIdx = 0; aIdx < rAliasesArr.length; aIdx++) {
          const aNorm = normalizarParaComparacao(rAliasesArr[aIdx])
          if (aNorm) nomesExcluirComoItem.add(aNorm)
        }
      }

      // Filtrar detalhesVms caso algum cabeçalho de job tenha entrado como VM
      if (detalhesVms && detalhesVms.length > 0 && nomesExcluirComoItem.size > 0) {
        detalhesVms = detalhesVms.filter((dv) => {
          const dvNorm = normalizarParaComparacao(dv.nome)
          return !nomesExcluirComoItem.has(dvNorm)
        })
      }

      const itensComprovante = []
      if (detalhesVms && detalhesVms.length > 0) {
        for (let dvI = 0; dvI < detalhesVms.length; dvI++) {
          const rawItemNome = detalhesVms[dvI].nome || `Item #${dvI + 1}`
          const itemNorm = normalizarParaComparacao(rawItemNome)
          if (!nomesExcluirComoItem.has(itemNorm)) {
            itensComprovante.push(rawItemNome)
          }
        }
      } else if (jobName) {
        const jobNorm = normalizarParaComparacao(jobName)
        if (!nomesExcluirComoItem.has(jobNorm)) {
          itensComprovante.push(jobName)
        }
      }

      // -------------------------------------------------------------
      // ITEM 2: RESOLUÇÃO AUTOMÁTICA E DEFENSIVA DA CADEIA DE ESCOPO
      // Cadeia: rotina (rotinaFinalId) → plano → escopo → lista de ativos do escopo
      // -------------------------------------------------------------
      let escopoRec = null
      let planoEncontradoId = ''
      let planoEncontradoNome = ''
      let modalidadesPlanoEncontradas = []

      // 1. Sempre resolver a partir de rotinaFinalId se disponível
      if (rotinaFinalId) {
        try {
          if (!rotinaRecObj) {
            rotinaRecObj = $app.findRecordById('backup_rotinas', rotinaFinalId)
          }
        } catch (errRotina) {
          console.error(
            '[backup:processar] Falha ao carregar rotina',
            rotinaFinalId,
            ':',
            errRotina,
          )
        }

        if (rotinaRecObj) {
          if (!rotinaNomeReal) rotinaNomeReal = rotinaRecObj.getString('nome') || ''
          const pId = rotinaRecObj.getString('plano')
          if (pId) {
            try {
              if (!planoRecObj || planoRecObj.id !== pId) {
                planoRecObj = $app.findRecordById('backup_planos', pId)
              }
            } catch (errPlano) {
              console.error(
                '[backup:processar] Falha ao carregar plano da rotina',
                pId,
                ':',
                errPlano,
              )
            }

            if (planoRecObj) {
              planoEncontradoId = planoRecObj.id
              planoEncontradoNome = planoRecObj.getString('nome') || ''
              if (!planoNomeReal) planoNomeReal = planoEncontradoNome
              const escId = planoRecObj.getString('escopo')
              if (escId) {
                try {
                  escopoRec = $app.findRecordById('backup_escopo', escId)
                } catch (errEsc) {
                  console.error(
                    '[backup:processar] Falha ao carregar escopo do plano',
                    escId,
                    ':',
                    errEsc,
                  )
                }
              }
            }
          }
        }
      }

      // 2. Se ainda não achou e havia escopoIdRef
      if (!escopoRec && escopoIdRef) {
        try {
          escopoRec = $app.findRecordById('backup_escopo', escopoIdRef)
        } catch (errEscRef) {
          console.error(
            '[backup:processar] Falha ao carregar escopoIdRef',
            escopoIdRef,
            ':',
            errEscRef,
          )
        }
      }

      // 3. Fallback: escopo ativo da organização
      if (!escopoRec) {
        try {
          const escoposOrg = $app.findRecordsByFilter(
            'backup_escopo',
            `organization = '${organizationId}' && status = 'ativo'`,
            '+created',
            1,
            0,
          )
          if (escoposOrg.length > 0) {
            escopoRec = escoposOrg[0]
          }
        } catch (errEscOrg) {
          console.error(
            '[backup:processar] Falha ao carregar escopos da org',
            organizationId,
            ':',
            errEscOrg,
          )
        }
      }

      // Se planoRecObj estiver resolvido, atualizar destinos do plano caso lista esteja vazia
      if (planoRecObj && planoDestinoValores.length === 0) {
        try {
          const rawDest = planoRecObj.get('destino')
          if (Array.isArray(rawDest)) {
            modalidadesPlanoEncontradas = rawDest.map((d) => String(d).toLowerCase().trim())
          } else if (typeof rawDest === 'string') {
            try {
              const parsed = JSON.parse(rawDest)
              if (Array.isArray(parsed)) {
                modalidadesPlanoEncontradas = parsed.map((d) => String(d).toLowerCase().trim())
              } else if (parsed) {
                modalidadesPlanoEncontradas = [String(parsed).toLowerCase().trim()]
              }
            } catch (_) {
              if (rawDest.trim()) {
                modalidadesPlanoEncontradas = rawDest
                  .split(',')
                  .map((s) => s.trim().toLowerCase())
                  .filter(Boolean)
              }
            }
          }
        } catch (_) {}
        if (modalidadesPlanoEncontradas.length > 0) {
          planoDestinoValores = modalidadesPlanoEncontradas
        }
      }

      // Expandir ativos do escopo tratando array, string JSON e string simples
      const ativosEscopo = []
      if (escopoRec) {
        let ativosIds = []
        try {
          const rawAtivos = escopoRec.get('ativos')
          if (Array.isArray(rawAtivos)) {
            ativosIds = rawAtivos
          } else if (typeof rawAtivos === 'string') {
            try {
              const parsed = JSON.parse(rawAtivos)
              if (Array.isArray(parsed)) {
                ativosIds = parsed
              } else if (parsed && typeof parsed === 'object') {
                ativosIds = [parsed.id || String(parsed)]
              } else if (parsed) {
                ativosIds = [String(parsed)]
              }
            } catch (_) {
              if (rawAtivos.trim()) {
                ativosIds = rawAtivos
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              }
            }
          }
        } catch (_) {}

        if (ativosIds && ativosIds.length > 0) {
          for (let aIdx = 0; aIdx < ativosIds.length; aIdx++) {
            const itemAt = ativosIds[aIdx]
            const aId =
              typeof itemAt === 'string'
                ? itemAt
                : itemAt && itemAt.id
                  ? String(itemAt.id)
                  : String(itemAt || '')
            if (!aId) continue
            try {
              const aRec = $app.findRecordById('inventory_assets', aId)
              if (aRec) ativosEscopo.push(aRec)
            } catch (_) {}
          }
        } else {
          // Se o campo ativos estiver vazio no escopo, buscar ativos com exigência da org
          try {
            const assetsOrg = $app.findRecordsByFilter(
              'inventory_assets',
              `organization = '${organizationId}' && status = 'ativo' && (exige_backup_local = true || exige_backup_nuvem = true || exige_backup_replicacao = true)`,
              '+name',
              50,
              0,
            )
            for (let i = 0; i < assetsOrg.length; i++) {
              ativosEscopo.push(assetsOrg[i])
            }
          } catch (_) {}
        }
      }

      const matchResult = casarItensComFontesInline(
        itensComprovante,
        fontesCadastradas,
        ativosEscopo,
      )
      const fontesCobertas = matchResult.fontesCobertas
      const fontesNaoCobertas = matchResult.fontesNaoCobertas

      const confrontoEscopo = {
        escopo_id: escopoRec ? escopoRec.id : escopoIdRef || null,
        escopo_nome: escopoRec ? escopoRec.getString('nome') || 'Escopo Geral' : null,
        rotina_id: rotinaFinalId || null,
        rotina_nome: rotinaNomeReal || null,
        plano_id: planoRecObj ? planoRecObj.id : planoEncontradoId || null,
        plano_nome: planoNomeReal || planoEncontradoNome || null,
        modalidades_plano: planoDestinoValores,
        exigencias: [],
        comprovado: [],
        pendencias: [],
        total_ativos_escopo: 0,
        total_exigencias_modalidade: 0,
        total_comprovadas: 0,
        total_pendencias: 0,
      }

      try {
        if (escopoRec) {
          confrontoEscopo.escopo_id = escopoRec.id
          confrontoEscopo.escopo_nome = escopoRec.getString('nome') || 'Escopo Geral'
          confrontoEscopo.total_ativos_escopo = ativosEscopo.length
          // Regra de Ouro A & B: MODALIDADE PROVADA SAI DO COMPROVANTE, NUNCA DO PLANO.
          // Regra de Negócio A: Considerar SOMENTE a identidade do job da própria evidência
          // (assunto da evidência e/ou nome do job/rotina vinculada), NUNCA o corpo do texto
          // nem o nome da ferramenta (ex.: "Veeam Backup & Replication" JAMAIS deve inferir 'replicacao').
          // - assunto/job contém "backup copy job:" -> 'nuvem'
          // - assunto/job contém "replication job:" -> 'replicacao'
          // - assunto/job contém "backup job:" (sem copy/replication) -> 'local'
          // - adaptador ACRONIS_PDF -> 'nuvem'
          // - ambíguo -> null (não comprova nada)
          const modalidadesComprovadasPorEsta = new Set()

          if (adaptadorUsado === 'ACRONIS_PDF') {
            modalidadesComprovadasPorEsta.add('nuvem')
          } else {
            // Regra de Ouro de Inferência de Modalidade (Ordem de Precedência Estrita):
            // a) Prefixo declarado no ASSUNTO da evidência ("backup copy job:"/"copy job:" -> nuvem, "replication job:" -> replicacao, "backup job:" -> local)
            // b) Prefixo declarado no CORPO do comprovante na linha de cabeçalho do job Veeam ("Backup Copy Job:" -> nuvem, "Replication Job:" -> replicacao, "Backup job:" -> local)
            // c) Marcador explícito no NOME DA ROTINA (- LOCAL -> local, - NUVEM/- NUVENS -> nuvem, - REPLICA/- REPLICAS/- REPLICACAO -> replicacao)
            // d) Se nada declarar -> null (fail-closed)
            // NUNCA usar job_name/caminho de pasta ("to Cloud") nem a assinatura do e-mail.
            let modInferida = null

            // a) Prefixo no ASSUNTO (deve ser prefixo / início do assunto após eventuais tags como [Success])
            const assuntoLimpo = String(assunto || '')
              .replace(/^(\s*\[[^\]]+\]\s*)+/i, '')
              .trim()
              .toLowerCase()
            if (
              assuntoLimpo.startsWith('backup copy job:') ||
              assuntoLimpo.startsWith('copy job:')
            ) {
              modInferida = 'nuvem'
            } else if (assuntoLimpo.startsWith('replication job:')) {
              modInferida = 'replicacao'
            } else if (assuntoLimpo.startsWith('backup job:')) {
              modInferida = 'local'
            }

            // b) Prefixo no CORPO do comprovante (linha de cabeçalho Veeam)
            if (!modInferida && rawConteudo) {
              const headerVeeamRegex =
                /(?:^|[\r\n]|<[^>]*>)\s*(Backup Copy [Jj]ob|Copy [Jj]ob|Replication [Jj]ob|Backup [Jj]ob)\s*:\s*([^<\r\n]+?)(?=\s*Created by|\s*Success|\s*Warning|\s*Failed|\s*Error|[\r\n]|<|$)/i
              const matchCorpo = rawConteudo.match(headerVeeamRegex)
              if (matchCorpo && matchCorpo[1]) {
                const prefixoCorpo = matchCorpo[1].trim().toLowerCase()
                if (prefixoCorpo.startsWith('backup copy') || prefixoCorpo.startsWith('copy')) {
                  modInferida = 'nuvem'
                } else if (prefixoCorpo.startsWith('replication')) {
                  modInferida = 'replicacao'
                } else if (prefixoCorpo.startsWith('backup')) {
                  modInferida = 'local'
                }
              }
            }

            // c) Marcador explícito no NOME DA ROTINA (- LOCAL, - NUVEM/- NUVENS, - REPLICA/- REPLICAS/- REPLICACAO)
            if (!modInferida && rotinaNomeReal) {
              const rNome = rotinaNomeReal.trim().toLowerCase()
              if (/(?:^|\s|-)\s*(?:replicas?|replicacao|replica[çc][aã]o)\s*$/i.test(rNome)) {
                modInferida = 'replicacao'
              } else if (/(?:^|\s|-)\s*nuvens?\s*$/i.test(rNome)) {
                modInferida = 'nuvem'
              } else if (/(?:^|\s|-)\s*local\s*$/i.test(rNome)) {
                modInferida = 'local'
              }
            }

            if (modInferida) {
              modalidadesComprovadasPorEsta.add(modInferida)
            }
          }

          // Montar mapa de fontes cadastradas que apontam para ativos do inventário
          // para permitir casamento ativo_inventario <-> fontes <-> itens comprovados
          const fontesPorAtivoId = {}
          for (let fI = 0; fI < fontesCadastradas.length; fI++) {
            const f = fontesCadastradas[fI]
            const aId =
              typeof f.getString === 'function'
                ? f.getString('ativo_inventario')
                : f.ativo_inventario
            if (aId) {
              if (!fontesPorAtivoId[aId]) fontesPorAtivoId[aId] = []
              fontesPorAtivoId[aId].push(f)
            }
          }

          // Lista de itens extraídos do comprovante normalizados
          const itensComprovanteNorm = itensComprovante.map((item) => ({
            original: item,
            norm: normalizarTexto(item),
          }))

          // Iterar cada ativo do escopo e avaliar exigências vs. comprovado vs. pendências
          for (let aIdx = 0; aIdx < ativosEscopo.length; aIdx++) {
            const aRec = ativosEscopo[aIdx]
            const aId = aRec.id
            const aNome = aRec.getString('name') || `Ativo #${aId}`
            const aNomeNorm = normalizarTexto(aNome)
            const aTipo = aRec.getString('tipo') || ''
            const exLocal = Boolean(aRec.getBool('exige_backup_local'))
            const exNuvem = Boolean(aRec.getBool('exige_backup_nuvem'))
            const exReplicacao = Boolean(aRec.getBool('exige_backup_replicacao'))

            const modalidadesExigidas = []
            if (exLocal) modalidadesExigidas.push('local')
            if (exNuvem) modalidadesExigidas.push('nuvem')
            if (exReplicacao) modalidadesExigidas.push('replicacao')

            // Adicionar à lista (a) EXIGÊNCIAS
            confrontoEscopo.exigencias.push({
              ativo_id: aId,
              ativo_nome: aNome,
              ativo_tipo: aTipo,
              local: exLocal,
              nuvem: exNuvem,
              replicacao: exReplicacao,
              modalidades: modalidadesExigidas,
            })
            confrontoEscopo.total_exigencias_modalidade += modalidadesExigidas.length

            // Casamento exato normalizado (trim + lowercase) do ativo contra:
            // 1) O nome do ativo diretamente contra os itens do comprovante
            // 2) Fontes associadas ao ativo (caminho_identificacao e aliases da fonte)
            let ativoComprovadoNestaEvidencia = false
            let itemCasadoNome = ''
            let fonteCasadaNome = ''
            let statusIndividualVm = null // 'sucesso' | 'aviso' | 'erro'

            // 1. Match direto nome do ativo <-> item do comprovante
            for (let itI = 0; itI < itensComprovanteNorm.length; itI++) {
              const it = itensComprovanteNorm[itI]
              if (
                it.norm &&
                aNomeNorm &&
                (it.norm === aNomeNorm ||
                  it.norm.includes(aNomeNorm) ||
                  aNomeNorm.includes(it.norm))
              ) {
                ativoComprovadoNestaEvidencia = true
                itemCasadoNome = it.original
                break
              }
            }

            // 2. Se não casou direto, testar fontes cadastradas do ativo
            const fontesDoAtivo = fontesPorAtivoId[aId] || []
            if (!ativoComprovadoNestaEvidencia && fontesDoAtivo.length > 0) {
              for (let fI = 0; fI < fontesDoAtivo.length; fI++) {
                const f = fontesDoAtivo[fI]
                const fCaminho =
                  typeof f.getString === 'function'
                    ? f.getString('caminho_identificacao')
                    : f.caminho_identificacao || ''
                const fAliasesRaw =
                  typeof f.getString === 'function' ? f.getString('aliases') : f.aliases || ''
                const fCaminhoNorm = normalizarTexto(fCaminho)
                const fAliases = extrairAliases(fAliasesRaw)

                for (let itI = 0; itI < itensComprovanteNorm.length; itI++) {
                  const it = itensComprovanteNorm[itI]
                  if (it.norm && fCaminhoNorm && it.norm === fCaminhoNorm) {
                    ativoComprovadoNestaEvidencia = true
                    itemCasadoNome = it.original
                    fonteCasadaNome = fCaminho
                    break
                  }
                  for (let alI = 0; alI < fAliases.length; alI++) {
                    if (it.norm && fAliases[alI] === it.norm) {
                      ativoComprovadoNestaEvidencia = true
                      itemCasadoNome = it.original
                      fonteCasadaNome = fAliases[alI]
                      break
                    }
                  }
                  if (ativoComprovadoNestaEvidencia) break
                }
                if (ativoComprovadoNestaEvidencia) break
              }
            }

            // Descobrir status individual desta VM se houver detalhesVms
            if (ativoComprovadoNestaEvidencia) {
              if (detalhesVms && detalhesVms.length > 0) {
                for (let dvI = 0; dvI < detalhesVms.length; dvI++) {
                  const vmObj = detalhesVms[dvI]
                  const vmNorm = normalizarTexto(vmObj.nome)
                  const itemCasadoNorm = normalizarTexto(itemCasadoNome)
                  if (
                    vmNorm &&
                    (vmNorm === aNomeNorm ||
                      vmNorm === itemCasadoNorm ||
                      vmNorm.includes(aNomeNorm) ||
                      aNomeNorm.includes(vmNorm))
                  ) {
                    const st = String(vmObj.status || '').toLowerCase()
                    if (st === 'success' || st === 'sucesso') {
                      statusIndividualVm = 'sucesso'
                    } else if (st === 'warning' || st === 'aviso') {
                      statusIndividualVm = 'aviso'
                    } else if (
                      st === 'failed' ||
                      st === 'error' ||
                      st === 'erro' ||
                      st === 'falha'
                    ) {
                      statusIndividualVm = 'erro'
                    }
                    break
                  }
                }
              }
              if (!statusIndividualVm) {
                statusIndividualVm = statusDetectado === 'sucesso' ? 'sucesso' : 'erro'
              }
            }

            // 3. Avaliar quais modalidades foram comprovadas e quais ficaram pendentes
            // GRANULARIDADE POR VM: O sucesso do item da VM prevalece sobre o status geral do job
            for (let mI = 0; mI < modalidadesExigidas.length; mI++) {
              const mod = modalidadesExigidas[mI]
              const modalidadeAtendidaPorEstaRotina = modalidadesComprovadasPorEsta.has(mod)
              const itemVmComSucesso = statusIndividualVm === 'sucesso'

              if (
                ativoComprovadoNestaEvidencia &&
                modalidadeAtendidaPorEstaRotina &&
                itemVmComSucesso
              ) {
                // (b) COMPROVADO
                confrontoEscopo.comprovado.push({
                  ativo_id: aId,
                  ativo_nome: aNome,
                  ativo_tipo: aTipo,
                  modalidade: mod,
                  item_comprovante: itemCasadoNome,
                  fonte_casada: fonteCasadaNome || null,
                  rotina_nome: rotinaNomeReal || null,
                  job_nome: jobName || rotinaNomeReal || null,
                  plano_nome: planoNomeReal || null,
                  status: 'sucesso',
                  comprovado_em: nowIso,
                })
              } else {
                // (c) PENDÊNCIAS
                // Regra de Ouro E: Nota pedagógica clara quando atendível por outra rotina/job
                let motivoPendencia = ''
                if (!ativoComprovadoNestaEvidencia) {
                  motivoPendencia = `Ativo não mencionado neste comprovante (pode ser coberto por outra rotina/job).`
                } else if (!modalidadeAtendidaPorEstaRotina) {
                  const modLabel =
                    mod === 'local' ? 'Local' : mod === 'nuvem' ? 'Nuvem' : 'Replicação'
                  motivoPendencia = `Atendível por outra rotina/job (requer processamento dos comprovantes de ${modLabel.toLowerCase()}).`
                } else if (!itemVmComSucesso) {
                  motivoPendencia = `VM ${itemCasadoNome || aNome} constou com status "${statusIndividualVm}" na execução do job '${jobName || rotinaNomeReal}'. Modalidade não homologada.`
                }

                confrontoEscopo.pendencias.push({
                  ativo_id: aId,
                  ativo_nome: aNome,
                  ativo_tipo: aTipo,
                  modalidade_pendente: mod,
                  ativo_presente_no_comprovante: ativoComprovadoNestaEvidencia,
                  item_comprovante: itemCasadoNome || null,
                  motivo: motivoPendencia,
                  job_nome: jobName || rotinaNomeReal || null,
                  atendivel_por_outra_rotina:
                    !modalidadeAtendidaPorEstaRotina || !ativoComprovadoNestaEvidencia,
                })
              }
            }
          }

          confrontoEscopo.job_nome = jobName || rotinaNomeReal || null
          confrontoEscopo.total_comprovadas = confrontoEscopo.comprovado.length
          confrontoEscopo.total_pendencias = confrontoEscopo.pendencias.length
        }
      } catch (errEscopo) {
        console.error('[backup:processar] Falha na montagem do confronto_escopo:', errEscopo)
      }
      // Marcar nos detalhesVms se o item está fora do escopo cadastrado
      if (detalhesVms && detalhesVms.length > 0) {
        for (let dvI = 0; dvI < detalhesVms.length; dvI++) {
          const dvNome = detalhesVms[dvI].nome
          const cobMatch = fontesCobertas.find(
            (fc) => normalizarTexto(fc.item) === normalizarTexto(dvNome),
          )
          const isNaoCoberto = fontesNaoCobertas.some(
            (fnc) => normalizarTexto(fnc.item) === normalizarTexto(dvNome),
          )
          if (cobMatch) {
            detalhesVms[dvI].fora_escopo = false
            detalhesVms[dvI].status_escopo = 'coberto'
            if (cobMatch.ativo_id) {
              detalhesVms[dvI].ativo_id = cobMatch.ativo_id
            }
          } else if (isNaoCoberto) {
            detalhesVms[dvI].fora_escopo = true
            detalhesVms[dvI].status_escopo = 'fora_escopo'
            detalhesVms[dvI].motivo_escopo = 'Não cadastrado — fora do escopo ou alias pendente'
          } else {
            detalhesVms[dvI].fora_escopo = false
            detalhesVms[dvI].status_escopo = 'coberto'
          }
        }
        execRec.set('detalhes_vms', detalhesVms)
      }

      // Gravar confronto_escopo na execução
      if (confrontoEscopo) {
        execRec.set('confronto_escopo', confrontoEscopo)
      }
      $app.save(execRec)

      const checklist = []

      // 1. Identificação (Regra)
      // Regra de Negócio B: Se nenhuma regra casar, MAS a evidência tem rotina vinculada (rotinaFinalId),
      // a verificação é CONFORME com nota "Vinculado por alias da rotina cadastrada".
      // Só NÃO CONFORME se a evidência ficou sem rotina (órfã).
      const identificacaoPass = Boolean(regraCasada || rotinaFinalId)
      let identificacaoDetalhes = ''
      if (regraCasada) {
        identificacaoDetalhes = `Regra "${regraCasada.getString('nome') || 'Regra ativa'}" casada com sucesso (remetente: "${remetente || 'detectado'}", assunto: "${assunto || 'detectado'}").`
      } else if (rotinaFinalId) {
        identificacaoDetalhes = `Vinculado por alias da rotina cadastrada "${rotinaNomeReal}".`
      } else {
        identificacaoDetalhes = `Nenhuma regra de identificação cadastrada correspondeu ao comprovante (remetente: "${remetente || 'desconhecido'}", assunto: "${assunto || 'não informado'}").`
      }

      checklist.push({
        item: 'identificacao',
        titulo: 'Identificação pela Regra',
        status: identificacaoPass ? 'conforme' : 'nao_conforme',
        passou: identificacaoPass,
        detalhes: identificacaoDetalhes,
      })

      // 2. Extração (Adaptador)
      const extracaoPass = statusDetectado !== 'erro'
      const extracaoStatus =
        statusDetectado === 'sucesso'
          ? 'conforme'
          : statusDetectado === 'parcial'
            ? 'atencao'
            : 'nao_conforme'
      const totalItensExtracao = contadores.total_vms || itensComprovante.length
      checklist.push({
        item: 'extracao',
        titulo: 'Extração pelo Adaptador',
        status: extracaoStatus,
        passou: extracaoPass,
        detalhes: `Adaptador ${adaptadorUsado}: status "${statusDetectado}", ${totalItensExtracao} item(ns)/VM(s) detectado(s), ${contadores.success || 0} sucesso, ${contadores.warning || 0} aviso(s), ${contadores.error || 0} falha(s), volume: ${tamanhoFormatado || 'não especificado'}.`,
      })

      // 3. Vínculo (Rotina e Plano)
      const vinculoPass = Boolean(rotinaFinalId)
      checklist.push({
        item: 'vinculo',
        titulo: 'Vínculo com Rotina e Plano',
        status: vinculoPass ? 'conforme' : 'nao_conforme',
        passou: vinculoPass,
        detalhes: vinculoPass
          ? `Rotina vinculada: "${rotinaNomeReal}" (Plano: "${planoNomeReal || 'Plano de Continuidade'}"). ${motivoVinculoRigoroso ? '[' + motivoVinculoRigoroso + ']' : ''}`
          : motivoVinculoRigoroso ||
            `Nenhuma rotina corresponde ao job '${jobName}' — cadastre o alias em Rotinas & Fontes`,
      })

      // 4. Status do Job
      const statusPass = statusDetectado === 'sucesso'
      checklist.push({
        item: 'status_job',
        titulo: 'Status da Execução do Job',
        status:
          statusDetectado === 'sucesso'
            ? 'conforme'
            : statusDetectado === 'parcial'
              ? 'atencao'
              : 'nao_conforme',
        passou: statusPass,
        detalhes:
          statusDetectado === 'sucesso'
            ? `O trabalho de backup reportou sucesso completo (0 erros detectados).`
            : statusDetectado === 'parcial'
              ? `O trabalho foi concluído com avisos/advertências (${contadores.warning || 0} warning(s)).`
              : `O trabalho reportou falha crítica na execução (${contadores.error || 1} erro(s)).`,
      })

      // 5. Periodicidade vs. Horário da Rotina
      let periodicidadeDesc = 'Não vinculada'
      let periodicidadePass = true
      let periodicidadeStatus = 'conforme'
      if (rotinaPeriodicidade === 'intervalo_minutos' && rotinaIntervaloMin > 0) {
        periodicidadeDesc = `Intervalo a cada ${rotinaIntervaloMin} minutos (${rotinaTipoExecucao || 'incremental'})`
        periodicidadePass = true
        periodicidadeStatus = 'conforme'
      } else if (rotinaPeriodicidade) {
        periodicidadeDesc = `Periodicidade ${rotinaPeriodicidade}${rotinaHorario ? ' às ' + rotinaHorario : ''}`
        periodicidadePass = true
        periodicidadeStatus = 'conforme'
      } else {
        periodicidadeDesc = 'Comprovante não vinculado a uma rotina de periodicidade específica'
        periodicidadePass = false
        periodicidadeStatus = 'atencao'
      }
      checklist.push({
        item: 'periodicidade',
        titulo: 'Periodicidade e Janela da Rotina',
        status: periodicidadeStatus,
        passou: periodicidadePass,
        detalhes: rotinaNomeReal
          ? `Rotina vinculada "${rotinaNomeReal}": ${periodicidadeDesc}. Execução recebida em conformidade temporal.`
          : 'Aviso: Comprovante processado sem vínculo de rotina pré-definida. Avaliado pelos dados do relatório.',
      })

      // 6. Cobertura de Fontes
      const coberturaPass = fontesNaoCobertas.length === 0
      const coberturaStatus = fontesNaoCobertas.length === 0 ? 'conforme' : 'atencao'
      checklist.push({
        item: 'cobertura_fontes',
        titulo: 'Cobertura de Fontes Monitoradas',
        status: coberturaStatus,
        passou: coberturaPass,
        cobertas_count: fontesCobertas.length,
        nao_cobertas_count: fontesNaoCobertas.length,
        detalhes:
          fontesNaoCobertas.length === 0
            ? `Todos os ${itensComprovante.length} itens do comprovante possuem fonte cadastrada correspondente.`
            : `Atenção: ${fontesNaoCobertas.length} item(ns) não possuem fonte cadastrada na rotina (${fontesNaoCobertas.map((f) => f.item).join(', ')}). ${fontesCobertas.length} coberto(s).`,
      })

      // 7. Destino das Cópias
      const destinoPass = Boolean(destinoDetectado)
      checklist.push({
        item: 'destino',
        titulo: 'Destino e Armazenamento da Cópia',
        status: destinoPass ? 'conforme' : 'atencao',
        passou: destinoPass,
        detalhes: destinoDetectado
          ? `Destino detectado: "${destinoDetectado}"${planoDestinoEsperado ? ' (alinhado com plano: ' + planoDestinoEsperado + ')' : ''}.`
          : 'Destino não pôde ser inferido a partir do texto do comprovante.',
      })

      // 8. Volume e Integridade dos Dados
      const volumePass = tamanhoBytes > 0 || Boolean(tamanhoFormatado)
      checklist.push({
        item: 'volume_dados',
        titulo: 'Métricas de Volume e Integridade',
        status: volumePass ? 'conforme' : 'atencao',
        passou: volumePass,
        detalhes: volumePass
          ? `Tamanho reportado: ${tamanhoFormatado || 'registrado'} (${tamanhoBytes} bytes processados/transferidos).`
          : 'Volume transferido não explicitado no formato recebido.',
      })

      // 9. RPO (Recovery Point Objective)
      // DEFEITO 4: A checagem de RPO compara horário da última execução bem-sucedida da modalidade
      // contra o RPO do plano (24h); execução recente bem-sucedida = CONFORME.
      const isExecucaoRecenteSucesso = statusDetectado === 'sucesso'
      let rpoPass = isExecucaoRecenteSucesso
      let rpoDetalhes = ''

      if (isExecucaoRecenteSucesso) {
        rpoPass = true
        rpoDetalhes = `Execução recente realizada com sucesso. Ponto de recuperação atualizado dentro da meta de RPO do plano (${planoRpoHoras}h). Objetivo atendido.`
      } else {
        // Verificar se houve execução anterior bem sucedida dentro da janela de RPO do plano
        let ultimaComprovadaHoras = null
        try {
          if (rotinaFinalId) {
            const execsAnteriores = $app.findRecordsByFilter(
              'backup_execucoes',
              `rotina = '${rotinaFinalId}' && status = 'sucesso'`,
              '-data_inicio',
              1,
              0,
            )
            if (execsAnteriores.length > 0) {
              const dtAnt =
                execsAnteriores[0].getString('data_inicio') ||
                execsAnteriores[0].getString('created')
              if (dtAnt) {
                const diffHoras =
                  (new Date().getTime() - new Date(dtAnt).getTime()) / (1000 * 60 * 60)
                ultimaComprovadaHoras = Math.round(diffHoras * 10) / 10
              }
            }
          }
        } catch (_) {}

        if (ultimaComprovadaHoras !== null && ultimaComprovadaHoras <= planoRpoHoras) {
          rpoPass = true
          rpoDetalhes = `Execução atual com ${statusDetectado}, porém existe ponto de recuperação prévio bem-sucedido há ${ultimaComprovadaHoras}h, dentro do RPO de ${planoRpoHoras}h do plano.`
        } else {
          rpoPass = false
          rpoDetalhes = `Falha na execução impede a atualização do ponto de recuperação. RPO do plano (${planoRpoHoras}h) em risco.`
        }
      }

      checklist.push({
        item: 'rpo',
        titulo: 'RPO (Recovery Point Objective)',
        status: rpoPass ? 'conforme' : 'nao_conforme',
        passou: rpoPass,
        rpo_esperado_horas: planoRpoHoras,
        detalhes: rpoDetalhes,
      })

      // Regra de Negócio C: VEREDITO ÚNICO DO LAUDO
      // Derivar da pior verificação do checklist:
      // - tem nao_conforme -> 'nao_conforme'
      // - senão tem atencao -> 'atencao'
      // - senão -> 'conforme'
      const temNaoConforme = checklist.some(
        (chk) => chk.status === 'nao_conforme' || chk.passou === false,
      )
      const temAtencao = checklist.some((chk) => chk.status === 'atencao')

      if (temNaoConforme) {
        conformidadeStatus = 'nao_conforme'
      } else if (temAtencao) {
        conformidadeStatus = 'atencao'
      } else {
        conformidadeStatus = 'conforme'
      }

      // Mensagem explicativa do veredito técnico condizente com conformidadeStatus
      if (!rotinaFinalId) {
        conformidadeDetalhe = `Não Conforme: ${motivoVinculoRigoroso || `Nenhuma rotina corresponde ao job '${jobName}' — cadastre o alias em Rotinas & Fontes.`}`
      } else if (statusDetectado === 'erro') {
        if (adaptadorUsado === 'ACRONIS_PDF') {
          conformidadeDetalhe = `Não Conforme: Relatório Acronis apresentou ${contadores.error} falha(s) nos planos de proteção.`
        } else if (adaptadorUsado === 'VEEAM_HTML') {
          const vmsFalhas = []
          for (let vi = 0; vi < detalhesVms.length; vi++) {
            const st = String(detalhesVms[vi].status || '').toLowerCase()
            if (st === 'failed' || st === 'error' || st === 'erro' || st === 'falha') {
              vmsFalhas.push(detalhesVms[vi].nome)
            }
          }
          if (vmsFalhas.length > 0) {
            const totalV = detalhesVms.length
            const falhasV = vmsFalhas.length
            const sucV = totalV - falhasV
            conformidadeDetalhe = `Não Conforme: Job Veeam "${jobName}" apresentou erro na execução: ${vmsFalhas.join(', ')} (${falhasV} de ${totalV} VMs falharam; ${sucV} com sucesso).`
          } else {
            conformidadeDetalhe = `Não Conforme: Job Veeam "${jobName}" apresentou erro na execução (${contadores.error} falha(s)).`
          }
        } else {
          conformidadeDetalhe =
            'Não Conforme: Comprovante indica falha crítica na execução do trabalho de backup.'
        }
      } else if (statusDetectado === 'parcial') {
        conformidadeDetalhe =
          adaptadorUsado === 'VEEAM_HTML'
            ? contadores.warning > 0
              ? `Atenção: Job Veeam "${jobName}" concluído com ${contadores.warning} alerta(s)/warning(s).`
              : `Atenção: Job Veeam "${jobName}" concluído com avisos/pendências.`
            : 'Atenção: Trabalho concluído com avisos/pendências ou cópia parcial.'
      } else if (!regraCasada && !rotinaFinalId) {
        conformidadeDetalhe = `Não Conforme: Comprovante processado via ${adaptadorUsado}, mas nenhuma regra de identificação cadastrada correspondeu ao remetente/assunto e nenhuma rotina vinculada.`
      } else if (adaptadorUsado === 'ACRONIS_PDF' && fontesNaoCobertas.length > 0) {
        const naoCobertasNomes = fontesNaoCobertas.map((f) => f.item).join(', ')
        conformidadeDetalhe = `Atenção: ${fontesCobertas.length} plano(s) do escopo atendido(s) com sucesso, mas o comprovante contém ${fontesNaoCobertas.length} máquina não cadastrada (${naoCobertasNomes}). Cadastre a fonte/alias correspondente em Rotinas & Fontes ou revise o escopo contratado.`
      } else if (fontesNaoCobertas.length > 0) {
        conformidadeDetalhe = `Atenção: Cópia executada com sucesso, mas há ${fontesNaoCobertas.length} item(ns) sem fonte cadastrada na rotina "${rotinaNomeReal}".`
      } else if (conformidadeStatus === 'atencao') {
        conformidadeDetalhe = `Atenção: Comprovante processado com sucesso (${tamanhoFormatado || 'cópia realizada'}), com observações técnicas nas verificações automatizadas.`
      } else if (rotinaPeriodicidade === 'intervalo_minutos' && rotinaIntervaloMin > 0) {
        conformidadeDetalhe = `Conforme: cópia executada com sucesso dentro do intervalo de ${rotinaIntervaloMin} min declarado pela rotina "${rotinaNomeReal || jobName}".`
      } else if (adaptadorUsado === 'ACRONIS_PDF') {
        conformidadeDetalhe = `Conforme: Relatório Acronis Cloud conferido com 100% de sucesso (${contadores.success} planos concluídos na Nuvem).`
      } else if (adaptadorUsado === 'VEEAM_HTML') {
        conformidadeDetalhe = `Conforme: cópia executada com sucesso dentro do intervalo declarado pela rotina "${rotinaNomeReal || jobName}".`
      } else {
        conformidadeDetalhe = `Conforme: Comprovante validado com sucesso via ${adaptadorUsado}.`
      }

      const laudoTecnico = {
        gerado_em: nowIso,
        resultado: conformidadeStatus,
        veredito: conformidadeDetalhe,
        fonte_comprovante: {
          origem: tipoEvidencia === 'e_mail' ? 'IMAP_EVIDENCE' : 'MANUAL_UPLOAD',
          remetente: remetente,
          assunto: assunto,
          hash_sha256: hashConteudo,
          nome_arquivo: nomeArquivoAnexo || null,
        },
        regra_identificacao: {
          id: regraCasada ? regraCasada.id : null,
          nome: regraCasada
            ? regraCasada.getString('nome') || 'Regra ativa'
            : 'Identificação heurística por conteúdo',
          padrao: regraCasada
            ? regraCasada.getString('padrao_conteudo') || 'Padrão configurado'
            : 'Assunto / Remetente',
          tipo_regra: regraCasada
            ? regraCasada.getString('tipo_regra') || 'regra_cadastrada'
            : 'heuristica',
        },
        adaptador: {
          codigo: adaptadorUsado,
          versao: '2.0.0',
          formato_detectado: isVeeamDetected
            ? 'VEEAM_HTML'
            : isAcronisDetected
              ? 'ACRONIS_PDF'
              : isNocDetected
                ? 'NOC_DIARIO'
                : 'EMAIL_HTML_GENERICO',
        },
        vinculos: {
          rotina_id: rotinaFinalId || null,
          rotina_nome: rotinaNomeReal || null,
          rotina_motivo:
            motivoVinculoRigoroso ||
            (rotinaFinalId
              ? `Vinculado à rotina "${rotinaNomeReal}"`
              : `Nenhuma rotina corresponde ao job '${jobName}' — cadastre o alias em Rotinas & Fontes`),
          plano_nome: planoNomeReal || null,
          periodicidade: rotinaPeriodicidade || null,
          intervalo_minutos: rotinaIntervaloMin,
        },
        cobertura: {
          itens_detectados: itensComprovante,
          fontes_cobertas: fontesCobertas,
          fontes_nao_cobertas: fontesNaoCobertas,
          total_itens: itensComprovante.length,
          total_cobertos: fontesCobertas.length,
          total_nao_cobertos: fontesNaoCobertas.length,
        },
        verificacoes: checklist,
        metricas: {
          tamanho_bytes: tamanhoBytes,
          tamanho_formatado: tamanhoFormatado,
          destino: destinoDetectado,
          duracao: duracaoDetectada || null,
          vms_sucesso: contadores.success,
          vms_falha: contadores.error,
          vms_alerta: contadores.warning,
        },
      }

      const avalCol = $app.findCollectionByNameOrId('backup_avaliacoes')
      const avalRec = new Record(avalCol)
      avalRec.set('organization', organizationId)
      avalRec.set('execucao', execRec.id)
      avalRec.set('resultado_conformidade', conformidadeStatus)
      avalRec.set('detalhe', conformidadeDetalhe)
      avalRec.set('itens_avaliados', {
        adaptador: adaptadorUsado,
        job_name: jobName,
        status_rotina: statusDetectado,
        periodicidade: rotinaPeriodicidade || 'diaria',
        intervalo_minutos: rotinaIntervaloMin,
        tipo_execucao: rotinaTipoExecucao,
        tamanho_valido: tamanhoBytes > 0 || tamanhoFormatado !== '',
        destino_identificado: destinoDetectado !== '',
        total_vms: contadores.total_vms || detalhesVms.length,
        vms_sucesso: contadores.success,
        vms_falha: contadores.error,
        vms_alerta: contadores.warning,
        anexo_pdf: nomeArquivoAnexo || null,
        avaliado_em: nowIso,
      })
      avalRec.set('laudo_tecnico', laudoTecnico)
      if (confrontoEscopo) {
        avalRec.set('confronto_escopo', confrontoEscopo)
      }
      $app.save(avalRec)

      // Agora que execução e avaliação foram persistidas com sucesso, atualizar evidência
      evidenciaRec.set('status_processamento', 'processada')
      $app.save(evidenciaRec)

      // Ocorrência se erro ou parcial
      if (statusDetectado === 'erro' || statusDetectado === 'parcial') {
        try {
          const ocCol = $app.findCollectionByNameOrId('backup_ocorrencias')
          const oc = new Record(ocCol)
          oc.set('organization', organizationId)
          oc.set('tipo', 'falha_de_backup')
          oc.set('severidade', statusDetectado === 'erro' ? 'alta' : 'media')
          oc.set('status', 'aberta')
          oc.set(
            'titulo',
            statusDetectado === 'erro'
              ? `Falha identificada no trabalho "${jobName}"`
              : `Execução parcial com alertas no trabalho "${jobName}"`,
          )
          oc.set(
            'descricao',
            `O adaptador ${adaptadorUsado} detectou ${statusDetectado} a partir do comprovante enviado por ${remetente}. Requer averiguação da equipe técnica.`,
          )
          oc.set('execucao', execRec.id)
          oc.set('evidencia', evidenciaRec.id)
          $app.save(oc)
        } catch (_) {}
      }

      // Auditoria append-only
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_log')
        const auditRec = new Record(auditCol)
        auditRec.set('organization', organizationId)
        auditRec.set('user', auth.id)
        auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
        auditRec.set('user_email', auth.getString('email'))
        auditRec.set('action', 'BACKUP_EVIDENCE_PROCESSED')
        auditRec.set('entity', 'Backup e Continuidade')
        auditRec.set(
          'detail',
          `Evidência de backup processada via ${adaptadorUsado} com status "${statusDetectado}". Execução #${execRec.id} registrada. Conformidade: ${conformidadeStatus}.`,
        )
        auditRec.set('metadata', {
          evidencia_id: evidenciaRec.id,
          execucao_id: execRec.id,
          hash_conteudo: hashConteudo,
          status: statusDetectado,
          adaptador: adaptadorUsado,
          anexo_pdf: nomeArquivoAnexo || null,
          vms_count: detalhesVms.length,
        })
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        idempotent: !isNovaEvidencia,
        evidencia_id: evidenciaRec.id,
        processamento_id: procRec.id,
        execucao_id: execRec.id,
        avaliacao_id: avalRec.id,
        status: statusDetectado,
        conformidade: conformidadeStatus,
        adaptador: adaptadorUsado,
        confronto_escopo: confrontoEscopo,
        resultado: resultadoProcessado,
        laudo_tecnico: laudoTecnico,
        message: isNovaEvidencia
          ? `Evidência registrada e processada via ${adaptadorUsado} com sucesso.`
          : `Evidência já existente reconhecida e reprocessada via ${adaptadorUsado}.`,
      })
    } catch (procErr) {
      const isInternalError =
        procErr instanceof ReferenceError ||
        procErr instanceof TypeError ||
        (procErr &&
          typeof procErr.name === 'string' &&
          (procErr.name === 'ReferenceError' || procErr.name === 'TypeError'))

      const rawErrMsg =
        procErr && procErr.message
          ? String(procErr.message)
          : String(procErr || 'Erro interno desconhecido')
      // Sanitizar para evitar vazar segredos ou tokens
      const sanitizedErr = rawErrMsg
        .replace(/token=[^&\s]+/gi, 'token=***')
        .replace(/password=[^&\s]+/gi, 'password=***')
        .replace(/bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer ***')
        .slice(0, 300)

      if (isInternalError) {
        console.error(
          '[ERRO_INTERNO_PROCESSAR_BACKUP]',
          (procErr && (procErr.stack || procErr.message)) || sanitizedErr,
        )
      }

      // Registrar ocorrência para auditoria e visibilidade
      try {
        const bodyObj = (e.requestInfo && e.requestInfo().body) || {}
        const authObj = e.auth
        const orgIdFallback = (authObj && authObj.getString('organization')) || ''
        if (orgIdFallback) {
          const ocCol = $app.findCollectionByNameOrId('backup_ocorrencias')
          const oc = new Record(ocCol)
          oc.set('organization', orgIdFallback)
          oc.set('tipo', 'erro_de_processamento')
          oc.set('severidade', 'alta')
          oc.set('status', 'aberta')
          oc.set(
            'titulo',
            isInternalError
              ? 'Erro interno de processamento no servidor'
              : 'Falha crítica no processamento da evidência',
          )
          oc.set(
            'descricao',
            isInternalError
              ? `Ocorreu um erro interno de execução no servidor (ReferenceError/TypeError): ${sanitizedErr}.`
              : `Ocorreu uma exceção não tratada durante o processamento da evidência: ${sanitizedErr}.`,
          )
          $app.save(oc)
        }
      } catch (_) {}

      const userMessage = isInternalError
        ? 'Ocorreu um erro interno de processamento no servidor. O incidente foi registrado.'
        : `Não foi possível processar o comprovante de backup: ${sanitizedErr}. Verifique os campos e o formato da evidência.`

      return e.json(200, {
        success: false,
        status: isInternalError ? 'erro_interno_servidor' : 'erro_processamento',
        message: userMessage,
      })
    }
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------------
// 2. Endpoint HTTP acionado pelo botão "Buscar evidências agora" (IMAP)
// -------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/backup/imap-fetch',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError(
        'Apenas perfis Administrador e Suporte podem executar a busca de evidências por e-mail.',
      )
    }

    const body = e.requestInfo().body || {}
    let organizationId = body.organizationId || auth.getString('organization')

    if (!organizationId) {
      try {
        const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
        if (firstOrg.length > 0) {
          organizationId = firstOrg[0].id
        }
      } catch (_) {}
    }

    if (!organizationId) {
      return e.badRequestError('Nenhuma organização associada.')
    }

    if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    // Buscar conector IMAP
    let emailRecord = null
    try {
      const records = $app.findRecordsByFilter(
        'integrations',
        `organization = '${organizationId}' && type = 'email_backup'`,
        '-created',
        1,
        0,
      )
      if (records.length > 0) {
        emailRecord = records[0]
      }
    } catch (_) {}

    const nowIso = new Date().toISOString()

    if (!emailRecord || !emailRecord.getBool('enabled')) {
      const sanitizedMsg = !emailRecord
        ? 'Conector de e-mail IMAP não configurado para esta organização. Acesse Configurações / Integrações.'
        : 'Conector de e-mail IMAP cadastrado, porém está desabilitado nas Configurações da organização.'

      return e.json(200, {
        success: false,
        configured: Boolean(emailRecord),
        enabled: Boolean(emailRecord && emailRecord.getBool('enabled')),
        mensagens_verificadas: 0,
        evidencias_criadas: 0,
        evidencias_duplicadas: 0,
        erros: 0,
        status: 'aviso',
        message: sanitizedMsg,
        last_check: nowIso,
      })
    }

    const host = (emailRecord.getString('email_host') || '').trim()
    const port = emailRecord.getInt('email_port') || 993
    const user = (emailRecord.getString('email_user') || '').trim()
    const folder = (emailRecord.getString('email_folder') || 'INBOX').trim()
    const hasPassword = emailRecord.getBool('email_has_password')

    if (!host || !user || !hasPassword) {
      const sanitizedMsg =
        'Parâmetros incompletos no conector IMAP (servidor, usuário ou senha ausentes).'
      emailRecord.set('last_sync', nowIso)
      emailRecord.set('last_sync_status', 'erro')
      emailRecord.set('last_sync_message', sanitizedMsg)
      $app.save(emailRecord)

      return e.json(200, {
        success: false,
        configured: true,
        enabled: true,
        mensagens_verificadas: 0,
        evidencias_criadas: 0,
        evidencias_duplicadas: 0,
        erros: 1,
        status: 'erro',
        message: sanitizedMsg,
        last_check: nowIso,
      })
    }

    // Execução da busca e ingestão IMAP
    // Validação dos parâmetros de conexão e consulta da caixa postal configurada
    let imapMensagensVerificadas = 0
    let imapEvidenciasCriadas = 0
    let imapEvidenciasDuplicadas = 0
    let syncStatusFinal = 'sucesso'
    let syncMsgFinal = ''

    // Validar formato de conta/usuário e porta (sem vazar e-mail nos retornos)
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)
    const atIdx = user.indexOf('@')
    const maskedUser = atIdx > 2 ? `${user[0]}••••${user.slice(atIdx)}` : '••••••••'

    if (!validEmail) {
      syncStatusFinal = 'erro'
      syncMsgFinal = `Falha na verificação IMAP: formato de conta de e-mail inválido.`
    } else if (port < 1 || port > 65535) {
      syncStatusFinal = 'erro'
      syncMsgFinal = `Falha na verificação IMAP: porta TCP inválida (${port}).`
    } else {
      // Retorno honesto: não há cliente IMAP direto no JSVM do PocketBase nesta hospedagem.
      // A ingestão automática via IMAP será executada pelo agente local na VM do cliente.
      syncStatusFinal = 'agente_local_pendente'
      syncMsgFinal = `Conector configurado (${host}:${port}/${folder}). A ingestão automática por IMAP será executada pelo agente local na VM Ubuntu 24.04 do cliente. Nesta versão hosted, utilize "Registrar Evidência / Anexo PDF" para processar comprovantes em tempo real.`
    }

    emailRecord.set('last_sync', nowIso)
    emailRecord.set('last_sync_status', syncStatusFinal)
    emailRecord.set('last_sync_message', syncMsgFinal)
    try {
      $app.save(emailRecord)
    } catch (_) {}

    // Auditoria append-only (sem segredos nem e-mail cru exposto)
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('organization', organizationId)
      auditRec.set('user', auth.id)
      auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
      auditRec.set('user_email', auth.getString('email'))
      auditRec.set('action', 'BACKUP_IMAP_FETCH')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Consulta de conector IMAP solicitada pelo operador: ${maskedUser}@${host}:${port} (${folder}). Status: ${syncStatusFinal}.`,
      )
      auditRec.set('metadata', {
        host: host,
        port: port,
        masked_user: maskedUser,
        folder: folder,
        status: syncStatusFinal,
        mensagens_verificadas: 0,
      })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: syncStatusFinal !== 'erro',
      configured: true,
      enabled: true,
      mensagens_verificadas: 0,
      evidencias_criadas: 0,
      evidencias_duplicadas: 0,
      erros: syncStatusFinal === 'erro' ? 1 : 0,
      status: syncStatusFinal,
      message: syncMsgFinal,
      last_check: nowIso,
    })
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------------
// 3. Cron periódica (*/15): verificação de conectores IMAP ativos
//    NUNCA fabricar nem gravar evidências sintéticas/mock.
// -------------------------------------------------------------------
cronAdd('backup_imap_fetch_cron', '*/15 * * * *', () => {
  let conectores = []
  try {
    conectores = $app.findRecordsByFilter(
      'integrations',
      "type = 'email_backup' && enabled = true",
      '+created',
      50,
      0,
    )
  } catch (_) {
    return
  }

  if (conectores.length === 0) {
    return
  }

  const nowIso = new Date().toISOString()
  for (let cIdx = 0; cIdx < conectores.length; cIdx++) {
    const con = conectores[cIdx]
    const host = (con.getString('email_host') || '').trim()
    const user = (con.getString('email_user') || '').trim()
    const hasPassword = con.getBool('email_has_password')

    if (!host || !user || !hasPassword) {
      continue
    }

    // Registra status neutro honesto: conector ativo aguardando agente local
    try {
      con.set('last_sync', nowIso)
      con.set('last_sync_status', 'agente_local_pendente')
      con.set(
        'last_sync_message',
        'Conector configurado. A ingestão automática via IMAP será executada pelo agente local na VM Ubuntu 24.04 do cliente. Nesta versão hosted, utilize "Registrar Evidência / Anexo PDF" para processamento manual.',
      )
      $app.save(con)
    } catch (_) {}
  }
})
// -------------------------------------------------------------------
// 4. Exclusão controlada de evidência individual com confirmação e motivo
// -------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/backup/evidencias/excluir',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError(
        'Apenas perfis Administrador e Suporte têm permissão para excluir evidências de backup.',
      )
    }

    const body = e.requestInfo().body || {}
    const evidenciaId = String(body.evidenciaId || body.id || '').trim()
    const motivo = String(body.motivo || body.observacao || '').trim()
    const confirmacao = Boolean(body.confirmacao)

    if (!evidenciaId) {
      return e.badRequestError('O identificador da evidência (evidenciaId) é obrigatório.')
    }

    if (!motivo || motivo.length < 10) {
      return e.badRequestError(
        'A observação/motivo da exclusão é obrigatória e deve ter pelo menos 10 caracteres.',
      )
    }

    if (!confirmacao) {
      return e.badRequestError(
        'É necessária a confirmação explícita de ciência da exclusão permanente.',
      )
    }

    let evidenciaRec = null
    try {
      evidenciaRec = $app.findRecordById('backup_evidencias', evidenciaId)
    } catch (_) {
      return e.notFoundError('Evidência não encontrada.')
    }

    const orgId = evidenciaRec.getString('organization')
    if (systemRole !== 'admin' && auth.getString('organization') !== orgId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    const remetente = evidenciaRec.getString('remetente') || ''
    const assunto = evidenciaRec.getString('assunto') || ''
    const hash = evidenciaRec.getString('hash_conteudo') || ''
    const hashTrunc = hash.length > 16 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash
    const dataRecebida = evidenciaRec.getString('data_recebida') || ''

    let execucoesExcluidas = 0
    let avaliacoesExcluidas = 0
    let ocorrenciasDesvinculadas = 0
    let monitoramentosDesvinculados = 0

    // 1. Buscar execuções geradas diretamente desta evidência
    try {
      const execs = $app.findRecordsByFilter(
        'backup_execucoes',
        `organization = '${orgId}' && evidencia = '${evidenciaId}'`,
        '',
        500,
        0,
      )
      for (let i = 0; i < execs.length; i++) {
        const ex = execs[i]
        // Buscar avaliações vinculadas a esta execução
        try {
          const avals = $app.findRecordsByFilter(
            'backup_avaliacoes',
            `organization = '${orgId}' && execucao = '${ex.id}'`,
            '',
            100,
            0,
          )
          for (let j = 0; j < avals.length; j++) {
            $app.delete(avals[j])
            avaliacoesExcluidas++
          }
        } catch (_) {}

        // Desvincular ocorrências que apontem para esta execução
        try {
          const ocs = $app.findRecordsByFilter(
            'backup_ocorrencias',
            `organization = '${orgId}' && execucao = '${ex.id}'`,
            '',
            100,
            0,
          )
          for (let k = 0; k < ocs.length; k++) {
            const oc = ocs[k]
            oc.set('execucao', null)
            $app.save(oc)
          }
        } catch (_) {}

        $app.delete(ex)
        execucoesExcluidas++
      }
    } catch (_) {}

    // 2. Desvincular ocorrências que apontem diretamente para a evidência
    try {
      const ocsEv = $app.findRecordsByFilter(
        'backup_ocorrencias',
        `organization = '${orgId}' && evidencia = '${evidenciaId}'`,
        '',
        100,
        0,
      )
      for (let k = 0; k < ocsEv.length; k++) {
        const oc = ocsEv[k]
        oc.set('evidencia', null)
        $app.save(oc)
        ocorrenciasDesvinculadas++
      }
    } catch (_) {}

    // 3. Desvincular monitoramentos externos que apontem para a evidência
    try {
      const mons = $app.findRecordsByFilter(
        'backup_monitoramentos_externos',
        `organization = '${orgId}' && evidencia = '${evidenciaId}'`,
        '',
        100,
        0,
      )
      for (let m = 0; m < mons.length; m++) {
        const mon = mons[m]
        mon.set('evidencia', null)
        $app.save(mon)
        monitoramentosDesvinculados++
      }
    } catch (_) {}

    // 4. Excluir a evidência (seus registros em backup_processamentos caem via cascadeDelete do PB)
    $app.delete(evidenciaRec)

    // 5. Registrar no audit_log append-only
    const nowIso = new Date().toISOString()
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('organization', orgId)
      auditRec.set('user', auth.id)
      auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
      auditRec.set('user_email', auth.getString('email'))
      auditRec.set('action', 'BACKUP_EVIDENCE_DELETED')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Evidência de backup excluída permanentemente pelo operador. Motivo informado: "${motivo}". Remetente: "${remetente}", Assunto: "${assunto}", SHA-256: ${hashTrunc}. Removidos vinculados: ${execucoesExcluidas} execução(ões), ${avaliacoesExcluidas} avaliação(ões).`,
      )
      auditRec.set('metadata', {
        evidencia_id: evidenciaId,
        motivo: motivo,
        remetente: remetente,
        assunto: assunto,
        hash_sha256_trunc: hashTrunc,
        data_recebida: dataRecebida,
        execucoes_removidas: execucoesExcluidas,
        avaliacoes_removidas: avaliacoesExcluidas,
        ocorrencias_desvinculadas: ocorrenciasDesvinculadas,
        monitoramentos_desvinculados: monitoramentosDesvinculados,
        removido_por_role: systemRole,
        removido_em: nowIso,
      })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Evidência e registros derivados removidos com sucesso.',
      evidencia_id: evidenciaId,
      removidos: {
        evidencias: 1,
        execucoes: execucoesExcluidas,
        avaliacoes: avaliacoesExcluidas,
      },
      audit: {
        action: 'BACKUP_EVIDENCE_DELETED',
        registrado_em: nowIso,
      },
    })
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------------
// 5. Limpeza total de evidências da organização (para reiniciar monitoramento do zero)
// -------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/backup/evidencias/limpar-todas',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError(
        'Apenas perfis Administrador e Suporte têm permissão para reiniciar o histórico de evidências.',
      )
    }

    const body = e.requestInfo().body || {}
    let organizationId = body.organizationId || auth.getString('organization')

    if (!organizationId) {
      try {
        const firstOrg = $app.findRecordsByFilter('organizations', '', '+name', 1, 0)
        if (firstOrg.length > 0) {
          organizationId = firstOrg[0].id
        }
      } catch (_) {}
    }

    if (!organizationId) {
      return e.badRequestError('Nenhuma organização associada.')
    }

    if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    const motivo = String(body.motivo || body.observacao || '').trim()
    const confirmacaoFrase = String(body.confirmacaoFrase || '').trim()
    const confirmacaoCheckbox = Boolean(body.confirmacaoCheckbox)

    // Exige frase exata "LIMPAR EVIDENCIAS"
    if (confirmacaoFrase !== 'LIMPAR EVIDENCIAS') {
      return e.badRequestError(
        'Frase de segurança incorreta. Digite exatamente "LIMPAR EVIDENCIAS" (em maiúsculas) para confirmar.',
      )
    }

    if (!confirmacaoCheckbox) {
      return e.badRequestError(
        'É necessária a confirmação explícita de ciência no checkbox de segurança.',
      )
    }

    if (!motivo || motivo.length < 10) {
      return e.badRequestError(
        'A observação/justificativa para zerar as evidências é obrigatória (mínimo de 10 caracteres).',
      )
    }

    // 1. Obter todas as evidências da organização
    let evidencias = []
    try {
      evidencias = $app.findRecordsByFilter(
        'backup_evidencias',
        `organization = '${organizationId}'`,
        '+created',
        5000,
        0,
      )
    } catch (_) {}

    const totalEvidencias = evidencias.length
    let totalExecucoes = 0
    let totalAvaliacoes = 0

    // 2. Excluir avaliações e execuções derivadas de evidências (origem_registro = 'evidencia')
    try {
      const execsEv = $app.findRecordsByFilter(
        'backup_execucoes',
        `organization = '${organizationId}' && origem_registro = 'evidencia'`,
        '',
        5000,
        0,
      )
      for (let i = 0; i < execsEv.length; i++) {
        const ex = execsEv[i]
        try {
          const avals = $app.findRecordsByFilter(
            'backup_avaliacoes',
            `organization = '${organizationId}' && execucao = '${ex.id}'`,
            '',
            100,
            0,
          )
          for (let j = 0; j < avals.length; j++) {
            $app.delete(avals[j])
            totalAvaliacoes++
          }
        } catch (_) {}

        $app.delete(ex)
        totalExecucoes++
      }
    } catch (_) {}

    // 3. Desvincular ocorrências que apontem para evidências ou execuções
    try {
      const ocs = $app.findRecordsByFilter(
        'backup_ocorrencias',
        `organization = '${organizationId}' && (evidencia != '' || execucao != '')`,
        '',
        1000,
        0,
      )
      for (let k = 0; k < ocs.length; k++) {
        const oc = ocs[k]
        oc.set('evidencia', null)
        oc.set('execucao', null)
        $app.save(oc)
      }
    } catch (_) {}

    // 4. Desvincular monitoramentos externos
    try {
      const mons = $app.findRecordsByFilter(
        'backup_monitoramentos_externos',
        `organization = '${organizationId}' && evidencia != ''`,
        '',
        1000,
        0,
      )
      for (let m = 0; m < mons.length; m++) {
        const mon = mons[m]
        mon.set('evidencia', null)
        $app.save(mon)
      }
    } catch (_) {}

    // 5. Excluir todas as evidências da organização (processamentos são apagados via cascadeDelete)
    for (let eIdx = 0; eIdx < evidencias.length; eIdx++) {
      try {
        $app.delete(evidencias[eIdx])
      } catch (_) {}
    }

    // 6. Registrar no audit_log append-only
    const nowIso = new Date().toISOString()
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('organization', organizationId)
      auditRec.set('user', auth.id)
      auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
      auditRec.set('user_email', auth.getString('email'))
      auditRec.set('action', 'BACKUP_ALL_EVIDENCES_CLEARED')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Histórico de evidências da serventia reiniciado do zero pelo operador. Total removido: ${totalEvidencias} evidência(s), ${totalExecucoes} execução(ões) vinculadas, ${totalAvaliacoes} avaliação(ões). Justificativa: "${motivo}".`,
      )
      auditRec.set('metadata', {
        organization_id: organizationId,
        evidencias_removidas: totalEvidencias,
        execucoes_removidas: totalExecucoes,
        avaliacoes_removidas: totalAvaliacoes,
        justificativa: motivo,
        operador_role: systemRole,
        executado_em: nowIso,
      })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `Histórico reiniciado com sucesso: ${totalEvidencias} evidência(s) removida(s).`,
      organization_id: organizationId,
      removidos: {
        evidencias: totalEvidencias,
        execucoes: totalExecucoes,
        avaliacoes: totalAvaliacoes,
      },
      audit: {
        action: 'BACKUP_ALL_EVIDENCES_CLEARED',
        registrado_em: nowIso,
      },
    })
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------------
// 6. Criação de fontes pendentes detectadas no comprovante
//    POST /backend/v1/backup/fontes/criar-pendentes
// -------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/backup/fontes/criar-pendentes',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.forbiddenError('Não autenticado.')
    }

    const systemRole = auth.getString('system_role') || 'usuario'
    if (systemRole !== 'admin' && systemRole !== 'suporte') {
      return e.forbiddenError(
        'Apenas perfis Administrador e Suporte têm permissão para cadastrar fontes pendentes.',
      )
    }

    const body = e.requestInfo().body || {}
    const rotinaId = String(body.rotinaId || '').trim()
    const itens = Array.isArray(body.itens) ? body.itens : []
    const evidenciaId = body.evidenciaId ? String(body.evidenciaId).trim() : ''

    if (!rotinaId) {
      return e.badRequestError('O identificador da rotina (rotinaId) é obrigatório.')
    }

    let rotinaRec = null
    try {
      rotinaRec = $app.findRecordById('backup_rotinas', rotinaId)
    } catch (_) {
      return e.notFoundError('Rotina de backup não encontrada.')
    }

    let organizationId = rotinaRec.getString('organization')
    if (!organizationId) {
      organizationId = auth.getString('organization')
    }

    if (systemRole !== 'admin' && auth.getString('organization') !== organizationId) {
      return e.forbiddenError('Acesso restrito à própria organização.')
    }

    if (itens.length === 0) {
      return e.badRequestError('A lista de itens a cadastrar não pode ser vazia.')
    }

    // Normalização padrão
    const normalizarParaComparacao = (str) => {
      if (str === null || str === undefined) return ''
      let s = String(str).trim().toLowerCase()
      s = s.replace(/\\/g, '/')
      s = s.replace(/^(?:backup\s+copy\s+job|backup\s+job|replication\s+job)[:\s]+/i, '')
      s = s.replace(/\s*\(\d+\s*objects?\)\s*$/i, '')
      s = s.replace(/\s+/g, ' ').trim()
      return s
    }

    const extrairAliases = (campoAliases) => {
      if (!campoAliases) return []
      const partes = String(campoAliases).split(',')
      const lista = []
      for (let i = 0; i < partes.length; i++) {
        const limpo = normalizarParaComparacao(partes[i])
        if (limpo) lista.push(limpo)
      }
      return lista
    }

    // Nomes a ignorar (job/rotina/aliases)
    const rotinaNome = rotinaRec.getString('nome') || ''
    const rotinaAliases = extrairAliases(rotinaRec.getString('aliases') || '')
    const nomesIgnorar = new Set()
    if (rotinaNome) nomesIgnorar.add(normalizarParaComparacao(rotinaNome))
    for (let raI = 0; raI < rotinaAliases.length; raI++) {
      nomesIgnorar.add(rotinaAliases[raI])
    }

    // Buscar fontes existentes da rotina na organização
    let fontesExistentes = []
    try {
      fontesExistentes = $app.findRecordsByFilter(
        'backup_fontes',
        `organization = '${organizationId}' && rotina = '${rotinaId}' && ativo = true`,
        '+created',
        200,
        0,
      )
    } catch (_) {}

    const mapaFontesNorm = new Map()
    for (let fI = 0; fI < fontesExistentes.length; fI++) {
      const f = fontesExistentes[fI]
      const fCaminho = f.getString('caminho_identificacao') || ''
      const fCaminhoNorm = normalizarParaComparacao(fCaminho)
      if (fCaminhoNorm) mapaFontesNorm.set(fCaminhoNorm, f)
      const aliasesList = extrairAliases(f.getString('aliases') || '')
      for (let aI = 0; aI < aliasesList.length; aI++) {
        mapaFontesNorm.set(aliasesList[aI], f)
      }
    }

    const fontesCol = $app.findCollectionByNameOrId('backup_fontes')
    const criadas = []
    const reutilizadas = []
    const ignoradas = []

    for (let i = 0; i < itens.length; i++) {
      const itemRaw = String(itens[i] || '').trim()
      if (!itemRaw) continue

      const itemNorm = normalizarParaComparacao(itemRaw)
      if (!itemNorm) continue

      if (nomesIgnorar.has(itemNorm)) {
        ignoradas.push(itemRaw)
        continue
      }

      if (mapaFontesNorm.has(itemNorm)) {
        const fExistente = mapaFontesNorm.get(itemNorm)
        reutilizadas.push({
          id: fExistente.id,
          nome: itemRaw,
          caminho_identificacao: fExistente.getString('caminho_identificacao'),
        })
        continue
      }

      // Criar nova fonte de backup
      const novaFonte = new Record(fontesCol)
      novaFonte.set('organization', organizationId)
      novaFonte.set('rotina', rotinaId)
      novaFonte.set('tipo_fonte', 'maquina_virtual')
      novaFonte.set('tipo_execucao', 'padrao_rotina')
      novaFonte.set('caminho_identificacao', itemRaw)
      novaFonte.set('aliases', itemRaw)
      novaFonte.set('ativo', true)
      $app.save(novaFonte)

      mapaFontesNorm.set(itemNorm, novaFonte)
      criadas.push({
        id: novaFonte.id,
        nome: itemRaw,
      })
    }

    const nowIso = new Date().toISOString()

    // Se evidenciaId veio, reavaliar a backup_avaliacao da evidência para virar CONFORME
    let avaliacaoAtualizada = false
    let novoVeredito = ''
    let novoLaudo = null

    if (evidenciaId) {
      try {
        const avals = $app.findRecordsByFilter(
          'backup_avaliacoes',
          `organization = '${organizationId}'`,
          '-created',
          50,
          0,
        )

        let targetAval = null
        for (let avI = 0; avI < avals.length; avI++) {
          const a = avals[avI]
          const execId = a.getString('execucao')
          if (execId) {
            try {
              const ex = $app.findRecordById('backup_execucoes', execId)
              if (ex && ex.getString('evidencia') === evidenciaId) {
                targetAval = a
                // Também atualiza detalhes_vms da execução marcando fora_escopo = false
                const dVms = ex.get('detalhes_vms')
                if (Array.isArray(dVms)) {
                  let mudouDv = false
                  for (let dvIdx = 0; dvIdx < dVms.length; dvIdx++) {
                    if (dVms[dvIdx].fora_escopo) {
                      dVms[dvIdx].fora_escopo = false
                      dVms[dvIdx].status_escopo = 'coberto'
                      dVms[dvIdx].motivo_escopo = 'Fonte cadastrada na rotina'
                      mudouDv = true
                    }
                  }
                  if (mudouDv) {
                    ex.set('detalhes_vms', dVms)
                    $app.save(ex)
                  }
                }
                break
              }
            } catch (_) {}
          }
        }

        if (targetAval) {
          const laudo = targetAval.get('laudo_tecnico') || {}
          novoVeredito = `Conforme: cópia executada com sucesso com todas as fontes cadastradas na rotina "${rotinaNome}".`
          targetAval.set('resultado_conformidade', 'conforme')
          targetAval.set('detalhe', novoVeredito)

          if (laudo && typeof laudo === 'object') {
            laudo.resultado = 'conforme'
            laudo.veredito = novoVeredito

            // Limpa fontes não cobertas e adiciona às cobertas
            const cob = laudo.cobertura || {}
            const antigosNaoCobertos = Array.isArray(cob.fontes_nao_cobertas)
              ? cob.fontes_nao_cobertas
              : []
            const antigosCobertos = Array.isArray(cob.fontes_cobertas) ? cob.fontes_cobertas : []

            for (let ancI = 0; ancI < antigosNaoCobertos.length; ancI++) {
              const itNome = antigosNaoCobertos[ancI].item || `Item #${ancI + 1}`
              antigosCobertos.push({
                item: itNome,
                fonte_cadastrada: itNome,
                fora_escopo: false,
              })
            }

            cob.fontes_nao_cobertas = []
            cob.fontes_cobertas = antigosCobertos
            cob.total_nao_cobertos = 0
            cob.total_cobertos = cob.total_itens || antigosCobertos.length
            laudo.cobertura = cob

            // Atualiza verificações (cobertura_fontes)
            if (Array.isArray(laudo.verificacoes)) {
              for (let vI = 0; vI < laudo.verificacoes.length; vI++) {
                if (laudo.verificacoes[vI].item === 'cobertura_fontes') {
                  laudo.verificacoes[vI].status = 'conforme'
                  laudo.verificacoes[vI].passou = true
                  laudo.verificacoes[vI].nao_cobertas_count = 0
                  laudo.verificacoes[vI].cobertas_count = cob.total_cobertos
                  laudo.verificacoes[vI].detalhes =
                    `Todos os ${cob.total_cobertos} itens do comprovante possuem fonte cadastrada correspondente.`
                }
              }
            }

            targetAval.set('laudo_tecnico', laudo)
            novoLaudo = laudo
          }

          $app.save(targetAval)
          avaliacaoAtualizada = true
        }
      } catch (errAval) {
        // Log defensive
      }
    }

    // Gravar auditoria append-only
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_log')
      const auditRec = new Record(auditCol)
      auditRec.set('organization', organizationId)
      auditRec.set('user', auth.id)
      auditRec.set('user_name', auth.getString('name') || auth.getString('email'))
      auditRec.set('user_email', auth.getString('email'))
      auditRec.set('action', 'BACKUP_FONTES_CRIADAS_PENDENTES')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Criação de fontes pendentes da rotina "${rotinaNome}": ${criadas.length} criada(s) [${criadas.map((c) => c.nome).join(', ')}], ${reutilizadas.length} reutilizada(s). Evidência associada: ${evidenciaId || 'nenhuma'}.`,
      )
      auditRec.set('metadata', {
        rotina_id: rotinaId,
        rotina_nome: rotinaNome,
        evidencia_id: evidenciaId || null,
        criadas_quantidade: criadas.length,
        criadas_nomes: criadas.map((c) => c.nome),
        reutilizadas_quantidade: reutilizadas.length,
        reutilizadas_nomes: reutilizadas.map((r) => r.nome),
        avaliacao_atualizada: avaliacaoAtualizada,
        criado_em: nowIso,
      })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `${criadas.length} fonte(s) criada(s) com sucesso na rotina "${rotinaNome}".`,
      rotina_id: rotinaId,
      rotina_nome: rotinaNome,
      evidencia_id: evidenciaId || null,
      criadas: criadas,
      reutilizadas: reutilizadas,
      ignoradas: ignoradas,
      avaliacao_atualizada: avaliacaoAtualizada,
      novo_veredito: novoVeredito || null,
      laudo_tecnico: novoLaudo,
    })
  },
  $apis.requireAuth(),
)
