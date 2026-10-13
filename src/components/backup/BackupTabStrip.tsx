import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  LayoutGrid,
  Layers,
  FileText,
  Calendar,
  FileSearch,
  PlayCircle,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BackupTabItem {
  id: string
  label: string
  subLabel?: string
  icon: React.ComponentType<{ className?: string }>
  count?: number | string
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
  evidenciasPendentesCount: _evidenciasPendentesCount,
  monitoramentosCount,
  execucoesCount,
  regrasCount,
  ocorrenciasCount,
  ocorrenciasAbertasCount: _ocorrenciasAbertasCount,
  testesCount,
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // 9 Abas rigorosamente alinhadas com o novo esboço do Leandro:
  // 1. Visão Geral (ícone grid) — sem sub-rótulo, bloco azul quando ativa
  // 2. Escopo, 4, "(Ativos)" — ícone camadas
  // 3. Planos, 1, "(Políticas)" — ícone documento
  // 4. Rotinas & Fontes, 4, "(Execuções)" — ícone calendário
  // 5. Evidências, 6, "(Documentação)" — ícone busca/arquivo + badge roxo NOC (Validação Externa)
  // 6. Execuções, 5, "(Histórico)" — ícone play em círculo
  // 7. Regras & Adaptadores, 4, "(Processamento)" — ícone sliders
  // 8. Ocorrências, 2, "(Alertas)" — ícone alerta
  // 9. Testes de Recuperação, 1, "(DR/BCP)" — ícone check em círculo
  const tabs: BackupTabItem[] = [
    {
      id: 'visao_geral',
      label: 'Visão Geral',
      subLabel: undefined,
      icon: LayoutGrid,
    },
    {
      id: 'escopo',
      label: 'Escopo',
      subLabel: '(Ativos)',
      icon: Layers,
      count: ativosExigemBackupCount > 0 ? ativosExigemBackupCount : escoposCount,
    },
    {
      id: 'planos',
      label: 'Planos',
      subLabel: '(Políticas)',
      icon: FileText,
      count: planosCount,
    },
    {
      id: 'rotinas',
      label: 'Rotinas & Fontes',
      subLabel: '(Execuções)',
      icon: Calendar,
      count: rotinasCount,
    },
    {
      id: 'evidencias',
      label: 'Evidências',
      subLabel: '(Documentação)',
      icon: FileSearch,
      count: evidenciasCount,
      nocCount: monitoramentosCount,
    },
    {
      id: 'execucoes',
      label: 'Execuções',
      subLabel: '(Histórico)',
      icon: PlayCircle,
      count: execucoesCount,
    },
    {
      id: 'regras',
      label: 'Regras & Adaptadores',
      subLabel: '(Processamento)',
      icon: Sliders,
      count: regrasCount,
    },
    {
      id: 'ocorrencias',
      label: 'Ocorrências',
      subLabel: '(Alertas)',
      icon: AlertTriangle,
      count: ocorrenciasCount,
    },
    {
      id: 'testes',
      label: 'Testes de Recuperação',
      subLabel: '(DR/BCP)',
      icon: CheckCircle2,
      count: testesCount,
    },
  ]

  // Monitoramento do scroll para setas e fades laterais (apenas abaixo de lg / desktop onde pode rolar)
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el || window.innerWidth >= 1024) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
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
        'relative w-full rounded-2xl bg-white p-1 sm:p-1.5 shadow-xs border border-slate-200/90 select-none overflow-hidden',
        className,
      )}
      role="region"
      aria-label="Navegação de abas do Backup e Recuperação"
    >
      {/* Sombra / Fade à esquerda quando houver rolagem apenas em telas menores */}
      {canScrollLeft && (
        <div
          className="lg:hidden absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Botão de rolagem anterior (apenas quando houver scroll em telas menores) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          className="lg:hidden absolute left-1 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white/95 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-md border border-slate-200 transition backdrop-blur-xs cursor-pointer"
          aria-label="Rolar abas para a esquerda"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      )}

      {/* Sombra / Fade à direita quando houver rolagem apenas em telas menores */}
      {canScrollRight && (
        <div
          className="lg:hidden absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Botão de rolagem posterior (apenas quando houver scroll em telas menores) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(200)}
          className="lg:hidden absolute right-1 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white/95 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-md border border-slate-200 transition backdrop-blur-xs cursor-pointer"
          aria-label="Rolar abas para a direita"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}

      {/* Trilho de abas: em desktop (lg+) envolve (flex-wrap) sem scroll nem chevrons, em telas menores faz scroll horizontal suave */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-0.5 sm:gap-1 lg:flex-wrap lg:justify-start overflow-x-auto lg:overflow-x-visible no-scrollbar scroll-smooth py-0.5 px-0.5"
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
                'group relative shrink-0 flex flex-col justify-center rounded-lg sm:rounded-xl px-2 sm:px-2.5 xl:px-3 py-1.5 text-left transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A56DB] cursor-pointer min-h-[44px]',
                isActive
                  ? 'bg-[#1A56DB] text-white shadow-xs font-semibold'
                  : 'bg-transparent text-slate-700 hover:bg-slate-100/70 hover:text-slate-900',
              )}
            >
              {/* Linha superior: ÍCONE + NOME + CONTADORES */}
              <div className="flex items-center gap-1.5">
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700',
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] sm:text-xs tracking-tight whitespace-nowrap',
                    isActive ? 'font-bold text-white' : 'font-semibold text-slate-800',
                  )}
                >
                  {tab.label}
                </span>

                {/* Mini-badge contador discreto ao lado do nome */}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full leading-none font-mono tracking-tight shrink-0',
                      isActive
                        ? 'bg-white/20 text-white border border-white/25'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/90 group-hover:bg-slate-200/80',
                    )}
                  >
                    {tab.count}
                  </span>
                )}

                {/* Badge ROXO do NOC em Evidências (Validação Externa) com contagem */}
                {tab.id === 'evidencias' && (tab.nocCount ?? 0) > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full leading-none font-mono shrink-0 shadow-2xs',
                      isActive
                        ? 'bg-purple-200 text-purple-900 border border-purple-300 font-extrabold'
                        : 'bg-purple-100 text-purple-800 border border-purple-200 group-hover:bg-purple-200',
                    )}
                    title={`Validação Externa (NOC): ${tab.nocCount} monitoramento(s) externo(s) registrado(s)`}
                  >
                    <UserCheck className="w-2.5 h-2.5" />
                    <span>{tab.nocCount}</span>
                  </span>
                )}
              </div>

              {/* Linha inferior: SUB-RÓTULO em cinza abaixo (se houver) */}
              {tab.subLabel && (
                <div className="pl-5 text-[9px] sm:text-[10px] leading-tight">
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

export default BackupTabStrip
