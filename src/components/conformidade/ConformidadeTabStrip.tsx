import React from 'react'
import { ShieldCheck, Layers, Lock, FileCheck2, History } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConformidadeTabKey = 'etapas' | 'itens' | 'prazos' | 'dossie' | 'historico'

export interface ConformidadeTabItem {
  id: ConformidadeTabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  badge?: string
}

export interface ConformidadeTabStripProps {
  activeTab: ConformidadeTabKey
  onSelectTab: (tab: ConformidadeTabKey) => void
  etapaBloqueante?: number | null
  totalItens?: number
  totalComprovados?: number
  diasRestantes?: number
  dossieHabilitado?: boolean
}

export const ConformidadeTabStrip: React.FC<ConformidadeTabStripProps> = ({
  activeTab,
  onSelectTab,
  etapaBloqueante,
  totalItens = 56,
  totalComprovados = 0,
  diasRestantes = 0,
  dossieHabilitado = false,
}) => {
  const tabs: ConformidadeTabItem[] = [
    {
      id: 'etapas',
      label: 'Etapas de Implantação',
      icon: Layers,
      badge: '6 Etapas',
    },
    {
      id: 'itens',
      label: 'Itens de Conformidade',
      icon: ShieldCheck,
      count: totalItens,
      badge: `${totalComprovados}/${totalItens}`,
    },
    {
      id: 'prazos',
      label: 'Prazos por Classe',
      icon: Lock,
      badge: `${diasRestantes}d rest.`,
    },
    {
      id: 'dossie',
      label: 'Dossiê Comprobatório',
      icon: FileCheck2,
      badge: dossieHabilitado ? 'A4 Pronto' : 'Por Etapa',
    },
    {
      id: 'historico',
      label: 'Trilha de Auditoria',
      icon: History,
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-1.5 overflow-x-auto">
      <nav className="flex space-x-1 min-w-max" aria-label="Abas de Conformidade">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                'group flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all select-none',
                isActive
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-[#D4AF37]' : 'text-slate-500 group-hover:text-slate-700',
                )}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 transition-colors',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default ConformidadeTabStrip
