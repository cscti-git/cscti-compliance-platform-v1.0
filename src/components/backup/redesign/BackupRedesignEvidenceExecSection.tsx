import React from 'react'
import {
  FileSearch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PanelHeader } from '@/components/common/PanelHeader'
import type { BackupEvidenciaItem, BackupExecucaoItem, BackupRotinaItem } from '@/types/cscti'
import { formatRelativeTimeSp } from '@/lib/dateTime'

export interface BackupRedesignEvidenceExecSectionProps {
  evidencias: BackupEvidenciaItem[]
  execucoes: BackupExecucaoItem[]
  rotinas: BackupRotinaItem[]
  monitoramentosNocCount: number
  loading?: boolean
  onNavigateTab: (tab: string) => void
}

export const BackupRedesignEvidenceExecSection: React.FC<
  BackupRedesignEvidenceExecSectionProps
> = ({
  evidencias,
  execucoes,
  rotinas,
  monitoramentosNocCount,
  loading = false,
  onNavigateTab,
}) => {
  const rotinasMap = React.useMemo(() => {
    const map = new Map<string, BackupRotinaItem>()
    rotinas.forEach((r) => map.set(r.id, r))
    return map
  }, [rotinas])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bloco 1: Evidências Ingeridas (E-mail / IMAP / Upload) */}
      <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden flex flex-col">
        <PanelHeader
          title="Evidências Ingeridas"
          subtitle="Comprovantes automáticos recebidos via IMAP e atestados de monitoramento"
          icon={FileSearch}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-700"
          badge={
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
              >
                {evidencias.length} arquivos
              </Badge>
              {monitoramentosNocCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-semibold gap-1"
                  title="Monitoramentos da Validação Externa (NOC)"
                >
                  <UserCheck className="w-3 h-3 text-purple-600" />
                  {monitoramentosNocCount} NOC
                </Badge>
              )}
            </div>
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('evidencias')}
              className="text-xs text-slate-700 border-slate-200 h-8"
            >
              Ver Evidências
            </Button>
          }
        />

        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {evidencias.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Nenhuma evidência recebida ainda. Configure a caixa IMAP ou realize o upload manual.
              </div>
            ) : (
              evidencias.slice(0, 5).map((evid) => {
                const dataEvid = evid.data_recebida || evid.created
                const relTime = dataEvid ? formatRelativeTimeSp(dataEvid) : '—'

                const isNoc = Boolean(evid.assunto && /noc|analise preventiva/i.test(evid.assunto))

                return (
                  <div
                    key={evid.id}
                    className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isNoc ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isNoc ? <UserCheck className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 truncate max-w-[220px] sm:max-w-[280px]">
                            {evid.assunto || `Comprovante (${evid.tipo})`}
                          </span>
                          {isNoc && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[9px] font-bold px-1.5 py-0">
                              Validação Externa (NOC)
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="truncate max-w-[150px]">{evid.remetente || 'IMAP'}</span>
                          <span>•</span>
                          <span title={dataEvid}>{relTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          evid.status_processamento === 'processada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : evid.status_processamento === 'pendente'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {evid.status_processamento}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Ingestão automatizada de comprovantes de backup</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('evidencias')}
              className="text-xs text-emerald-700 hover:text-emerald-900 p-0 h-auto font-semibold gap-1"
            >
              <span>Ver Todas as Evidências</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Execuções Processadas (Motor & Jobs) */}
      <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden flex flex-col">
        <PanelHeader
          title="Execuções Processadas"
          subtitle="Histórico de jobs extraídos e confrontados pelo motor de auditoria"
          icon={Clock}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-700"
          badge={
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold"
            >
              {execucoes.length} execuções
            </Badge>
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('execucoes')}
              className="text-xs text-slate-700 border-slate-200 h-8"
            >
              Ver Execuções
            </Button>
          }
        />

        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {execucoes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Nenhuma execução processada ainda. As execuções são criadas automaticamente pelo
                motor.
              </div>
            ) : (
              execucoes.slice(0, 5).map((exec) => {
                const rotina = rotinasMap.get(exec.rotina || '')
                const dataExec = exec.data_email || exec.data_inicio || exec.created
                const relTime = dataExec ? formatRelativeTimeSp(dataExec) : '—'

                return (
                  <div
                    key={exec.id}
                    className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          exec.status === 'sucesso'
                            ? 'bg-emerald-100 text-emerald-700'
                            : exec.status === 'parcial'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {exec.status === 'sucesso' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : exec.status === 'parcial' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[260px]">
                            {rotina?.nome || exec.observacao || 'Job de Backup'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Destino: {exec.destino || 'Local'}</span>
                          <span>•</span>
                          <span title={dataExec}>{relTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          exec.status === 'sucesso'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : exec.status === 'parcial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {exec.status}
                      </Badge>
                      {exec.tamanho_formatado && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {exec.tamanho_formatado}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>RPO comprovado com base estrita em data_email</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('execucoes')}
              className="text-xs text-blue-700 hover:text-blue-900 p-0 h-auto font-semibold gap-1"
            >
              <span>Ver Histórico de Execuções</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BackupRedesignEvidenceExecSection
