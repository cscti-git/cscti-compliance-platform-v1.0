import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  UserCheck,
  History,
  ClipboardList,
  Server,
  Cloud,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { CsctiLogo } from '../../components/CsctiLogo'
import { CSCTI_BRAND } from '../../lib/brand'
import {
  buildDefaultPeriod,
  endOfDaySpIso,
  formatSpDateTime,
  formatSpDateOnly,
  loadRelatorioData,
  OCORRENCIA_STATUS_LABELS,
  parseSpDate,
  type RelatorioBundle,
  type ReportPeriod,
} from './relatorioData'

interface BackupReportPageProps {
  /** Se presente, usa explicitamente; senão deriva da sessão (multi-tenant). */
  orgId?: string
}

interface ModalidadeMeta {
  key: string
  label: string
  icon: React.ElementType
}

const MODALIDADES: ModalidadeMeta[] = [
  { key: 'local', label: 'Local', icon: Server },
  { key: 'nuvem', label: 'Nuvem', icon: Cloud },
  { key: 'replicacao', label: 'Replicação', icon: Copy },
]

const MODALIDADE_LABELS: Record<string, string> = {
  local: 'Local',
  nuvem: 'Nuvem',
  replicacao: 'Replicação',
}

const STATUS_LABELS: Record<string, string> = {
  sucesso: 'Sucesso',
  falha: 'Falha',
  alerta: 'Alerta',
  atencao: 'Atenção',
  pendente: 'Pendente',
  parcial: 'Parcial',
}

function statusIcon(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'sucesso' || s === 'conforme' || s === 'ok')
    return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
  if (s === 'falha' || s === 'nao_conforme' || s === 'erro')
    return <XCircle className="w-4 h-4 text-red-600" />
  if (s === 'alerta' || s === 'atencao' || s === 'parcial')
    return <AlertTriangle className="w-4 h-4 text-amber-600" />
  return <AlertCircle className="w-4 h-4 text-slate-400" />
}

export const BackupReportPage: React.FC<BackupReportPageProps> = ({ orgId: orgIdProp }) => {
  const { organization } = useAuth()
  const orgId = orgIdProp || organization?.id || ''
  const [period, setPeriod] = useState<ReportPeriod>(() => buildDefaultPeriod())
  const [data, setData] = useState<RelatorioBundle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emissao, setEmissao] = useState<Date>(() => new Date())
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(0)

  const load = React.useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const bundle = await loadRelatorioData(orgId, period)
      setData(bundle)
      setEmissao(new Date())
    } catch (e: any) {
      console.error('[BackupReportPage] Falha ao carregar dados do relatório:', e)
      setError('Não foi possível carregar os dados do relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [orgId, period])

  useEffect(() => {
    load()
  }, [load])

  // Paginação da Seção 3 (execuções), recortada por página A4 no print
  useEffect(() => {
    const compute = () => {
      const headerH = 96
      const rowH = 40
      const footH = 60
      const h = window.innerHeight
      const rows = Math.max(4, Math.floor((h - headerH - footH - 260) / rowH))
      setPageSize(Math.min(18, rows))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  const execucoesPage = useMemo(() => {
    if (!data) return []
    const size = pageSize || 12
    const start = page * size
    return data.execucoes.slice(start, start + size)
  }, [data, page, pageSize])

  const totalPages = useMemo(() => {
    if (!pageSize) return 1
    return Math.max(1, Math.ceil((data?.execucoes.length || 0) / pageSize))
  }, [data, pageSize])

  const periodoTexto = useMemo(
    () =>
      `${formatSpDateOnly(`${period.start}T12:00:00Z`)} a ${formatSpDateOnly(`${period.end}T12:00:00Z`)}`,
    [period],
  )

  const emissorTexto = useMemo(() => formatSpDateTime(emissao.toISOString()), [emissao])

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 print:hidden">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Sessão sem serventia vinculada</h1>
          <p className="text-sm text-slate-600">
            O Relatório Comprobatório é emitido por serventia. Acesse com um usuário vinculado a uma
            organização para emitir o documento.
          </p>
          <Link to="/dashboard">
            <Button variant="outline" className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Barra de ações (oculta na impressão) */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-[880px] mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/backup">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Módulo Backup
              </Button>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-600">
              Relatório Comprobatório de Backup
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="period-start" className="text-[11px] text-slate-500">
                De
              </Label>
              <Input
                id="period-start"
                type="date"
                value={period.start}
                max={period.end}
                onChange={(e) => {
                  setPage(0)
                  setPeriod((p) => ({ ...p, start: e.target.value }))
                }}
                className="h-8 w-[135px] text-xs"
              />
              <Label htmlFor="period-end" className="text-[11px] text-slate-500">
                a
              </Label>
              <Input
                id="period-end"
                type="date"
                value={period.end}
                min={period.start}
                onChange={(e) => {
                  setPage(0)
                  setPeriod((p) => ({ ...p, end: e.target.value }))
                }}
                className="h-8 w-[135px] text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={load}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Atualizar
            </Button>
            <Button
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1"
              onClick={() => window.print()}
              disabled={loading || !!error}
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Folha A4 */}
      <div className="max-w-[880px] mx-auto px-4 py-6 print:p-0 print:max-w-none">
        <div
          id="relatorio-a4"
          className="bg-white shadow-sm print:shadow-none border border-slate-200 print:border-0 print:w-full px-8 py-6 print:px-0 print:py-0"
        >
          {loading && !data && (
            <div className="space-y-3 p-6">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {error && (
            <div className="m-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2 print:hidden">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erro ao carregar o relatório</p>
                <p className="text-xs">{error}</p>
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={load}>
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {data && !error && (
            <div className="space-y-6">
              {/* ===== CABEÇALHO ===== */}
              <header className="border-b-2 border-[#0B2545] pb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CsctiLogo variant="horizontal" className="h-12 w-auto" />
                  <div>
                    <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                      Relatório Comprobatório de Backup
                    </h1>
                    <p className="text-xs text-slate-600">
                      {data.serventia?.nome || 'Serventia não identificada'}
                      {data.serventia?.classe ? ` · ${data.serventia.classe}` : ''}
                      {data.serventia?.subclasse ? ` / ${data.serventia.subclasse}` : ''}
                      {data.serventia?.municipio || data.serventia?.uf
                        ? ` · ${[data.serventia?.municipio, data.serventia?.uf].filter(Boolean).join('/')}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
                  <p>
                    <span className="font-semibold text-slate-800">Período de referência:</span>{' '}
                    {periodoTexto}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Data de emissão:</span>{' '}
                    {emissorTexto}
                  </p>
                </div>
              </header>

              {/* ===== SEÇÃO 1 — PROTEÇÃO EFETIVA ===== */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide border-b border-slate-200 pb-1">
                  1. Proteção Efetiva
                </h2>
                <p className="text-[11px] text-slate-600">
                  Percentual médio de proteção por ativo: modalidades comprovadas dentro do RPO
                  (prova = comprovante com data operacional <em>data_email</em>) divididas pelas 3
                  modalidades possíveis (Local, Nuvem, Replicação).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Proteção efetiva
                    </span>
                    <span className="text-2xl font-extrabold text-[#0B2545]">
                      {data.pct_protegido}%
                    </span>
                    <span className="text-[10px] text-slate-500">protegido perante a rotina</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Ativos
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {data.total_parciais} de {data.total_ativos} ativos parcialmente protegidos ·{' '}
                      {data.total_completos} com proteção completa
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Status por modalidade
                    </span>
                    <div className="space-y-1">
                      {data.modalidades_status.map((m) => {
                        const Icon = MODALIDADES.find((x) => x.key === m.key)?.icon || Server
                        return (
                          <div
                            key={m.key}
                            className="flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <Icon className="w-3.5 h-3.5 text-slate-500" /> {m.label}
                            </span>
                            <span className="flex items-center gap-1">
                              {m.dentro_rpo ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              )}
                              <span className="text-slate-600">{formatSpDateTime(m.ultima)}</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* ===== SEÇÃO 2 — PROTEÇÃO POR ATIVO ===== */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide border-b border-slate-200 pb-1">
                  2. Proteção por Ativo
                </h2>
                {data.ativos.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhuma execução comprovada no período para os ativos desta serventia.
                  </p>
                ) : (
                  <table className="w-full text-[11px] border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Ativo (Fonte)
                        </th>
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Rotina
                        </th>
                        {MODALIDADES.map((m) => (
                          <th
                            key={m.key}
                            className="text-center px-2 py-1.5 border-b border-slate-200 font-semibold"
                          >
                            {m.label}
                          </th>
                        ))}
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Últ. execução comprovada
                        </th>
                        <th className="text-center px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ativos.map((a) => (
                        <tr key={a.fonte} className="border-b border-slate-100">
                          <td className="px-2 py-1.5 font-medium text-slate-800">{a.fonte}</td>
                          <td className="px-2 py-1.5 text-slate-600">{a.rotina_nome}</td>
                          {a.modalidades.map((m) => (
                            <td key={m.key} className="px-2 py-1.5 text-center">
                              {m.dentro_rpo ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400 inline" />
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-slate-600">
                            {formatSpDateTime(a.ultimaExecucao)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {a.completa ? (
                              <span className="text-emerald-700 font-semibold">Completa</span>
                            ) : a.parcial ? (
                              <span className="text-amber-700 font-semibold">Parcial</span>
                            ) : (
                              <span className="text-red-600 font-semibold">Sem prova</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* ===== SEÇÃO 3 — EXECUÇÕES DO PERÍODO ===== */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide border-b border-slate-200 pb-1">
                  3. Execuções do Período
                </h2>
                <p className="text-[11px] text-slate-600">
                  Lista cronológica (mais recente primeiro) das execuções comprovadas pelo
                  comprovante (data operacional <em>data_email</em>, fuso de São Paulo). Execuções
                  excluídas com justificativa aparecem marcadas.
                </p>
                {data.execucoes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhuma execução registrada no período.
                  </p>
                ) : (
                  <>
                    <table className="w-full text-[11px] border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                            Data do comprovante
                          </th>
                          <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                            Rotina
                          </th>
                          <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                            Fonte
                          </th>
                          <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                            Modalidade
                          </th>
                          <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                            Status
                          </th>
                          <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                            Evidência
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {execucoesPage.map((e) => (
                          <tr
                            key={e.id}
                            className={`border-b border-slate-100 ${e.justificativa_exclusao ? 'bg-red-50/50 line-through opacity-70' : ''}`}
                          >
                            <td className="px-2 py-1.5 text-slate-700">
                              {formatSpDateTime(e.data_email)}
                            </td>
                            <td className="px-2 py-1.5 text-slate-700">{e.rotina_nome || '—'}</td>
                            <td className="px-2 py-1.5 text-slate-600">{e.fonte || '—'}</td>
                            <td className="px-2 py-1.5 text-slate-600">
                              {MODALIDADE_LABELS[e.modalidade] || '—'}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="flex items-center gap-1">
                                {statusIcon(e.status)}
                                {STATUS_LABELS[e.status] || e.status}
                                {e.justificativa_exclusao && (
                                  <span className="text-red-700 font-semibold">· Excluída</span>
                                )}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-slate-500 font-mono text-[10px]">
                              {e.evidencia_id ? e.evidencia_id.slice(0, 8) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.execucoes.length > (pageSize || 12) && (
                      <div className="flex items-center justify-between pt-1 print:hidden">
                        <span className="text-[11px] text-slate-500">
                          Página {page + 1} de {totalPages} · {data.execucoes.length} execuções
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled={page === 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled={page + 1 >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* ===== SEÇÃO 4 — OCORRÊNCIAS DO PERÍODO ===== */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide border-b border-slate-200 pb-1">
                  4. Ocorrências do Período
                </h2>
                {data.ocorrencias.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhuma ocorrência registrada no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.ocorrencias.map((o) => (
                      <div
                        key={o.id}
                        className="border border-slate-200 rounded-lg p-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                            {o.status === 'resolvida' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            {OCORRENCIA_STATUS_LABELS[o.status] || o.status} · {o.origem_label}
                            {o.fonte ? ` · ${o.fonte}` : ''}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatSpDateTime(o.created)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700">
                          <span className="font-semibold">Fato real:</span> {o.fato_real}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          <span className="font-semibold">Parecer:</span> {o.parecer}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ===== SEÇÃO 5 — ATESTADO HUMANO NOC ===== */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide border-b border-slate-200 pb-1">
                  5. Atestado Humano NOC (Dupla Camada)
                </h2>
                {data.noc.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum atestado humano NOC registrado no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.noc.map((n) => (
                      <div
                        key={n.id}
                        className="border border-slate-200 rounded-lg p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                            Atestado de {formatSpDateTime(n.data_email)} ·{' '}
                            {n.origem === 'manual' ? 'Registro manual' : 'E-mail NOC'}
                          </span>
                          {n.convergencia === 'convergente' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                              <ShieldCheck className="w-3 h-3" /> NOC concorda com a análise do
                              sistema
                            </span>
                          ) : n.convergencia === 'divergente' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                              <ShieldAlert className="w-3 h-3" /> Divergência detectada (registrada;
                              veredito do sistema prevalece)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Convergência não avaliada
                            </span>
                          )}
                        </div>
                        {n.vms.length > 0 && (
                          <table className="w-full text-[10px] border border-slate-100">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600">
                                <th className="text-left px-2 py-1 border-b border-slate-100">
                                  VM
                                </th>
                                <th className="text-left px-2 py-1 border-b border-slate-100">
                                  Status NOC
                                </th>
                                <th className="text-left px-2 py-1 border-b border-slate-100">
                                  Ações do técnico
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {n.vms.map((v, i) => (
                                <tr key={`${n.id}-${i}`} className="border-b border-slate-50">
                                  <td className="px-2 py-1 text-slate-700">{v.vm}</td>
                                  <td className="px-2 py-1 text-slate-600">{v.status}</td>
                                  <td className="px-2 py-1 text-slate-600">{v.acoes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ===== SEÇÃO 6 — TRILHA DE AUDITORIA ===== */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide border-b border-slate-200 pb-1">
                  6. Trilha de Auditoria do Período
                </h2>
                {data.audit.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum evento de auditoria no período.
                  </p>
                ) : (
                  <table className="w-full text-[11px] border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Data/Hora
                        </th>
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Ação
                        </th>
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Recurso
                        </th>
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Usuário
                        </th>
                        <th className="text-left px-2 py-1.5 border-b border-slate-200 font-semibold">
                          Resumo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audit.map((a) => (
                        <tr key={a.id} className="border-b border-slate-100">
                          <td className="px-2 py-1.5 text-slate-600">
                            {formatSpDateTime(a.created)}
                          </td>
                          <td className="px-2 py-1.5 text-slate-700 font-medium">{a.acao}</td>
                          <td className="px-2 py-1.5 text-slate-600">{a.recurso}</td>
                          <td className="px-2 py-1.5 text-slate-600">{a.usuario || '—'}</td>
                          <td className="px-2 py-1.5 text-slate-600">{a.resumo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* ===== RODAPÉ ===== */}
              <footer className="border-t border-slate-200 pt-3 pb-2 mt-6 flex items-end justify-between gap-4 text-[10px] text-slate-500 print:fixed print:bottom-2 print:left-0 print:right-0 print:px-8">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-700">{CSCTI_BRAND.name}</p>
                  <p>
                    Documento espelha o estado dos registros à data de emissão ({emissorTexto}) —
                    não substitui os comprovantes originais arquivados.
                  </p>
                </div>
                <span className="print:hidden">
                  Página gerada eletronicamente · CSCTI - Compliance
                </span>
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BackupReportPage
