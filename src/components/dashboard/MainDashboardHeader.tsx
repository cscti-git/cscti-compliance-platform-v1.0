import React from 'react'
import { LayoutDashboard } from 'lucide-react'
import { ModuleHeader } from '@/components/common/ModuleHeader'

export interface MainDashboardHeaderProps {
  serventiaNome: string
  serventiaAtiva?: boolean
  lastUpdated?: string
  loading?: boolean
  onReload?: () => void
  className?: string
}

export const MainDashboardHeader: React.FC<MainDashboardHeaderProps> = ({
  serventiaNome,
  serventiaAtiva = true,
  lastUpdated,
  loading = false,
  onReload,
  className = '',
}) => {
  return (
    <ModuleHeader
      breadcrumbs={[{ label: 'CSCTI - Compliance', href: '/' }, { label: 'Dashboard Principal' }]}
      icon={LayoutDashboard}
      title="Dashboard"
      badgeText="Compliance & Governança"
      subtitle="Visão geral da conformidade, riscos e proteção dos ativos"
      serventiaNome={serventiaNome}
      serventiaAtiva={serventiaAtiva}
      lastUpdated={lastUpdated}
      loading={loading}
      onReload={onReload}
      className={className}
    />
  )
}
