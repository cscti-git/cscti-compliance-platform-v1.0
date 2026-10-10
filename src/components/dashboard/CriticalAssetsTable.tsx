import React from 'react'
import { Link } from 'react-router-dom'
import {
  Server,
  Monitor,
  Network,
  Cpu,
  Database,
  Printer,
  HardDrive,
  Cloud,
  HelpCircle,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export interface CriticalAssetRow {
  id: string
  name: string
  tipo: string
  tipoFormatado: string
  situacao: 'conforme' | 'pendente' | 'nao_conforme' | 'nao_avaliado'
  situacaoLabel: string
  ultimaRevisao: string
  criticidade: 'alta' | 'media' | 'baixa'
}

const getAssetIcon = (tipo: string): LucideIcon => {
  switch (tipo) {
    case 'servidor_virtualizado':
    case 'servidor_aplicacao':
      return Server
    case 'estacao':
      return Monitor
    case 'equipamento_rede':
      return Network
    case 'banco_dados':
      return Database
    case 'impressora_multifuncional':
      return Printer
    case 'storage_backup':
      return HardDrive
    case 'servico_nuvem':
      return Cloud
    default:
      return Server
  }
}

const getSituacaoBadge = (situacao: CriticalAssetRow['situacao'], label: string) => {
  switch (situacao) {
    case 'conforme':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          {label}
        </span>
      )
    case 'pendente':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          {label}
        </span>
      )
    case 'nao_conforme':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
          {label}
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
          {label}
        </span>
      )
  }
}

export interface CriticalAssetsTableProps {
  assets: CriticalAssetRow[]
}

export const CriticalAssetsTable: React.FC<CriticalAssetsTableProps> = ({ assets }) => {
  if (assets.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 italic">
        Nenhum ativo crítico em atenção no momento.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-left text-xs border-collapse min-w-[500px]">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <th className="pb-2.5 pl-3 font-semibold">Ativo</th>
            <th className="pb-2.5 font-semibold">Categoria</th>
            <th className="pb-2.5 font-semibold text-center">Situação</th>
            <th className="pb-2.5 font-semibold text-right pr-2">Última Revisão</th>
            <th className="pb-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assets.map((asset) => {
            const Icon = getAssetIcon(asset.tipo)

            return (
              <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors group">
                {/* Nome do ativo com ícone */}
                <td className="py-2.5 pl-3 pr-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/60">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/ativos`}
                        className="font-bold text-slate-900 hover:text-blue-700 truncate block max-w-[140px] sm:max-w-[180px]"
                        title={asset.name}
                      >
                        {asset.name}
                      </Link>
                    </div>
                  </div>
                </td>

                {/* Categoria */}
                <td
                  className="py-2.5 pr-2 text-slate-500 font-medium truncate max-w-[120px]"
                  title={asset.tipoFormatado}
                >
                  {asset.tipoFormatado}
                </td>

                {/* Situação com badge pastel */}
                <td className="py-2.5 px-2 text-center">
                  {getSituacaoBadge(asset.situacao, asset.situacaoLabel)}
                </td>

                {/* Última Revisão */}
                <td className="py-2.5 pr-2 text-right text-slate-500 font-mono text-[11px]">
                  {asset.ultimaRevisao}
                </td>

                {/* Menu ⋯ */}
                <td className="py-2.5 pr-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-slate-400 hover:text-slate-700 rounded-md"
                        aria-label="Ações do ativo"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem asChild>
                        <Link to="/ativos" className="cursor-pointer">
                          Ver no Inventário
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/backup" className="cursor-pointer">
                          Ver no Backup
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
