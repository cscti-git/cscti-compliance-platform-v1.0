import React from 'react'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface SvgDonutChartProps {
  data: DonutSegment[]
  totalLabel: string
  subLabel?: string
  size?: number
  strokeWidth?: number
}

export const SvgDonutChart: React.FC<SvgDonutChartProps> = ({
  data,
  totalLabel,
  subLabel = 'Execuções',
  size = 130,
  strokeWidth = 18,
}) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let accumulatedPercent = 0

  // Escala dinâmica de tipografia central conforme o tamanho do donut
  const titleClass =
    size <= 100
      ? 'text-lg font-extrabold text-slate-900 leading-none tracking-tight'
      : 'text-xl font-extrabold text-slate-900 leading-none tracking-tight'
  const subClass =
    size <= 100
      ? 'text-[10px] font-medium text-slate-500 mt-0.5 leading-none'
      : 'text-[11px] font-medium text-slate-500 mt-1 leading-none'

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />
        {total > 0 &&
          data.map((seg, i) => {
            if (seg.value <= 0) return null
            const segPercent = seg.value / total
            const strokeDasharray = `${segPercent * circumference} ${circumference}`
            const strokeDashoffset = -accumulatedPercent * circumference
            accumulatedPercent += segPercent

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
              />
            )
          })}
      </svg>
      {/* Texto Central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1 text-center">
        <span className={titleClass}>{totalLabel}</span>
        {subLabel && <span className={subClass}>{subLabel}</span>}
      </div>
    </div>
  )
}

export interface HorizontalStackedCategory {
  categoria: string
  total: number
  protegidos: number
  parciais: number
  semProtecao: number
  percentProtegido: number
}

interface HorizontalStackedBarProps {
  categories: HorizontalStackedCategory[]
}

export const HorizontalStackedBar: React.FC<HorizontalStackedBarProps> = ({ categories }) => {
  if (categories.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400 italic">
        Nenhum ativo com exigência de backup cadastrado.
      </div>
    )
  }

  return (
    <div className="space-y-2.5 w-full min-w-0">
      {categories.map((cat, idx) => {
        const total = cat.total || 1
        const pctProtegidos = (cat.protegidos / total) * 100
        const pctParciais = (cat.parciais / total) * 100
        const pctSem = (cat.semProtecao / total) * 100

        return (
          <div key={idx} className="flex items-center gap-2 sm:gap-2.5 text-xs w-full min-w-0">
            {/* Nome da categoria com flex-1, min-w-0 e truncate para nunca empurrar o resto para fora */}
            <span
              className="flex-1 min-w-0 font-medium text-slate-700 truncate text-left"
              title={cat.categoria}
            >
              {cat.categoria}
            </span>

            {/* Quantidade de ativos */}
            <span className="shrink-0 font-bold text-slate-800 text-right tabular-nums px-0.5">
              {cat.total}
            </span>

            {/* Barra empilhada proporcional com flex-1 e min-w-[50px] para ocupar o espaço disponível sem estourar */}
            <div className="flex-1 min-w-[50px] max-w-[120px] h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner shrink-0">
              {cat.protegidos > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${pctProtegidos}%` }}
                  title={`Protegidos: ${cat.protegidos}`}
                />
              )}
              {cat.parciais > 0 && (
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${pctParciais}%` }}
                  title={`Parciais: ${cat.parciais}`}
                />
              )}
              {cat.semProtecao > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${pctSem}%` }}
                  title={`Sem proteção: ${cat.semProtecao}`}
                />
              )}
            </div>

            {/* Percentual protegido ao final, shrink-0, tabular-nums e alinhado à direita dentro do card */}
            <span className="w-10 sm:w-11 shrink-0 font-bold text-slate-900 text-right tabular-nums">
              {cat.percentProtegido}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
