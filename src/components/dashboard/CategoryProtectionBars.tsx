import React from 'react'

export interface CategoryProtectionBarItem {
  categoria: string
  percentual: number
  totalAtivos: number
  protegidos: number
}

export interface CategoryProtectionBarsProps {
  categories: CategoryProtectionBarItem[]
}

export const CategoryProtectionBars: React.FC<CategoryProtectionBarsProps> = ({ categories }) => {
  if (categories.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 italic">
        Nenhuma categoria de ativo mapeada.
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col justify-between h-48 pt-2">
      {/* Grade e Barras Verticais */}
      <div className="flex-1 flex items-stretch">
        {/* Eixo Y */}
        <div className="w-8 flex flex-col justify-between text-[10px] font-mono text-slate-400 text-right pr-2 select-none py-1">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Área das Barras com linhas de fundo */}
        <div className="flex-1 relative flex items-end justify-between px-2 sm:px-4 border-l border-b border-slate-200">
          <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
          <div className="absolute inset-x-0 top-1/4 border-t border-slate-100" />
          <div className="absolute inset-x-0 top-2/4 border-t border-slate-100" />
          <div className="absolute inset-x-0 top-3/4 border-t border-slate-100" />

          {categories.map((cat, idx) => {
            const barHeight = Math.min(100, Math.max(cat.percentual > 0 ? 8 : 2, cat.percentual))
            const barColor =
              cat.percentual >= 85
                ? 'bg-emerald-500'
                : cat.percentual >= 50
                  ? 'bg-amber-400'
                  : 'bg-rose-500'

            return (
              <div
                key={idx}
                className="relative flex-1 max-w-[56px] mx-1 flex flex-col items-center justify-end h-full z-10 group"
              >
                {/* Valor acima da barra */}
                <span className="text-[11px] font-bold text-slate-800 mb-1 leading-none tabular-nums font-mono">
                  {cat.percentual}%
                </span>

                {/* Barra verde / âmbar */}
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${barColor}`}
                  style={{ height: `${barHeight}%` }}
                  title={`${cat.categoria}: ${cat.percentual}% (${cat.protegidos} de ${cat.totalAtivos} ativos protegidos)`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Rótulos do Eixo X */}
      <div className="flex items-start justify-between pl-8 pr-2 sm:pr-4 pt-2 text-[10px] sm:text-[11px] font-medium text-slate-600">
        {categories.map((cat, idx) => (
          <span
            key={idx}
            className="flex-1 max-w-[56px] mx-1 text-center truncate leading-tight"
            title={cat.categoria}
          >
            {cat.categoria}
          </span>
        ))}
      </div>
    </div>
  )
}
