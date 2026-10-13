import React, { useState } from 'react'
import {
  FileImage,
  Hash,
  Calendar,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
  ShieldCheck,
  Upload,
  Info,
  Layers,
  ZoomIn,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DiagramaReferenciaData } from './ImportarDiagramaModal'
import { formatDateTime } from '@/lib/dateTime'

export interface DiagramaReferenciaPanelProps {
  diagrama: DiagramaReferenciaData | null
  onAbrirModalImportacao: () => void
  onRemoverDiagrama?: () => void
}

export const DiagramaReferenciaPanel: React.FC<DiagramaReferenciaPanelProps> = ({
  diagrama,
  onAbrirModalImportacao,
  onRemoverDiagrama,
}) => {
  const [expandido, setExpandido] = useState(false)
  const [modalZoomAberto, setModalZoomAberto] = useState(false)

  if (!diagrama) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 text-center shadow-2xs space-y-3">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto border border-blue-200">
          <FileImage className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Diagrama de Referência (Gabarito Não Importado)
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5">
            Você pode importar um diagrama existente em formato de imagem (PNG/JPG até 10MB) para
            servir de cotejo visual e gabarito arquivado ao lado do mapa interativo.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAbrirModalImportacao}
          className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5 shadow-2xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Importar Diagrama Existente</span>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden flex flex-col">
        {/* Cabeçalho do Painel */}
        <div className="bg-gradient-to-r from-blue-900 via-[#0B2545] to-[#124E78] text-white p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 text-amber-300 flex items-center justify-center font-bold text-xs shadow-2xs">
              <FileImage className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Gabarito Arquivado • Referência Técnica
                </span>
                <Badge className="bg-blue-600/90 text-white text-[10px] py-0 border-blue-400">
                  Documento Estático
                </Badge>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5">
                {diagrama.descricao || 'Diagrama Topológico da Serventia'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalZoomAberto(true)}
              className="text-xs h-7 bg-white/15 text-white hover:bg-white/25 border-0 gap-1"
              title="Visualizar em tela cheia"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Ampliar</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onAbrirModalImportacao}
              className="text-xs h-7 bg-white/15 text-white hover:bg-white/25 border-0 gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Substituir</span>
            </Button>
          </div>
        </div>

        {/* Metadados e Hash SHA-256 */}
        <div className="bg-blue-50/70 border-b border-blue-200/60 p-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Importado em: <strong>{formatDateTime(diagrama.dataUpload)}</strong>
              </span>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-mono text-[11px]">
              Arquivo: <strong>{diagrama.nomeArquivo}</strong> ({diagrama.tamanhoFormatado})
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-[11px] font-mono text-slate-700">
            <Hash className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="text-slate-500 font-sans">SHA-256:</span>
            <span
              className="font-bold text-blue-900 truncate max-w-[220px]"
              title={diagrama.sha256}
            >
              {diagrama.sha256}
            </span>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[9px] py-0 px-1 font-sans"
            >
              Autêntico
            </Badge>
          </div>
        </div>

        {/* Imagem do diagrama */}
        <div className="p-3 sm:p-4 bg-slate-100 flex items-center justify-center relative min-h-[300px] max-h-[550px] overflow-hidden">
          <img
            src={diagrama.dataUrl}
            alt="Diagrama de Referência da Serventia"
            className="w-full h-auto max-h-[520px] object-contain rounded-lg border border-slate-300 bg-white shadow-xs cursor-zoom-in"
            onClick={() => setModalZoomAberto(true)}
          />

          <div className="absolute bottom-6 right-6">
            <Button
              size="sm"
              onClick={() => setModalZoomAberto(true)}
              className="bg-black/70 hover:bg-black text-white text-xs shadow-md gap-1.5 backdrop-blur-xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expandir Gabarito</span>
            </Button>
          </div>
        </div>

        {/* Rodapé explicativo do cotejo */}
        <div className="p-3 px-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Finalidade:</strong> Utilize esta planta como gabarito comparativo com o mapa
              vivo interativo gerado ao lado.
            </span>
          </div>

          {onRemoverDiagrama && (
            <button
              onClick={onRemoverDiagrama}
              className="text-[11px] text-red-600 hover:underline self-end sm:self-auto"
            >
              Remover gabarito
            </button>
          )}
        </div>
      </div>

      {/* Modal de Zoom em Tela Cheia */}
      {modalZoomAberto && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between text-white p-2">
            <div className="flex items-center gap-2">
              <FileImage className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-sm">
                Gabarito de Referência: {diagrama.descricao}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({diagrama.sha256.slice(0, 16)}...)
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalZoomAberto(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
            <img
              src={diagrama.dataUrl}
              alt="Diagrama Ampliado"
              className="max-h-[88vh] max-w-full object-contain rounded-lg border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  )
}
