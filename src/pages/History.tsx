import React, { useEffect, useState } from 'react'
import { listActivities, type ActivityItem } from '@/services/contextService'
import { useRealtime } from '@/hooks/use-realtime'
import { formatRelativeTime } from '@/pages/Index'
import {
  Clock,
  PlusCircle,
  FileEdit,
  Download,
  Trash2,
  Filter,
  Loader2,
  Calendar,
} from 'lucide-react'

export default function History() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filterAction, setFilterAction] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchActivities = async (currentPage: number, append: boolean = false) => {
    try {
      const data = await listActivities(currentPage, 20)
      setTotalPages(data.totalPages)
      if (append) {
        setActivities((prev) => [...prev, ...data.items])
      } else {
        setActivities(data.items)
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchActivities(1)
  }, [])

  // Realtime subscription for live activities
  useRealtime('activities', () => {
    fetchActivities(1)
  })

  const handleLoadMore = () => {
    if (page < totalPages) {
      setIsLoadingMore(true)
      const nextPage = page + 1
      setPage(nextPage)
      fetchActivities(nextPage, true)
    }
  }

  const getActionBadge = (action: ActivityItem['action']) => {
    switch (action) {
      case 'created':
        return {
          icon: PlusCircle,
          color: 'text-[#10B981] bg-emerald-50 border-emerald-200',
          label: 'Criação',
        }
      case 'updated':
        return {
          icon: FileEdit,
          color: 'text-[#3B82F6] bg-blue-50 border-blue-200',
          label: 'Atualização',
        }
      case 'exported':
        return {
          icon: Download,
          color: 'text-[#8B5CF6] bg-purple-50 border-purple-200',
          label: 'Exportação',
        }
      case 'deleted':
        return {
          icon: Trash2,
          color: 'text-[#EF4444] bg-red-50 border-red-200',
          label: 'Exclusão',
        }
      default:
        return {
          icon: Clock,
          color: 'text-[#6B7280] bg-gray-50 border-gray-200',
          label: 'Ação',
        }
    }
  }

  const filteredActivities = activities.filter((item) => {
    if (filterAction === 'all') return true
    return item.action === filterAction
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight">
            Histórico de Atividades
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Registro cronológico de todas as ações realizadas na sua conta.
          </p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] p-1 rounded-xl shadow-xs self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'created', label: 'Criações' },
            { id: 'updated', label: 'Atualizações' },
            { id: 'exported', label: 'Exportações' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterAction(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                filterAction === tab.id
                  ? 'bg-[#4F46E5] text-white'
                  : 'text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F9FAFB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="w-9 h-9 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-[#9CA3AF] flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-[#1F2937]">Nenhuma atividade registrada</h3>
          <p className="text-xs text-[#6B7280]">
            Suas ações de criação, atualização e exportação de contextos aparecerão aqui em tempo
            real.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E4E7EC]">
            {filteredActivities.map((act) => {
              const meta = getActionBadge(act.action)
              const Icon = meta.icon
              const formattedDate = new Date(act.created).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div key={act.id} className="relative flex items-start gap-4 group">
                  {/* Timeline icon node */}
                  <div
                    className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center border bg-white shadow-xs ${meta.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors p-3.5 rounded-xl border border-[#E4E7EC] ml-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1F2937]">
                        {act.description}
                      </span>
                      <span className="text-[11px] text-[#9CA3AF] shrink-0">
                        {formatRelativeTime(act.created)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[#6B7280]">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Load More */}
          {page < totalPages && (
            <div className="pt-6 text-center border-t border-[#E4E7EC] mt-6">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#D1D5DB] rounded-lg text-xs font-medium text-[#1F2937] hover:bg-[#F9FAFB] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Carregando...</span>
                  </>
                ) : (
                  <span>Ver mais atividades</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
