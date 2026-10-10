import React from 'react'

export interface ComplianceTrendPoint {
  mesLabel: string
  conformidadeGeral: number // 0 a 100
  pendencias: number // 0 a 100
}

export interface ComplianceEvolutionChartProps {
  data: ComplianceTrendPoint[]
}

export const ComplianceEvolutionChart: React.FC<ComplianceEvolutionChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 flex flex-col items-center justify-center my-auto">
        <p className="text-xs font-semibold text-slate-700">Sem histórico acumulado</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          A série temporal de evolução da conformidade será gerada automaticamente conforme novos
          ciclos mensais de auditoria forem consolidados.
        </p>
      </div>
    )
  }

  // Se houver dados reais acumulados
  const width = 500
  const height = 180
  const paddingX = 40
  const paddingY = 20
  const graphWidth = width - paddingX * 2
  const graphHeight = height - paddingY * 2

  const pointsCount = data.length
  const stepX = pointsCount > 1 ? graphWidth / (pointsCount - 1) : graphWidth

  const getCoordinates = (val: number, idx: number) => {
    const x = paddingX + idx * stepX
    const y = paddingY + graphHeight - (Math.min(100, Math.max(0, val)) / 100) * graphHeight
    return { x, y }
  }

  const conformidadePoints = data.map((d, i) => getCoordinates(d.conformidadeGeral, i))
  const pendenciasPoints = data.map((d, i) => getCoordinates(d.pendencias, i))

  const conformidadePath = conformidadePoints.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
    '',
  )
  const pendenciasPath = pendenciasPoints.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
    '',
  )

  return (
    <div className="w-full flex flex-col justify-between">
      {/* Legenda Superior */}
      <div className="flex items-center justify-end gap-4 text-xs mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span className="text-slate-600 font-medium text-[11px]">Conformidade Geral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-slate-600 font-medium text-[11px]">Pendências</span>
        </div>
      </div>

      {/* SVG com linhas e pontos */}
      <div className="w-full relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Linhas de Grade Horizontal (100%, 75%, 50%, 25%, 0%) */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingY + graphHeight * pct
            const label = `${Math.round((1 - pct) * 100)}%`
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray={pct === 1 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#94A3B8"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            )
          })}

          {/* Linha Conformidade Geral (Azul) */}
          <path d={conformidadePath} fill="none" stroke="#2563EB" strokeWidth="2.5" />
          {conformidadePoints.map((p, i) => (
            <circle
              key={`c-${i}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#2563EB"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}

          {/* Linha Pendências (Vermelho) */}
          <path d={pendenciasPath} fill="none" stroke="#F43F5E" strokeWidth="2.5" />
          {pendenciasPoints.map((p, i) => (
            <circle
              key={`p-${i}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#F43F5E"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}

          {/* Rótulos do Eixo X (Mês) */}
          {data.map((d, i) => {
            const p = conformidadePoints[i]
            return (
              <text
                key={`label-${i}`}
                x={p.x}
                y={height - 2}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
              >
                {d.mesLabel}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
