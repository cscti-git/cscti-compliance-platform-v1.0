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
  subLabel = 'Ativos',
  size = 130,
  strokeWidth = 22,
}) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let accumulatedPercent = 0

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
      {/* Central Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-extrabold text-slate-900 leading-none tracking-tight">
          {totalLabel}
        </span>
        {subLabel && (
          <span className="text-[11px] font-medium text-slate-500 mt-0.5 leading-none">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  )
}

export interface BarItem {
  label: string
  value: number
  color: string
}

interface SvgBarChartProps {
  data: BarItem[]
  maxVal?: number
}

export const SvgBarChart: React.FC<SvgBarChartProps> = ({ data, maxVal }) => {
  const calculatedMax = maxVal || Math.max(...data.map((d) => d.value), 120)
  const ticks = [120, 90, 60, 30, 0]

  return (
    <div className="flex-1 flex flex-col justify-between h-40 pt-1">
      <div className="flex-1 flex items-stretch">
        {/* Eixo Y */}
        <div className="w-7 flex flex-col justify-between text-[10px] font-mono text-slate-400 text-right pr-2 select-none py-1">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {t}
            </span>
          ))}
        </div>

        {/* Grade e Barras */}
        <div className="flex-1 relative flex items-end justify-around px-2 border-l border-b border-slate-200">
          {/* Linhas de grade sutis */}
          <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
          <div className="absolute inset-x-0 top-1/4 border-t border-slate-100" />
          <div className="absolute inset-x-0 top-2/4 border-t border-slate-100" />
          <div className="absolute inset-x-0 top-3/4 border-t border-slate-100" />

          {data.map((item, idx) => {
            const heightPercent = Math.min(100, Math.max(4, (item.value / calculatedMax) * 100))
            return (
              <div
                key={idx}
                className="relative flex flex-col items-center justify-end h-full z-10 w-12 sm:w-14 group"
              >
                {/* Valor acima da barra */}
                <span className="text-[11px] font-bold text-slate-700 mb-1 leading-none group-hover:scale-110 transition-transform">
                  {item.value}
                </span>
                {/* Barra com canto arredondado no topo */}
                <div
                  className="w-full rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Rótulos do Eixo X */}
      <div className="flex items-center justify-around pl-7 pr-2 pt-1 text-[11px] font-medium text-slate-600">
        {data.map((item, idx) => (
          <span key={idx} className="w-12 sm:w-14 text-center truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
