// src/pages/backup/relatorioData.ts — Agregação de dados para o Relatório Comprobatório de Backup (A4)
// Regras espelham o motor: RPO e "execução mais recente" usam data_email (data do comprovante, fuso SP);
// cada execução comprova somente a modalidade que o job demonstra (veredito único = pior verificação).
import pb from '../../lib/pocketbase/client'
import { getBackupConfronto } from '../../services/backupService'
import type {
  BackupConfrontoResponse,
  BackupExecucaoItem,
  BackupOcorrenciaItem,
} from '../../types/cscti'

// ---------- Datas (fuso de São Paulo) ----------

export function parseSpDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export function formatSpDateTime(value?: string | null): string {
  const d = parseSpDate(value)
  if (!d) return '—'
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatSpDateOnly(value?: string | null): string {
  const d = parseSpDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function isBeforeStartOfDaySp(date: Date | null, now: Date): boolean {
  if (!date) return false
  try {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const ymd = (d: Date) => f.format(d)
    return ymd(date) < ymd(now)
  } catch {
    return date < now
  }
}

// ---------- Períodos ----------

export interface ReportPeriod {
  start: string
  end: string
}

export function buildDefaultPeriod(): ReportPeriod {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return { start: fmt(start), end: fmt(end) }
}

// Fim do dia (inclusive) no fuso SP, convertido para UTC ISO
export function endOfDaySpIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const utcAsSp = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
  return new Date(utcAsSp.getTime() - 3 * 3600 * 1000).toISOString()
}

// ---------- Serventia (organização da sessão) ----------

export interface ServentiaData {
  id: string
  nome: string
  classe: string
  subclasse: string
  municipio: string
  uf: string
  cnpj: string
  codigo: string
}

export async function loadServentia(orgId: string): Promise<ServentiaData | null> {
  if (!orgId) return null
  const rec = await pb
    .collection('organizations')
    .getOne<Record<string, any>>(orgId)
    .catch(async () => {
      // fallback caso a collection seja nomeada no singular
      return pb.collection('organization').getOne<Record<string, any>>(orgId)
    })
  return {
    id: rec.id,
    nome: String(rec.nome || rec.name || ''),
    classe: String(rec.classe || ''),
    subclasse: String(rec.subclasse || ''),
    municipio: String(rec.municipio || rec.cidade || ''),
    uf: String(rec.uf || rec.estado || ''),
    cnpj: String(rec.cnpj || ''),
    codigo: String(rec.codigo || rec.codigo_cnj || ''),
  }
}

// ---------- Execuções ----------

export interface ExecucaoRow {
  id: string
  rotina_nome: string
  fonte: string
  modalidade: string
  modalidade_label: string
  status: string
  status_label: string
  data_email: string | null
  created: string
  evidencia_id: string
  justificativa_exclusao: string
}

export const MODALIDADE_LABELS: Record<string, string> = {
  local: 'Local',
  nuvem: 'Nuvem',
  replicacao: 'Replicação',
}

export const STATUS_LABELS: Record<string, string> = {
  sucesso: 'Sucesso',
  falha: 'Falha',
  erro: 'Falha',
  alerta: 'Alerta',
  pendente: 'Pendente',
  parcial: 'Parcial',
}

export function mapExecucao(e: BackupExecucaoItem | Record<string, any>): ExecucaoRow {
  const rec = e as Record<string, any>
  const expand = rec.expand || {}
  const rotina = expand.rotina?.nome || rec.rotina_nome || rec.rotina || ''

  // Extrai detalhes de VMs ou confronto
  let fonte = ''
  if (Array.isArray(rec.detalhes_vms) && rec.detalhes_vms.length > 0) {
    fonte = rec.detalhes_vms
      .map((v: any) => v.vm || v.nome || '')
      .filter(Boolean)
      .join(', ')
  } else if (rec.confronto_escopo?.ativos && Array.isArray(rec.confronto_escopo.ativos)) {
    fonte = rec.confronto_escopo.ativos
      .map((a: any) => a.nome || a.ativo || '')
      .filter(Boolean)
      .join(', ')
  } else if (rec.fonte) {
    fonte = String(rec.fonte)
  }

  // Modalidade (local/nuvem/replicacao) — espelha estritamente o motor backend (backup_confronto.js: inferirModalidadeExecucao)
  const obs = String(rec.observacao || '').toLowerCase()
  const rotNome = String(rotina || '').trim()
  const dest = String(rec.destino || '').trim()

  let modalidade = ''

  // a) Prefixo do job em rec.observacao (case-insensitive, prioridade máxima)
  if (
    obs.includes('veeam backup_copy:') ||
    obs.includes('backup copy job:') ||
    obs.includes('copy job:')
  ) {
    modalidade = 'nuvem'
  } else if (obs.includes('veeam replication:') || obs.includes('replication job:')) {
    modalidade = 'replicacao'
  } else if (obs.includes('veeam backup:') || obs.includes('backup job:')) {
    modalidade = 'local'
  }

  // b) Padrão do nome da rotina (rotina_nome, regex case-insensitive)
  if (!modalidade && rotNome) {
    if (/-\s*replicas?$|\breplica[çc][aã]o$/i.test(rotNome)) {
      modalidade = 'replicacao'
    } else if (/to cloud/i.test(rotNome) || /-\s*nuvens?$/i.test(rotNome)) {
      modalidade = 'nuvem'
    } else if (/-\s*local$/i.test(rotNome)) {
      modalidade = 'local'
    }
  }

  // c) Destino só conta se for INEQUÍVOCO (se contiver mais de 1 modalidade mencionada, ignora)
  if (!modalidade && dest) {
    const destLower = dest.toLowerCase()
    const temLocal = /\blocal\b/i.test(destLower)
    const temNuvem = /\b(?:nuvens?|cloud)\b/i.test(destLower)
    const temReplica = /\b(?:replicas?|replica[çc][aã]o|replication)\b/i.test(destLower)
    const count = (temLocal ? 1 : 0) + (temNuvem ? 1 : 0) + (temReplica ? 1 : 0)
    if (count === 1) {
      if (temReplica) modalidade = 'replicacao'
      else if (temNuvem) modalidade = 'nuvem'
      else if (temLocal) modalidade = 'local'
    }
  }

  // d) Ler confronto_escopo.comprovado[].modalidade como fonte confirmatória
  if (!modalidade) {
    const comprovados = Array.isArray(rec.confronto_escopo?.comprovado)
      ? rec.confronto_escopo.comprovado
      : []
    for (const comp of comprovados) {
      const m = String(comp?.modalidade || '').toLowerCase()
      if (m === 'local' || m === 'nuvem' || m === 'replicacao') {
        modalidade = m
        break
      }
    }
  }

  // Fallback caso ainda não tenha modalidade
  if (!modalidade) {
    const rawMod = String(rec.modalidade || '').toLowerCase()
    if (rawMod === 'local' || rawMod === 'nuvem' || rawMod === 'replicacao') {
      modalidade = rawMod
    } else {
      modalidade = 'local'
    }
  }

  const data_email = rec.data_email || rec.data_inicio || rec.created || null

  return {
    id: rec.id,
    rotina_nome: rotina || '—',
    fonte: fonte || '—',
    modalidade,
    modalidade_label: MODALIDADE_LABELS[modalidade] || modalidade || '—',
    status: rec.status || 'sucesso',
    status_label: STATUS_LABELS[rec.status] || rec.status || 'Sucesso',
    data_email,
    created: rec.created || '',
    evidencia_id: rec.evidencia || '',
    justificativa_exclusao: rec.observacao?.includes('EXCLUÍDA')
      ? rec.observacao
      : rec.justificativa_exclusao || '',
  }
}

// ---------- Modalidades comprovadas (regra do motor, espelhada) ----------

export interface ModalidadeComprovacao {
  key: string
  label: string
  ultima: string | null
  ultima_exec_id: string | null
  dentro_rpo: boolean
}

export interface AtivoProtecao {
  fonte: string
  rotina_nome: string
  modalidades: ModalidadeComprovacao[]
  comprovadas: number
  exigidas: number
  parcial: boolean
  completa: boolean
  ultimaExecucao: string | null
  tipo?: string
  criticidade?: string
  status_consolidado?: string
}

export interface ProtectionAggregate {
  ativos: AtivoProtecao[]
  total_ativos: number
  total_parciais: number
  total_completos: number
  pct_protegido: number
  modalidades_status: ModalidadeComprovacao[]
}

export const MODALIDADES = ['local', 'nuvem', 'replicacao']
export const RPO_MS: Record<string, number> = {
  local: 24 * 3600_000,
  nuvem: 24 * 3600_000,
  replicacao: 24 * 3600_000, // 24h conforme plano da serventia (RPO padrão de 24h)
}

export function mapAtivo(
  fonte: string,
  rotina_nome: string,
  rows: ExecucaoRow[],
  now: Date = new Date(),
): AtivoProtecao {
  const modalidades = Object.keys(MODALIDADE_LABELS).map((key) => {
    const modalRows = rows.filter((r) => r.modalidade === key)
    const last = modalRows.reduce<ExecucaoRow | null>((acc, r) => {
      if (!acc) return r
      return (parseSpDate(r.data_email)?.getTime() ?? 0) >
        (parseSpDate(acc.data_email)?.getTime() ?? 0)
        ? r
        : acc
    }, null)
    const ultima = last?.data_email || null
    const d = parseSpDate(ultima)
    return {
      key,
      label: MODALIDADE_LABELS[key],
      ultima,
      ultima_exec_id: last?.id || null,
      dentro_rpo: !!d && d.getTime() >= now.getTime() - RPO_MS[key],
    }
  })

  return {
    fonte,
    rotina_nome,
    modalidades,
    comprovadas: modalidades.filter((m) => m.dentro_rpo).length,
    exigidas: 3,
    parcial: modalidades.some((m) => m.dentro_rpo) && !modalidades.every((m) => m.dentro_rpo),
    completa: modalidades.every((m) => m.dentro_rpo),
    ultimaExecucao: rows.reduce<string | null>((acc, r) => {
      const d = parseSpDate(r.data_email)
      if (!d) return acc
      return !acc || d > (parseSpDate(acc) as Date) ? r.data_email : acc
    }, null),
  }
}

// ---------- Ocorrências ----------

export interface OcorrenciaRow {
  id: string
  origem: string
  origem_label: string
  status: string
  status_label: string
  tipo: string
  severidade: string
  titulo: string
  fato_real: string
  parecer: string
  created: string
  fonte: string
  is_falso_alarme: boolean
}

export const OCORRENCIA_ORIGEM_LABELS: Record<string, string> = {
  motor: 'Motor (automática)',
  noc: 'NOC',
  manual: 'Manual',
}

export const OCORRENCIA_STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  resolvida: 'Resolvida',
  dispensada: 'Dispensada',
}

export function mapOcorrencia(o: BackupOcorrenciaItem | Record<string, any>): OcorrenciaRow {
  const rec = o as Record<string, any>
  let fatoRealTexto = ''
  let origemDetectada = 'motor'
  let fonte = ''
  let isFalsoAlarme = false

  // Detecta se fato_real traz marcação explícita de falso alarme
  if (typeof rec.fato_real === 'string') {
    try {
      const parsed = JSON.parse(rec.fato_real)
      if (parsed?.falso_alarme === true || parsed?.falha_real === false) {
        isFalsoAlarme = true
      }
      if (parsed?.motivo) {
        fatoRealTexto = String(parsed.motivo)
      } else {
        fatoRealTexto = rec.fato_real
      }
    } catch {
      fatoRealTexto = rec.fato_real
    }
  } else if (rec.fato_real && typeof rec.fato_real === 'object') {
    const fr = rec.fato_real
    if (fr.falso_alarme === true || fr.falha_real === false) {
      isFalsoAlarme = true
    }
    if (fr.origem === 'noc') origemDetectada = 'noc'
    if (fr.rotina_nome) fatoRealTexto += `Rotina: ${fr.rotina_nome}. `
    if (fr.modalidade) fatoRealTexto += `Modalidade: ${fr.modalidade}. `
    if (Array.isArray(fr.vms_falhas) && fr.vms_falhas.length > 0) {
      fonte = fr.vms_falhas
        .map((v: any) => (typeof v === 'string' ? v : v.cliente || v.vm || ''))
        .filter(Boolean)
        .join(', ')
      fatoRealTexto += `VMs com falha: ${fonte}. `
    }
    if (fr.motivo) {
      fatoRealTexto += (fatoRealTexto ? ' ' : '') + fr.motivo
    } else if (fr.erro_detalhe) {
      fatoRealTexto += (fatoRealTexto ? ' ' : '') + fr.erro_detalhe
    }
  }

  // Heurística confirmatória caso o parecer ou a descrição atestem falso alarme
  const textoCombinado =
    `${rec.titulo || ''} ${rec.descricao || ''} ${rec.resolucao || ''} ${fatoRealTexto}`.toLowerCase()
  if (
    textoCombinado.includes('falso alarme') ||
    textoCombinado.includes('regressão no parse') ||
    textoCombinado.includes('regressão de parsing') ||
    textoCombinado.includes('fabricad')
  ) {
    isFalsoAlarme = true
  }

  if (!fatoRealTexto) {
    fatoRealTexto = rec.descricao || rec.titulo || 'Ocorrência registrada'
  }

  const parecerFinal =
    rec.resolucao ||
    rec.parecer ||
    (rec.status === 'resolvida' ? 'Resolvida conforme comprovação' : 'Aguardando validação')

  return {
    id: rec.id,
    origem: rec.origem || origemDetectada,
    origem_label: OCORRENCIA_ORIGEM_LABELS[rec.origem || origemDetectada] || 'Motor (automática)',
    status: rec.status,
    status_label: OCORRENCIA_STATUS_LABELS[rec.status] || rec.status,
    tipo: rec.tipo || 'falha_de_backup',
    severidade: rec.severidade || 'baixa',
    titulo: rec.titulo || '',
    fato_real: fatoRealTexto,
    parecer: parecerFinal,
    created: rec.created || '',
    fonte: fonte || rec.fonte || '',
    is_falso_alarme: isFalsoAlarme,
  }
}

// ---------- Atestados NOC ----------

export interface NocRow {
  id: string
  data_email: string
  created: string
  origem: string
  convergencia: string
  vms: { vm: string; status: string; acoes: string }[]
}

export function mapNoc(r: Record<string, any>): NocRow {
  let vms: { vm: string; status: string; acoes: string }[] = []
  if (r.clientes_status) {
    try {
      const parsed =
        typeof r.clientes_status === 'string' ? JSON.parse(r.clientes_status) : r.clientes_status
      if (Array.isArray(parsed)) {
        vms = parsed.map((v: any) => ({
          vm: String(v.cliente || v.vm || v.nome || ''),
          status: String(v.status || ''),
          acoes: String(v.acoes || ''),
        }))
      }
    } catch {
      /* campo livre */
    }
  } else if (r.vms) {
    try {
      const parsed = typeof r.vms === 'string' ? JSON.parse(r.vms) : r.vms
      if (Array.isArray(parsed)) {
        vms = parsed.map((v: any) => ({
          vm: String(v.vm || v.nome || ''),
          status: String(v.status || ''),
          acoes: String(v.acoes || ''),
        }))
      }
    } catch {
      /* campo livre */
    }
  }

  const temDivergencia = Array.isArray(r.divergencias) && r.divergencias.length > 0
  const convergenciaCalculada =
    r.convergencia || r.status_convergencia || (temDivergencia ? 'divergente' : 'convergente')

  return {
    id: r.id,
    data_email: r.data_monitoramento || r.data_email || r.created,
    created: r.created,
    origem: r.origem_tipo || r.origem || 'email',
    convergencia: convergenciaCalculada,
    vms,
  }
}

// ---------- Carga principal ----------

export interface RelatorioBundle {
  serventia: ServentiaData | null
  execucoes: ExecucaoRow[]
  ativos: AtivoProtecao[]
  total_ativos: number
  total_parciais: number
  total_completos: number
  pct_protegido: number
  modalidades_status: ModalidadeComprovacao[]
  ocorrencias: OcorrenciaRow[]
  noc: NocRow[]
  confrontoRaw?: BackupConfrontoResponse | null
}

export async function loadRelatorioData(
  orgId: string,
  period: ReportPeriod,
): Promise<RelatorioBundle> {
  const startIso = new Date(`${period.start}T00:00:00Z`).toISOString()
  const endIso = endOfDaySpIso(period.end)

  // Consultas paralelas:
  // 1. Dados estruturais da serventia
  // 2. Confronto centrado no ativo (motor backend) — estado atual de conformidade / Visão Geral
  // 3. Execuções completas (todas da organização, para mapear estado atual e Seção 3 do período)
  // 4. Ocorrências dentro do período selecionado (Seção 4)
  // 5. Monitoramentos externos NOC
  const [serventia, confrontoRes, execucoes, ocorrencias, nocs] = await Promise.all([
    loadServentia(orgId).catch(() => null),
    getBackupConfronto(orgId).catch((err) => {
      console.warn('[relatorioData] Motor de confronto inacessível:', err)
      return null as BackupConfrontoResponse | null
    }),
    pb
      .collection('backup_execucoes')
      .getFullList<Record<string, any>>({
        filter: `organization = "${orgId}"`,
        sort: '-created',
        expand: 'rotina,evidencia',
      })
      .catch((): Record<string, any>[] => []),
    pb
      .collection('backup_ocorrencias')
      .getFullList<Record<string, any>>({
        filter: `organization = "${orgId}" && created >= "${startIso}" && created <= "${endIso}"`,
        sort: '-created',
      })
      .catch((): Record<string, any>[] => []),
    pb
      .collection('backup_monitoramentos_externos')
      .getFullList<Record<string, any>>({
        filter: `organization = "${orgId}"`,
        sort: '-created',
      })
      .catch((): Record<string, any>[] => []),
  ])

  // Todas as execuções mapeadas (sem filtro de período), usadas para derivar o estado atual
  const allRows = execucoes.map((e) => mapExecucao(e))

  // SEÇÃO 3: Filtragem de execuções no período por data_email (verdade operacional, ou fallback)
  const execucoesDoPeriodo = allRows.filter((r) => {
    const dataIso = r.data_email || r.created
    if (!dataIso) return true
    return dataIso >= startIso && dataIso <= endIso
  })

  // SEÇÃO 1 e SEÇÃO 2: Estado atual da proteção (independente do período de referência das Seções 3 e 4)
  // Alinhado 100% com o motor de confronto da Visão Geral
  let ativos: AtivoProtecao[] = []
  let total_ativos = 0
  let total_parciais = 0
  let total_completos = 0
  let pct_protegido = 0
  let modalidades_status: ModalidadeComprovacao[] = []

  const now = new Date()

  if (
    confrontoRes &&
    confrontoRes.ok &&
    Array.isArray(confrontoRes.confronto) &&
    confrontoRes.confronto.length > 0
  ) {
    // Alinhamento direto com o motor de confronto
    const confList = confrontoRes.confronto
    total_ativos = confrontoRes.totais?.total_ativos_exigidos ?? confList.length
    total_completos =
      confrontoRes.totais?.total_protegidos_completo ??
      confList.filter((a) => a.status_consolidado === 'PROTEGIDO').length
    total_parciais =
      confrontoRes.totais?.total_parcial ??
      confList.filter((a) => a.status_consolidado === 'PARCIAL').length
    pct_protegido =
      typeof confrontoRes.totais?.percentual_protegido_efetivo === 'number'
        ? confrontoRes.totais.percentual_protegido_efetivo
        : (confrontoRes.totais?.percentual_protegido ?? 0)

    ativos = confList.map((item) => {
      const modalList: ModalidadeComprovacao[] = Object.keys(MODALIDADE_LABELS).map((key) => {
        const modInfo = (item.modalidades as any)?.[key]
        const ultima = modInfo?.ultima_comprovacao || null
        const dentro_rpo = modInfo ? Boolean(modInfo.dentro_do_rpo) : false
        return {
          key,
          label: MODALIDADE_LABELS[key],
          ultima,
          ultima_exec_id: modInfo?.execucao_id || null,
          dentro_rpo,
        }
      })

      // Determinar rotina representativa
      const rotinaNome =
        item.modalidades?.local?.rotina_nome ||
        item.modalidades?.nuvem?.rotina_nome ||
        item.modalidades?.replicacao?.rotina_nome ||
        'Rotina de Backup'

      // Última execução geral comprovada deste ativo
      let ultimaGeral: string | null = null
      for (const m of modalList) {
        if (m.ultima) {
          if (!ultimaGeral || new Date(m.ultima).getTime() > new Date(ultimaGeral).getTime()) {
            ultimaGeral = m.ultima
          }
        }
      }

      const comprovadasCount = item.total_atendidas ?? modalList.filter((m) => m.dentro_rpo).length
      const exigidasCount = item.exigencias?.total_exigidas || 3
      const isCompleta = item.status_consolidado === 'PROTEGIDO'
      const isParcial = item.status_consolidado === 'PARCIAL'

      return {
        fonte: item.nome,
        rotina_nome: rotinaNome,
        modalidades: modalList,
        comprovadas: comprovadasCount,
        exigidas: exigidasCount,
        parcial: isParcial,
        completa: isCompleta,
        ultimaExecucao: ultimaGeral,
        tipo: item.tipo,
        criticidade: item.criticidade,
        status_consolidado: item.status_consolidado,
      }
    })

    // Status geral por modalidade (agrega a última comprovação e se está dentro do RPO)
    modalidades_status = Object.keys(MODALIDADE_LABELS).map((key) => {
      let ultimaData: string | null = null
      let ultimaExecId: string | null = null
      let algumForaRpo = false
      let temAoMenosUma = false

      for (const item of confList) {
        const mod = (item.modalidades as any)?.[key]
        if (mod && mod.ultima_comprovacao) {
          temAoMenosUma = true
          if (
            !ultimaData ||
            new Date(mod.ultima_comprovacao).getTime() > new Date(ultimaData).getTime()
          ) {
            ultimaData = mod.ultima_comprovacao
            ultimaExecId = mod.execucao_id || null
          }
          if (mod.status_modalidade === 'FORA_RPO') {
            algumForaRpo = true
          }
        }
      }

      // Se nenhum ativo tem o mod comprovado no confronto, busca em allRows
      if (!ultimaData) {
        const allModRows = allRows.filter((r) => r.modalidade === key && r.status === 'sucesso')
        const last = allModRows.reduce<ExecucaoRow | null>((acc, r) => {
          if (!acc) return r
          return (parseSpDate(r.data_email)?.getTime() ?? 0) >
            (parseSpDate(acc.data_email)?.getTime() ?? 0)
            ? r
            : acc
        }, null)
        if (last) {
          ultimaData = last.data_email
          ultimaExecId = last.id
        }
      }

      const d = parseSpDate(ultimaData)
      // Dentro do RPO: segue a avaliação do confronto (se tem comprovação e nenhum ativo está FORA_RPO)
      // ou fallback por RPO_MS
      const rpoMs = RPO_MS[key] || 24 * 3600_000
      const dentro_rpo = temAoMenosUma
        ? !algumForaRpo
        : Boolean(d && d.getTime() >= now.getTime() - rpoMs)

      return {
        key,
        label: MODALIDADE_LABELS[key],
        ultima: ultimaData,
        ultima_exec_id: ultimaExecId,
        dentro_rpo,
      }
    })
  } else {
    // Fallback: caso o motor de confronto backend falhe, usar allRows (execuções mais recentes sem filtro de período)
    const byFonte = new Map<string, ExecucaoRow[]>()
    for (const r of allRows) {
      const key = r.fonte || '(sem fonte)'
      if (!byFonte.has(key)) byFonte.set(key, [])
      byFonte.get(key)!.push(r)
    }

    for (const [fonte, erows] of byFonte) {
      const rotina = erows[0]?.rotina_nome || '—'
      ativos.push(mapAtivo(fonte, rotina, erows, now))
    }

    total_ativos = ativos.length
    total_parciais = ativos.filter((a) => a.parcial).length
    total_completos = ativos.filter((a) => a.completa).length
    pct_protegido = total_ativos
      ? Math.round((ativos.reduce((s, a) => s + a.comprovadas / 3, 0) / total_ativos) * 100)
      : 0

    modalidades_status = Object.keys(MODALIDADE_LABELS).map((key) => {
      const all = allRows.filter((r) => r.modalidade === key)
      const last = all.reduce<ExecucaoRow | null>((acc, r) => {
        if (!acc) return r
        return (parseSpDate(r.data_email)?.getTime() ?? 0) >
          (parseSpDate(acc.data_email)?.getTime() ?? 0)
          ? r
          : acc
      }, null)
      const d = parseSpDate(last?.data_email || null)
      const rpoMs = RPO_MS[key] || 24 * 3600_000
      return {
        key,
        label: MODALIDADE_LABELS[key],
        ultima: last?.data_email || null,
        ultima_exec_id: last?.id || null,
        dentro_rpo: !!d && d.getTime() >= now.getTime() - rpoMs,
      }
    })
  }

  return {
    serventia,
    execucoes: execucoesDoPeriodo,
    ativos,
    total_ativos,
    total_parciais,
    total_completos,
    pct_protegido,
    modalidades_status,
    ocorrencias: ocorrencias.map(mapOcorrencia),
    noc: nocs.map(mapNoc),
    confrontoRaw: confrontoRes,
  }
}
