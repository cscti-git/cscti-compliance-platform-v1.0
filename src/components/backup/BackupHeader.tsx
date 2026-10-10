import React from 'react'
import { Link } from 'react-router-dom'
import {
  Database,
  Building2,
  Play,
  MoreVertical,
  RefreshCw,
  Printer,
  HelpCircle,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
  onNovaExecucao?: () => void
  onReload?: () => void
  loading?: boolean
  lastUpdated?: string
  canOperate?: boolean
  onNovoPlano?: () => void
  className?: string
}

export const BackupHeader: React.FC<BackupHeaderProps> = ({
  currentTabLabel = 'Visão Geral',
  serventiaNome,
  serventiaAtiva = true,
  onNovaExecucao,
  onReload,
  loading = false,
  lastUpdated,
  canOperate = true,
  onNovoPlano,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
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

      {/* 2. Linha principal do cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* À esquerda: Ícone em quadrado azul-escuro/teal arredondado + Título + Subtítulo */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#124E78] text-white flex items-center justify-center shrink-0 shadow-sm border border-[#124E78]/30"
            aria-hidden="true"
          >
            <Database className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Backup e Recuperação
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                Fase 3 • Continuidade
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
              Gestão, monitoramento e conformidade da proteção dos ativos
            </p>
          </div>
        </div>

        {/* À direita: (1) Card da Serventia Real + (2) Botão Primário "Nova Execução" + (3) Menu "⋯" discreto + Pill Última atualização */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
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
              className="flex items-center gap-2 text-right cursor-pointer hover:opacity-85 transition-opacity bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Clique para recarregar os dados"
              aria-label={`Última atualização às ${lastUpdated}. Clique para recarregar.`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${loading ? 'animate-spin' : ''}`}
              />
              <div className="text-left leading-tight hidden sm:block">
                <span className="text-[10px] text-slate-400 font-medium block">
                  Última atualização
                </span>
                <span className="text-[11px] font-semibold text-slate-700 font-mono block">
                  {lastUpdated}
                </span>
              </div>
            </div>
          )}

          {/* (1) Pílula / card branco com borda contendo ícone de prédio + rótulo pequeno "Serventia Atual" + nome da serventia real + badge verde "Ativo" */}
          <div
            className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs max-w-xs sm:max-w-sm"
            title={`Serventia atual: ${serventiaNome}`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60">
              <Building2 className="w-4 h-4 text-slate-700" />
            </div>
            <div className="min-w-0 pr-1">
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider leading-none">
                Serventia Atual
              </span>
              <span className="text-xs font-bold text-slate-900 truncate block mt-0.5 max-w-[150px] sm:max-w-[180px]">
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

          {/* (2) Botão primário azul com ícone play "Nova Execução" */}
          {canOperate ? (
            <Button
              onClick={onNovaExecucao}
              className="bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-bold h-9 px-3.5 gap-1.5 rounded-xl shadow-xs transition-colors"
              title="Registrar nova execução de backup"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Nova Execução</span>
            </Button>
          ) : (
            <Button
              onClick={onNovaExecucao}
              variant="outline"
              className="border-slate-200 text-slate-700 text-xs font-semibold h-9 px-3 gap-1.5 rounded-xl shadow-2xs"
              title="Ver histórico de execuções"
            >
              <Play className="w-3.5 h-3.5 text-blue-600" />
              <span>Execuções</span>
            </Button>
          )}

          {/* (3) Menu "⋯" discreto apenas com ações complementares (sem duplicar botões visíveis) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl shadow-2xs"
                title="Mais opções do módulo de backup"
                aria-label="Mais opções"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs p-1">
              <DropdownMenuItem asChild>
                <Link to="/backup/relatorio" target="_blank" className="cursor-pointer gap-2 py-2">
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Relatório Comprobatório (A4)</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/backup/guia" className="cursor-pointer gap-2 py-2">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Guia / Manual de Uso</span>
                </Link>
              </DropdownMenuItem>

              {canOperate && onNovoPlano && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onNovoPlano}
                    className="cursor-pointer gap-2 py-2 text-[#0B2545] font-semibold"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Cadastrar Novo Plano</span>
                  </DropdownMenuItem>
                </>
              )}

              {onReload && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onReload} className="cursor-pointer gap-2 py-2">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    <span>Recarregar Todos os Dados</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export default BackupHeader
