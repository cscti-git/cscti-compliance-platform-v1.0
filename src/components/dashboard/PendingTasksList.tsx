import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

export interface PendingTaskItem {
  id: string
  descricao: string
  modulo: string
  prazo: string
  isVencido?: boolean
  prioridade: 'alta' | 'media' | 'baixa'
  href?: string
}

export interface PendingTasksListProps {
  tasks: PendingTaskItem[]
}

const getPriorityIcon = (prioridade: PendingTaskItem['prioridade'], isVencido?: boolean) => {
  if (isVencido || prioridade === 'alta') {
    return (
      <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs">
        <ShieldAlert className="w-3.5 h-3.5" />
      </div>
    )
  }
  if (prioridade === 'media') {
    return (
      <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
        <AlertTriangle className="w-3.5 h-3.5" />
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0 shadow-2xs">
      <CheckCircle2 className="w-3.5 h-3.5" />
    </div>
  )
}

export const PendingTasksList: React.FC<PendingTasksListProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 italic">
        Nenhuma pendência ou tarefa em aberto no momento.
      </div>
    )
  }

  return (
    <div className="space-y-2.5 w-full">
      {tasks.map((task) => {
        const item = (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {getPriorityIcon(task.prioridade, task.isVencido)}
              <div className="min-w-0">
                <span
                  className="font-medium text-slate-800 text-xs truncate block"
                  title={task.descricao}
                >
                  {task.descricao}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{task.modulo}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`font-mono text-xs font-semibold block ${
                  task.isVencido ? 'text-rose-600 font-bold' : 'text-slate-600'
                }`}
                title={task.isVencido ? 'Prazo expirado' : 'Prazo de entrega'}
              >
                {task.prazo}
              </span>
            </div>
          </div>
        )

        if (task.href) {
          return (
            <Link
              key={task.id}
              to={task.href}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
            >
              {item}
            </Link>
          )
        }

        return <div key={task.id}>{item}</div>
      })}
    </div>
  )
}
