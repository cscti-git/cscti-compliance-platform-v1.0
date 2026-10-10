import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'

export interface RecentBackupExecutionRow {
  id: string
  dataHora: string
  ativo: string
  resultado: 'sucesso' | 'parcial' | 'erro' | 'nao_executada'
  resultadoLabel: string
  duracao: string
}

const getResultBadge = (resultado: RecentBackupExecutionRow['resultado'], label: string) => {
  switch (resultado) {
    case 'sucesso':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          {label}
        </span>
      )
    case 'parcial':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {label}
        </span>
      )
    case 'erro':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
          {label}
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {label}
        </span>
      )
  }
}

export interface RecentBackupExecutionsTableProps {
  executions: RecentBackupExecutionRow[]
}

export const RecentBackupExecutionsTable: React.FC<RecentBackupExecutionsTableProps> = ({
  executions,
}) => {
  if (executions.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 italic">
        Nenhuma execução de backup registrada até o momento.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-left text-xs border-collapse min-w-[480px]">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <th className="pb-2.5 pl-3 font-semibold">Data/Hora</th>
            <th className="pb-2.5 font-semibold">Ativo</th>
            <th className="pb-2.5 font-semibold text-center">Resultado</th>
            <th className="pb-2.5 font-semibold text-right pr-3">Duração</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {executions.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
              {/* Data / Hora (verdade operacional = data_email) */}
              <td className="py-2.5 pl-3 pr-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                {item.dataHora}
              </td>

              {/* Ativo */}
              <td className="py-2.5 pr-2">
                <Link
                  to="/backup"
                  className="font-bold text-slate-900 hover:text-blue-700 truncate block max-w-[150px] sm:max-w-[200px]"
                  title={item.ativo}
                >
                  {item.ativo}
                </Link>
              </td>

              {/* Resultado com Badge */}
              <td className="py-2.5 px-2 text-center">
                {getResultBadge(item.resultado, item.resultadoLabel)}
              </td>

              {/* Duração */}
              <td className="py-2.5 pr-3 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                {item.duracao}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
