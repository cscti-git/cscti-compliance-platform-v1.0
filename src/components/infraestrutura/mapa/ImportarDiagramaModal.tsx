import React, { useState, useRef } from 'react'
import {
  Upload,
  FileImage,
  Hash,
  Calendar,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { calculateFileSha256 } from '@/services/designacaoService'
import { formatDateTime } from '@/lib/dateTime'
import { useToast } from '@/hooks/use-toast'

export interface DiagramaReferenciaData {
  id: string
  nomeArquivo: string
  tamanhoFormatado: string
  dataUpload: string
  sha256: string
  descricao: string
  dataUrl: string
}

export interface ImportarDiagramaModalProps {
  isOpen: boolean
  onClose: () => void
  onSalvar: (diagrama: DiagramaReferenciaData) => void
  diagramaAtual: DiagramaReferenciaData | null
}

export const ImportarDiagramaModal: React.FC<ImportarDiagramaModalProps> = ({
  isOpen,
  onClose,
  onSalvar,
  diagramaAtual,
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(diagramaAtual?.dataUrl || '')
  const [sha256, setSha256] = useState<string>(diagramaAtual?.sha256 || '')
  const [calculandoHash, setCalculandoHash] = useState(false)
  const [descricao, setDescricao] = useState(
    diagramaAtual?.descricao || 'Diagrama topológico da Sala de Servidores e Racks da serventia',
  )
  const [isDragging, setIsDragging] = useState(false)

  if (!isOpen) return null

  const processFile = async (file: File) => {
    // Validar tipo de arquivo (PNG / JPG / JPEG / WEBP)
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione uma imagem válida (PNG, JPG ou JPEG).',
        variant: 'destructive',
      })
      return
    }

    // Validar tamanho máximo de 10MB
    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo não pode exceder 10 MB.',
        variant: 'destructive',
      })
      return
    }

    setArquivo(file)
    setCalculandoHash(true)

    try {
      // Ler para DataURL
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl((e.target?.result as string) || '')
      }
      reader.readAsDataURL(file)

      // Calcular SHA-256 padrão
      const hash = await calculateFileSha256(file)
      setSha256(hash)
    } catch (err) {
      console.error('Erro ao processar imagem:', err)
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Não foi possível ler o arquivo e calcular o hash.',
        variant: 'destructive',
      })
    } finally {
      setCalculandoHash(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleConfirmar = () => {
    if (!previewUrl || !sha256) {
      toast({
        title: 'Selecione uma imagem',
        description: 'Faça o upload do diagrama de referência antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    const data: DiagramaReferenciaData = {
      id: diagramaAtual?.id || `diag-ref-${Date.now()}`,
      nomeArquivo: arquivo ? arquivo.name : diagramaAtual?.nomeArquivo || 'diagrama-referencia.png',
      tamanhoFormatado: arquivo
        ? formatBytes(arquivo.size)
        : diagramaAtual?.tamanhoFormatado || '1.8 MB',
      dataUpload: new Date().toISOString(),
      sha256,
      descricao: descricao.trim() || 'Diagrama de referência da serventia',
      dataUrl: previewUrl,
    }

    onSalvar(data)
    toast({
      title: 'Diagrama de referência salvo',
      description:
        'O diagrama foi arquivado e já está disponível para cotejo visual ao lado do mapa.',
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#124E78] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileImage className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Importar Diagrama de Referência (Gabarito)
              </h3>
              <p className="text-xs text-slate-500">
                Upload de imagem existente (PNG/JPG até 10MB) com cálculo de integridade SHA-256
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 h-8 w-8 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Banner Informativo de Distinção (Requisito 2) */}
        <div className="bg-blue-50/80 border-b border-blue-200/70 p-3.5 px-5 flex items-start gap-2.5 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-blue-950">
              Cotejo Regulatório: Diagrama Arquivado vs. Mapa Interativo Vivo
            </p>
            <p className="text-blue-800 leading-relaxed text-[11px]">
              O diagrama importado serve de <strong>referência/gabarito histórico</strong> arquivado
              como documento comprobatório auditável com hash SHA-256. Já o{' '}
              <strong>mapa topológico</strong> da tela é o ambiente vivo e atualizável conectado aos
              registros reais da serventia.
            </p>
          </div>
        </div>

        {/* Corpo com scroll */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Área de drop/upload */}
          <div>
            <Label className="text-xs font-bold text-slate-700">Arquivo de Imagem</Label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1.5 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60'
                  : previewUrl
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="space-y-3">
                  <div className="max-h-48 overflow-hidden rounded-lg border border-slate-200 shadow-2xs inline-block bg-slate-900/5">
                    <img
                      src={previewUrl}
                      alt="Prévia do Diagrama"
                      className="max-h-48 w-auto object-contain mx-auto"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Imagem carregada com sucesso
                    </Badge>
                    <span className="text-xs text-blue-700 underline font-medium">
                      Clique para trocar arquivo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs border border-blue-200">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Arraste e solte o diagrama aqui ou clique para selecionar
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">PNG, JPG ou WEBP até 10 MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hash SHA-256 */}
          <div>
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                Hash Criptográfico SHA-256 (Padrão de Evidências CSCTI)
              </span>
              {calculandoHash && (
                <span className="text-[10px] text-blue-600 animate-pulse font-normal">
                  Calculando hash...
                </span>
              )}
            </Label>
            <div className="mt-1 bg-slate-100/90 rounded-lg p-2.5 border border-slate-200 font-mono text-xs text-slate-800 break-all select-all flex items-center justify-between gap-2">
              <span>{sha256 || 'Nenhum arquivo processado ainda.'}</span>
              {sha256 && (
                <Badge
                  variant="outline"
                  className="bg-white text-emerald-800 border-emerald-300 text-[10px] shrink-0 font-sans"
                >
                  Integridade Garantida
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Gera a mesma assinatura utilizada na Central de Evidências para certificar a
              imutabilidade do documento.
            </p>
          </div>

          {/* Descrição do Diagrama */}
          <div>
            <Label htmlFor="diag-desc" className="text-xs font-bold text-slate-700">
              Descrição e Finalidade do Gabarito
            </Label>
            <Textarea
              id="diag-desc"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Topologia de infraestrutura da sala de servidores, racks de telecomunicações e alimentação elétrica aprovada pela serventia."
              className="mt-1 text-xs"
            />
          </div>
        </div>

        {/* Rodapé com ações */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!previewUrl || !sha256 || calculandoHash}
            onClick={handleConfirmar}
            className="text-xs bg-gradient-to-r from-[#0B2545] to-[#124E78] text-white hover:opacity-95 shadow-xs gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Salvar e Exibir Gabarito</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
