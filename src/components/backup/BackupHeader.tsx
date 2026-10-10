import React from 'react'
import { Link } from 'react-router-dom'
import { HardDriveDownload, HelpCircle, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModuleHeader } from '@/components/common/ModuleHeader'
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
  const actions = (
    <>
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
    </>
  )

  return (
    <ModuleHeader
      breadcrumbs={[{ label: 'Backup e Recuperação', href: '/backup' }, { label: currentTabLabel }]}
      icon={HardDriveDownload}
      title="Backup e Recuperação"
      badgeText="Fase 3 · Continuidade"
      subtitle="Gestão, monitoramento e conformidade da proteção dos ativos"
      serventiaNome={serventiaNome}
      serventiaAtiva={serventiaAtiva}
      lastUpdated={lastUpdated}
      loading={loading}
      onReload={onReload}
      actions={actions}
      className={className}
    />
  )
}

export default BackupHeader
