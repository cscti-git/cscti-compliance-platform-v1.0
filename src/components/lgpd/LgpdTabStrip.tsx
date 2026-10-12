import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Database,
  ShieldCheck,
  FileCheck,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LgpdTabItem {
  id: string
  label: string
  subLabel?: string
  icon: React.ComponentType<{ className?: string }>
  count?: number | string
  badgeVariant?: 'default' | 'amber' | 'red'
}

export interface LgpdTabStripProps {
  activeTab: string
  onSelectTab: (tabId: string) => void
  inventarioCount: number
  operacoesCount: number
  cienciasConcedidasCount: number
  cienciasTotalCount: number
  incidentesAbertosCount: number
  className?: string
}

export const LgpdTabStrip: React.FC<LgpdTabStripProps> = ({
  activeTab,
  onSelectTab,
  inventarioCount,
  operacoesCount,
  cienciasConcedidasCount,
  cienciasTotalCount,
  incidentesAbertosCount,
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const tabs: LgpdTabItem[] = [
    {
      id: 'inventario',
      label: 'Inventário de Dados',
      subLabel: '(Mapeamento)',
      icon: Database,
      count: inventarioCount,
    },
    {
      id: 'operacoes',
      label: 'Operações de Tratamento',
      subLabel: '(Bases Legais)',
      icon: ShieldCheck,
      count: operacoesCount,
    },
    {
      id: 'ciencia',
      label: 'Ciência da Política',
      subLabel: '(Adesão PSI)',
      icon: FileCheck,
      count: `${cienciasConcedidasCount}/${cienciasTotalCount}`,
    },
    {
      id: 'incidentes',
      label: 'Incidentes de Segurança',
      subLabel: '(Prazo 72h)',
      icon: AlertOctagon,
      count: incidentesAbertosCount,
      badgeVariant: incidentesAbertosCount > 0 ? 'amber' : 'default',
    },
  ]

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollContainerRef.current
    if (!el) return

    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)
    el.addEventListener('scroll', checkScroll, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      el.removeEventListener('scroll', checkScroll)
    }
  }, [checkScroll])

  const scrollBy = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: offset,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl bg-white p-1.5 sm:p-2 shadow-xs border border-slate-200/90 select-none overflow-hidden',
        className,
      )}
      role="region"
      aria-label="Navegação de abas do Módulo LGPD e Governança"
    >
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-md border border-slate-200 transition backdrop-blur-xs cursor-pointer"
          aria-label="Rolar abas para a esquerda"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(200)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white/95 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-md border border-slate-200 transition backdrop-blur-xs cursor-pointer"
          aria-label="Rolar abas para a direita"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`lgpd-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`lgpd-panel-${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              data-tab-id={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                'group relative shrink-0 flex flex-col justify-center rounded-xl px-3 sm:px-4 py-2 text-left transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A56DB] cursor-pointer min-h-[52px]',
                isActive
                  ? 'bg-[#1A56DB] text-white shadow-xs font-semibold'
                  : 'bg-transparent text-slate-700 hover:bg-slate-100/70 hover:text-slate-900',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700',
                  )}
                />
                <span
                  className={cn(
                    'text-xs tracking-tight whitespace-nowrap',
                    isActive ? 'font-bold text-white' : 'font-semibold text-slate-800',
                  )}
                >
                  {tab.label}
                </span>

                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none font-mono tracking-tight shrink-0',
                      isActive
                        ? 'bg-white/20 text-white border border-white/25'
                        : tab.badgeVariant === 'amber'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/90 group-hover:bg-slate-200/80',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </div>

              {tab.subLabel && (
                <div className="pl-6 text-[10px] leading-tight">
                  <span
                    className={cn(
                      'transition-colors whitespace-nowrap',
                      isActive ? 'text-blue-100 font-medium' : 'text-slate-400 font-normal',
                    )}
                  >
                    {tab.subLabel}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LgpdTabStrip
