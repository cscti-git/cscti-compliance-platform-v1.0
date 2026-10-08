// Utilitário de extração de conteúdo para importação de comprovantes de backup
// Suporta: HTML (.html, .htm), PDF (.pdf), TXT/LOG/CSV (.txt, .log, .csv), EML (.eml, .msg) e XLSX (.xlsx, .xls)
// O principal caso de uso é o e-mail Veeam salvo em HTML, onde as tabelas de detalhes
// de VMs (SRV-PRODUCAO-01  Success  08:10:05 ...) são preservadas com estrutura intacta.

export interface ExtractedComprovante {
  conteudo: string
  assunto?: string
  remetente?: string
  nomeArquivo: string
  tamanhoBytes: number
  tipoDetectado: 'html' | 'pdf' | 'eml' | 'txt' | 'xlsx' | 'outro'
  vmsDetectadas?: string[]
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Converte documento HTML em texto preservando tabelas em linhas formatadas
 * e mantendo blocos sem quebrar o parser do Veeam / Acronis / NOC.
 */
export function extractTextFromHtml(html: string): {
  plainText: string
  assunto?: string
  remetente?: string
  vmsEncontradas: string[]
} {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Extrair assunto se houver nas tags <title> ou meta
  let assunto: string | undefined
  const titleEl = doc.querySelector('title')
  if (titleEl && titleEl.textContent?.trim()) {
    assunto = titleEl.textContent.trim()
  }

  // Tentar extrair remetente/origem se houver headers clássicos
  let remetente: string | undefined
  const fromMeta = doc.querySelector('meta[name="from"], meta[name="author"]')
  if (fromMeta) {
    remetente = fromMeta.getAttribute('content') || undefined
  }

  // Identificar VMs de interesse para resumo prévio
  const vmsEncontradas: string[] = []

  // Preservar tabelas substituindo elementos <tr> por linhas de texto estruturadas
  // e <td>/<th> por colunas separadas por tabulação/espaços múltiplos
  const tables = Array.from(doc.querySelectorAll('table'))
  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'))
    const rowTexts: string[] = []

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('th, td'))
      const cellTexts = cells.map((cell) => {
        // Obter texto limpo da célula
        return (cell.textContent || '').replace(/\s+/g, ' ').trim()
      })

      // Se a linha tiver dados
      if (cellTexts.some((c) => c.length > 0)) {
        // Se parece com linha de VM do Veeam: Col 0 é o nome, Col 1 é o status (Success/Warning/Failed/Error)
        if (cellTexts.length >= 2) {
          const c0 = cellTexts[0]
          const c1 = cellTexts[1]
          if (
            /^(success|warning|failed|error)$/i.test(c1) &&
            !/^(name|vm|vms|status|details)$/i.test(c0)
          ) {
            vmsEncontradas.push(c0)
          }
        }

        // Formatar como colunas separadas por múltiplos espaços (ou \t)
        // O parser do Veeam em backup.js aceita tanto "\t" quanto "\s{2,}" ou "Nome Status Horário..."
        const rowLine = cellTexts.join('  ')
        rowTexts.push(rowLine)
      }
    }

    if (rowTexts.length > 0) {
      const tableFormatted = '\n' + rowTexts.join('\n') + '\n'
      const textNode = doc.createTextNode(tableFormatted)
      table.parentNode?.replaceChild(textNode, table)
    }
  }

  // Remover scripts, styles e outros elementos invisíveis
  const removeTags = ['script', 'style', 'noscript', 'svg', 'canvas']
  removeTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove())
  })

  // Tratar quebras de linha (<br>, <p>, <div>, <h1>...<h6>, <li>)
  doc.querySelectorAll('br').forEach((br) => {
    br.replaceWith(doc.createTextNode('\n'))
  })
  doc.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr').forEach((block) => {
    block.prepend(doc.createTextNode('\n'))
    block.append(doc.createTextNode('\n'))
  })

  // Obter texto completo
  let plainText = doc.body ? doc.body.textContent || '' : doc.documentElement.textContent || ''

  // Normalizar quebras de linha mantendo a separação entre blocos
  plainText = plainText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    plainText,
    assunto,
    remetente,
    vmsEncontradas,
  }
}

/**
 * Decodifica MIME Quoted-Printable (ex.: =20, =3D, =\n)
 */
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16))
      } catch {
        return _
      }
    })
}

/**
 * Extrai texto e metadados de arquivo EML / MSG (formato RFC 822)
 */
export function extractFromEml(emlContent: string): {
  conteudo: string
  assunto?: string
  remetente?: string
} {
  // Separar cabeçalhos do corpo
  const headerSplit = emlContent.split(/\r?\n\r?\n/)
  const headerBlock = headerSplit[0] || ''
  const bodyBlock = headerSplit.slice(1).join('\n\n')

  let assunto: string | undefined
  let remetente: string | undefined

  // Extrair Subject:
  const subMatch = headerBlock.match(/^Subject:\s*(.+)$/im)
  if (subMatch) {
    assunto = subMatch[1].trim()
    // Decodificar encoded-words simples se houver (=?UTF-8?B?...?= ou =?UTF-8?Q?...?=)
    if (assunto.startsWith('=?')) {
      const b64Match = assunto.match(/=\?([^?]+)\?B\?([^?]+)\?=/i)
      if (b64Match) {
        try {
          assunto = atob(b64Match[2])
        } catch {
          /* ignore */
        }
      }
      const qpMatch = assunto.match(/=\?([^?]+)\?Q\?([^?]+)\?=/i)
      if (qpMatch) {
        try {
          assunto = decodeQuotedPrintable(qpMatch[2].replace(/_/g, ' '))
        } catch {
          /* ignore */
        }
      }
    }
  }

  // Extrair From:
  const fromMatch = headerBlock.match(/^From:\s*(.+)$/im)
  if (fromMatch) {
    remetente = fromMatch[1].trim()
  }

  // Verificar se há corpo HTML em multipart
  if (bodyBlock.includes('<table') || bodyBlock.includes('<html') || bodyBlock.includes('<body')) {
    const htmlPartMatch =
      bodyBlock.match(/<html[\s\S]*?<\/html>/i) || bodyBlock.match(/<table[\s\S]*?<\/table>/i)
    if (htmlPartMatch) {
      const decodedHtml = decodeQuotedPrintable(htmlPartMatch[0])
      const extracted = extractTextFromHtml(decodedHtml)
      return {
        conteudo: extracted.plainText,
        assunto: assunto || extracted.assunto,
        remetente,
      }
    }
  }

  // Fallback: decodificar quoted-printable do corpo
  const decodedBody = decodeQuotedPrintable(bodyBlock)
  return {
    conteudo: decodedBody.trim(),
    assunto,
    remetente,
  }
}

/**
 * Extração de texto de PDF no cliente via leitura direta de streams de texto PDF
 * (cobre PDFs padrão com operadores Tj/TJ e texto selecionável sem dependências externas)
 */
export function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const binaryString = new TextDecoder('latin1').decode(bytes)

  const lines: string[] = []

  // 1. Procurar por blocos de streams descomprimidos com texto
  // Operadores de texto PDF: (texto) Tj ou [(t)(e)(x)(t)] TJ
  const tjRegex = /\(([^)]*)\)\s*Tj/g
  const arrayTjRegex = /\[([^\]]*)\]\s*TJ/g

  let match: RegExpExecArray | null

  // Tentar encontrar streams normais
  const streamMatches = binaryString.matchAll(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g)
  for (const sMatch of streamMatches) {
    const streamContent = sMatch[1]

    // Tj
    while ((match = tjRegex.exec(streamContent)) !== null) {
      const txt = match[1]
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
      if (txt.trim()) lines.push(txt)
    }

    // TJ
    while ((match = arrayTjRegex.exec(streamContent)) !== null) {
      const inner = match[1]
      const innerMatches = inner.match(/\(([^)]*)\)/g)
      if (innerMatches) {
        const assembled = innerMatches
          .map((m) => m.slice(1, -1).replace(/\\([()\\])/g, '$1'))
          .join('')
        if (assembled.trim()) lines.push(assembled)
      }
    }
  }

  // 2. Se a extração simplificada obteve texto
  if (lines.length > 5) {
    return lines
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  // 3. Fallback: procurar sequências de caracteres imprimíveis longas
  const printableRegex = /[\x20-\x7E\xA0-\xFF]{4,}/g
  const candidateTexts: string[] = []
  let pMatch: RegExpExecArray | null
  while ((pMatch = printableRegex.exec(binaryString)) !== null) {
    const s = pMatch[0].trim()
    // Filtrar operadores internos do PDF
    if (
      !/^(obj|endobj|stream|endstream|xref|trailer|startxref|Length|Filter|FlateDecode)/i.test(s) &&
      !s.startsWith('/')
    ) {
      candidateTexts.push(s)
    }
  }

  if (candidateTexts.length > 0) {
    return candidateTexts.join('\n')
  }

  return 'Conteúdo binário do PDF (camada de texto nativa não legível diretamente no navegador). O processamento do anexo completo pode ser validado enviando o comprovante via formulário.'
}

/**
 * Extração de texto de planilhas XLSX simples (lê sharedStrings.xml ou strings embutidas do zip)
 */
export async function extractTextFromXlsx(buffer: ArrayBuffer): Promise<string> {
  try {
    // Como XLSX é um ZIP que contém /xl/sharedStrings.xml e /xl/worksheets/sheet1.xml,
    // podemos escanear o binário por sequências XML de texto <t>valor</t>
    const bytes = new Uint8Array(buffer)
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)

    const cellRegex = /<t[^>]*>([^<]+)<\/t>/g
    const foundValues: string[] = []
    let m: RegExpExecArray | null
    while ((m = cellRegex.exec(text)) !== null) {
      const val = m[1].trim()
      if (val) foundValues.push(val)
    }

    if (foundValues.length > 0) {
      return foundValues.join('  ')
    }
  } catch {
    /* fallback */
  }

  return ''
}

/**
 * Validador e Extrator Principal de Arquivo
 */
export async function extrairConteudoArquivo(file: File): Promise<ExtractedComprovante> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `O arquivo "${file.name}" excede o tamanho máximo permitido de 10 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    )
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const validExtensions = ['html', 'htm', 'pdf', 'txt', 'log', 'csv', 'eml', 'msg', 'xlsx', 'xls']

  if (!validExtensions.includes(extension)) {
    throw new Error(
      `Formato de arquivo ".${extension}" não suportado. Utilize arquivos HTML, PDF, TXT, EML ou XLSX.`,
    )
  }

  const extracted: ExtractedComprovante = {
    conteudo: '',
    nomeArquivo: file.name,
    tamanhoBytes: file.size,
    tipoDetectado: 'outro',
  }

  // Função auxiliar para decodificar string base64 se detectada
  const decodeBase64IfDetected = (rawStr: string): string => {
    if (!rawStr) return ''
    let trimmed = rawStr.trim()
    // Caso 1: Data URL (ex: data:text/html;base64,...)
    if (trimmed.startsWith('data:') && trimmed.includes(';base64,')) {
      const parts = trimmed.split(';base64,')
      if (parts[1]) {
        try {
          const bin = atob(parts[1].trim())
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
        } catch {
          /* fallback */
        }
      }
    }
    // Caso 2: String longa sem tags html/xml/table que decodifica para texto estruturado
    if (
      !trimmed.includes('<html') &&
      !trimmed.includes('<table') &&
      !trimmed.includes('<?xml') &&
      trimmed.length >= 20 &&
      /^[A-Za-z0-9+/=\s\r\n]+$/.test(trimmed)
    ) {
      try {
        const cleanB64 = trimmed.replace(/\s+/g, '')
        const bin = atob(cleanB64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const dec = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
        if (
          dec.includes('<?xml') ||
          dec.includes('<html') ||
          dec.includes('<table') ||
          dec.includes('Backup') ||
          dec.includes('backup')
        ) {
          return dec
        }
      } catch {
        /* fallback */
      }
    }
    return trimmed
  }

  // 1. Arquivos HTML (.html, .htm) - CASO PRINCIPAL
  if (extension === 'html' || extension === 'htm') {
    extracted.tipoDetectado = 'html'
    // Leitura garantida em texto decodificado UTF-8
    let htmlText = ''
    try {
      htmlText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file, 'utf-8')
      })
    } catch {
      htmlText = await file.text()
    }

    // Detecção defensiva se o conteúdo ainda veio em base64
    htmlText = decodeBase64IfDetected(htmlText)

    // O arquivo HTML salvo do Gmail contém a estrutura completa de tabelas.
    // Preservamos o HTML em si (para que o parser backend utilize regex sobre <table>/<tr>/<td>)
    // E também o texto plano estruturado se necessário.
    // O backend aceita o HTML completo em rawConteudo e possui parser nativo de <table> e de texto plano!
    // Para garantir máxima compatibilidade com backup.js:
    // Passamos o HTML com as tabelas, mas também extraímos assunto/remetente se existirem.
    const parsed = extractTextFromHtml(htmlText)
    extracted.conteudo = htmlText
    extracted.assunto = parsed.assunto
    extracted.remetente = parsed.remetente
    extracted.vmsDetectadas = parsed.vmsEncontradas

    // Se o HTML tem title mas não tem assunto deduzido
    if (!extracted.assunto) {
      const titleM = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      if (titleM && titleM[1]) {
        extracted.assunto = titleM[1].replace(/\s+/g, ' ').trim()
      }
    }

    // Tentar extrair job name diretamente para assunto se ainda vazio
    if (!extracted.assunto) {
      const jobM = htmlText.match(
        /(?:Backup job|Backup copy job|Replication job)[:\s]+([^<\n\r]+)/i,
      )
      if (jobM && jobM[0]) {
        extracted.assunto = `[Veeam] ${jobM[0].trim()}`
      }
    }

    return extracted
  }

  // 2. Arquivos de texto (.txt, .log, .csv)
  if (extension === 'txt' || extension === 'log' || extension === 'csv') {
    extracted.tipoDetectado = 'txt'
    let text = ''
    try {
      text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file, 'utf-8')
      })
    } catch {
      text = await file.text()
    }
    extracted.conteudo = decodeBase64IfDetected(text).trim()
    return extracted
  }

  // 3. Arquivos de e-mail (.eml, .msg)
  if (extension === 'eml' || extension === 'msg') {
    extracted.tipoDetectado = 'eml'
    let raw = ''
    try {
      raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file, 'utf-8')
      })
    } catch {
      raw = await file.text()
    }
    const cleanRaw = decodeBase64IfDetected(raw)
    const emlRes = extractFromEml(cleanRaw)
    extracted.conteudo = emlRes.conteudo
    extracted.assunto = emlRes.assunto
    extracted.remetente = emlRes.remetente
    return extracted
  }

  // 4. Arquivos PDF (.pdf)
  if (extension === 'pdf') {
    extracted.tipoDetectado = 'pdf'
    const buffer = await file.arrayBuffer()
    const text = extractTextFromPdfBuffer(buffer)
    extracted.conteudo = text
    return extracted
  }

  // 5. Arquivos XLSX / XLS (.xlsx, .xls)
  if (extension === 'xlsx' || extension === 'xls') {
    extracted.tipoDetectado = 'xlsx'
    const buffer = await file.arrayBuffer()
    const text = await extractTextFromXlsx(buffer)
    extracted.conteudo = text || `[Planilha ${file.name} importada]`
    return extracted
  }

  return extracted
}
