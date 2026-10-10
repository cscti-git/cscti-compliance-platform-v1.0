import React from 'react'
import { LucideIcon, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface MainKpiCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: {
    value: string
    isPositive?: boolean
    neutral?: boolean
  }
  supportText?: string
  icon: LucideIcon
  iconBgColor?: string
  iconColor?: string
  href?: string
  infoTooltip?: string
}

export const MainKpiCard: React.FC<MainKpiCardProps> = ({
  label,
  value,
  unit,
  trend,
  supportText,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-700',
  href,
  infoTooltip,
}) => {
  const content = (
    <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors h-full flex flex-col justify-between group overflow-hidden bg-white rounded-xl">
      <CardContent className="p-4 sm:p-4.5 flex items-center gap-3.5 h-full">
        {/* Círculo colorido com o ícone */}
        <div
          className={`w-12 h-12 rounded-full ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
          aria-hidden="true"
        >
          <Icon className="w-6 h-6" />
        </div>

        {/* Informações centrais */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500 block truncate" title={label}>
              {label}
            </span>

            {href && (
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            )}
          </div>

          {/* Número grande */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
              {value}
              {unit && <span className="text-xl sm:text-2xl ml-0.5 font-bold">{unit}</span>}
            </span>

            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                  trend.neutral
                    ? 'bg-slate-100 text-slate-600'
                    : trend.isPositive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                }`}
              >
                {trend.neutral ? null : trend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 shrink-0" />
                )}
                {trend.value}
              </span>
            )}
          </div>

          {/* Linha de apoio */}
          {supportText && (
            <p className="text-[11px] text-slate-400 mt-1 font-medium truncate" title={supportText}>
              {supportText}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link
        to={href}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl"
      >
        {content}
      </Link>
    )
  }

  if (infoTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-full cursor-help">{content}</div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs bg-slate-900 text-white p-2.5">
            {infoTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}
