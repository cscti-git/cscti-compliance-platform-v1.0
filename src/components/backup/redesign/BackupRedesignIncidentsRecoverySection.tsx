import React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  Clock,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Plus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PanelHeader } from '@/components/common/PanelHeader'
import type { BackupOcorrenciaItem, BackupTesteRecuperacaoItem } from '@/types/cscti'
import { formatRelativeTimeSp } from '@/lib/dateTime'

export interface BackupRedesignIncidentsRecoverySectionProps {
  ocorrencias: BackupOcorrenciaItem[]
  testes: BackupTesteRecuperacaoItem[]
  loading?: boolean
  onNavigateTab: (tab: string) => void
}

export const BackupRedesignIncidentsRecoverySection: React.FC<
  BackupRedesignIncidentsRecoverySectionProps
> = ({ ocorrencias, testes, loading = false, onNavigateTab }) => {
  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status !== 'resolvida')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bloco 1: Ocorrências & Alertas */}
      <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden flex flex-col">
        <PanelHeader
          title="Ocorrências & Anomalias"
          subtitle="Alertas operacionais, falhas de job e ações corretivas em andamento"
          icon={AlertTriangle}
          iconBgColor={ocorrenciasAbertas.length > 0 ? 'bg-rose-100' : 'bg-slate-100'}
          iconColor={ocorrenciasAbertas.length > 0 ? 'text-rose-700' : 'text-slate-600'}
          badge={
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${
                  ocorrenciasAbertas.length > 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {ocorrenciasAbertas.length} em aberto
              </Badge>
              <span className="text-xs text-slate-400">/ {ocorrencias.length} total</span>
            </div>
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('ocorrencias')}
              className="text-xs text-slate-700 border-slate-200 h-8"
            >
              Ver Ocorrências
            </Button>
          }
        />

        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {ocorrencias.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Nenhuma ocorrência registrada. O ambiente de backup opera sem anomalias reportadas.
              </div>
            ) : (
              ocorrencias.slice(0, 4).map((ocorrencia) => {
                const dataOcorr = ocorrencia.created
                const relTime = dataOcorr ? formatRelativeTimeSp(dataOcorr) : '—'
                const isAberta = ocorrencia.status !== 'resolvida'

                return (
                  <div
                    key={ocorrencia.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{ocorrencia.titulo}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold ${
                            isAberta
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {ocorrencia.status}
                        </Badge>
                      </div>
                      {ocorrencia.descricao && (
                        <p className="text-slate-500 text-[11px] line-clamp-1">
                          {ocorrencia.descricao}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize font-semibold ${
                          ocorrencia.severidade === 'alta'
                            ? 'bg-rose-100 text-rose-800'
                            : ocorrencia.severidade === 'media'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ocorrencia.severidade || 'Média'}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{relTime}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Rastreabilidade de incidentes e planos corretivos</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('ocorrencias')}
              className="text-xs text-rose-700 hover:text-rose-900 p-0 h-auto font-semibold gap-1"
            >
              <span>Gerenciar Ocorrências</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Testes de Recuperação (DR / BCP) */}
      <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden flex flex-col">
        <PanelHeader
          title="Testes de Recuperação (DR / BCP)"
          subtitle="Exercícios periódicos de restauração de banco, VM e arquivos críticos"
          icon={FileCheck}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-700"
          badge={
            <Badge
              variant="outline"
              className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
            >
              {testes.length} testes homologados
            </Badge>
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('testes')}
              className="text-xs text-slate-700 border-slate-200 h-8"
            >
              Ver Testes
            </Button>
          }
        />

        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {testes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Nenhum teste de restauração registrado ainda. O plano de continuidade requer
                exercícios semestrais.
              </div>
            ) : (
              testes.slice(0, 4).map((teste) => {
                const dataTeste = teste.data_teste || teste.created
                const relTime = dataTeste ? formatRelativeTimeSp(dataTeste) : '—'

                return (
                  <div
                    key={teste.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {teste.escopo_testado || `Teste de ${teste.tipo.replace(/_/g, ' ')}`}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold ${
                            teste.resultado === 'sucesso'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {teste.resultado || 'Realizado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Tipo: {teste.tipo.replace(/_/g, ' ')}</span>
                        {teste.tempo_decorrido_minutos && (
                          <>
                            <span>•</span>
                            <span>Tempo: {teste.tempo_decorrido_minutos} min</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-slate-400">{relTime}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Comprovação de integridade e prontidão operacional</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('testes')}
              className="text-xs text-emerald-700 hover:text-emerald-900 p-0 h-auto font-semibold gap-1"
            >
              <span>Gerenciar Testes de Recuperação</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BackupRedesignIncidentsRecoverySection
