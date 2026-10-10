import React from 'react'
import { Link } from 'react-router-dom'
import { LucideIcon, ChevronRight } from 'lucide-react'

export interface PanelHeaderProps {
  /** Título do painel/seção */
  title: string
  /** Subtítulo descritivo opcional */
  subtitle?: string
  /** Ícone do painel em quadrado suave arredondado */
  icon?: LucideIcon
  /** Cor de fundo do ícone (ex.: "bg-blue-100", "bg-emerald-100") */
  iconBgColor?: string
  /** Cor do ícone (ex.: "text-blue-600", "text-emerald-600") */
  iconColor?: string
  /** Tag ou chip extra à direita do título */
  badge?: React.ReactNode
  /** Link opcional "Ver todos" ou similar */
  viewAllLink?: {
    label?: string
    href: string
  }
  /** Ação customizada à direita */
  action?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho de painel padronizado para as três telas do produto:
 * Ícone em quadrado arredondado suave + Título + Subtítulo opcional + Ação/Link à direita.
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  badge,
  viewAllLink,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 gap-3 ${className}`}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2.5">
        {Icon && (
          <div
            className={`w-8 h-8 rounded-lg ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0 border border-slate-200/60 shadow-2xs`}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action}
        {viewAllLink && (
          <Link
            to={viewAllLink.href}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 group transition-colors"
          >
            <span>{viewAllLink.label || 'Ver todos'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default PanelHeader
