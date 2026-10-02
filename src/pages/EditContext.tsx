import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getContextById, updateContext, type ContextItem } from '@/services/contextService'
import { getSourceBadgeInfo } from '@/pages/Index'
import { ArrowLeft, Save, Loader2, X, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function EditContext() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [context, setContext] = useState<ContextItem | null>(null)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{ title?: string }>({})

  useEffect(() => {
    if (!id) return
    getContextById(id)
      .then((data) => {
        setContext(data)
        setTitle(data.title)
        setSummary(data.summary || '')
        setTags(data.tags || [])
      })
      .catch((err) => {
        console.error(err)
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: 'Contexto não encontrado.',
        })
        navigate('/')
      })
      .finally(() => setIsLoading(false))
  }, [id, navigate, toast])

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
      if (val && !tags.includes(val)) {
        setTags([...tags, val])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (!title.trim()) {
      setErrors({ title: 'O título é obrigatório' })
      return
    }

    setIsSaving(true)
    setErrors({})
    try {
      await updateContext(id, {
        title: title.trim(),
        summary: summary.trim(),
        tags,
      })

      toast({
        title: 'Alterações salvas!',
        description: 'Contexto atualizado com sucesso.',
      })
      navigate(`/contextos/${id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar'
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: msg,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-200 rounded-lg" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    )
  }

  if (!context) return null

  const badge = getSourceBadgeInfo(context.source)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Link
            to={`/contextos/${context.id}`}
            className="p-2 -ml-2 text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F3F4F6] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight">
            Editar Contexto
          </h1>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-xs space-y-5"
      >
        {/* Source Read-only Badge */}
        <div>
          <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
            Origem (somente leitura)
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-[#9CA3AF]">
              A origem do contexto não pode ser alterada após a criação.
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do contexto"
            className={`w-full h-10 px-3.5 text-sm rounded-lg border bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15 ${
              errors.title ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
            }`}
          />
          {errors.title && <p className="text-xs text-[#EF4444] mt-1">{errors.title}</p>}
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
            Resumo
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="Resumo executivo do contexto..."
            className="w-full p-3 text-sm rounded-lg border border-[#D1D5DB] bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
            Tags
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
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={tags.length === 0 ? 'Digite e pressione Enter...' : 'Adicionar...'}
              className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-[#1F2937] placeholder-[#9CA3AF]"
            />
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1">
            Pressione Enter ou vírgula para adicionar cada tag.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E4E7EC]">
          <Link
            to={`/contextos/${context.id}`}
            className="inline-flex items-center gap-2 h-10 px-4 border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#1F2937] text-sm font-medium rounded-lg transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="inline-flex items-center gap-2 h-10 px-5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar alterações</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
