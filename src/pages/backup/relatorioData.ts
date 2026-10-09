// src/pages/backup/relatorioData.ts — Agregação de dados para o Relatório Comprobatório de Backup (A4)
// Regras espelham o motor: RPO e "execução mais recente" usam data_email (data do comprovante, fuso SP);
// cada execução comprova somente a modalidade que o job demonstra (veredito único = pior verificação).
import { pb } from '../../lib/pocketbase/client'
import type { BackupExecucaoItem, BackupOcorrenciaItem } from '../../types/cscti'

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

// Fim do dia (inclusive) no fuso SP, convertido para UTC ISO — resolve o "fim do dia" sem ambiguidade.
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
  const rec = await pb.collection('organization').getOne<Record<string, any>>(orgId)
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
  alerta: 'Alerta',
  pendente: 'Pendente',
}

export function mapExecucao(
  e: BackupExecucaoItem,
  i: number,
  arr: BackupExecucaoItem[],
): ExecucaoRow {
  const fonte = e.fonte || ''
  const rotina = e.rotina_nome || ''
  const next = arr[i + 1]
  const nextRotina = next ? next.rotina_nome || '' : ''
  const nextFonte = next ? next.fonte || '' : ''
  const rotinaTerminou = next ? rotina !== nextRotina : true
  const fonteTerminou = next ? fonte !== nextFonte : true

  return {
    id: e.id,
    rotina_nome: rotina,
    fonte,
    modalidade: e.modalidade || '',
    modalidade_label: MODALIDADE_LABELS[e.modalidade] || '—',
    status: e.status,
    status_label: STATUS_LABELS[e.status] || e.status,
    data_email: e.data_email || null,
    created: e.created,
    evidencia_id: e.evidencia || '',
    justificativa_exclusao: e.justificativa_exclusao || '',
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
  replicacao: 24 * 30_000, // 30 min — rotinas de 30 min (memória do projeto)
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
  fato_real: string
  parecer: string
  created: string
  fonte: string
}

export const OCORRENCIA_ORIGEM_LABELS: Record<string, string> = {
  motor: 'Motor (automática)',
  noc: 'NOC',
  manual: 'Manual',
}

export const OCORRENCIA_STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta',
  resolvida: 'Resolvida',
  dispensada: 'Dispensada',
}

export function mapOcorrencia(o: BackupOcorrenciaItem): OcorrenciaRow {
  return {
    id: o.id,
    origem: o.origem || 'motor',
    origem_label: OCORRENCIA_ORIGEM_LABELS[o.origem] || 'Motor (automática)',
    status: o.status,
    status_label: OCORRENCIA_STATUS_LABELS[o.status] || o.status,
    fato_real: o.fato_real || '—',
    parecer: o.parecer || '—',
    created: o.created,
    fonte: o.fonte || '',
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
  if (r.vms) {
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
  return {
    id: r.id,
    data_email: r.data_email || r.created,
    created: r.created,
    origem: r.origem || 'email',
    convergencia: r.convergencia || r.status_convergencia || '',
    vms,
  }
}

// ---------- Trilha de auditoria ----------

export interface AuditRow {
  id: string
  created: string
  acao: string
  recurso: string
  resumo: string
  usuario: string
}

export function mapAudit(r: Record<string, any>): AuditRow {
  return {
    id: r.id,
    created: r.created,
    acao: r.acao || r.action || '',
    recurso: r.recurso || r.collection || '',
    resumo: r.resumo || r.detalhes || r.description || '',
    usuario: r.usuario || r.user_name || '',
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
  audit: AuditRow[]
}

export async function loadRelatorioData(
  orgId: string,
  period: ReportPeriod,
): Promise<RelatorioBundle> {
  const startIso = new Date(`${period.start}T00:00:00Z`).toISOString()
  const endIso = endOfDaySpIso(period.end)
  const window = `data_email >= "${startIso}" && data_email <= "${endIso}"`

  const [serventia, execucoes, ocorrencias, nocs, audits] = await Promise.all([
    loadServentia(orgId).catch(() => null),
    pb
      .collection('backup_execucoes')
      .getFullList<BackupExecucaoItem>({
        filter: `org = "${orgId}" && ${window}`,
        sort: '-data_email',
      })
      .catch((): BackupExecucaoItem[] => []),
    pb
      .collection('backup_ocorrencias')
      .getFullList<BackupOcorrenciaItem>({
        filter: `org = "${orgId}" && created >= "${startIso}" && created <= "${endIso}"`,
        sort: '-created',
      })
      .catch((): BackupOcorrenciaItem[] => []),
    pb
      .collection('backup_monitoramentos_externos')
      .getFullList<Record<string, any>>({ filter: `org = "${orgId}"`, sort: '-data_email' })
      .catch((): Record<string, any>[] => []),
    pb
      .collection('audit_log')
      .getFullList<Record<string, any>>({
        filter: `org = "${orgId}" && created >= "${startIso}" && created <= "${endIso}"`,
        sort: '-created',
      })
      .catch((): Record<string, any>[] => []),
  ])

  const rows = execucoes.map((e, i, arr) => mapExecucao(e, i, arr))

  // Agrupar por fonte (ativo) preservando ordem de primeira aparição
  const byFonte = new Map<string, ExecucaoRow[]>()
  for (const r of rows) {
    const key = r.fonte || '(sem fonte)'
    if (!byFonte.has(key)) byFonte.set(key, [])
    byFonte.get(key)!.push(r)
  }

  const now = new Date()
  const ativos: AtivoProtecao[] = []
  for (const [fonte, erows] of byFonte) {
    const rotina = erows[0]?.rotina_nome || '—'
    ativos.push(mapAtivo(fonte, rotina, erows, now))
  }

  const total_ativos = ativos.length
  const total_parciais = ativos.filter((a) => a.parcial).length
  const total_completos = ativos.filter((a) => a.completa).length
  const pct_protegido = total_ativos
    ? Math.round((ativos.reduce((s, a) => s + a.comprovadas / 3, 0) / total_ativos) * 100)
    : 0

  const modalidades_status = Object.keys(MODALIDADE_LABELS).map((key) => {
    const all = rows.filter((r) => r.modalidade === key)
    const last = all.reduce<ExecucaoRow | null>((acc, r) => {
      if (!acc) return r
      return (parseSpDate(r.data_email)?.getTime() ?? 0) >
        (parseSpDate(acc.data_email)?.getTime() ?? 0)
        ? r
        : acc
    }, null)
    const d = parseSpDate(last?.data_email || null)
    return {
      key,
      label: MODALIDADE_LABELS[key],
      ultima: last?.data_email || null,
      ultima_exec_id: last?.id || null,
      dentro_rpo: !!d && d.getTime() >= now.getTime() - RPO_MS[key],
    }
  })

  return {
    serventia,
    execucoes: rows,
    ativos,
    total_ativos,
    total_parciais,
    total_completos,
    pct_protegido,
    modalidades_status,
    ocorrencias: ocorrencias.map(mapOcorrencia),
    noc: nocs.map(mapNoc),
    audit: audits.map(mapAudit),
  }
}

// (fim)
