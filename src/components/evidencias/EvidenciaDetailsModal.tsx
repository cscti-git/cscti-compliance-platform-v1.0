import React, { useState } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Calendar,
  User,
  Server,
  Tag,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getEvidenciaFileUrl } from '@/services/evidenciaService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import type { EvidenciaItem } from '@/types/cscti'

interface EvidenciaDetailsModalProps {
  evidencia: EvidenciaItem | null
  open: boolean
  onClose: () => void
  onEdit?: (evidencia: EvidenciaItem) => void
  canEdit?: boolean
}

export const EvidenciaDetailsModal: React.FC<EvidenciaDetailsModalProps> = ({
  evidencia,
  open,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  const [currentFileIdx, setCurrentFileIdx] = useState(0)

  if (!evidencia) return null

  const arquivos = evidencia.arquivos || []
  const hasFiles = arquivos.length > 0
  const activeFileName = hasFiles ? arquivos[currentFileIdx] || arquivos[0] : ''
  const isPdf = activeFileName.toLowerCase().endsWith('.pdf')
  const activeFileUrl = hasFiles ? getEvidenciaFileUrl(evidencia, activeFileName) : ''

  const handlePrev = () => {
    setCurrentFileIdx((prev) => (prev > 0 ? prev - 1 : arquivos.length - 1))
  }

  const handleNext = () => {
    setCurrentFileIdx((prev) => (prev < arquivos.length - 1 ? prev + 1 : 0))
  }

  const getStatusBadge = () => {
    if (evidencia.status === 'conforme') {
      return (
        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Conforme
        </Badge>
      )
    }
    if (evidencia.status === 'pendente_revisao') {
      return (
        <Badge className="bg-amber-50 text-amber-800 border-amber-300 gap-1 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pendente de Revisão
        </Badge>
      )
    }
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-300 gap-1 text-xs">
        <Archive className="w-3.5 h-3.5 text-slate-500" /> Arquivado
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white max-h-[92vh] flex flex-col gap-0 border-slate-200">
        {/* Top Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 bg-slate-50/50">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {evidencia.categoria_nome}
              </span>
              {getStatusBadge()}
            </div>
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {evidencia.titulo}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onEdit(evidencia)
                }}
                className="text-xs h-8"
              >
                Editar Evidência
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Corpo com Grid: Visualizador de Mídia à Esquerda e Metadados à Direita */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Lado Esquerdo: Lightbox / Carrossel de Fotos (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col items-center justify-center bg-slate-950/5 min-h-[320px] lg:min-h-[460px]">
            {hasFiles ? (
              <div className="w-full h-full flex flex-col items-center justify-between gap-3">
                {/* Visualizador Principal */}
                <div className="relative w-full flex-1 flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden min-h-[280px] shadow-inner group">
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center p-6 text-white space-y-3 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm max-w-xs truncate">{activeFileName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Documento PDF comprovatório</p>
                      </div>
                      <a
                        href={activeFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold bg-white text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Abrir Documento em Nova Guia
                      </a>
                    </div>
                  ) : (
                    <img
                      src={activeFileUrl}
                      alt={evidencia.titulo}
                      className="max-h-[380px] w-auto max-w-full object-contain select-none"
                    />
                  )}

                  {/* Controles do Carrossel se houver > 1 arquivo */}
                  {arquivos.length > 1 && (
                    <>
                      <button
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs transition-colors shadow-md"
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs transition-colors shadow-md"
                        aria-label="Próxima foto"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-2.5 bg-slate-900/80 text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        {currentFileIdx + 1} de {arquivos.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Miniaturas no Rodapé do Lightbox */}
                {arquivos.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto w-full py-1 px-0.5 scrollbar-thin">
                    {arquivos.map((fn, idx) => {
                      const isThumbPdf = fn.toLowerCase().endsWith('.pdf')
                      const thumbUrl = getEvidenciaFileUrl(evidencia, fn, '100x100')
                      return (
                        <button
                          key={fn + idx}
                          onClick={() => setCurrentFileIdx(idx)}
                          className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                            idx === currentFileIdx
                              ? 'border-blue-600 ring-2 ring-blue-500/30'
                              : 'border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          {isThumbPdf ? (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-red-600">
                              <FileText className="w-5 h-5" />
                            </div>
                          ) : (
                            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Botão de Download do Arquivo Ativo */}
                <div className="w-full flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="truncate max-w-[240px] font-mono text-[11px]">
                    {activeFileName}
                  </span>
                  <a
                    href={activeFileUrl}
                    download={activeFileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar Arquivo
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <FileText className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-medium">Nenhum arquivo ou foto anexado</p>
                <p className="text-xs text-slate-400">
                  Edite a evidência para anexar fotos ou documentos comprobatórios.
                </p>
              </div>
            )}
          </div>

          {/* Lado Direito: Metadados Técnicos, Descrição e Vínculo (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-4 text-xs">
            {/* Descrição Detalhada */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Descrição da Evidência
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap min-h-[70px]">
                {evidencia.descricao || (
                  <span className="italic text-slate-400">
                    Nenhuma descrição detalhada informada.
                  </span>
                )}
              </div>
            </div>

            {/* Informações de Registro */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Data da Evidência:
                </span>
                <span className="font-semibold text-slate-900">
                  {formatSpDateOnly(evidencia.data_evidencia)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Responsável pelo Registro:
                </span>
                <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                  {evidencia.responsavel_registro}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Server className="w-3.5 h-3.5 text-slate-400" /> Ativo Vinculado:
                </span>
                <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                  {evidencia.expand?.ativo_vinculado?.name ? (
                    <span className="text-blue-700 font-bold">
                      {evidencia.expand.ativo_vinculado.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">Nenhum vínculo direto</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Registrado no Sistema:
                </span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {evidencia.created ? formatSpDateTime(evidencia.created) : '—'}
                </span>
              </div>
            </div>

            {/* Tags */}
            {evidencia.tags && evidencia.tags.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Tag className="w-3.5 h-3.5" /> Tags e Palavras-chave
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {evidencia.tags.map((t, i) => (
                    <span
                      key={t + i}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observações de Revisão se existirem */}
            {evidencia.observacoes_revisao && (
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Parecer / Revisão
                </span>
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-900 text-xs">
                  {evidencia.observacoes_revisao}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default EvidenciaDetailsModal
