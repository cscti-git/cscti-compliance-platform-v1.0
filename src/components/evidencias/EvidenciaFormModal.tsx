import React, { useState, useEffect } from 'react'
import {
  X,
  Upload,
  FileText,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  saveEvidencia,
  getEvidenciaFileUrl,
  type SaveEvidenciaPayload,
} from '@/services/evidenciaService'
import { toast } from '@/hooks/use-toast'
import type {
  EvidenciaItem,
  EvidenciaCategoriaItem,
  InventoryAssetItem,
  CentralEvidenciaStatus,
} from '@/types/cscti'

interface EvidenciaFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  orgId: string
  evidencia?: EvidenciaItem | null
  categorias: EvidenciaCategoriaItem[]
  ativos: InventoryAssetItem[]
  defaultResponsavel?: string
}

export const EvidenciaFormModal: React.FC<EvidenciaFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  orgId,
  evidencia,
  categorias,
  ativos,
  defaultResponsavel = '',
}) => {
  const isEditing = !!evidencia?.id

  const [categoria, setCategoria] = useState<string>('')
  const [categoriaNome, setCategoriaNome] = useState<string>('')
  const [titulo, setTitulo] = useState<string>('')
  const [descricao, setDescricao] = useState<string>('')
  const [dataEvidencia, setDataEvidencia] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [responsavel, setResponsavel] = useState<string>('')
  const [ativoVinculado, setAtivoVinculado] = useState<string>('nenhum')
  const [status, setStatus] = useState<CentralEvidenciaStatus>('conforme')
  const [observacoesRevisao, setObservacoesRevisao] = useState<string>('')
  const [tagsInput, setTagsInput] = useState<string>('')

  // Arquivos
  const [arquivosExistentes, setArquivosExistentes] = useState<string[]>([])
  const [novosArquivos, setNovosArquivos] = useState<File[]>([])
  const [previewsNovos, setPreviewsNovos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (evidencia) {
      setCategoria(evidencia.categoria || '')
      setCategoriaNome(evidencia.categoria_nome || '')
      setTitulo(evidencia.titulo || '')
      setDescricao(evidencia.descricao || '')
      setDataEvidencia(
        evidencia.data_evidencia
          ? evidencia.data_evidencia.split('T')[0]
          : new Date().toISOString().split('T')[0],
      )
      setResponsavel(evidencia.responsavel_registro || defaultResponsavel)
      setAtivoVinculado(evidencia.ativo_vinculado || 'nenhum')
      setStatus(evidencia.status || 'conforme')
      setObservacoesRevisao(evidencia.observacoes_revisao || '')
      setTagsInput(evidencia.tags ? evidencia.tags.join(', ') : '')
      setArquivosExistentes(evidencia.arquivos || [])
      setNovosArquivos([])
      setPreviewsNovos([])
    } else {
      // Criação: valores default
      const defaultCat = categorias[0]?.id || ''
      const defaultCatNome = categorias[0]?.name || 'Geral'
      setCategoria(defaultCat)
      setCategoriaNome(defaultCatNome)
      setTitulo('')
      setDescricao('')
      setDataEvidencia(new Date().toISOString().split('T')[0])
      setResponsavel(defaultResponsavel)
      setAtivoVinculado('nenhum')
      setStatus('conforme')
      setObservacoesRevisao('')
      setTagsInput('')
      setArquivosExistentes([])
      setNovosArquivos([])
      setPreviewsNovos([])
    }
  }, [evidencia, open, categorias, defaultResponsavel])

  // Limpar previews na desmontagem
  useEffect(() => {
    return () => {
      previewsNovos.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewsNovos])

  const handleCategoriaChange = (catId: string) => {
    setCategoria(catId)
    const found = categorias.find((c) => c.id === catId)
    if (found) {
      setCategoriaNome(found.name)
    }
  }

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const incoming = Array.from(e.target.files)
    const valid: File[] = []
    const newPreviewUrls: string[] = []

    for (const file of incoming) {
      // Máximo 30MB
      if (file.size > 30 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: `O arquivo ${file.name} excede o limite de 30MB.`,
          variant: 'destructive',
        })
        continue
      }
      valid.push(file)
      if (file.type.startsWith('image/')) {
        newPreviewUrls.push(URL.createObjectURL(file))
      } else {
        newPreviewUrls.push('')
      }
    }

    setNovosArquivos((prev) => [...prev, ...valid])
    setPreviewsNovos((prev) => [...prev, ...newPreviewUrls])
  }

  const removeNovoArquivo = (idx: number) => {
    if (previewsNovos[idx]) {
      URL.revokeObjectURL(previewsNovos[idx])
    }
    setNovosArquivos((prev) => prev.filter((_, i) => i !== idx))
    setPreviewsNovos((prev) => prev.filter((_, i) => i !== idx))
  }

  const removeArquivoExistente = (fn: string) => {
    setArquivosExistentes((prev) => prev.filter((f) => f !== fn))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!titulo.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título ou identificação da evidência.',
        variant: 'destructive',
      })
      return
    }

    if (!categoriaNome.trim()) {
      toast({
        title: 'Categoria obrigatória',
        description: 'Selecione ou informe a categoria da evidência.',
        variant: 'destructive',
      })
      return
    }

    if (!responsavel.trim()) {
      toast({
        title: 'Responsável obrigatório',
        description: 'Informe o responsável pelo registro da evidência.',
        variant: 'destructive',
      })
      return
    }

    // Processar tags
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    setSubmitting(true)
    try {
      const payload: SaveEvidenciaPayload = {
        id: evidencia?.id,
        categoria: categoria || undefined,
        categoria_nome: categoriaNome,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_evidencia: dataEvidencia,
        responsavel_registro: responsavel.trim(),
        tags: parsedTags,
        ativo_vinculado: ativoVinculado !== 'nenhum' ? ativoVinculado : null,
        status,
        observacoes_revisao: observacoesRevisao.trim(),
        arquivosNovos: novosArquivos,
        arquivosExistentes,
      }

      await saveEvidencia(orgId, payload)

      toast({
        title: isEditing ? 'Evidência atualizada' : 'Evidência cadastrada com sucesso',
        description: `"${titulo}" foi salva e auditada no registro da serventia.`,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[EvidenciaFormModal] Erro ao salvar evidência:', err)
      toast({
        title: 'Erro ao salvar evidência',
        description: err?.message || 'Verifique os dados preenchidos e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEditing ? 'Editar Evidência Comprobatória' : 'Cadastrar Nova Evidência'}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre fotos, imagens e comprovações documentais da infraestrutura e rotinas da
            serventia.
          </p>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs"
        >
          {/* Categoria e Título */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-700">
                Categoria da Evidência <span className="text-red-500">*</span>
              </Label>
              <Select value={categoria} onValueChange={handleCategoriaChange}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-700">
                Status da Comprovação
              </Label>
              <Select
                value={status}
                onValueChange={(val: CentralEvidenciaStatus) => setStatus(val)}
              >
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conforme" className="text-xs">
                    Conforme (Homologado)
                  </SelectItem>
                  <SelectItem value="pendente_revisao" className="text-xs">
                    Pendente de Revisão
                  </SelectItem>
                  <SelectItem value="arquivado" className="text-xs">
                    Arquivado (Histórico)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Título da Evidência */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-700">
              Título da Evidência <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Ex.: Foto frontal do gerador com horímetro em operação"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Descrição Detalhada */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-700">
              Descrição / Detalhamento Técnico
            </Label>
            <Textarea
              placeholder="Detalhes adicionais sobre o ativo, teste realizado, localização, estado de conservação ou observações técnicas..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs min-h-[75px] resize-y"
            />
          </div>

          {/* Data, Responsável e Vínculo com Ativo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-700">
                Data da Evidência <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={dataEvidencia}
                onChange={(e) => setDataEvidencia(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-700">
                Responsável pelo Registro <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="Ex.: Leandro Silva (TI)"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-700">
                Vínculo com Ativo (Opcional)
              </Label>
              <Select value={ativoVinculado} onValueChange={setAtivoVinculado}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Selecione um ativo..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="nenhum" className="text-xs">
                    (Sem vínculo direto)
                  </SelectItem>
                  {ativos.map((atv) => (
                    <SelectItem key={atv.id} value={atv.id} className="text-xs">
                      {atv.name} {atv.ip_address ? `(${atv.ip_address})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags e Palavras-chave */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-700">
              Tags / Palavras-chave (separadas por vírgula)
            </Label>
            <Input
              type="text"
              placeholder="Ex.: gerador, energia, nobreak, dme, vistoria"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* UPLOAD DE ARQUIVOS (Fotos / PDFs) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Arquivos Comprobatórios (Fotos, Imagens e Documentos)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Formatos: JPG, PNG, WEBP, PDF (até 30MB cada)
              </span>
            </Label>

            {/* Dropzone / Botão de Seleção */}
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-xl p-4 bg-slate-50/60 text-center">
              <input
                type="file"
                id="file-upload-input"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden"
                onChange={handleFilesSelect}
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-blue-700 hover:underline">
                    Clique para selecionar fotos ou documentos
                  </span>{' '}
                  <span className="text-slate-500">ou arraste arquivos para esta área</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Fotos de servidores, gerador, switches, ar-condicionado, nobreaks e extintores
                </span>
              </label>
            </div>

            {/* Lista de Arquivos Existentes (em modo de edição) */}
            {arquivosExistentes.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-500 block">
                  Arquivos já cadastrados ({arquivosExistentes.length}):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {arquivosExistentes.map((fn) => {
                    const isPdf = fn.toLowerCase().endsWith('.pdf')
                    const thumbUrl = evidencia ? getEvidenciaFileUrl(evidencia, fn, '150x150') : ''
                    return (
                      <div
                        key={fn}
                        className="group relative rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs p-1"
                      >
                        <div className="h-20 w-full bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                          {isPdf ? (
                            <FileText className="w-8 h-8 text-red-500" />
                          ) : (
                            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-600 truncate mt-1 px-1 font-mono">
                          {fn}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeArquivoExistente(fn)}
                          className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                          title="Remover arquivo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lista de Novos Arquivos selecionados */}
            {novosArquivos.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-blue-700 block">
                  Novos arquivos para envio ({novosArquivos.length}):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {novosArquivos.map((file, idx) => {
                    const isImg = file.type.startsWith('image/')
                    return (
                      <div
                        key={file.name + idx}
                        className="relative rounded-lg border border-blue-200 overflow-hidden bg-blue-50/40 shadow-2xs p-1"
                      >
                        <div className="h-20 w-full bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                          {isImg && previewsNovos[idx] ? (
                            <img
                              src={previewsNovos[idx]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-red-500" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-700 truncate mt-1 px-1 font-mono">
                          {file.name}
                        </p>
                        <span className="text-[9px] text-slate-400 block px-1">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeNovoArquivo(idx)}
                          className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity"
                          title="Remover arquivo selecionado"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé com Botões */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Gravar Evidência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default EvidenciaFormModal
