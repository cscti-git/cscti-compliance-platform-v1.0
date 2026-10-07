import React from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Sliders,
  Calendar,
  HardDrive,
  FileCheck2,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Check,
  HelpCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface BackupCicloStep {
  id: string
  tab: string
  title: string
  shortTitle?: string
  subtitle: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  status: 'empty' | 'complete'
  emptyHint: string
}

interface BackupCicloStepperProps {
  activeTab: string
  onSelectTab: (tab: string) => void
  counts: {
    escopos: number
    planos: number
    rotinas: number
    fontes: number
    evidencias: number
    execucoes: number
    ocorrencias: number
    testes: number
    ativosExigemBackup?: number
  }
}

export const BackupCicloStepper: React.FC<BackupCicloStepperProps> = ({
  activeTab,
  onSelectTab,
  counts,
}) => {
  const step1Title = '1. Escopo'
  const step1Subtitle =
    typeof counts.ativosExigemBackup === 'number' && counts.ativosExigemBackup > 0
      ? `${counts.ativosExigemBackup} ${counts.ativosExigemBackup === 1 ? 'ativo exige backup' : 'ativos exigem backup'}`
      : counts.escopos > 0
        ? `${counts.escopos} ${counts.escopos === 1 ? 'escopo formal' : 'escopos formais'}`
        : '0 ativos c/ exigência'

  const step1Complete =
    (typeof counts.ativosExigemBackup === 'number' && counts.ativosExigemBackup > 0) ||
    counts.escopos > 0

  const steps: BackupCicloStep[] = [
    {
      id: 'escopo',
      tab: 'escopo',
      title: step1Title,
      shortTitle: 'Escopo',
      subtitle: step1Subtitle,
      count:
        typeof counts.ativosExigemBackup === 'number' && counts.ativosExigemBackup > 0
          ? counts.ativosExigemBackup
          : counts.escopos,
      icon: Layers,
      status: step1Complete ? 'complete' : 'empty',
      emptyHint: 'Pendente de mapeamento de ativos',
    },
    {
      id: 'planos',
      tab: 'planos',
      title: '2. Planos',
      shortTitle: 'Planos',
      subtitle: 'RTO / RPO / 3-2-1',
      count: counts.planos,
      icon: Sliders,
      status: counts.planos > 0 ? 'complete' : 'empty',
      emptyHint: 'Cadastre o primeiro plano',
    },
    {
      id: 'rotinas',
      tab: 'rotinas',
      title: '3. Rotinas',
      shortTitle: 'Rotinas',
      subtitle: 'Agendamentos e janelas',
      count: counts.rotinas,
      icon: Calendar,
      status: counts.rotinas > 0 ? 'complete' : 'empty',
      emptyHint: 'Defina a periodicidade',
    },
    {
      id: 'fontes',
      tab: 'regras', // aba regras & fontes
      title: '4. Fontes',
      shortTitle: 'Fontes',
      subtitle: 'Regras & Adaptadores',
      count: counts.fontes,
      icon: HardDrive,
      status: counts.fontes > 0 ? 'complete' : 'empty',
      emptyHint: 'Mapeie fontes e regras',
    },
    {
      id: 'evidencias',
      tab: 'evidencias',
      title: '5. Evidências',
      shortTitle: 'Evidências',
      subtitle: 'Comprovantes & Hashes',
      count: counts.evidencias,
      icon: FileCheck2,
      status: counts.evidencias > 0 ? 'complete' : 'empty',
      emptyHint: 'Aguardando comprovante',
    },
    {
      id: 'execucoes',
      tab: 'execucoes',
      title: '6. Execuções',
      shortTitle: 'Execuções',
      subtitle: 'Histórico & Laudos',
      count: counts.execucoes,
      icon: PlayCircle,
      status: counts.execucoes > 0 ? 'complete' : 'empty',
      emptyHint: 'Sem execuções avaliadas',
    },
    {
      id: 'ocorrencias',
      tab: 'ocorrencias',
      title: '7. Ocorrências',
      shortTitle: 'Ocorrências',
      subtitle: 'Lapsos e falhas',
      count: counts.ocorrencias,
      icon: AlertTriangle,
      // Para ocorrências, 0 é o ideal (ambiente saudável), mas contagem mostra número de ocorrências abertas/totais
      status: 'complete',
      emptyHint: 'Ambiente sem ocorrências',
    },
    {
      id: 'testes',
      tab: 'testes',
      title: '8. Testes',
      shortTitle: 'Testes',
      subtitle: 'Restauração periódica',
      count: counts.testes,
      icon: CheckCircle2,
      status: counts.testes > 0 ? 'complete' : 'empty',
      emptyHint: 'Simulação pendente',
    },
  ]

  const totalVazias = steps.filter((s) => s.id !== 'ocorrencias' && s.count === 0).length

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B2545] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0B2545]" />
            Ciclo de Continuidade Operacional
          </span>
          <span className="text-slate-400 text-xs hidden sm:inline">•</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Clique em qualquer etapa para acessar a aba e configurar
          </span>
        </div>

        <div className="flex items-center gap-2">
          {totalVazias > 0 ? (
            <Badge className="bg-amber-50 text-amber-900 border-amber-300 text-[10px] font-semibold gap-1 py-0.5">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              {totalVazias} {totalVazias === 1 ? 'etapa pendente' : 'etapas pendentes'} de cadastro
            </Badge>
          ) : (
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold gap-1 py-0.5">
              <Check className="w-3 h-3 text-emerald-600" />
              Ciclo completamente configurado
            </Badge>
          )}

          <Link
            to="/backup/guia"
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded-md transition shadow-2xs"
            title="Abrir o Manual de Uso passo a passo do Backup"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Guia de Backup</span>
            <span className="sm:hidden">Guia</span>
          </Link>
        </div>
      </div>

      {/* Grid horizontal responsivo com scroll suave no mobile */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        <div className="grid grid-flow-col auto-cols-[minmax(140px,1fr)] sm:auto-cols-[minmax(130px,1fr)] lg:grid-cols-8 gap-2 min-w-[720px] lg:min-w-0">
          {steps.map((st, idx) => {
            const Icon = st.icon
            const isSelected = activeTab === st.tab
            const isEmpty = st.id !== 'ocorrencias' && st.count === 0
            const isOcorrenciaComFalhas = st.id === 'ocorrencias' && st.count > 0

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectTab(st.tab)}
                className={`relative group p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#0B2545] bg-[#0B2545]/5 ring-1 ring-[#0B2545] shadow-2xs'
                    : isEmpty
                      ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400'
                      : isOcorrenciaComFalhas
                        ? 'border-red-300 bg-red-50/40 hover:bg-red-50'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${
                        isSelected
                          ? 'bg-[#0B2545] text-white'
                          : isEmpty
                            ? 'bg-amber-200/80 text-amber-900 font-bold'
                            : isOcorrenciaComFalhas
                              ? 'bg-red-100 text-red-700 font-bold'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Badge de contagem / destaque */}
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                        isSelected
                          ? 'bg-[#0B2545] text-white'
                          : isEmpty
                            ? 'bg-amber-200/90 text-amber-900 border border-amber-300/80'
                            : isOcorrenciaComFalhas
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {st.count}
                    </span>
                  </div>

                  <p
                    className={`text-xs font-bold truncate ${
                      isSelected
                        ? 'text-[#0B2545]'
                        : isEmpty
                          ? 'text-amber-950 font-bold'
                          : 'text-slate-800 group-hover:text-blue-900'
                    }`}
                  >
                    {st.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-tight">
                    {st.subtitle}
                  </p>
                </div>

                {/* Status rodapé do card */}
                <div className="mt-2 pt-1.5 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
                  {isEmpty ? (
                    <span className="text-amber-800 font-semibold flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      Vazio
                    </span>
                  ) : st.id === 'ocorrencias' ? (
                    <span
                      className={`font-semibold truncate ${
                        st.count > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {st.count > 0 ? 'Em aberto' : 'Em dia'}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Ativo
                    </span>
                  )}

                  <ChevronRight
                    className={`w-3 h-3 text-slate-400 group-hover:text-slate-700 transition ${
                      isSelected ? 'text-[#0B2545]' : ''
                    }`}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default BackupCicloStepper
