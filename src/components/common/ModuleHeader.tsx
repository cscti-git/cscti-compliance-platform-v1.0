import React from 'react'
import { Link } from 'react-router-dom'
import { LucideIcon, Building2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface ModuleHeaderBreadcrumbItem {
  label: string
  href?: string
}

export interface ModuleHeaderProps {
  /** Itens da trilha de navegação (breadcrumb) */
  breadcrumbs: ModuleHeaderBreadcrumbItem[]
  /** Ícone do módulo exibido dentro do quadrado com gradiente azul-escuro */
  icon: LucideIcon
  /** Título principal do módulo (ex.: "Dashboard", "Inventário de Ativos", "Backup e Recuperação") */
  title: string
  /** Tag azul exibida ao lado do título (ex.: "Compliance & Governança", "Fase 3 · Continuidade", "Módulo de Ativos") */
  badgeText?: string
  /** Subtítulo descritivo em uma ou duas linhas */
  subtitle: string
  /** Nome da serventia cadastrada ativa */
  serventiaNome?: string
  /** Se a serventia está ativa */
  serventiaAtiva?: boolean
  /** Data/hora da última atualização (ex.: "10/10/2026 16:03") */
  lastUpdated?: string
  /** Estado de carregamento para animação de rotação */
  loading?: boolean
  /** Função de recarga acionada ao clicar na pílula "Última atualização" */
  onReload?: () => void
  /** Ações e botões específicos do módulo posicionados à direita */
  actions?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho padrão de módulo para o produto CSCTI - Compliance.
 * Unifica estrutura visual, gradiente (#0B2545 -> #124E78), breadcrumbs,
 * pílula de recarga funcional, card da serventia e ações personalizadas.
 */
export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  breadcrumbs,
  icon: Icon,
  title,
  badgeText,
  subtitle,
  serventiaNome,
  serventiaAtiva = true,
  lastUpdated,
  loading = false,
  onReload,
  actions,
  className = '',
}) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 1. Breadcrumbs padronizados */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb aria-label="Navegação estrutural">
          <BreadcrumbList className="text-xs text-slate-500 font-medium">
            {breadcrumbs.map((bc, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  <BreadcrumbItem>
                    {isLast || !bc.href ? (
                      <BreadcrumbPage className="font-semibold text-slate-800">
                        {bc.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          to={bc.href}
                          className="hover:text-blue-700 text-slate-600 transition-colors font-medium"
                        >
                          {bc.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="text-slate-400" />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* 2. Linha principal do cabeçalho */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Identidade à esquerda: Ícone no quadrado azul-escuro + Título + Tag + Subtítulo */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#124E78] text-white flex items-center justify-center shrink-0 shadow-sm border border-[#124E78]/30"
            aria-hidden="true"
          >
            <Icon className="w-6 h-6 text-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-nowrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight whitespace-nowrap">
                {title}
              </h1>
              {badgeText && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0 whitespace-nowrap">
                  {badgeText}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug truncate max-w-2xl">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Lado direito: Pílula Última atualização + Card Serventia Atual + Ações específicas */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 justify-start xl:justify-end">
          {/* Pílula de Última Atualização com recarga funcional */}
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
              className="flex items-center gap-2 text-right cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0 select-none"
              title="Clique para recarregar todos os dados"
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

          {/* Card da Serventia Atual */}
          {serventiaNome && (
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
          )}

          {/* Ações específicas do módulo (ex.: Novo Ativo, Imprimir, Guia etc.) */}
          {actions}
        </div>
      </div>
    </div>
  )
}

export default ModuleHeader
