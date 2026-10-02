import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSearch } from '@/contexts/SearchContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  listContexts,
  deleteContext,
  exportContextAsJson,
  createContext,
  type ContextItem,
  type ContextSource,
} from '@/services/contextService'
import {
  Briefcase,
  MessageSquare,
  Clock,
  Plus,
  MoreVertical,
  Download,
  Pencil,
  Trash2,
  Copy,
  Eye,
  FileText,
  SearchX,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Source styling helper
export function getSourceBadgeInfo(source: ContextSource) {
  switch (source) {
    case 'chatgpt':
      return {
        label: 'ChatGPT',
        bgColor: 'bg-[#ECFDF5]',
        textColor: 'text-[#10A37F]',
        borderColor: 'border-[#10A37F]/30',
      }
    case 'claude':
      return {
        label: 'Claude',
        bgColor: 'bg-[#FFF7ED]',
        textColor: 'text-[#D97757]',
        borderColor: 'border-[#D97757]/30',
      }
    case 'gemini':
      return {
        label: 'Gemini',
        bgColor: 'bg-[#EFF6FF]',
        textColor: 'text-[#4285F4]',
        borderColor: 'border-[#4285F4]/30',
      }
    case 'vm':
      return {
        label: 'VM',
        bgColor: 'bg-[#F5F3FF]',
        textColor: 'text-[#8B5CF6]',
        borderColor: 'border-[#8B5CF6]/30',
      }
    case 'manual':
    default:
      return {
        label: 'Manual',
        bgColor: 'bg-[#F3F4F6]',
        textColor: 'text-[#6B7280]',
        borderColor: 'border-[#6B7280]/30',
      }
  }
}

// Relative time helper
export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'agora'
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} h`
  if (diffInSeconds < 86400 * 30) return `há ${Math.floor(diffInSeconds / 86400)} d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Index() {
  const { user } = useAuth()
  const { searchTerm } = useSearch()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [contexts, setContexts] = useState<ContextItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('-created')

  // Deletion modal state
  const [contextToDelete, setContextToDelete] = useState<ContextItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchContexts = async () => {
    try {
      const data = await listContexts({
        source: sourceFilter,
        sort: sortBy,
      })
      setContexts(data)
    } catch (err) {
      console.error('Erro ao carregar contextos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContexts()
  }, [sourceFilter, sortBy])

  // Realtime subscription for live sync
  useRealtime('contexts', () => {
    fetchContexts()
  })

  // Client-side search filtering
  const filteredContexts = useMemo(() => {
    if (!searchTerm.trim()) return contexts
    const q = searchTerm.toLowerCase()
    return contexts.filter((c) => {
      const inTitle = c.title.toLowerCase().includes(q)
      const inSummary = c.summary.toLowerCase().includes(q)
      const inContent = c.content.toLowerCase().includes(q)
      const inTags = c.tags.some((t) => t.toLowerCase().includes(q))
      return inTitle || inSummary || inContent || inTags
    })
  }, [contexts, searchTerm])

  // Stats calculation
  const totalCount = contexts.length
  const conversationCount = contexts.filter(
    (c) => c.source === 'chatgpt' || c.source === 'claude' || c.source === 'gemini',
  ).length
  const latestUpdate = contexts.length > 0 ? contexts[0].created : null

  const handleDeleteConfirm = async () => {
    if (!contextToDelete) return
    setIsDeleting(true)
    try {
      await deleteContext(contextToDelete.id, contextToDelete.title)
      setContexts((prev) => prev.filter((c) => c.id !== contextToDelete.id))
      toast({
        title: 'Contexto excluído',
        description: `O contexto "${contextToDelete.title}" foi removido com sucesso.`,
      })
      setContextToDelete(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir'
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: msg,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async (context: ContextItem) => {
    try {
      await createContext({
        title: `${context.title} (Cópia)`,
        summary: context.summary,
        content: context.content,
        source: context.source,
        tags: [...context.tags],
      })
      toast({
        title: 'Contexto duplicado',
        description: `Uma cópia de "${context.title}" foi criada.`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao duplicar',
        description: 'Não foi possível duplicar o contexto.',
      })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">
            Olá, {user?.name || 'Desenvolvedor'} 👋
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Gerencie seus contextos de trabalho entre ferramentas e sua máquina virtual.
          </p>
        </div>
        <button
          onClick={() => navigate('/novo-contexto')}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg shadow-sm transition-all active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Contexto</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E4E7EC] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium">Total de Contextos</p>
            <p className="text-2xl font-bold text-[#1F2937]">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E4E7EC] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium">Conversas Importadas</p>
            <p className="text-2xl font-bold text-[#1F2937]">{conversationCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E4E7EC] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#8B5CF6] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-medium">Última Atualização</p>
            <p className="text-sm font-semibold text-[#1F2937] mt-1">
              {latestUpdate ? formatRelativeTime(latestUpdate) : 'Nenhuma'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and sorting bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mr-1">
            Origem:
          </span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'chatgpt', label: 'ChatGPT' },
            { id: 'claude', label: 'Claude' },
            { id: 'gemini', label: 'Gemini' },
            { id: 'manual', label: 'Manual' },
            { id: 'vm', label: 'VM' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSourceFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                sourceFilter === item.id
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'bg-white border border-[#D1D5DB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-[#6B7280]">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-[#D1D5DB] bg-white text-[#1F2937] focus:outline-none focus:border-[#4F46E5] cursor-pointer"
          >
            <option value="-created">Mais recentes</option>
            <option value="created">Mais antigos</option>
            <option value="title">A-Z</option>
          </select>
        </div>
      </div>

      {/* Grid of Context cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-[#E4E7EC] p-5 space-y-3 animate-pulse"
            >
              <div className="h-5 w-20 bg-slate-200 rounded-md" />
              <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
              <div className="h-12 w-full bg-slate-100 rounded-md" />
              <div className="flex gap-2 pt-2">
                <div className="h-4 w-12 bg-slate-200 rounded-full" />
                <div className="h-4 w-16 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredContexts.length === 0 ? (
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 my-8">
          {searchTerm ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-[#9CA3AF] flex items-center justify-center">
                <SearchX className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#1F2937]">
                Nenhum resultado para "{searchTerm}"
              </h3>
              <p className="text-xs text-[#6B7280]">
                Tente ajustar os termos de busca ou limpar os filtros para ver seus contextos.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shadow-inner">
                <FileText className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#1F2937]">
                  Nenhum contexto criado ainda
                </h3>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                  Importe uma conversa do ChatGPT/Claude ou descreva seu trabalho para começar a
                  organizar seus contextos portáteis.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/novo-contexto')}
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar seu primeiro contexto</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContexts.map((context) => {
            const badge = getSourceBadgeInfo(context.source)
            return (
              <div
                key={context.id}
                onClick={() => navigate(`/contextos/${context.id}`)}
                className="group relative bg-white rounded-xl border border-[#E4E7EC] hover:border-[#C7CBD1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top row: Badge and dropdown */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      {badge.label}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-md text-[#9CA3AF] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition-colors focus:outline-none"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                        className="w-44 bg-white border border-[#E4E7EC] shadow-lg rounded-lg p-1 text-xs"
                      >
                        <DropdownMenuItem
                          onClick={() => navigate(`/contextos/${context.id}`)}
                          className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[#1F2937]"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>Ver Detalhes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/editar-contexto/${context.id}`)}
                          className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[#1F2937]"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(context)}
                          className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[#1F2937]"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>Duplicar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportContextAsJson(context)}
                          className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[#1F2937]"
                        >
                          <Download className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>Exportar JSON</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-[#E4E7EC]" />
                        <DropdownMenuItem
                          onClick={() => setContextToDelete(context)}
                          className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[#EF4444] hover:bg-red-50 focus:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm text-[#1F2937] line-clamp-1 group-hover:text-[#4F46E5] transition-colors">
                    {context.title}
                  </h3>

                  {/* Snippet / Summary */}
                  <p className="text-xs text-[#6B7280] line-clamp-2 mt-2 leading-relaxed">
                    {context.summary || context.content}
                  </p>
                </div>

                {/* Footer: Tags and Time */}
                <div className="pt-4 mt-3 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] text-[#9CA3AF]">
                  <div className="flex flex-wrap gap-1 max-w-[70%]">
                    {context.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#6B7280] text-[10px] font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                    {context.tags.length > 3 && (
                      <span className="text-[10px] text-[#9CA3AF]">+{context.tags.length - 3}</span>
                    )}
                  </div>
                  <span className="shrink-0">{formatRelativeTime(context.created)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!contextToDelete} onOpenChange={(open) => !open && setContextToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl border border-[#E4E7EC]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#1F2937]">
              Excluir Contexto
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280] mt-2">
              Tem certeza que deseja excluir o contexto <strong>"{contextToDelete?.title}"</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <button
              type="button"
              onClick={() => setContextToDelete(null)}
              disabled={isDeleting}
              className="px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
