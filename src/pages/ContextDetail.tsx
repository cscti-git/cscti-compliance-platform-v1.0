import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import {
  getContextById,
  deleteContext,
  exportContextAsJson,
  analyzeContextWithAi,
  type ContextItem,
} from '@/services/contextService'
import { getSourceBadgeInfo } from '@/pages/Index'
import {
  ArrowLeft,
  Download,
  MoreVertical,
  Pencil,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  Calendar,
  Layers,
  FileCode2,
  ListOrdered,
  ListChecks,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export default function ContextDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [context, setContext] = useState<ContextItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Lightbox modal for screenshots
  const [activeImage, setActiveImage] = useState<string | null>(null)

  // AI Feature State
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [activeActionLabel, setActiveActionLabel] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [copiedResponse, setCopiedResponse] = useState(false)

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getContextById(id)
      .then((data) => setContext(data))
      .catch((err) => {
        console.error(err)
        toast({
          variant: 'destructive',
          title: 'Contexto não encontrado',
          description: 'Não foi possível carregar os dados deste contexto.',
        })
        navigate('/')
      })
      .finally(() => setIsLoading(false))
  }, [id, navigate, toast])

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 h-64 bg-slate-100 rounded-xl" />
          <div className="md:col-span-7 h-96 bg-slate-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!context) return null

  const badge = getSourceBadgeInfo(context.source)

  const handleAiAction = async (
    action: 'bullets' | 'tasks' | 'simple' | 'next_steps',
    label: string,
  ) => {
    setIsAiLoading(true)
    setActiveActionLabel(label)
    setAiResponse(null)
    try {
      const result = await analyzeContextWithAi({
        title: context.title,
        summary: context.summary,
        content: context.content,
        action,
      })
      setAiResponse(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao analisar com IA'
      toast({
        variant: 'destructive',
        title: 'Erro na análise de IA',
        description: msg,
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleCustomAiQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customPrompt.trim()) return

    setIsAiLoading(true)
    setActiveActionLabel(`Pergunta: "${customPrompt}"`)
    setAiResponse(null)
    try {
      const result = await analyzeContextWithAi({
        title: context.title,
        summary: context.summary,
        content: context.content,
        customQuestion: customPrompt.trim(),
      })
      setAiResponse(result)
      setCustomPrompt('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao consultar IA'
      toast({
        variant: 'destructive',
        title: 'Erro ao consultar IA',
        description: msg,
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleCopyAiResult = () => {
    if (!aiResponse) return
    navigator.clipboard.writeText(aiResponse)
    setCopiedResponse(true)
    setTimeout(() => setCopiedResponse(false), 2000)
    toast({
      title: 'Resposta copiada!',
      description: 'Texto copiado para a área de transferência.',
    })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteContext(context.id, context.title)
      toast({
        title: 'Contexto excluído',
        description: 'O registro foi removido com sucesso.',
      })
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir'
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: msg,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formattedCreated = new Date(context.created).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedUpdated = new Date(context.updated).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4E7EC]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors"
            title="Voltar ao dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
              >
                {badge.label}
              </span>
              <span className="text-xs text-[#9CA3AF]">ID: {context.id}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight mt-1">
              {context.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => exportContextAsJson(context)}
            className="inline-flex items-center gap-2 h-9 px-3.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#1F2937] text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#6B7280]" />
            <span>Exportar JSON</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 text-[#6B7280] hover:text-[#1F2937] border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors focus:outline-none">
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 bg-white border border-[#E4E7EC] shadow-lg rounded-lg p-1 text-xs"
            >
              <DropdownMenuItem
                onClick={() => navigate(`/editar-contexto/${context.id}`)}
                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[#1F2937]"
              >
                <Pencil className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[#EF4444] hover:bg-red-50 focus:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Two-Column Layout (Desktop 40% / 60%, Mobile stacked) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column (Metadata, Summary, Tags) */}
        <div className="md:col-span-5 space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Resumo Executivo</span>
            </div>
            <p className="text-sm text-[#1F2937] leading-relaxed bg-[#EEF2FF]/40 p-3.5 rounded-lg border border-[#EEF2FF]">
              {context.summary || 'Nenhum resumo gerado para este contexto.'}
            </p>
          </div>

          {/* Tags Card */}
          <div className="bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              Tags & Classificações
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {context.tags.length > 0 ? (
                context.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-[#F3F4F6] text-[#4F46E5] text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#9CA3AF]">Nenhuma tag associada</span>
              )}
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              Metadados do Contexto
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Origem
                </span>
                <span className="font-medium text-[#1F2937] capitalize">{context.source}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Criado em
                </span>
                <span className="font-medium text-[#1F2937]">{formattedCreated}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#6B7280] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Última atualização
                </span>
                <span className="font-medium text-[#1F2937]">{formattedUpdated}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Original Content & AI Feature Panel) */}
        <div className="md:col-span-7 space-y-6">
          {/* Original Content Card */}
          <div className="bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Conteúdo Original
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(context.content)
                  toast({
                    title: 'Conteúdo copiado!',
                    description: 'Todo o texto original foi copiado para a área de transferência.',
                  })
                }}
                className="text-xs text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar tudo
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-4 bg-[#F9FAFB] rounded-xl border border-[#E4E7EC] text-xs font-mono text-[#1F2937] whitespace-pre-wrap leading-relaxed select-text">
              {context.content}
            </div>

            {/* Screenshots Thumbnails if present */}
            {context.images && context.images.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-[#6B7280] mb-2">Imagens e Screenshots:</p>
                <div className="flex flex-wrap gap-2">
                  {context.images.map((imgName, idx) => {
                    const imgUrl = pb.files.getURL(
                      { collectionId: 'contexts', id: context.id },
                      imgName,
                    )
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(imgUrl)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#D1D5DB] hover:border-[#4F46E5] transition-all cursor-pointer"
                      >
                        <img
                          src={imgUrl}
                          alt={`Anexo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Feature Panel ("O que mais posso fazer?") */}
          <div className="bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#4F46E5]" />
              <div>
                <h3 className="text-sm font-semibold text-[#1F2937]">O que mais posso fazer?</h3>
                <p className="text-xs text-[#6B7280]">
                  Gere análises sob demanda deste contexto usando o modelo inteligente rápido.
                </p>
              </div>
            </div>

            {/* 4 Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleAiAction('bullets', 'Resumo em Bullet Points')}
                disabled={isAiLoading}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-[#D1D5DB] hover:border-[#4F46E5] hover:bg-[#EEF2FF]/30 text-xs font-medium text-[#1F2937] transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <ListOrdered className="w-4 h-4 text-[#4F46E5] shrink-0" />
                <span>Resumir em bullet points</span>
              </button>

              <button
                type="button"
                onClick={() => handleAiAction('tasks', 'Extração de Tarefas Pendentes')}
                disabled={isAiLoading}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-[#D1D5DB] hover:border-[#4F46E5] hover:bg-[#EEF2FF]/30 text-xs font-medium text-[#1F2937] transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <ListChecks className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Extrair tarefas pendentes</span>
              </button>

              <button
                type="button"
                onClick={() => handleAiAction('simple', 'Explicação em Termos Simples')}
                disabled={isAiLoading}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-[#D1D5DB] hover:border-[#4F46E5] hover:bg-[#EEF2FF]/30 text-xs font-medium text-[#1F2937] transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <HelpCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Explicar em termos simples</span>
              </button>

              <button
                type="button"
                onClick={() => handleAiAction('next_steps', 'Sugestão de Próximos Passos')}
                disabled={isAiLoading}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-[#D1D5DB] hover:border-[#4F46E5] hover:bg-[#EEF2FF]/30 text-xs font-medium text-[#1F2937] transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <Lightbulb className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Sugerir próximos passos</span>
              </button>
            </div>

            {/* AI Streaming/Result Area */}
            {isAiLoading && (
              <div className="p-4 rounded-xl bg-[#EEF2FF]/40 border border-[#EEF2FF] space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#4F46E5] font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando resposta para: {activeActionLabel}...</span>
                </div>
                <div className="h-4 bg-[#EEF2FF] rounded animate-pulse w-3/4" />
                <div className="h-4 bg-[#EEF2FF] rounded animate-pulse w-1/2" />
              </div>
            )}

            {aiResponse && !isAiLoading && (
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E4E7EC] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
                  <span className="text-xs font-semibold text-[#4F46E5]">{activeActionLabel}</span>
                  <button
                    type="button"
                    onClick={handleCopyAiResult}
                    className="inline-flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#1F2937] transition-colors"
                  >
                    {copiedResponse ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                        <span className="text-[#10B981]">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar resposta</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-[#1F2937] whitespace-pre-wrap leading-relaxed select-text">
                  {aiResponse}
                </div>
              </div>
            )}

            {/* Custom follow-up question */}
            <form onSubmit={handleCustomAiQuestion} className="flex gap-2 pt-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Faça uma pergunta específica sobre este contexto..."
                className="flex-1 h-9 px-3 text-xs rounded-lg border border-[#D1D5DB] bg-white text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
              />
              <button
                type="submit"
                disabled={!customPrompt.trim() || isAiLoading}
                className="h-9 px-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Perguntar</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Lightbox for Screenshots */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activeImage}
              alt="Screenshot ampliado"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl border border-[#E4E7EC]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#1F2937]">
              Excluir Contexto
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280] mt-2">
              Tem certeza que deseja excluir o contexto <strong>"{context.title}"</strong>? Esta
              ação é definitiva e removerá todos os dados do banco.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm text-[#1F2937] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
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
