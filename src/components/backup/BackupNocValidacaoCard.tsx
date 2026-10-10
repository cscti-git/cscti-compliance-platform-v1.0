import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { formatDate, formatRelativeTimeSp } from '@/lib/dateTime'
import type {
  BackupMonitoramentoExternoItem,
  BackupNocClienteStatusItem,
  BackupNocDivergenciaItem,
} from '@/types/cscti'

/**
 * Card "Validação Externa (NOC)" da Visão Geral do Backup.
 *
 * Mostra a segunda camada da conformidade (o motor de confronto é a primeira):
 * a data do último atestado externo diário do NOC, o status geral, as VMs
 * avaliadas com status individual e o indicador de convergência
 * NOC × análise do sistema. Somente leitura — os dados vêm da coleção
 * `backup_monitoramentos_externos` (mesma fonte da sub-aba
 * "Monitoramento Externo (NOC)" da aba Evidências).
 */

/** Rótulos espurios que podem vir da tabela HTML do e-mail do NOC (mesma regra da sub-aba de Evidências). */
const ROTULOS_ESPURIOS_NOC = new Set([
  'name',
  'nome',
  'vm',
  'vms',
  'status',
  'start time',
  'end time',
  'duration',
  'total size',
  'data read',
  'transferred',
  'success',
  'warning',
  'error',
  'failed',
  'cliente',
  'cartório',
  'cartorio',
  'ação',
  'ações',
  'acoes',
  'ações realizadas pelo noc',
  'acoes realizadas pelo noc',
])

function isRotuloEspurioNoc(cliente?: string): boolean {
  if (!cliente) return true
  const cl = cliente.toLowerCase().trim()
  if (!cl) return true
  if (
    cl.startsWith('backup copy job') ||
    cl.startsWith('backup job') ||
    cl.startsWith('replication job')
  ) {
    return true
  }
  return ROTULOS_ESPURIOS_NOC.has(cl)
}

type NocStatusIndividual = 'ok' | 'erro' | 'neutro'

/** Mesma normalização de status da aba de Evidências: "Success"/"OK" → verde, erro explícito → vermelho. */
function classificarStatusNoc(status?: string): NocStatusIndividual {
  const st = (status || '').toUpperCase().trim()
  if (!st) return 'neutro'
  if (
    st === 'OK' ||
    st.startsWith('OK') ||
    st === 'SUCCESS' ||
    st === 'SUCESSO' ||
    st.startsWith('SUCCESS') ||
    st.startsWith('SUCESSO')
  ) {
    return 'ok'
  }
  if (
    st === 'NOK' ||
    st.includes('FAIL') ||
    st.includes('FALHA') ||
    st.includes('ERRO') ||
    st.includes('ERROR') ||
    st.includes('CRITICAL') ||
    st.includes('DOWN')
  ) {
    return 'erro'
  }
  return 'neutro'
}

function labelTipoDivergencia(tipo?: BackupNocDivergenciaItem['tipo']): string {
  if (tipo === 'noc_ok_sistema_falha') return 'NOC aponta OK, sistema registra falha'
  if (tipo === 'noc_falha_sistema_ok') return 'NOC aponta falha, sistema registra sucesso'
  return 'Divergência NOC × sistema'
}

interface BackupNocValidacaoCardProps {
  /** Monitoramentos externos do NOC (ordenados do mais recente para o mais antigo). */
  monitoramentos: BackupMonitoramentoExternoItem[]
  loading: boolean
  /** Navega para Evidências → sub-aba Monitoramento Externo (NOC). */
  onOpenNoc: () => void
}

export const BackupNocValidacaoCard: React.FC<BackupNocValidacaoCardProps> = ({
  monitoramentos,
  loading,
  onOpenNoc,
}) => {
  // Atestado mais recente (por data_monitoramento, com fallback para created)
  const ultimo = useMemo(() => {
    if (monitoramentos.length === 0) return null
    return [...monitoramentos].sort((a, b) => {
      const ta = new Date(a.data_monitoramento || a.created || 0).getTime() || 0
      const tb = new Date(b.data_monitoramento || b.created || 0).getTime() || 0
      return tb - ta
    })[0]
  }, [monitoramentos])

  const vmsAvaliadas = useMemo<BackupNocClienteStatusItem[]>(() => {
    const lista = ultimo?.clientes_status || []
    return lista.filter((c) => !isRotuloEspurioNoc(c?.cliente))
  }, [ultimo])

  const divergencias = useMemo<BackupNocDivergenciaItem[]>(
    () => (ultimo?.divergencias || []).filter(Boolean),
    [ultimo],
  )

  const statusGeral = ultimo?.status_geral
  const temDivergencia = divergencias.length > 0

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpenNoc()
    }
  }

  return (
    <Card
      className="border-slate-200 shadow-2xs cursor-pointer transition hover:border-purple-300"
      onClick={onOpenNoc}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Validação Externa (NOC) — abrir Monitoramento Externo"
    >
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-700 shrink-0" />
              <span className="truncate">Validação Externa (NOC)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Dupla camada de conformidade: prova automática do motor de confronto + atestado
              externo diário do NOC.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onOpenNoc()
            }}
            className="text-xs text-blue-600 hover:text-blue-700 shrink-0 self-start sm:self-auto"
          >
            Abrir Monitoramento Externo (NOC) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {loading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Carregando atestados do NOC...
          </div>
        ) : !ultimo ? (
          /* Estado vazio honesto — nunca houve atestado NOC */
          <div className="py-6 px-4 flex flex-col items-center text-center gap-2">
            <div className="p-2.5 rounded-full bg-slate-100 text-slate-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Nenhum atestado externo registrado ainda
            </p>
            <p className="text-[11px] text-slate-500 max-w-md leading-relaxed">
              Nenhum atestado externo registrado ainda — os relatórios do NOC aparecem aqui
              automaticamente ao serem processados.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onOpenNoc()
              }}
              className="mt-1 text-xs font-semibold text-purple-800 border-purple-300 bg-purple-50/60 hover:bg-purple-100 gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" /> Ir para Monitoramento Externo (NOC)
            </Button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Linha de resumo: data, status geral e convergência */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Data do último atestado */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3 text-purple-600 shrink-0" />
                  <span className="truncate">Último atestado NOC</span>
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                  {ultimo.data_monitoramento ? formatDate(ultimo.data_monitoramento, '—') : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {formatRelativeTimeSp(ultimo.data_monitoramento || ultimo.created)}
                  {ultimo.origem_tipo === 'manual'
                    ? ' • Registro manual da equipe'
                    : ultimo.origem_tipo === 'email'
                      ? ' • E-mail do NOC'
                      : ''}
                  {ultimo.origem_remetente ? ` • ${ultimo.origem_remetente}` : ''}
                </p>
              </div>

              {/* Status geral do atestado */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Status geral do atestado
                </p>
                <div className="mt-1.5">
                  {statusGeral === 'ok' ? (
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" /> Sucesso
                    </Badge>
                  ) : statusGeral === 'falha' ? (
                    <Badge className="bg-red-50 text-red-800 border-red-300 text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" /> Falha
                    </Badge>
                  ) : statusGeral === 'atencao' ? (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" /> Atenção
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-600 border-slate-300 text-[11px] font-bold"
                    >
                      Pendente
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 truncate">
                  {vmsAvaliadas.length} VM(s) / cliente(s) avaliado(s) neste atestado
                </p>
              </div>

              {/* Indicador de convergência NOC × sistema */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">Convergência NOC × sistema</span>
                </p>
                <div className="mt-1.5">
                  {temDivergencia ? (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" /> Divergência detectada
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" /> NOC concorda com a
                      análise do sistema
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                  {temDivergencia
                    ? 'Veredito oficial permanece sendo o do sistema (motor de confronto).'
                    : 'Nenhuma divergência registrada no último atestado.'}
                </p>
              </div>
            </div>

            {/* Resumo das divergências registradas */}
            {temDivergencia && (
              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-800 mb-1">
                  Divergência(s) registrada(s) no último atestado:
                </span>
                <ul className="list-disc list-inside space-y-0.5">
                  {divergencias.slice(0, 2).map((d, dIdx) => (
                    <li key={dIdx} className="leading-snug">
                      <strong>{labelTipoDivergencia(d?.tipo)}</strong>
                      {d?.descricao ? ` — ${d.descricao}` : ''}
                    </li>
                  ))}
                  {divergencias.length > 2 && (
                    <li className="text-amber-700 font-medium">
                      + {divergencias.length - 2} outra(s) divergência(s) registrada(s)
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* VMs avaliadas com status individual (mesmo padrão de badges da aba de Evidências) */}
            {vmsAvaliadas.length > 0 && (
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  VMs / clientes avaliados no último atestado:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {vmsAvaliadas.slice(0, 8).map((c, cIdx) => {
                    const cls = classificarStatusNoc(c.status)
                    return (
                      <Badge
                        key={`${c.cliente}-${cIdx}`}
                        variant="outline"
                        title={
                          c.acoes
                            ? `${c.cliente}: ${c.status} — ${c.acoes}`
                            : `${c.cliente}: ${c.status}`
                        }
                        className={`text-[10px] font-bold max-w-[16rem] ${
                          cls === 'ok'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : cls === 'erro'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="truncate font-mono">{c.cliente}</span>
                        <span className="mx-1 opacity-50">•</span>
                        <span className="shrink-0">{c.status}</span>
                      </Badge>
                    )
                  })}
                  {vmsAvaliadas.length > 8 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-white text-slate-600 border-slate-300"
                    >
                      + {vmsAvaliadas.length - 8} outra(s)
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BackupNocValidacaoCard
