import React from 'react'
import { Link } from 'react-router-dom'
import { Database, Building2, RefreshCw, Printer, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface BackupHeaderProps {
  currentTabLabel?: string
  serventiaNome: string
  serventiaAtiva?: boolean
  /** @deprecated Ações removidas do cabeçalho conforme solicitação de usabilidade */
  onNovaExecucao?: () => void
  onReload?: () => void
  loading?: boolean
  lastUpdated?: string
  canOperate?: boolean
  /** @deprecated Ações removidas do cabeçalho conforme solicitação de usabilidade */
  onNovoPlano?: () => void
  className?: string
}

export const BackupHeader: React.FC<BackupHeaderProps> = ({
  currentTabLabel = 'Visão Geral',
  serventiaNome,
  serventiaAtiva = true,
  onReload,
  loading = false,
  lastUpdated,
  className = '',
}) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 1. Breadcrumb no topo: "Backup e Recuperação > Visão Geral" com seta cinza */}
      <Breadcrumb aria-label="Navegação estrutural">
        <BreadcrumbList className="text-xs text-slate-500 font-medium">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/backup"
                className="hover:text-blue-700 text-slate-600 transition-colors font-medium"
              >
                Backup e Recuperação
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-slate-400" />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-slate-800">
              {currentTabLabel}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 2. Linha principal do cabeçalho: Identidade à esquerda e elementos de estado/ação à direita */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* À esquerda: Ícone em quadrado azul-escuro + Título em linha única + Tag Fase 3 + Subtítulo */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#124E78] text-white flex items-center justify-center shrink-0 shadow-sm border border-[#124E78]/30"
            aria-hidden="true"
          >
            <Database className="w-6 h-6 text-white" />
          </div>

          <div className="min-w-0">
            {/* Título e Tag na mesma linha */}
            <div className="flex items-center gap-2.5 flex-nowrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight whitespace-nowrap">
                Backup e Recuperação
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0 whitespace-nowrap">
                Fase 3 • Continuidade
              </span>
            </div>

            {/* Subtítulo com texto integral */}
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
              Gestão, monitoramento e conformidade da proteção dos ativos
            </p>
          </div>
        </div>

        {/* À direita: (1) Pill Última atualização + (2) Card Serventia Atual + (3) Guia/Ajuda + (4) Relatório Comprobatório */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 justify-start xl:justify-end">
          {/* Pílula / Botão de Última Atualização com recarga efetiva */}
          {lastUpdated && (
            <div
              onClick={onReload}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onReload?.()
                }
              }}
              className="flex items-center gap-2 text-right cursor-pointer hover:opacity-85 transition-opacity bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
              title="Clique para recarregar os dados"
              aria-label={`Última atualização às ${lastUpdated}. Clique para recarregar.`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${loading ? 'animate-spin' : ''}`}
              />
              <div className="text-left leading-tight">
                <span className="text-[10px] text-slate-400 font-medium block">
                  Última atualização
                </span>
                <span className="text-[11px] font-semibold text-slate-700 font-mono block whitespace-nowrap">
                  {lastUpdated}
                </span>
              </div>
            </div>
          )}

          {/* Card da Serventia Real */}
          <div
            className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs shrink-0"
            title={`Serventia atual: ${serventiaNome}`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60">
              <Building2 className="w-4 h-4 text-slate-700" />
            </div>
            <div className="min-w-0 pr-1">
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider leading-none">
                Serventia Atual
              </span>
              <span className="text-xs font-bold text-slate-900 truncate block mt-0.5 max-w-[150px] sm:max-w-[200px]">
                {serventiaNome}
              </span>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            >
              {serventiaAtiva ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>

          {/* Botão "Guia / Ajuda" */}
          <Button
            asChild
            variant="outline"
            className="border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-[#0B2545] text-xs font-semibold h-9 px-3 gap-1.5 rounded-xl shadow-2xs transition-colors shrink-0"
            title="Abrir o Manual de Uso passo a passo do Backup"
          >
            <Link to="/backup/guia">
              <HelpCircle className="w-4 h-4 text-blue-700" />
              <span>Guia / Ajuda</span>
            </Link>
          </Button>

          {/* Botão "Relatório Comprobatório" (abre /backup/relatorio em nova aba) */}
          <Button
            asChild
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 px-3 gap-1.5 rounded-xl shadow-2xs transition-colors shrink-0"
            title="Abrir o Relatório Comprobatório em formato A4 para impressão ou conferência"
          >
            <Link to="/backup/relatorio" target="_blank" rel="noopener noreferrer">
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Relatório Comprobatório</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BackupHeader
