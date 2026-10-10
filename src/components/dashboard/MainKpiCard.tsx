import React from 'react'
import { LucideIcon } from 'lucide-react'
import { KpiCard } from '@/components/common/KpiCard'

export interface MainKpiCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: {
    value: string
    isPositive?: boolean
    neutral?: boolean
  }
  supportText?: string
  icon: LucideIcon
  iconBgColor?: string
  iconColor?: string
  href?: string
  infoTooltip?: string
}

export const MainKpiCard: React.FC<MainKpiCardProps> = (props) => {
  return <KpiCard {...props} />
}
