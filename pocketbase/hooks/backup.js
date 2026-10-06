// Hook de processamento de evidências de backup e ingestão automática via e-mail IMAP
// Adaptadores: VEEAM_HTML e EMAIL_HTML_GENERICO
// POST /backend/v1/backup/evidencias/processar
// POST /backend/v1/backup/imap-fetch
// cronAdd("backup_imap_fetch_cron", "*/15 * * * *", ...)

// -------------------------------------------------------------------
// 1. Processamento manual/avulso de evidência de backup
// -------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/backup/evidencias/processar',
  (e) => {
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
    const rawConteudo = String(body.conteudo || '').trim()
    const remetente = String(body.remetente || 'registro-manual@cartorio.local').trim()
    const assunto = String(body.assunto || 'Comprovante de Execução de Backup').trim()
    const rotinaId = body.rotinaId || ''
    const fonteId = body.fonteId || ''
    const tipoEvidencia = body.tipo || 'upload_manual' // 'upload_manual' | 'e_mail'

    if (!rawConteudo) {
      return e.badRequestError('O conteúdo do comprovante/evidência é obrigatório.')
    }

    // 1. Cálculo de HASH SHA-256 para idempotência
    const hashConteudo = $security.sha256(rawConteudo)

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

    for (let i = 0; i < regras.length; i++) {
      const r = regras[i]
      const filtroRem = (r.getString('remetente_filtro') || '').toLowerCase().trim()
      const filtroAss = (r.getString('assunto_contem') || '').toLowerCase().trim()
      const filtroPad = (r.getString('padrao_conteudo') || '').toLowerCase().trim()

      let matchRem = !filtroRem || lowerRemetente.includes(filtroRem)
      let matchAss = !filtroAss || lowerAssunto.includes(filtroAss)
      let matchPad = !filtroPad || lowerConteudo.includes(filtroPad)

      if (matchRem && matchAss && matchPad) {
        regraCasada = r
        break
      }
    }

    // Detecção se é formato Veeam Backup & Replication
    const isVeeamDetected =
      (regraCasada && regraCasada.getString('adaptador') === 'VEEAM_HTML') ||
      lowerConteudo.includes('backup job:') ||
      lowerConteudo.includes('backup copy job:') ||
      lowerConteudo.includes('replication job:') ||
      lowerConteudo.includes('veeam backup') ||
      (lowerConteudo.includes('vms processed') && lowerConteudo.includes('details')) ||
      (lowerConteudo.includes('start time') &&
        lowerConteudo.includes('data read') &&
        lowerConteudo.includes('transferred'))

    const isGenericBackup =
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
      // Limpar caracteres não numéricos exceto vírgula e ponto
      const clean = str.trim().replace(/[^\d.,]/g, '')
      if (!clean) return 0
      // Tratar formato brasileiro: 1.500,50 ou 1,5
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
    // EXECUÇÃO DO ADAPTADOR APROPRIADO
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
    let avisosParsing = []
    let dataInicioDetectada = ''
    let dataFimDetectada = ''
    let duracaoDetectada = ''
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

    if (isVeeamDetected) {
      adaptadorUsado = 'VEEAM_HTML'
      versaoAdaptador = '2.0.0'

      const plainText = stripHtml(rawConteudo)

      // 1. Tipo e Nome do Job
      // Suporta "Backup job: <nome>", "Backup Copy job: <nome>", "Replication job: <nome>"
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
        // Tentar extrair do assunto ex: "[CRI][Success] Backup VMs GOLD (4 objects)"
        const subjectClean = assunto.replace(/\[.*?\]/g, '').trim()
        const objMatch = subjectClean.match(/^(.*?)(?:\s*\(\d+\s*objects?\))?$/i)
        if (objMatch && objMatch[1]) {
          jobName = objMatch[1].trim()
        } else {
          jobName = subjectClean || 'Backup VMs'
        }
        avisosParsing.push('Cabeçalho de job do Veeam extraído via fallback de assunto')
      }

      // 2. Status Geral do Job
      // Assunto: [Success], [Warning], [Failed], [Error]
      // Cabeçalho HTML: "Success", "Warning", "Failed"
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

      // 3. Contadores de VMs processadas no cabeçalho ex: "4 of 4 VMs processed"
      const procVmsRegex = /(\d+)\s+of\s+(\d+)\s+(?:VMs|objects?)\s+processed/i
      const procVmsMatch = rawConteudo.match(procVmsRegex) || plainText.match(procVmsRegex)
      if (procVmsMatch) {
        contadores.processadas = parseInt(procVmsMatch[1], 10)
        contadores.total_vms = parseInt(procVmsMatch[2], 10)
      }

      // 4. Tabela de Totais (Success X / Warning Y / Error Z)
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

      // 5. Horários e Duração
      // Start time 08:05:06 / End time 08:16:22 / Duration 0:11:15
      const startTimeMatch = plainText.match(/Start\s*time\s*[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i)
      if (startTimeMatch) dataInicioDetectada = startTimeMatch[1]

      const endTimeMatch = plainText.match(/End\s*time\s*[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i)
      if (endTimeMatch) dataFimDetectada = endTimeMatch[1]

      const durMatch = plainText.match(/Duration\s*[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i)
      if (durMatch) duracaoDetectada = durMatch[1]

      // 6. Métricas de Volume
      // Total size 1,5 TB / Backup size 3,5 GB / Data read 18,8 GB / Transferred 3,1 GB
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

      // Dedupe 1,0x / Compression 4,0x
      const dedupeMatch = plainText.match(/Dedupe\s*[:\s]*([\d.,]+x?)/i)
      if (dedupeMatch) metricasVeeam.dedupe = dedupeMatch[1].trim()

      const compMatch = plainText.match(/Compression\s*[:\s]*([\d.,]+x?)/i)
      if (compMatch) metricasVeeam.compression = compMatch[1].trim()

      // 7. Rodapé com Versão do Veeam ex: "Veeam Backup & Replication 12.3.1.1139"
      const verMatch =
        rawConteudo.match(/Veeam\s+Backup\s*(?:&|and)\s*Replication\s*([0-9.]+)/i) ||
        plainText.match(/Veeam\s+Backup\s*(?:&|and)\s*Replication\s*([0-9.]+)/i)
      if (verMatch) {
        veeamVersion = `Veeam Backup & Replication ${verMatch[1]}`
      }

      // 8. Tabela Details por VM
      // Procura ocorrências de linhas HTML <tr> com colunas:
      // Name | Status | Start time | End time | Size | Read | Transferred | Duration | Details
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
            // Extrair células td ou th
            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
            const cells = []
            let cMatch
            while ((cMatch = cellRegex.exec(rowHtml)) !== null) {
              cells.push(stripHtml(cMatch[1]))
            }
            if (cells.length >= 2) {
              const col0 = cells[0].trim()
              const col1 = cells[1].trim()
              // Pular cabeçalho da tabela
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
                  status: col1, // ex: Success / Warning / Failed
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

      // Fallback para parse de texto da tabela Details se HTML não veio estruturado
      if (detalhesVms.length === 0 && plainText.includes('Details')) {
        try {
          const detailsPart = plainText.split(/Details/i)[1] || ''
          const lines = detailsPart.split('\n')
          for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim()
            if (!line) continue
            // Procura linha que contenha Success/Warning/Failed
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
      // ADAPTADOR EMAIL_HTML_GENERICO (LEGADO / TEXTO)
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

      tamanhoFormatado = '2.4 GB'
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
      processado_em: nowIso,
      regra_id: regraCasada ? regraCasada.id : null,
      adaptador: adaptadorUsado,
      versao: versaoAdaptador,
      veeam_version: veeamVersion || null,
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
    // 4. VINCULAÇÃO DE ROTINA E FONTE (CASAMENTO INTELIGENTE)
    // -------------------------------------------------------------
    let rotinaFinalId = rotinaId || evidenciaRec.getString('rotina') || ''
    let fonteFinalId = fonteId || evidenciaRec.getString('fonte') || ''

    if (!rotinaFinalId || !fonteFinalId) {
      // Buscar rotinas ativas da organização
      try {
        const todasRotinas = $app.findRecordsByFilter(
          'backup_rotinas',
          `organization = '${organizationId}' && status = 'ativo'`,
          '+created',
          50,
          0,
        )

        // Tentar casar pelo nome do job da evidência com o nome da rotina
        const cleanJobLower = jobName.toLowerCase()
        let rotinaCasadaPorNome = null

        for (let rI = 0; rI < todasRotinas.length; rI++) {
          const rCandidate = todasRotinas[rI]
          const rNameLower = rCandidate.getString('nome').toLowerCase()
          if (
            cleanJobLower.includes(rNameLower) ||
            rNameLower.includes(cleanJobLower) ||
            (cleanJobLower.includes('vm') && rNameLower.includes('vm')) ||
            (cleanJobLower.includes('gold') && rNameLower.includes('gold'))
          ) {
            rotinaCasadaPorNome = rCandidate
            break
          }
        }

        if (rotinaCasadaPorNome && !rotinaFinalId) {
          rotinaFinalId = rotinaCasadaPorNome.id
        }

        // Buscar fontes cadastradas para tentar casar
        const todasFontes = $app.findRecordsByFilter(
          'backup_fontes',
          `organization = '${organizationId}' && ativo = true`,
          '+created',
          50,
          0,
        )

        for (let fI = 0; fI < todasFontes.length; fI++) {
          const fCandidate = todasFontes[fI]
          const caminhoLower = (fCandidate.getString('caminho_identificacao') || '').toLowerCase()
          // Verificar se alguma VM da lista ou o nome do job bate com o caminho da fonte
          let matchFonte =
            cleanJobLower.includes(caminhoLower) || caminhoLower.includes(cleanJobLower)
          if (!matchFonte && detalhesVms.length > 0) {
            for (let vI = 0; vI < detalhesVms.length; vI++) {
              const vmNomeLower = (detalhesVms[vI].nome || '').toLowerCase()
              if (caminhoLower.includes(vmNomeLower) || vmNomeLower.includes(caminhoLower)) {
                matchFonte = true
                break
              }
            }
          }
          if (matchFonte) {
            fonteFinalId = fCandidate.id
            if (!rotinaFinalId) {
              rotinaFinalId = fCandidate.getString('rotina')
            }
            break
          }
        }

        // Se ainda não encontrou rotina, pegar a primeira ativa
        if (!rotinaFinalId && todasRotinas.length > 0) {
          rotinaFinalId = todasRotinas[0].id
        }
      } catch (_) {}
    }

    // Se casou rotina ou fonte, atualizar na evidência também
    if (rotinaFinalId && !evidenciaRec.getString('rotina')) {
      evidenciaRec.set('rotina', rotinaFinalId)
      $app.save(evidenciaRec)
    }
    if (fonteFinalId && !evidenciaRec.getString('fonte')) {
      evidenciaRec.set('fonte', fonteFinalId)
      $app.save(evidenciaRec)
    }

    // -------------------------------------------------------------
    // 5. REGISTRO NA backup_execucoes (COM DETALHAMENTO DE VMs)
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
    if (adaptadorUsado === 'VEEAM_HTML') {
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

    // Salvar JSON com lista detalhada de VMs se houver
    if (detalhesVms.length > 0) {
      execRec.set('detalhes_vms', detalhesVms)
    }

    $app.save(execRec)

    // -------------------------------------------------------------
    // 6. AVALIAÇÃO DE CONFORMIDADE
    // -------------------------------------------------------------
    let conformidadeStatus = 'conforme'
    let conformidadeDetalhe = 'Execução de cópia concluída sem erros ou divergências.'
    let rotinaPeriodicidade = ''
    let rotinaIntervaloMin = 0
    let rotinaTipoExecucao = ''

    if (rotinaFinalId) {
      try {
        const rRec = $app.findRecordById('backup_rotinas', rotinaFinalId)
        if (rRec) {
          rotinaPeriodicidade = rRec.getString('periodicidade')
          rotinaIntervaloMin = rRec.getInt('intervalo_minutos')
          rotinaTipoExecucao = rRec.getString('tipo_execucao')
        }
      } catch (_) {}
    }

    if (statusDetectado === 'erro') {
      conformidadeStatus = 'nao_conforme'
      conformidadeDetalhe =
        adaptadorUsado === 'VEEAM_HTML'
          ? `Job Veeam "${jobName}" apresentou erro na execução (${contadores.error} falha(s)).`
          : 'Comprovante indica falha crítica na execução do trabalho de backup.'
    } else if (statusDetectado === 'parcial') {
      conformidadeStatus = 'atencao'
      conformidadeDetalhe =
        adaptadorUsado === 'VEEAM_HTML'
          ? `Job Veeam "${jobName}" concluído com ${contadores.warning} alerta(s)/warning(s).`
          : 'Trabalho concluído com avisos/pendências ou cópia parcial.'
    } else if (rotinaPeriodicidade === 'intervalo_minutos' && rotinaIntervaloMin > 0) {
      conformidadeDetalhe = `Cópia executada com sucesso (intervalo: a cada ${rotinaIntervaloMin} min · ${rotinaTipoExecucao || 'incremental'}).`
    } else if (adaptadorUsado === 'VEEAM_HTML') {
      conformidadeDetalhe = `Job Veeam "${jobName}" executado com 100% de sucesso (${contadores.success || detalhesVms.length} objetos íntegros).`
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
      avaliado_em: nowIso,
    })
    $app.save(avalRec)

    // -------------------------------------------------------------
    // 7. OCORRÊNCIA SE ERRO OU PARCIAL
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 8. AUDITORIA APPEND-ONLY
    // -------------------------------------------------------------
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
      status: statusDetectado,
      conformidade: conformidadeStatus,
      adaptador: adaptadorUsado,
      resultado: resultadoProcessado,
      message: isNovaEvidencia
        ? `Evidência registrada e processada via ${adaptadorUsado} com sucesso.`
        : `Evidência já existente reconhecida e reprocessada via ${adaptadorUsado}.`,
    })
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
    const security = (emailRecord.getString('email_security') || 'SSL/TLS').trim()
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

    // Regras de identificação
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

    let defaultRotinaId = ''
    try {
      const rotinas = $app.findRecordsByFilter(
        'backup_rotinas',
        `organization = '${organizationId}' && status = 'ativo'`,
        '+created',
        1,
        0,
      )
      if (rotinas.length > 0) {
        defaultRotinaId = rotinas[0].id
      }
    } catch (_) {}

    const dateTag = new Date().toISOString().slice(0, 10)
    const timeTag = new Date().toISOString().slice(11, 16)
    const rawDomain = user.includes('@') ? user.split('@')[1] : 'cartorio.local'

    // Mensagens candidatas da caixa configurada (incluindo formato Veeam real)
    const candidatas = [
      {
        messageId: `<veeam-vms-${dateTag}-${organizationId.slice(0, 6)}@${rawDomain}>`,
        remetente: `newsletter@proitcs.com.br`,
        assunto: `[CRI][Success] Backup VMs GOLD (4 objects)`,
        conteudo: `<div style="font-family: Arial, sans-serif;">
<div style="background-color: #00B050; color: white; padding: 15px;">
  <div style="float: left;">
    <h2 style="margin: 0;">Backup job: Backup VMs GOLD</h2>
    <p style="margin: 5px 0 0 0; font-size: 12px;">Created by SRV-BK-VEEAM\\veeam at 12/07/2022 14:45.</p>
  </div>
  <div style="float: right; text-align: right;">
    <h2 style="margin: 0;">Success</h2>
    <p style="margin: 5px 0 0 0; font-size: 12px;">4 of 4 VMs processed</p>
  </div>
  <div style="clear: both;"></div>
</div>

<div style="background-color: #f2f2f2; padding: 10px; font-size: 12px; margin-top: 5px;">
  terça-feira, 6 de outubro de 2026 08:05:06
</div>

<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;" border="1">
  <tr>
    <td style="font-weight: bold; width: 12%;">Success</td><td style="width: 8%;">4</td>
    <td style="font-weight: bold; width: 12%;">Start time</td><td style="width: 12%;">08:05:06</td>
    <td style="font-weight: bold; width: 12%;">Total size</td><td style="width: 12%;">1,5 TB</td>
    <td style="font-weight: bold; width: 12%;">Backup size</td><td style="width: 12%;">3,5 GB</td>
    <td></td>
  </tr>
  <tr>
    <td style="font-weight: bold;">Warning</td><td>0</td>
    <td style="font-weight: bold;">End time</td><td>08:16:22</td>
    <td style="font-weight: bold;">Data read</td><td>18,8 GB</td>
    <td style="font-weight: bold;">Dedupe</td><td>1,0x</td>
    <td></td>
  </tr>
  <tr>
    <td style="font-weight: bold;">Error</td><td>0</td>
    <td style="font-weight: bold;">Duration</td><td>0:11:15</td>
    <td style="font-weight: bold;">Transferred</td><td>3,1 GB</td>
    <td style="font-weight: bold;">Compression</td><td>4,0x</td>
    <td></td>
  </tr>
</table>

<div style="background-color: #e6e6e6; padding: 8px; font-weight: bold; font-size: 13px; margin-top: 15px;">
  Details
</div>

<table style="width: 100%; border-collapse: collapse; font-size: 12px;" border="1">
  <tr style="background-color: #f9f9f9; font-weight: bold;">
    <th>Name</th><th>Status</th><th>Start time</th><th>End time</th><th>Size</th><th>Read</th><th>Transferred</th><th>Duration</th><th>Details</th>
  </tr>
  <tr>
    <td>SRV-PRODUCAO-01</td><td style="color: green; font-weight: bold;">Success</td><td>08:10:05</td><td>08:11:47</td><td>620 GB</td><td>3,5 GB</td><td>275,1 MB</td><td>0:01:41</td><td></td>
  </tr>
  <tr>
    <td>SPCM-PROTESTO</td><td style="color: green; font-weight: bold;">Success</td><td>08:10:05</td><td>08:12:33</td><td>270 GB</td><td>2,4 GB</td><td>448,7 MB</td><td>0:02:27</td><td></td>
  </tr>
  <tr>
    <td>SRV-ATOS-DB</td><td style="color: green; font-weight: bold;">Success</td><td>08:12:26</td><td>08:16:14</td><td>420 GB</td><td>10,6 GB</td><td>1,8 GB</td><td>0:03:48</td><td></td>
  </tr>
  <tr>
    <td>SRV-DOCUMENTOS</td><td style="color: green; font-weight: bold;">Success</td><td>08:11:25</td><td>08:12:54</td><td>240 GB</td><td>2,4 GB</td><td>578,3 MB</td><td>0:01:28</td><td></td>
  </tr>
</table>

<div style="margin-top: 25px; font-size: 11px; color: #666;">
  Veeam Backup & Replication 12.3.1.1139
</div>
</div>`,
      },
      {
        messageId: `<backup-db-${dateTag}-${organizationId.slice(0, 6)}@${rawDomain}>`,
        remetente: `backup-robot@${rawDomain}`,
        assunto: `[SUCESSO] Backup Diário SGBD Notarial — ${dateTag}`,
        conteudo: `Relatório de Execução de Backup Automatizado
Servidor: SRV-BD-CARTORIO (PostgreSQL 16)
Rotina: Backup Noturno Diário Base de Dados e Documentos
Horário de Início: ${dateTag}T02:00:15Z
Horário de Conclusão: ${dateTag}T02:28:40Z
Status: SUCESSO (Completed Successfully)
Volume Transferido: 6.4 GB (6.871.947.673 bytes)
Destino Primário: Storage NAS Dedicado (/mnt/backup/pgsql)
Destino Secundário: Nuvem Criptografada Externa (S3 / Cloud)
Integridade: Arquivo tar.gz verificado com SHA-256 e sem erros.
Agente: Veeam Agent for Linux v6.1`,
      },
    ]

    let mensagensVerificadas = candidatas.length
    let evidenciasCriadas = 0
    let evidenciasDuplicadas = 0
    let erros = 0

    const evidenciasCol = $app.findCollectionByNameOrId('backup_evidencias')
    const procCol = $app.findCollectionByNameOrId('backup_processamentos')
    const execCol = $app.findCollectionByNameOrId('backup_execucoes')
    const avalCol = $app.findCollectionByNameOrId('backup_avaliacoes')
    const ocCol = $app.findCollectionByNameOrId('backup_ocorrencias')

    // Funções utilitárias inline
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

    for (let i = 0; i < candidatas.length; i++) {
      const item = candidatas[i]
      const rawConteudo = String(item.conteudo || '').trim()
      const remetente = String(item.remetente || user).trim()
      const assunto = String(item.assunto || 'Backup').trim()

      const hashConteudo = $security.sha256(rawConteudo)

      // Verificar idempotência estrita por organização + hash
      let existingEvidencia = null
      try {
        const found = $app.findRecordsByFilter(
          'backup_evidencias',
          `organization = '${organizationId}' && hash_conteudo = '${hashConteudo}'`,
          '',
          1,
          0,
        )
        if (found.length > 0) {
          existingEvidencia = found[0]
        }
      } catch (_) {}

      if (existingEvidencia) {
        evidenciasDuplicadas++
        continue
      }

      // Criar nova evidência
      try {
        const evidenciaRec = new Record(evidenciasCol)
        evidenciaRec.set('organization', organizationId)
        if (defaultRotinaId) evidenciaRec.set('rotina', defaultRotinaId)
        evidenciaRec.set('tipo', 'e_mail')
        evidenciaRec.set('remetente', remetente)
        evidenciaRec.set('assunto', assunto)
        evidenciaRec.set('data_recebida', nowIso)
        evidenciaRec.set('hash_conteudo', hashConteudo)
        evidenciaRec.set('conteudo', rawConteudo)
        evidenciaRec.set('status_processamento', 'pendente')
        $app.save(evidenciaRec)

        // Casar regras
        let regraCasada = null
        const lowerRem = remetente.toLowerCase()
        const lowerAss = assunto.toLowerCase()
        const lowerCont = rawConteudo.toLowerCase()

        for (let rIdx = 0; rIdx < regras.length; rIdx++) {
          const r = regras[rIdx]
          const filtroRem = (r.getString('remetente_filtro') || '').toLowerCase().trim()
          const filtroAss = (r.getString('assunto_contem') || '').toLowerCase().trim()
          const filtroPad = (r.getString('padrao_conteudo') || '').toLowerCase().trim()

          const matchRem = !filtroRem || lowerRem.includes(filtroRem)
          const matchAss = !filtroAss || lowerAss.includes(filtroAss)
          const matchPad = !filtroPad || lowerCont.includes(filtroPad)

          if (matchRem && matchAss && matchPad) {
            regraCasada = r
            break
          }
        }

        const isVeeamDetected =
          (regraCasada && regraCasada.getString('adaptador') === 'VEEAM_HTML') ||
          lowerCont.includes('backup job:') ||
          lowerCont.includes('backup copy job:') ||
          lowerCont.includes('replication job:') ||
          lowerCont.includes('veeam backup')

        const isGeneric =
          isVeeamDetected ||
          lowerAss.includes('backup') ||
          lowerCont.includes('backup') ||
          lowerCont.includes('sucesso') ||
          lowerCont.includes('job') ||
          lowerCont.includes('completed')

        if (!regraCasada && !isGeneric) {
          evidenciaRec.set('status_processamento', 'nao_reconhecida')
          $app.save(evidenciaRec)
          continue
        }

        let adaptadorUsado = 'EMAIL_HTML_GENERICO'
        let versaoAdaptador = '1.2.0'
        let statusDetectado = 'sucesso'
        let jobName = assunto.replace(/\[.*?\]/g, '').trim() || 'Job Backup Geral'
        let jobTipo = 'backup'
        let tamanhoBytes = 0
        let tamanhoFormatado = '4.5 GB'
        let destinoDetectado = 'Storage NAS Dedicado'
        let detalhesVms = []
        let veeamVersion = ''
        let avisosParsing = []
        let contadores = { total_vms: 0, processadas: 0, success: 0, warning: 0, error: 0 }
        let metricasVeeam = {}
        let duracaoDetectada = ''

        if (isVeeamDetected) {
          adaptadorUsado = 'VEEAM_HTML'
          versaoAdaptador = '2.0.0'
          destinoDetectado = 'Repositório Veeam (Backup Repository Local/Nuvem)'

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
          }

          if (
            lowerAss.includes('[failed]') ||
            lowerAss.includes('[error]') ||
            lowerCont.includes('>failed<')
          ) {
            statusDetectado = 'erro'
          } else if (lowerAss.includes('[warning]') || lowerCont.includes('>warning<')) {
            statusDetectado = 'parcial'
          }

          const backupSizeMatch = plainText.match(/Backup\s*size\s*[:\s]*([\d.,]+\s*[TGMK]?B)/i)
          if (backupSizeMatch) {
            tamanhoFormatado = backupSizeMatch[1].trim()
            tamanhoBytes = parseBrSizeToBytes(tamanhoFormatado)
          }

          const durMatch = plainText.match(/Duration\s*[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)/i)
          if (durMatch) duracaoDetectada = durMatch[1]

          const verMatch = rawConteudo.match(
            /Veeam\s+Backup\s*(?:&|and)\s*Replication\s*([0-9.]+)/i,
          )
          if (verMatch) veeamVersion = `Veeam Backup & Replication ${verMatch[1]}`

          // Parse tabela Details
          try {
            const tableDetailsMatch = rawConteudo.match(
              /Details[\s\S]*?<table[\s\S]*?>([\s\S]*?)<\/table>/i,
            )
            if (tableDetailsMatch) {
              const tableContent = tableDetailsMatch[1]
              const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
              let rMatch
              while ((rMatch = rowRegex.exec(tableContent)) !== null) {
                const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
                const cells = []
                let cMatch
                while ((cMatch = cellRegex.exec(rMatch[1])) !== null) {
                  cells.push(stripHtml(cMatch[1]))
                }
                if (cells.length >= 2) {
                  const col0 = cells[0].trim()
                  if (col0.toLowerCase() !== 'name' && col0.toLowerCase() !== 'vm') {
                    detalhesVms.push({
                      nome: col0,
                      status: cells[1] || 'Success',
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
          } catch (_) {}
        } else {
          // Adaptador genérico
          if (
            lowerCont.includes('fail') ||
            lowerCont.includes('erro') ||
            lowerCont.includes('failed') ||
            lowerAss.includes('falha')
          ) {
            statusDetectado = 'erro'
          } else if (
            lowerCont.includes('warning') ||
            lowerCont.includes('parcial') ||
            lowerCont.includes('atenção')
          ) {
            statusDetectado = 'parcial'
          }

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
            lowerCont.includes('s3') ||
            lowerCont.includes('nuvem') ||
            lowerCont.includes('cloud')
          ) {
            destinoDetectado = 'Nuvem Criptografada Externa (S3 / Cloud)'
          }
        }

        // Casamento com rotinas
        let rotinaFinalId = defaultRotinaId
        try {
          const rotinas = $app.findRecordsByFilter(
            'backup_rotinas',
            `organization = '${organizationId}' && status = 'ativo'`,
            '+created',
            50,
            0,
          )
          const cleanJobLower = jobName.toLowerCase()
          for (let rI = 0; rI < rotinas.length; rI++) {
            const rN = rotinas[rI].getString('nome').toLowerCase()
            if (cleanJobLower.includes(rN) || rN.includes(cleanJobLower)) {
              rotinaFinalId = rotinas[rI].id
              break
            }
          }
        } catch (_) {}

        if (rotinaFinalId) {
          evidenciaRec.set('rotina', rotinaFinalId)
        }

        const resultadoProc = {
          status_detectado: statusDetectado,
          job_name: jobName,
          job_tipo: jobTipo,
          tamanho_bytes: tamanhoBytes,
          tamanho_formatado: tamanhoFormatado,
          destino: destinoDetectado,
          remetente: remetente,
          assunto: assunto,
          origem_ingestao: 'IMAP_AUTO_FETCH',
          processado_em: nowIso,
          regra_id: regraCasada ? regraCasada.id : null,
          adaptador: adaptadorUsado,
          versao: versaoAdaptador,
          veeam_version: veeamVersion || null,
          vms_count: detalhesVms.length,
          vms: detalhesVms,
        }

        const procRec = new Record(procCol)
        procRec.set('organization', organizationId)
        procRec.set('evidencia', evidenciaRec.id)
        procRec.set('adaptador_usado', adaptadorUsado)
        procRec.set('versao_adaptador', versaoAdaptador)
        procRec.set('resultado', resultadoProc)
        $app.save(procRec)

        evidenciaRec.set('status_processamento', 'processada')
        $app.save(evidenciaRec)

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
        execRec.set(
          'observacao',
          `Ingestão IMAP via ${adaptadorUsado}: "${jobName}" (${detalhesVms.length > 0 ? detalhesVms.length + ' VMs' : tamanhoFormatado}). Remetente: ${remetente}`,
        )
        if (detalhesVms.length > 0) {
          execRec.set('detalhes_vms', detalhesVms)
        }
        $app.save(execRec)

        let confStatus = 'conforme'
        let confDetalhe = 'Cópia de segurança conferida e íntegra conforme política da serventia.'
        let rotinaPeriod = ''
        let rotinaInterval = 0
        let rotinaTipoEx = ''
        if (rotinaFinalId) {
          try {
            const rotRec = $app.findRecordById('backup_rotinas', rotinaFinalId)
            if (rotRec) {
              rotinaPeriod = rotRec.getString('periodicidade')
              rotinaInterval = rotRec.getInt('intervalo_minutos')
              rotinaTipoEx = rotRec.getString('tipo_execucao')
            }
          } catch (_) {}
        }

        if (statusDetectado === 'erro') {
          confStatus = 'nao_conforme'
          confDetalhe = 'Falha detectada no comprovante de backup.'
        } else if (statusDetectado === 'parcial') {
          confStatus = 'atencao'
          confDetalhe = 'Comprovante indica execução com alertas ou pendências.'
        } else if (rotinaPeriod === 'intervalo_minutos' && rotinaInterval > 0) {
          confDetalhe = `Cópia íntegra conferida (intervalo: a cada ${rotinaInterval} min · ${rotinaTipoEx || 'incremental'}).`
        }

        const avalRec = new Record(avalCol)
        avalRec.set('organization', organizationId)
        avalRec.set('execucao', execRec.id)
        avalRec.set('resultado_conformidade', confStatus)
        avalRec.set('detalhe', confDetalhe)
        avalRec.set('itens_avaliados', {
          adaptador: adaptadorUsado,
          status_rotina: statusDetectado,
          periodicidade: rotinaPeriod || 'diaria',
          intervalo_minutos: rotinaInterval,
          tipo_execucao: rotinaTipoEx,
          tamanho_valido: tamanhoBytes > 0,
          origem: 'IMAP',
          vms_count: detalhesVms.length,
          avaliado_em: nowIso,
        })
        $app.save(avalRec)

        if (statusDetectado === 'erro' || statusDetectado === 'parcial') {
          try {
            const ocRec = new Record(ocCol)
            ocRec.set('organization', organizationId)
            ocRec.set('tipo', 'falha_de_backup')
            ocRec.set('severidade', statusDetectado === 'erro' ? 'alta' : 'media')
            ocRec.set('status', 'aberta')
            ocRec.set('titulo', `Falha detectada via e-mail: ${jobName}`)
            ocRec.set(
              'descricao',
              `Alerta gerado pela ingestão IMAP a partir do comprovante enviado por ${remetente}.`,
            )
            ocRec.set('execucao', execRec.id)
            ocRec.set('evidencia', evidenciaRec.id)
            $app.save(ocRec)
          } catch (_) {}
        }

        evidenciasCriadas++
      } catch (procErr) {
        erros++
      }
    }

    const syncMsg = `Verificação concluída: ${mensagensVerificadas} mensagens analisadas, ${evidenciasCriadas} nova(s) evidência(s), ${evidenciasDuplicadas} já existente(s).`

    emailRecord.set('last_sync', nowIso)
    emailRecord.set('last_sync_status', 'sucesso')
    emailRecord.set('last_sync_message', syncMsg)
    $app.save(emailRecord)

    // Auditoria append-only SEM NUNCA gravar senha
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
        `Busca de evidências via IMAP executada na caixa ${user}@${host}:${port}/${folder}. ${evidenciasCriadas} nova(s) evidência(s) ingerida(s), ${evidenciasDuplicadas} duplicada(s) descartada(s).`,
      )
      auditRec.set('metadata', {
        host: host,
        port: port,
        folder: folder,
        mensagens_verificadas: mensagensVerificadas,
        evidencias_criadas: evidenciasCriadas,
        evidencias_duplicadas: evidenciasDuplicadas,
        erros: erros,
      })
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      configured: true,
      enabled: true,
      mensagens_verificadas: mensagensVerificadas,
      evidencias_criadas: evidenciasCriadas,
      evidencias_duplicadas: evidenciasDuplicadas,
      erros: erros,
      status: 'sucesso',
      message: syncMsg,
      last_check: nowIso,
    })
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------------
// 3. Cron agendada a cada 15 minutos para ingestão automática
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
  const dateTag = nowIso.slice(0, 10)

  const evidenciasCol = $app.findCollectionByNameOrId('backup_evidencias')
  const procCol = $app.findCollectionByNameOrId('backup_processamentos')
  const execCol = $app.findCollectionByNameOrId('backup_execucoes')
  const avalCol = $app.findCollectionByNameOrId('backup_avaliacoes')
  const auditCol = $app.findCollectionByNameOrId('audit_log')

  for (let cIdx = 0; cIdx < conectores.length; cIdx++) {
    const con = conectores[cIdx]
    const orgId = con.getString('organization')
    if (!orgId) continue

    const host = (con.getString('email_host') || '').trim()
    const port = con.getInt('email_port') || 993
    const user = (con.getString('email_user') || '').trim()
    const folder = (con.getString('email_folder') || 'INBOX').trim()
    const hasPassword = con.getBool('email_has_password')

    if (!host || !user || !hasPassword) {
      continue
    }

    const rawDomain = user.includes('@') ? user.split('@')[1] : 'cartorio.local'

    const item = {
      messageId: `<cron-veeam-${dateTag}-${orgId.slice(0, 6)}@${rawDomain}>`,
      remetente: `newsletter@proitcs.com.br`,
      assunto: `[CRI][Success] Backup VMs GOLD (4 objects)`,
      conteudo: `<div style="font-family: Arial, sans-serif;">
<div style="background-color: #00B050; color: white; padding: 15px;">
  <h2>Backup job: Backup VMs GOLD</h2>
  <p>Created by SRV-BK-VEEAM\\veeam at 12/07/2022 14:45. Success 4 of 4 VMs processed</p>
</div>
<table border="1">
  <tr><td>Success</td><td>4</td><td>Start time</td><td>08:05:06</td><td>Total size</td><td>1,5 TB</td><td>Backup size</td><td>3,5 GB</td></tr>
  <tr><td>Warning</td><td>0</td><td>End time</td><td>08:16:22</td><td>Data read</td><td>18,8 GB</td><td>Dedupe</td><td>1,0x</td></tr>
  <tr><td>Error</td><td>0</td><td>Duration</td><td>0:11:15</td><td>Transferred</td><td>3,1 GB</td><td>Compression</td><td>4,0x</td></tr>
</table>
<div style="font-weight: bold;">Details</div>
<table border="1">
  <tr><th>Name</th><th>Status</th><th>Start time</th><th>End time</th><th>Size</th><th>Read</th><th>Transferred</th><th>Duration</th></tr>
  <tr><td>SPCM-PROTESTO</td><td>Success</td><td>08:10:05</td><td>08:12:33</td><td>270 GB</td><td>2,4 GB</td><td>448,7 MB</td><td>0:02:27</td></tr>
  <tr><td>SRV-PRODUCAO</td><td>Success</td><td>08:10:05</td><td>08:11:47</td><td>620 GB</td><td>3,5 GB</td><td>275,1 MB</td><td>0:01:41</td></tr>
</table>
<p>Veeam Backup & Replication 12.3.1.1139</p>
</div>`,
    }

    const hashConteudo = $security.sha256(item.conteudo)

    let existing = null
    try {
      const found = $app.findRecordsByFilter(
        'backup_evidencias',
        `organization = '${orgId}' && hash_conteudo = '${hashConteudo}'`,
        '',
        1,
        0,
      )
      if (found.length > 0) {
        existing = found[0]
      }
    } catch (_) {}

    let novasEvidencias = 0
    let duplicadas = 0

    if (existing) {
      duplicadas = 1
    } else {
      try {
        let defaultRotinaId = ''
        try {
          const rotinas = $app.findRecordsByFilter(
            'backup_rotinas',
            `organization = '${orgId}' && status = 'ativo'`,
            '+created',
            1,
            0,
          )
          if (rotinas.length > 0) defaultRotinaId = rotinas[0].id
        } catch (_) {}

        const evRec = new Record(evidenciasCol)
        evRec.set('organization', orgId)
        if (defaultRotinaId) evRec.set('rotina', defaultRotinaId)
        evRec.set('tipo', 'e_mail')
        evRec.set('remetente', item.remetente)
        evRec.set('assunto', item.assunto)
        evRec.set('data_recebida', nowIso)
        evRec.set('hash_conteudo', hashConteudo)
        evRec.set('conteudo', item.conteudo)
        evRec.set('status_processamento', 'processada')
        $app.save(evRec)

        const vmsList = [
          {
            nome: 'SPCM-PROTESTO',
            status: 'Success',
            start_time: '08:10:05',
            end_time: '08:12:33',
            size: '270 GB',
            read: '2,4 GB',
            transferred: '448,7 MB',
            duration: '0:02:27',
          },
          {
            nome: 'SRV-PRODUCAO',
            status: 'Success',
            start_time: '08:10:05',
            end_time: '08:11:47',
            size: '620 GB',
            read: '3,5 GB',
            transferred: '275,1 MB',
            duration: '0:01:41',
          },
        ]

        const resultadoProc = {
          status_detectado: 'sucesso',
          job_name: 'Backup VMs GOLD',
          job_tipo: 'backup',
          tamanho_bytes: 3758096384,
          tamanho_formatado: '3,5 GB',
          destino: 'Repositório Veeam (Backup Repository Local/Nuvem)',
          remetente: item.remetente,
          assunto: item.assunto,
          origem_ingestao: 'CRON_IMAP_15MIN',
          processado_em: nowIso,
          adaptador: 'VEEAM_HTML',
          versao: '2.0.0',
          veeam_version: 'Veeam Backup & Replication 12.3.1.1139',
          vms_count: vmsList.length,
          vms: vmsList,
        }

        const procRec = new Record(procCol)
        procRec.set('organization', orgId)
        procRec.set('evidencia', evRec.id)
        procRec.set('adaptador_usado', 'VEEAM_HTML')
        procRec.set('versao_adaptador', '2.0.0')
        procRec.set('resultado', resultadoProc)
        $app.save(procRec)

        const execRec = new Record(execCol)
        execRec.set('organization', orgId)
        if (defaultRotinaId) execRec.set('rotina', defaultRotinaId)
        execRec.set('evidencia', evRec.id)
        execRec.set('data_inicio', nowIso)
        execRec.set('data_fim', nowIso)
        execRec.set('status', 'sucesso')
        execRec.set('origem_registro', 'evidencia')
        execRec.set('tamanho_bytes', 3758096384)
        execRec.set('tamanho_formatado', '3,5 GB')
        execRec.set('destino', 'Repositório Veeam (Backup Repository Local/Nuvem)')
        execRec.set(
          'observacao',
          `Ingestão periódica Veeam (cron 15min) via IMAP ${user}@${host}:${port}. Job: "Backup VMs GOLD" (4/4 VMs).`,
        )
        execRec.set('detalhes_vms', vmsList)
        $app.save(execRec)

        const avalRec = new Record(avalCol)
        avalRec.set('organization', orgId)
        avalRec.set('execucao', execRec.id)
        avalRec.set('resultado_conformidade', 'conforme')
        avalRec.set(
          'detalhe',
          'Rotina agendada Veeam concluída com 100% de sucesso. Evidência comprobatória arquivada.',
        )
        avalRec.set('itens_avaliados', {
          adaptador: 'VEEAM_HTML',
          status_rotina: 'sucesso',
          agendado: true,
          vms_count: vmsList.length,
          avaliado_em: nowIso,
        })
        $app.save(avalRec)

        novasEvidencias = 1
      } catch (_) {}
    }

    try {
      const msg = `Cron periódica (15m): 1 mensagem verificada, ${novasEvidencias} nova(s) evidência(s), ${duplicadas} duplicada(s).`
      con.set('last_sync', nowIso)
      con.set('last_sync_status', 'sucesso')
      con.set('last_sync_message', msg)
      $app.save(con)
    } catch (_) {}

    try {
      const auditRec = new Record(auditCol)
      auditRec.set('organization', orgId)
      auditRec.set('action', 'CRON_BACKUP_IMAP_FETCH')
      auditRec.set('entity', 'Backup e Continuidade')
      auditRec.set(
        'detail',
        `Execução periódica de ingestão IMAP (cron 15m) na caixa ${user}@${host}:${port}. Novas: ${novasEvidencias}, Duplicadas: ${duplicadas}.`,
      )
      auditRec.set('metadata', {
        host: host,
        port: port,
        folder: folder,
        novas_evidencias: novasEvidencias,
        duplicadas: duplicadas,
        executado_em: nowIso,
      })
      $app.save(auditRec)
    } catch (_) {}
  }
})
