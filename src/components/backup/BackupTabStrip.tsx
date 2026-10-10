import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Calendar,
  FileCheck2,
  AlertTriangle,
  PlayCircle,
  Layers,
  CheckCircle2,
  Sliders,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BackupTabItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number | string
  countSuffix?: string // e.g. "ativos"
  badgeColor?: 'default' | 'amber' | 'red' | 'purple'
  badgeTitle?: string
  nocCount?: number
}

export interface BackupTabStripProps {
  activeTab: string
  onSelectTab: (tabId: string) => void
  ativosExigemBackupCount: number
  escoposCount: number
  planosCount: number
  rotinasCount: number
  evidenciasCount: number
  evidenciasPendentesCount: number
  monitoramentosCount: number
  execucoesCount: number
  regrasCount: number
  ocorrenciasCount: number
  ocorrenciasAbertasCount: number
  testesCount: number
  className?: string
}

export const BackupTabStrip: React.FC<BackupTabStripProps> = ({
  activeTab,
  onSelectTab,
  ativosExigemBackupCount,
  escoposCount,
  planosCount,
  rotinasCount,
  evidenciasCount,
  evidenciasPendentesCount,
  monitoramentosCount,
  execucoesCount,
  regrasCount,
  ocorrenciasCount,
  ocorrenciasAbertasCount,
  testesCount,
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Lista padronizada de abas
  const tabs: BackupTabItem[] = [
    {
      id: 'visao_geral',
      label: 'Visão Geral',
      icon: ShieldCheck,
    },
    {
      id: 'escopo',
      label: 'Escopo',
      icon: Layers,
      count: ativosExigemBackupCount > 0 ? ativosExigemBackupCount : escoposCount,
      countSuffix: ativosExigemBackupCount > 0 ? 'ativos' : undefined,
    },
    {
      id: 'planos',
      label: 'Planos',
      icon: Sliders,
      count: planosCount,
    },
    {
      id: 'rotinas',
      label: 'Rotinas & Fontes',
      icon: Calendar,
      count: rotinasCount,
    },
    {
      id: 'evidencias',
      label: 'Evidências',
      icon: FileCheck2,
      count: evidenciasCount,
      nocCount: monitoramentosCount,
    },
    {
      id: 'execucoes',
      label: 'Execuções',
      icon: PlayCircle,
      count: execucoesCount,
    },
    {
      id: 'regras',
      label: 'Regras & Adaptadores',
      icon: Sliders,
      count: regrasCount,
    },
    {
      id: 'ocorrencias',
      label: 'Ocorrências',
      icon: AlertTriangle,
      count: ocorrenciasCount,
      badgeColor: ocorrenciasAbertasCount > 0 ? 'red' : 'default',
    },
    {
      id: 'testes',
      label: 'Testes de Recuperação',
      icon: CheckCircle2,
      count: testesCount,
    },
  ]

  // Monitoramento do scroll para setas e fades laterais
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

  // Rolar automaticamente para a aba ativa quando mudar
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const activeEl = el.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`)
    if (activeEl) {
      const containerLeft = el.getBoundingClientRect().left
      const containerRight = el.getBoundingClientRect().right
      const tabLeft = activeEl.getBoundingClientRect().left
      const tabRight = activeEl.getBoundingClientRect().right

      if (tabLeft < containerLeft || tabRight > containerRight) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [activeTab])

  const scrollBy = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: offset,
        behavior: 'smooth',
      })
    }
  }

  // Navegação por teclado nas abas
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIndex = (index + 1) % tabs.length
      onSelectTab(tabs[nextIndex].id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevIndex = (index - 1 + tabs.length) % tabs.length
      onSelectTab(tabs[prevIndex].id)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onSelectTab(tabs[0].id)
    } else if (e.key === 'End') {
      e.preventDefault()
      onSelectTab(tabs[tabs.length - 1].id)
    }
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl bg-[#0B2545] p-1.5 sm:p-2 shadow-sm border border-[#124E78]/40 select-none overflow-hidden',
        className,
      )}
      role="region"
      aria-label="Navegação de abas do Backup e Recuperação"
    >
      {/* Sombra / Fade à esquerda quando houver rolagem */}
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0B2545] to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Botão de rolagem anterior (desktop se houver overflow) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-180)}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center shadow-md border border-white/20 transition backdrop-blur-xs"
          aria-label="Rolar abas para a esquerda"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Sombra / Fade à direita quando houver rolagem */}
      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0B2545] to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Botão de rolagem posterior (desktop se houver overflow) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(180)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center shadow-md border border-white/20 transition backdrop-blur-xs"
          aria-label="Rolar abas para a direita"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Trilho de abas com scroll horizontal suave */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5"
      >
        {tabs.map((tab, idx) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`backup-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`backup-panel-${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={isActive ? 0 : -1}
              data-tab-id={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                'group relative shrink-0 inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2545]',
                isActive
                  ? 'bg-white text-[#0B2545] shadow-md shadow-black/10 font-bold scale-[1.01]'
                  : 'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15',
              )}
            >
              {/* Ícone */}
              <Icon
                className={cn(
                  'w-3.5 h-3.5 shrink-0 transition-colors duration-150',
                  isActive ? 'text-[#0B2545]' : 'text-white/70 group-hover:text-white',
                )}
              />

              {/* Rótulo da aba */}
              <span className="tracking-tight">{tab.label}</span>

              {/* Mini-badge contador principal (se houver) */}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md leading-none tracking-tight transition-colors duration-150',
                    isActive
                      ? 'bg-slate-100 text-[#0B2545] border border-slate-200/80 font-mono'
                      : 'bg-white/15 text-white/90 border border-white/10 font-mono group-hover:bg-white/20',
                  )}
                >
                  {tab.count}
                  {tab.countSuffix && (
                    <span className="ml-0.5 text-[9px] font-normal opacity-85 lowercase">
                      {tab.countSuffix}
                    </span>
                  )}
                </span>
              )}

              {/* Badges de Destaque Adicionais: Evidências Pendentes (Âmbar) */}
              {tab.id === 'evidencias' && evidenciasPendentesCount > 0 && (
                <span
                  className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md leading-none bg-amber-500 text-slate-950 font-mono shadow-xs"
                  title={`${evidenciasPendentesCount} evidência(s) pendente(s) de processamento`}
                >
                  {evidenciasPendentesCount}
                </span>
              )}

              {/* Badge ROXO do NOC em Evidências (Monitoramento Externo) - REQUISITO 4 */}
              {tab.id === 'evidencias' && (tab.nocCount ?? 0) > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md leading-none font-mono transition-transform duration-150',
                    isActive
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-purple-500/30 text-purple-200 border border-purple-400/40 group-hover:bg-purple-500/40 group-hover:text-white',
                  )}
                  title="Validação Externa (NOC) — Monitoramentos externos registrados"
                >
                  <UserCheck className="w-2.5 h-2.5" />
                  {tab.nocCount}
                </span>
              )}

              {/* Badge Vermelho de Ocorrências Abertas (se houver) */}
              {tab.id === 'ocorrencias' && ocorrenciasAbertasCount > 0 && (
                <span
                  className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md leading-none bg-rose-500 text-white font-mono shadow-xs"
                  title={`${ocorrenciasAbertasCount} ocorrência(s) em aberto`}
                >
                  {ocorrenciasAbertasCount}
                </span>
              )}

              {/* Indicador de borda ou glow sutil para aba ativa */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-xl ring-1 ring-black/5 pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default BackupTabStrip
