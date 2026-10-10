import React from 'react'
import { SvgDonutChart, DonutSegment } from '@/components/backup/BackupPreviewCharts'

export interface DonutWithLegendProps {
  data: (DonutSegment & { percent?: number })[]
  totalLabel: string
  subLabel?: string
  size?: number
  strokeWidth?: number
  showTotalInLegend?: boolean
}

export const DonutWithLegend: React.FC<DonutWithLegendProps> = ({
  data,
  totalLabel,
  subLabel = 'Ativos',
  size = 130,
  strokeWidth = 16,
}) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-5 w-full">
      {/* Donut centralizado */}
      <div className="shrink-0 flex items-center justify-center">
        <SvgDonutChart
          data={data}
          totalLabel={totalLabel}
          subLabel={subLabel}
          size={size}
          strokeWidth={strokeWidth}
        />
      </div>

      {/* Legenda com rótulos alinhados à esquerda e valores à direita sem estouro */}
      <div className="flex-1 min-w-0 w-full space-y-2">
        {data.map((seg, idx) => {
          const pct =
            seg.percent !== undefined
              ? seg.percent
              : total > 0
                ? Math.round((seg.value / total) * 100)
                : 0

          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 text-xs hover:bg-slate-50/70 p-1 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className="text-slate-600 font-medium truncate" title={seg.label}>
                  {seg.label}
                </span>
              </div>

              <div className="font-mono text-right text-xs shrink-0 tabular-nums">
                <span className="font-bold text-slate-900">{seg.value}</span>
                <span className="text-slate-400 text-[11px] ml-1">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
