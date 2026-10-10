import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  LayoutGrid,
  Building2,
  Users,
  FolderTree,
  Puzzle,
  Palette,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfigTabItem {
  id: string
  label: string
  icon: LucideIcon
  count?: number
  adminOnly?: boolean
}

export interface ConfigTabStripProps {
  activeTab: string
  onSelectTab: (tabId: string) => void
  isAdmin: boolean
  counts?: {
    people?: number
    catalogs?: number
    users?: number
  }
  className?: string
}

export const ConfigTabStrip: React.FC<ConfigTabStripProps> = ({
  activeTab,
  onSelectTab,
  isAdmin,
  counts,
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // As 7 abas mapeadas conforme o esboço visual aprovado pelo usuário:
  // 1. Visão Geral (LayoutGrid)
  // 2. Dados da Organização (Building2)
  // 3. Papéis & Responsáveis (Users)
  // 4. Catálogos (FolderTree)
  // 5. Integrações (Puzzle)
  // 6. Identidade Visual (Palette)
  // 7. Usuários e Acessos (UserCheck) - apenas Admin
  const allTabs: ConfigTabItem[] = [
    {
      id: 'visao-geral',
      label: 'Visão Geral',
      icon: LayoutGrid,
    },
    {
      id: 'organizacao',
      label: 'Dados da Organização',
      icon: Building2,
    },
    {
      id: 'papeis',
      label: 'Papéis & Responsáveis',
      icon: Users,
      count: counts?.people,
    },
    {
      id: 'catalogos',
      label: 'Catálogos',
      icon: FolderTree,
      count: counts?.catalogs,
    },
    {
      id: 'integracoes',
      label: 'Integrações',
      icon: Puzzle,
    },
    {
      id: 'identidade',
      label: 'Identidade Visual',
      icon: Palette,
    },
    {
      id: 'usuarios',
      label: 'Usuários e Acessos',
      icon: UserCheck,
      count: counts?.users,
      adminOnly: true,
    },
  ]

  const visibleTabs = allTabs.filter((tab) => !tab.adminOnly || isAdmin)

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

  // Rolar suavemente para a aba ativa quando mudar
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

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIndex = (index + 1) % visibleTabs.length
      onSelectTab(visibleTabs[nextIndex].id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevIndex = (index - 1 + visibleTabs.length) % visibleTabs.length
      onSelectTab(visibleTabs[prevIndex].id)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onSelectTab(visibleTabs[0].id)
    } else if (e.key === 'End') {
      e.preventDefault()
      onSelectTab(visibleTabs[visibleTabs.length - 1].id)
    }
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl bg-white p-1.5 sm:p-2 shadow-2xs border border-slate-200/90 select-none overflow-hidden',
        className,
      )}
      role="region"
      aria-label="Navegação de abas de Configurações da Serventia"
    >
      {/* Fade à esquerda */}
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Botão de rolagem anterior */}
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

      {/* Fade à direita */}
      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Botão de rolagem posterior */}
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

      {/* Trilho de abas */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5"
      >
        {visibleTabs.map((tab, idx) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`config-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`config-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              data-tab-id={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                'group relative shrink-0 flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 text-left transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A56DB] cursor-pointer min-h-[42px]',
                isActive
                  ? 'bg-[#1A56DB] text-white shadow-xs font-semibold'
                  : 'bg-transparent text-slate-700 hover:bg-slate-100/70 hover:text-slate-900',
              )}
            >
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
                    'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none font-mono shrink-0',
                    isActive
                      ? 'bg-white/20 text-white border border-white/25'
                      : 'bg-slate-100 text-slate-600 border border-slate-200/90 group-hover:bg-slate-200/80',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ConfigTabStrip
