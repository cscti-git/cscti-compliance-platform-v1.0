import React from 'react'
import { LucideIcon, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface KpiCardProps {
  /** Rótulo superior do KPI (quebra em até 2 linhas sem truncar) */
  label: string
  /** Valor numérico ou string destacado */
  value: string | number
  /** Sufixo ou complemento de valor secundário (ex.: "%", "ativos", "/ 4 exigidos") */
  unit?: string
  /** Complemento ou subvalor exibido ao lado do valor principal (ex.: "/ 4 exigidos") */
  secondaryValue?: string
  /** Indicador de tendência opcional */
  trend?: {
    value: string
    isPositive?: boolean
    neutral?: boolean
  }
  /** Texto de apoio inferior com tooltip se necessário */
  supportText?: string
  /** Ícone do Lucide exibido no círculo de cor pastel */
  icon: LucideIcon
  /** Classe de cor de fundo do círculo do ícone (ex.: "bg-blue-100", "bg-emerald-100") */
  iconBgColor?: string
  /** Classe de cor do ícone (ex.: "text-blue-600", "text-emerald-600") */
  iconColor?: string
  /** Rota opcional para navegação com seta indicativa */
  href?: string
  /** Tooltip explicativo opcional */
  infoTooltip?: string
  /** Classes extras para o card */
  className?: string
}

/**
 * Card de KPI padronizado para todo o produto CSCTI - Compliance.
 * Suporta quebra elegante de títulos em 2 linhas sem truncamentos agressivos,
 * tipografia consistente, círculo de ícone pastel alinhado e link opcional.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  secondaryValue,
  trend,
  supportText,
  icon: Icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  href,
  infoTooltip,
  className = '',
}) => {
  const content = (
    <Card
      className={`border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all h-full flex flex-col justify-between group overflow-hidden bg-white rounded-xl ${className}`}
    >
      <CardContent className="p-4 flex items-center gap-3.5 h-full">
        {/* Círculo suave com ícone lucide padronizado */}
        <div
          className={`w-12 h-12 rounded-full ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
          aria-hidden="true"
        >
          <Icon className="w-6 h-6" />
        </div>

        {/* Informações centrais */}
        <div className="min-w-0 flex-1">
          {/* Título com suporte a 2 linhas sem cortar ("Cobertura de...", "Sistemas Crític...", etc.) */}
          <div className="flex items-start justify-between gap-1">
            <span
              className="text-xs font-semibold text-slate-500 leading-snug line-clamp-2"
              title={label}
            >
              {label}
            </span>

            {href && (
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1 mt-0.5" />
            )}
          </div>

          {/* Número grande com unidade e trend */}
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
              {value}
              {unit && <span className="text-xl sm:text-2xl ml-0.5 font-bold">{unit}</span>}
            </span>
            {secondaryValue && (
              <span className="text-xs sm:text-sm font-semibold text-slate-500 whitespace-nowrap">
                {secondaryValue}
              </span>
            )}

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

          {/* Texto de apoio no rodapé */}
          {supportText && (
            <p
              className="text-[11px] text-slate-400 mt-1 font-medium truncate leading-tight"
              title={supportText}
            >
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
          <TooltipContent className="max-w-xs text-xs bg-slate-900 text-white p-2.5 shadow-xl">
            {infoTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

export default KpiCard
