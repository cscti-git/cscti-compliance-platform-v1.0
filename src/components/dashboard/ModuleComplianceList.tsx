import React from 'react'

export interface ModuleComplianceItem {
  id: string
  name: string
  percent: number
  statusText?: string
  color?: string
}

export interface ModuleComplianceListProps {
  items: ModuleComplianceItem[]
}

export const ModuleComplianceList: React.FC<ModuleComplianceListProps> = ({ items }) => {
  return (
    <div className="space-y-3.5 w-full">
      {items.map((item) => {
        // Cor do progresso baseada na porcentagem se não informada
        const barColor =
          item.color ||
          (item.percent >= 85
            ? 'bg-emerald-500'
            : item.percent >= 50
              ? 'bg-amber-400'
              : 'bg-rose-500')

        return (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-800 truncate" title={item.name}>
                {item.name}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.statusText && (
                  <span className="text-[10px] text-slate-400 font-medium">{item.statusText}</span>
                )}
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {item.percent}%
                </span>
              </div>
            </div>

            {/* Barra de progresso com cantos arredondados */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
