import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export interface DashboardCardProps {
  title: string
  subtitle?: string
  viewAllLink?: {
    label?: string
    href: string
  }
  headerAction?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  emptyState?: {
    message: string
    submessage?: string
    action?: {
      label: string
      href: string
    }
  }
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  viewAllLink,
  headerAction,
  children,
  className = '',
  contentClassName = '',
  emptyState,
}) => {
  return (
    <Card
      className={`border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden flex flex-col justify-between ${className}`}
    >
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {title}
            </CardTitle>
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerAction}
          {viewAllLink && (
            <Link
              to={viewAllLink.href}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 group transition-colors"
            >
              <span>{viewAllLink.label || 'Ver todos'}</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className={`p-4 sm:p-5 flex-1 ${contentClassName}`}>
        {emptyState ? (
          <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 flex flex-col items-center justify-center my-auto">
            <p className="text-xs font-semibold text-slate-700">{emptyState.message}</p>
            {emptyState.submessage && (
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">{emptyState.submessage}</p>
            )}
            {emptyState.action && (
              <Link
                to={emptyState.action.href}
                className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                <span>{emptyState.action.label}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
