import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createContext as createDbRecord,
  generateAiSummary,
  type ContextSource,
} from '@/services/contextService'
import {
  MessageSquare,
  Sparkles,
  Paperclip,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  FileText,
  Terminal,
  Cpu,
  HelpCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function CreateContext() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Form State
  const [source, setSource] = useState<ContextSource>('chatgpt')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])

  // Step 3 State
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [currentTagInput, setCurrentTagInput] = useState('')

  // Loading States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{ content?: string; title?: string }>({})

  const sourcesList: {
    id: ContextSource
    name: string
    desc: string
    icon: React.ElementType
    badgeColor: string
  }[] = [
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      desc: 'Cole uma conversa ou exporte seu histórico',
      icon: MessageSquare,
      badgeColor: 'text-[#10A37F] bg-[#ECFDF5] border-[#10A37F]/30',
    },
    {
      id: 'claude',
      name: 'Claude',
      desc: 'Importe conversas do Claude',
      icon: Sparkles,
      badgeColor: 'text-[#D97757] bg-[#FFF7ED] border-[#D97757]/30',
    },
    {
      id: 'gemini',
      name: 'Gemini',
      desc: 'Importe conversas do Gemini',
      icon: Cpu,
      badgeColor: 'text-[#4285F4] bg-[#EFF6FF] border-[#4285F4]/30',
    },
    {
      id: 'manual',
      name: 'Descrição Manual',
      desc: 'Descreva o que está fazendo no seu projeto',
      icon: FileText,
      badgeColor: 'text-[#6B7280] bg-[#F3F4F6] border-[#6B7280]/30',
    },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selected].slice(0, 5))

      const newPreviews = selected.map((file) => URL.createObjectURL(file))
      setFilePreviews((prev) => [...prev, ...newPreviews].slice(0, 5))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleStep2Next = async () => {
    if (!content.trim()) {
      setErrors({ content: 'O conteúdo é obrigatório' })
      return
    }
    setErrors({})
    setStep(3)

    // Call AI automatically to suggest title, summary, and tags
    setIsGeneratingAi(true)
    try {
      const aiResult = await generateAiSummary(content, source)
      if (aiResult.title && !title) setTitle(aiResult.title)
      if (aiResult.summary && !summary) setSummary(aiResult.summary)
      if (aiResult.tags && aiResult.tags.length > 0 && tags.length === 0) {
        setTags(aiResult.tags)
      }
    } catch (err) {
      console.warn('Sugestão por IA falhou, prosseguindo com campos editáveis:', err)
      if (!title) {
        setTitle(content.slice(0, 40).replace(/[\n\r]+/g, ' ') + '...')
      }
      if (!summary) {
        setSummary(content.slice(0, 150) + '...')
      }
      if (tags.length === 0) {
        setTags([source])
      }
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = currentTagInput
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
      if (val && !tags.includes(val)) {
        setTags([...tags, val])
      }
      setCurrentTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      setErrors({ title: 'O título é obrigatório' })
      return
    }

    setIsSaving(true)
    try {
      const created = await createDbRecord({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        source,
        tags,
        files,
      })

      toast({
        title: 'Contexto criado com sucesso!',
        description: 'Seu pacote de contexto está pronto para ser transferido ou consultado.',
      })

      navigate(`/contextos/${created.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar contexto'
      toast({
        variant: 'destructive',
        title: 'Erro ao criar contexto',
        description: msg,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Wizard Progress Bar */}
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= 1 ? 'bg-[#4F46E5] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}
            >
              1
            </span>
            <span
              className={`text-xs font-semibold ${step >= 1 ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}
            >
              Origem
            </span>
          </div>
          <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? 'bg-[#4F46E5]' : 'bg-[#E4E7EC]'}`} />
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= 2 ? 'bg-[#4F46E5] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-semibold ${step >= 2 ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}
            >
              Conteúdo
            </span>
          </div>
          <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? 'bg-[#4F46E5]' : 'bg-[#E4E7EC]'}`} />
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= 3 ? 'bg-[#4F46E5] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}
            >
              3
            </span>
            <span
              className={`text-xs font-semibold ${step >= 3 ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}
            >
              Organizar
            </span>
          </div>
        </div>

        {/* Step 1: Source */}
        {step === 1 && (
          <div className="space-y-6 pt-2">
            <div>
              <h2 className="text-xl font-bold text-[#1F2937]">Qual a origem do contexto?</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                Escolha de onde você deseja trazer as informações para criar este contexto
                unificado.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sourcesList.map((item) => {
                const Icon = item.icon
                const isSelected = source === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => setSource(item.id)}
                    className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#4F46E5] bg-[#EEF2FF]/40 shadow-sm'
                        : 'border-[#E4E7EC] hover:border-[#C7CBD1] bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center border ${item.badgeColor}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#4F46E5] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <h3 className="font-semibold text-sm text-[#1F2937]">{item.name}</h3>
                      <p className="text-xs text-[#6B7280] mt-1">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Special VM helper banner */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-[#6B7280]">
              <Terminal className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#1F2937]">
                  Trabalhando na sua Máquina Virtual (VM)?
                </span>
                <p className="mt-0.5">
                  Você pode colar comandos de terminal, scripts, prints de erro ou anotações
                  diretamente na opção de Descrição Manual ou usar o contexto gerado aqui para
                  importar de volta na sua VM via JSON!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 h-10 px-5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg shadow-sm transition-all"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Content */}
        {step === 2 && (
          <div className="space-y-6 pt-2">
            <div>
              <h2 className="text-xl font-bold text-[#1F2937]">Adicione seu conteúdo</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                {source === 'manual'
                  ? 'Descreva em detalhes o que você está trabalhando — pode ser um projeto, uma pesquisa, um código ou um plano.'
                  : 'Cole a conversa inteira, trechos importantes ou adicione capturas de tela do que você já tem.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                Conteúdo Original ou Conversa
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  source === 'manual'
                    ? 'Descreva em detalhes o que você está trabalhando — pode ser um projeto, uma pesquisa, um código, um plano...'
                    : 'Cole aqui a conversa ou o conteúdo exportado. Você também pode descrever o que estava fazendo...'
                }
                rows={10}
                className={`w-full p-3.5 text-sm rounded-xl border bg-[#F9FAFB] focus:bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15 font-mono ${
                  errors.content ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                }`}
              />
              {errors.content && <p className="text-xs text-[#EF4444] mt-1">{errors.content}</p>}
            </div>

            {/* Screenshots / Attachments zone */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                Capturas de tela & Imagens (opcional)
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#D1D5DB] hover:border-[#4F46E5] rounded-xl p-6 cursor-pointer bg-slate-50 hover:bg-[#EEF2FF]/20 transition-all">
                <Paperclip className="w-6 h-6 text-[#4F46E5] mb-2" />
                <span className="text-xs font-medium text-[#1F2937]">
                  Arraste imagens ou clique para enviar
                </span>
                <span className="text-[11px] text-[#9CA3AF] mt-1">
                  Formatos PNG, JPG ou WEBP (até 5 imagens de 10MB)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {filePreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {filePreviews.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#E4E7EC] group"
                    >
                      <img
                        src={url}
                        alt={`Screenshot ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white p-1 rounded-full text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 h-10 px-4 border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#1F2937] text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Next}
                disabled={!content.trim()}
                className="inline-flex items-center gap-2 h-10 px-5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Organize and Save */}
        {step === 3 && (
          <div className="space-y-6 pt-2">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#1F2937]">Organize e salve</h2>
                {isGeneratingAi && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#4F46E5] bg-[#EEF2FF] px-2.5 py-1 rounded-full animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Gerando sugestões com IA...
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6B7280] mt-1">
                Refine o título, resumo executivo e palavras-chave sugeridos pela inteligência
                artificial.
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                Título do Contexto
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Análise de requisitos para dashboard"
                className={`w-full h-10 px-3.5 text-sm rounded-lg border bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15 ${
                  errors.title ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                }`}
              />
              {errors.title && <p className="text-xs text-[#EF4444] mt-1">{errors.title}</p>}
            </div>

            {/* Summary */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Resumo Executivo (2 a 3 frases)
                </label>
                <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#4F46E5]" /> Gerado por IA
                </span>
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Breve resumo estruturado deste contexto..."
                className="w-full p-3 text-sm rounded-lg border border-[#D1D5DB] bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                Tags e Palavras-chave
              </label>
              <div className="flex flex-wrap gap-2 items-center p-2.5 rounded-lg border border-[#D1D5DB] bg-white min-h-[44px]">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EEF2FF] text-[#4F46E5] text-xs font-medium"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={currentTagInput}
                  onChange={(e) => setCurrentTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? 'Digite e pressione Enter...' : 'Adicionar...'}
                  className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-[#1F2937] placeholder-[#9CA3AF]"
                />
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                Pressione Enter ou vírgula para adicionar cada tag.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSaving}
                className="inline-flex items-center gap-2 h-10 px-4 border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#1F2937] text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={isSaving || !title.trim()}
                className="inline-flex items-center gap-2 h-10 px-6 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Contexto...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Criar Contexto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
