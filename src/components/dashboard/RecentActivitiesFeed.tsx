import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  FileText,
  Settings,
  ShieldCheck,
  Server,
  HardDriveDownload,
  LucideIcon,
} from 'lucide-react'

export interface RecentActivityItem {
  id: string
  action: string
  descricao: string
  dataHora: string
  tipoIcone?: 'sucesso' | 'alerta' | 'info' | 'documento' | 'config' | 'ativo' | 'backup'
  userLabel?: string
}

const getEventIcon = (
  tipo?: RecentActivityItem['tipoIcone'],
): { icon: LucideIcon; color: string; bg: string } => {
  switch (tipo) {
    case 'sucesso':
      return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' }
    case 'alerta':
      return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' }
    case 'documento':
      return { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' }
    case 'config':
      return { icon: Settings, color: 'text-blue-600', bg: 'bg-blue-100' }
    case 'ativo':
      return { icon: Server, color: 'text-cyan-600', bg: 'bg-cyan-100' }
    case 'backup':
      return { icon: HardDriveDownload, color: 'text-purple-600', bg: 'bg-purple-100' }
    default:
      return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' }
  }
}

export interface RecentActivitiesFeedProps {
  activities: RecentActivityItem[]
}

export const RecentActivitiesFeed: React.FC<RecentActivitiesFeedProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 italic">
        Nenhuma atividade recente registrada na auditoria.
      </div>
    )
  }

  return (
    <div className="space-y-3 w-full">
      {activities.map((act) => {
        const { icon: Icon, color, bg } = getEventIcon(act.tipoIcone)

        return (
          <div
            key={act.id}
            className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div
                className={`w-6 h-6 rounded-full ${bg} ${color} flex items-center justify-center shrink-0 mt-0.5`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate" title={act.descricao}>
                  {act.descricao}
                </p>
                {act.userLabel && (
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">Por: {act.userLabel}</p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                {act.dataHora}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
