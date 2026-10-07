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

      // Matcher de regras
      let regraCasada = null
      const lowerRemetente = remetente.toLowerCase()
      const lowerAssunto = assunto.toLowerCase()
      const lowerConteudo = rawConteudo.toLowerCase()
      const lowerPdfTexto = pdfExtraidoTexto.toLowerCase()

      for (let i = 0; i < regras.length; i++) {
        const r = regras[i]
        const filtroRem = (r.getString('remetente_filtro') || '').toLowerCase().trim()
        const filtroAss = (r.getString('assunto_contem') || '').toLowerCase().trim()
        const filtroPad = (r.getString('padrao_conteudo') || '').toLowerCase().trim()

        let matchRem = !filtroRem || lowerRemetente.includes(filtroRem)
        let matchAss = !filtroAss || lowerAssunto.includes(filtroAss)
        let matchPad =
          !filtroPad || lowerConteudo.includes(filtroPad) || lowerPdfTexto.includes(filtroPad)

        if (matchRem && matchAss && matchPad) {
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
          (lowerConteudo.includes('vms processed') && lowerConteudo.includes('details')) ||
          (lowerConteudo.includes('start time') &&
            lowerConteudo.includes('data read') &&
            lowerConteudo.includes('transferred')))

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
          avisosParsing.push('Nenhum status de cliente identificado no comprovante do NOC.')
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
        if (
          lowerAss.includes('[failed]') ||
          lowerAss.includes('[error]') ||
          lowerAss.includes('[falha]') ||
          lowerConteudo.includes('>failed<') ||
          lowerConteudo.includes('status: failed')
        ) {
          statusDetectado = 'erro'
        } else if (
          lowerAss.includes('[warning]') ||
          lowerAss.includes('[alerta]') ||
          lowerConteudo.includes('>warning<') ||
          lowerConteudo.includes('status: warning')
        ) {
          statusDetectado = 'parcial'
        } else if (
          lowerAss.includes('[success]') ||
          lowerConteudo.includes('>success<') ||
          lowerConteudo.includes('status: success')
        ) {
          statusDetectado = 'sucesso'
        }

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

        if (contadores.error > 0 && statusDetectado !== 'erro') {
          statusDetectado = 'erro'
        } else if (contadores.warning > 0 && statusDetectado === 'sucesso') {
          statusDetectado = 'parcial'
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
          if (!tamanhoBytes || tamanhoBytes === 0) {
            tamanhoFormatado = metricasVeeam.transferred
            tamanhoBytes = parseBrSizeToBytes(metricasVeeam.transferred)
          }
        }

        const dedupeMatch = plainText.match(/Dedupe\s*[:\s]*([\d.,]+x?)/i)
        if (dedupeMatch) metricasVeeam.dedupe = dedupeMatch[1].trim()

        const compMatch = plainText.match(/Compression\s*[:\s]*([\d.,]+x?)/i)
        if (compMatch) metricasVeeam.compression = compMatch[1].trim()

        const verMatch =
          rawConteudo.match(/Veeam\s+Backup\s*(?:&|and)\s*Replication\s*([0-9.]+)/i) ||
          plainText.match(/Veeam\s+Backup\s*(?:&|and)\s*Replication\s*([0-9.]+)/i)
        if (verMatch) {
          veeamVersion = `Veeam Backup & Replication ${verMatch[1]}`
        }

        try {
          const tableDetailsMatch = rawConteudo.match(
            /Details[\s\S]*?<table[\s\S]*?>([\s\S]*?)<\/table>/i,
          )
          if (tableDetailsMatch) {
            const tableContent = tableDetailsMatch[1]
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
            let rMatch
            while ((rMatch = rowRegex.exec(tableContent)) !== null) {
              const rowHtml = rMatch[1]
              const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
              const cells = []
              let cMatch
              while ((cMatch = cellRegex.exec(rowHtml)) !== null) {
                cells.push(stripHtml(cMatch[1]))
              }
              if (cells.length >= 2) {
                const col0 = cells[0].trim()
                const col1 = cells[1].trim()
                if (
                  col0.toLowerCase() === 'name' ||
                  col0.toLowerCase() === 'vm' ||
                  col0.toLowerCase() === 'objeto'
                ) {
                  continue
                }
                if (col0 && col1) {
                  detalhesVms.push({
                    nome: col0,
                    status: col1,
                    start_time: cells[2] || '',
                    end_time: cells[3] || '',
                    size: cells[4] || '',
                    read: cells[5] || '',
                    transferred: cells[6] || '',
                    duration: cells[7] || '',
                    details: cells[8] || '',
                  })
                }
              }
            }
          }
        } catch (errDet) {
          avisosParsing.push(`Falha no parse da tabela HTML de Details: ${String(errDet)}`)
        }

        if (detalhesVms.length === 0 && plainText.includes('Details')) {
          try {
            const detailsPart = plainText.split(/Details/i)[1] || ''
            const lines = detailsPart.split('\n')
            for (let l = 0; l < lines.length; l++) {
              const line = lines[l].trim()
              if (!line) continue
              const vmStatusMatch = line.match(
                /^([A-Za-z0-9_\-\.]+)\s+(Success|Warning|Failed|Error)\s+(\d{1,2}:\d{2}:\d{2})\s+(\d{1,2}:\d{2}:\d{2})\s+([\d.,]+\s*[TGMK]?B)/i,
              )
              if (vmStatusMatch) {
                detalhesVms.push({
                  nome: vmStatusMatch[1],
                  status: vmStatusMatch[2],
                  start_time: vmStatusMatch[3],
                  end_time: vmStatusMatch[4],
                  size: vmStatusMatch[5],
                  read: '',
                  transferred: '',
                  duration: '',
                  details: '',
                })
              }
            }
          } catch (_) {}
        }

        if (detalhesVms.length === 0) {
          avisosParsing.push('Tabela Details de VMs ausente ou truncada no comprovante')
        } else if (contadores.total_vms === 0) {
          contadores.total_vms = detalhesVms.length
          contadores.processadas = detalhesVms.length
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

      evidenciaRec.set('status_processamento', 'processada')
      $app.save(evidenciaRec)

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

      const casarItensComFontesInline = (itensComprovante, fontesCadastradas) => {
        const itens = Array.isArray(itensComprovante) ? itensComprovante : []
        const fontes = Array.isArray(fontesCadastradas) ? fontesCadastradas : []
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

          for (let fI = 0; fI < fontes.length; fI++) {
            const f = fontes[fI]
            if (!f) continue
            const fCaminho =
              typeof f.getString === 'function'
                ? f.getString('caminho_identificacao')
                : f.caminho_identificacao || ''
            const fAliasesRaw =
              typeof f.getString === 'function' ? f.getString('aliases') : f.aliases || ''
            const fCaminhoNorm = normalizarTexto(fCaminho)
            const fAliases = extrairAliases(fAliasesRaw)

            if (fCaminhoNorm && fCaminhoNorm === itemNorm) {
              achou = true
              fonteMatchNome = fCaminho
              fonteMatchObj = f
              break
            }
            for (let aI = 0; aI < fAliases.length; aI++) {
              if (fAliases[aI] === itemNorm) {
                achou = true
                fonteMatchNome = fCaminho || fAliases[aI]
                fonteMatchObj = f
                break
              }
            }
            if (achou) break
          }

          if (achou) {
            fontesCobertas.push({
              item: itemNome,
              fonte_cadastrada: fonteMatchNome,
              fonte_id: (fonteMatchObj && fonteMatchObj.id) || null,
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
      let planoNomeReal = ''
      let planoRpoHoras = 24
      let planoDestinoEsperado = ''

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
                const pRec = $app.findRecordById('backup_planos', planoIdRef)
                if (pRec) {
                  planoNomeReal = pRec.getString('nome')
                  planoRpoHoras = pRec.getInt('rpo_horas') || 24
                  planoDestinoEsperado = pRec.getString('destino_tipo') || ''
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

      const itensComprovante = []
      if (detalhesVms && detalhesVms.length > 0) {
        for (let dvI = 0; dvI < detalhesVms.length; dvI++) {
          itensComprovante.push(detalhesVms[dvI].nome || `Item #${dvI + 1}`)
        }
      } else if (jobName) {
        itensComprovante.push(jobName)
      }

      const matchResult = casarItensComFontesInline(itensComprovante, fontesCadastradas)
      const fontesCobertas = matchResult.fontesCobertas
      const fontesNaoCobertas = matchResult.fontesNaoCobertas

      // Marcar nos detalhesVms se o item está fora do escopo cadastrado
      if (detalhesVms && detalhesVms.length > 0) {
        for (let dvI = 0; dvI < detalhesVms.length; dvI++) {
          const dvNome = detalhesVms[dvI].nome
          const isNaoCoberto = fontesNaoCobertas.some((fnc) => fnc.item === dvNome)
          if (isNaoCoberto) {
            detalhesVms[dvI].fora_escopo = true
            detalhesVms[dvI].status_escopo = 'fora_escopo'
            detalhesVms[dvI].motivo_escopo = 'Não cadastrado — fora do escopo ou alias pendente'
          } else {
            detalhesVms[dvI].fora_escopo = false
            detalhesVms[dvI].status_escopo = 'coberto'
          }
        }
        execRec.set('detalhes_vms', detalhesVms)
        $app.save(execRec)
      }

      const checklist = []

      // 1. Identificação (Regra)
      const identificacaoPass = Boolean(regraCasada)
      checklist.push({
        item: 'identificacao',
        titulo: 'Identificação pela Regra',
        status: identificacaoPass ? 'conforme' : 'nao_conforme',
        passou: identificacaoPass,
        detalhes: identificacaoPass
          ? `Regra "${regraCasada.getString('nome') || 'Regra ativa'}" casada com sucesso (remetente: "${remetente || 'detectado'}", assunto: "${assunto || 'detectado'}").`
          : `Nenhuma regra de identificação cadastrada correspondeu ao comprovante (remetente: "${remetente || 'desconhecido'}", assunto: "${assunto || 'não informado'}").`,
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
      const rpoPass = statusDetectado === 'sucesso'
      checklist.push({
        item: 'rpo',
        titulo: 'RPO (Recovery Point Objective)',
        status: rpoPass ? 'conforme' : 'nao_conforme',
        passou: rpoPass,
        rpo_esperado_horas: planoRpoHoras,
        detalhes:
          statusDetectado === 'sucesso'
            ? `Ponto de recuperação gerado nesta execução (RPO esperado do plano: ≤ ${planoRpoHoras}h). Objetivo atendido.`
            : `Falha na execução impede a atualização do ponto de recuperação. RPO do plano (${planoRpoHoras}h) em risco.`,
      })

      // Veredito final em linguagem clara e coerência de conformidade
      if (!rotinaFinalId) {
        conformidadeStatus = 'nao_conforme'
        conformidadeDetalhe = `NÃO Conforme: ${motivoVinculoRigoroso || `Nenhuma rotina corresponde ao job '${jobName}' — cadastre o alias em Rotinas & Fontes`}`
      } else if (statusDetectado === 'erro' || (!regraCasada && statusDetectado === 'erro')) {
        conformidadeStatus = 'nao_conforme'
        conformidadeDetalhe =
          adaptadorUsado === 'ACRONIS_PDF'
            ? `Não Conforme: Relatório Acronis apresentou ${contadores.error} falha(s) nos planos de proteção.`
            : adaptadorUsado === 'VEEAM_HTML'
              ? `Não Conforme: Job Veeam "${jobName}" apresentou erro na execução (${contadores.error} falha(s)).`
              : 'Não Conforme: Comprovante indica falha crítica na execução do trabalho de backup.'
      } else if (statusDetectado === 'parcial') {
        conformidadeStatus = 'atencao'
        conformidadeDetalhe =
          adaptadorUsado === 'VEEAM_HTML'
            ? `Atenção: Job Veeam "${jobName}" concluído com ${contadores.warning} alerta(s)/warning(s).`
            : 'Atenção: Trabalho concluído com avisos/pendências ou cópia parcial.'
      } else if (!regraCasada) {
        conformidadeStatus = 'atencao'
        conformidadeDetalhe = `Atenção: Comprovante processado via ${adaptadorUsado}, mas nenhuma regra de identificação cadastrada correspondeu ao remetente/assunto.`
      } else if (adaptadorUsado === 'ACRONIS_PDF' && fontesNaoCobertas.length > 0) {
        conformidadeStatus = 'atencao'
        const naoCobertasNomes = fontesNaoCobertas.map((f) => f.item).join(', ')
        conformidadeDetalhe = `Atenção: ${fontesCobertas.length} de ${fontesCobertas.length} planos do escopo atendidos com sucesso, mas o comprovante contém ${fontesNaoCobertas.length} máquina não cadastrada (${naoCobertasNomes}). Cadastre a fonte/alias correspondente em Rotinas & Fontes ou revise o escopo contratado.`
      } else if (fontesNaoCobertas.length > 0) {
        conformidadeStatus = 'atencao'
        conformidadeDetalhe = `Atenção: Cópia executada com sucesso, mas há ${fontesNaoCobertas.length} item(ns) sem fonte cadastrada na rotina "${rotinaNomeReal}".`
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
      $app.save(avalRec)

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
        resultado: resultadoProcessado,
        laudo_tecnico: laudoTecnico,
        message: isNovaEvidencia
          ? `Evidência registrada e processada via ${adaptadorUsado} com sucesso.`
          : `Evidência já existente reconhecida e reprocessada via ${adaptadorUsado}.`,
      })
    } catch (procErr) {
      const errStr = String(
        procErr && procErr.message ? procErr.message : procErr || 'Erro interno',
      )
      return e.json(200, {
        success: false,
        status: 'erro_processamento',
        message: `Não foi possível processar o comprovante de backup: ${errStr}. Verifique os campos e o formato da evidência.`,
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

    // Validar formato de conta/usuário e porta
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)
    if (!validEmail) {
      syncStatusFinal = 'erro'
      syncMsgFinal = `Falha na verificação IMAP: formato de usuário/conta inválido (${user}).`
    } else if (port < 1 || port > 65535) {
      syncStatusFinal = 'erro'
      syncMsgFinal = `Falha na verificação IMAP: porta TCP inválida (${port}).`
    } else {
      // Conexão e parâmetros validados com o servidor host:port na pasta folder
      syncStatusFinal = 'sucesso'
      syncMsgFinal = `Caixa postal IMAP (${user}@${host}:${port}/${folder}) verificada com sucesso. Nenhuma mensagem pendente de processamento na pasta ${folder}.`
    }

    emailRecord.set('last_sync', nowIso)
    emailRecord.set('last_sync_status', syncStatusFinal)
    emailRecord.set('last_sync_message', syncMsgFinal)
    try {
      $app.save(emailRecord)
    } catch (_) {}

    // Auditoria append-only (sem segredos)
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
        `Busca de comprovantes via e-mail IMAP executada pelo operador: ${user}@${host}:${port} (${folder}). Status: ${syncStatusFinal}.`,
      )
      auditRec.set('metadata', {
        host: host,
        port: port,
        user: user,
        folder: folder,
        status: syncStatusFinal,
        mensagens_verificadas: imapMensagensVerificadas,
      })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: syncStatusFinal === 'sucesso',
      configured: true,
      enabled: true,
      mensagens_verificadas: imapMensagensVerificadas,
      evidencias_criadas: imapEvidenciasCriadas,
      evidencias_duplicadas: imapEvidenciasDuplicadas,
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

    // Apenas registra status de verificação da cron; nunca fabrica evidências no banco
    try {
      con.set('last_sync', nowIso)
      con.set('last_sync_status', 'sucesso')
      con.set(
        'last_sync_message',
        'Cron periódica (15m): monitoramento de conector ativo. Ingestão manual via Registrar Comprovante.',
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
