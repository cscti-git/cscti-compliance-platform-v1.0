import React from 'react'
import { ShieldAlert, Sparkles, History } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PlanoAcaoTabKey = 'planos' | 'sugestoes' | 'historico'

export interface PlanoAcaoTabItem {
  id: PlanoAcaoTabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  badge?: string
}

export interface PlanoAcaoTabStripProps {
  activeTab: PlanoAcaoTabKey
  onSelectTab: (tab: PlanoAcaoTabKey) => void
  totalPlanos?: number
  totalSugestoes?: number
  totalHistorico?: number
}

export const PlanoAcaoTabStrip: React.FC<PlanoAcaoTabStripProps> = ({
  activeTab,
  onSelectTab,
  totalPlanos = 0,
  totalSugestoes = 0,
  totalHistorico = 0,
}) => {
  const tabs: PlanoAcaoTabItem[] = [
    {
      id: 'planos',
      label: 'Planos de Ação',
      icon: ShieldAlert,
      badge: `${totalPlanos}`,
    },
    {
      id: 'sugestoes',
      label: 'Sugestões da Matriz',
      icon: Sparkles,
      badge: totalSugestoes > 0 ? `${totalSugestoes} pendentes` : '0',
    },
    {
      id: 'historico',
      label: 'Histórico e Auditoria',
      icon: History,
      badge: totalHistorico > 0 ? `${totalHistorico}` : undefined,
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-1.5 overflow-x-auto">
      <nav className="flex space-x-1 min-w-max" aria-label="Abas de Planos de Ação">
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

export default PlanoAcaoTabStrip
