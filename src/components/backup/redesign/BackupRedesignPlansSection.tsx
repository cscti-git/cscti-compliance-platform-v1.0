import React from 'react'
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  HardDrive,
  Cloud,
  Copy,
  Plus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PanelHeader } from '@/components/common/PanelHeader'
import type { BackupPlanoItem, BackupRotinaItem, BackupFonteItem } from '@/types/cscti'

export interface BackupRedesignPlansSectionProps {
  planos: BackupPlanoItem[]
  rotinas: BackupRotinaItem[]
  fontes: BackupFonteItem[]
  loading?: boolean
  onNavigateTab: (tab: string) => void
}

export const BackupRedesignPlansSection: React.FC<BackupRedesignPlansSectionProps> = ({
  planos,
  rotinas,
  fontes,
  loading = false,
  onNavigateTab,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bloco 1: Planos e Políticas */}
      <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden flex flex-col">
        <PanelHeader
          title="Planos & Políticas de Backup"
          subtitle="Definições formais de RPO, RTO, retenção e periodicidade da serventia"
          icon={FileText}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-700"
          badge={
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold"
            >
              {planos.length} planos
            </Badge>
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('planos')}
              className="text-xs text-slate-700 border-slate-200 h-8"
            >
              Ver Planos
            </Button>
          }
        />

        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {planos.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Nenhum plano cadastrado ainda. Cadastre as políticas de RPO e RTO da serventia.
              </div>
            ) : (
              planos.slice(0, 4).map((plano) => (
                <div
                  key={plano.id}
                  className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{plano.nome}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          plano.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {plano.status}
                      </Badge>
                    </div>
                    {plano.descricao && (
                      <p className="text-slate-500 text-[11px] line-clamp-1">{plano.descricao}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px]">
                    <div className="text-right">
                      <div className="text-slate-500">RPO Alvo</div>
                      <div className="font-mono font-bold text-slate-800">
                        {plano.rpo_horas ? `${plano.rpo_horas}h` : '—'}
                      </div>
                    </div>
                    <div className="text-right border-l border-slate-200 pl-3">
                      <div className="text-slate-500">RTO Alvo</div>
                      <div className="font-mono font-bold text-slate-800">
                        {plano.rto_horas ? `${plano.rto_horas}h` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Políticas e governança de dados da serventia</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('planos')}
              className="text-xs text-blue-700 hover:text-blue-900 p-0 h-auto font-semibold gap-1"
            >
              <span>Gerenciar Políticas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Rotinas & Fontes */}
      <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden flex flex-col">
        <PanelHeader
          title="Rotinas & Fontes de Execução"
          subtitle="Rotinas agendadas, destinos e fontes ativas vinculadas ao motor"
          icon={Calendar}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-700"
          badge={
            <Badge
              variant="outline"
              className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-semibold"
            >
              {rotinas.length} rotinas • {fontes.length} fontes
            </Badge>
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('rotinas')}
              className="text-xs text-slate-700 border-slate-200 h-8"
            >
              Ver Rotinas
            </Button>
          }
        />

        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {rotinas.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Nenhuma rotina configurada ainda. Crie rotinas para sincronizar com o Veeam/Acronis.
              </div>
            ) : (
              rotinas.slice(0, 4).map((rotina) => {
                const fontesDestaRotina = fontes.filter((f) => f.rotina === rotina.id)

                return (
                  <div
                    key={rotina.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{rotina.nome}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold ${
                            rotina.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {rotina.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{fontesDestaRotina.length} fonte(s) vinculada(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-slate-100 text-slate-700 font-semibold"
                      >
                        {rotina.periodicidade || 'Programado'}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Rotinas ativas confrontadas em tempo real</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('rotinas')}
              className="text-xs text-purple-700 hover:text-purple-900 p-0 h-auto font-semibold gap-1"
            >
              <span>Gerenciar Fontes & Rotinas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BackupRedesignPlansSection
