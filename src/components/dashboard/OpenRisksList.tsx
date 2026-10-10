import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface OpenRiskItem {
  id: string
  label: string
  count: number
  colorDot: string
  badgeBg: string
  badgeText: string
  href?: string
}

export interface OpenRisksListProps {
  items: OpenRiskItem[]
}

export const OpenRisksList: React.FC<OpenRisksListProps> = ({ items }) => {
  return (
    <div className="space-y-2 w-full">
      {items.map((item) => {
        const itemContent = (
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${item.badgeBg} ${item.badgeText} border border-current/20`}
              >
                {item.count}
              </span>
              <span className="text-xs font-medium text-slate-800 truncate">{item.label}</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </div>
        )

        if (item.href) {
          return (
            <Link
              key={item.id}
              to={item.href}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
            >
              {itemContent}
            </Link>
          )
        }

        return <div key={item.id}>{itemContent}</div>
      })}
    </div>
  )
}
