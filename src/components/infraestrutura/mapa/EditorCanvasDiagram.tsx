import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  EquipamentoSimulado,
  TopologiaConexao,
  CamadaId,
  CAMADAS_TOPOLOGIA,
  TIPOS_CONEXAO_CATALOGO,
  TipoConexao,
} from './topologiaData'
import { MapaNodeCard } from './MapaNodeCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Move,
  Plus,
  Cable,
  Trash2,
  Edit2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

export interface EditorCanvasDiagramProps {
  equipamentos: EquipamentoSimulado[]
  conexoes: TopologiaConexao[]
  modoEdicao: boolean
  filtroConexao?: 'todos' | 'eletrica' | 'fibra' | 'rede' | 'telefonia'
  equipamentoSelecionadoId: string | null
  onSelectEquipamento: (equipamento: EquipamentoSimulado) => void
  onEditarNode: (equipamento: EquipamentoSimulado) => void
  onRemoverNode: (nodeId: string) => void
  onAtualizarPosicaoNode: (nodeId: string, x: number, y: number) => void
  onAdicionarNodeNaCamada: (camadaId: CamadaId) => void
  onAbrirNovaConexao: (origemId?: string) => void
  onEditarConexao: (conexao: TopologiaConexao) => void
  onRemoverConexao: (conexaoId: string) => void
}

export const EditorCanvasDiagram: React.FC<EditorCanvasDiagramProps> = ({
  equipamentos,
  conexoes,
  modoEdicao,
  filtroConexao = 'todos',
  equipamentoSelecionadoId,
  onSelectEquipamento,
  onEditarNode,
  onRemoverNode,
  onAtualizarPosicaoNode,
  onAdicionarNodeNaCamada,
  onAbrirNovaConexao,
  onEditarConexao,
  onRemoverConexao,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [exibirGrid, setExibirGrid] = useState(true)

  // Estado de arrasto de nó
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Posições em tela dos nós para desenho dos cabos SVG
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number; w: number; h: number }>
  >({})

  // Conexões filtradas
  const conexoesFiltradas = conexoes.filter((c) => {
    if (filtroConexao === 'todos') return true
    return c.tipo === filtroConexao
  })

  // Agrupa os equipamentos por camada
  const equipamentosPorCamada = React.useMemo(() => {
    const mapa: Record<string, EquipamentoSimulado[]> = {}
    CAMADAS_TOPOLOGIA.forEach((camada) => {
      mapa[camada.id] = equipamentos.filter((e) => e.camadaId === camada.id)
    })
    return mapa
  }, [equipamentos])

  // Medição das posições dos nós para traçar linhas SVG
  const atualizarDimensoesNos = useCallback(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const novasPosicoes: Record<string, { x: number; y: number; w: number; h: number }> = {}

    equipamentos.forEach((eq) => {
      const el = document.getElementById(`node-card-${eq.id}`)
      if (el) {
        const rect = el.getBoundingClientRect()
        novasPosicoes[eq.id] = {
          x: (rect.left - containerRect.left) / zoom,
          y: (rect.top - containerRect.top) / zoom,
          w: rect.width / zoom,
          h: rect.height / zoom,
        }
      }
    })

    setNodePositions(novasPosicoes)
  }, [equipamentos, zoom])

  useEffect(() => {
    const timer = setTimeout(atualizarDimensoesNos, 120)
    window.addEventListener('resize', atualizarDimensoesNos)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', atualizarDimensoesNos)
    }
  }, [atualizarDimensoesNos, equipamentos, zoom])

  // Início do arrasto
  const handleMouseDownNode = (e: React.MouseEvent, node: EquipamentoSimulado) => {
    if (!modoEdicao) return
    // Se clicar em botão de ação do card, não arrasta
    if ((e.target as HTMLElement).closest('button')) return

    e.preventDefault()
    setDraggingNodeId(node.id)

    const el = document.getElementById(`node-card-${node.id}`)
    if (el) {
      const rect = el.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  // Movimento durante o arrasto com alinhamento sutil à grade (grid de 12px)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !modoEdicao || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    let rawX = (e.clientX - containerRect.left - dragOffset.x) / zoom
    let rawY = (e.clientY - containerRect.top - dragOffset.y) / zoom

    // Grade de 12px
    if (exibirGrid) {
      rawX = Math.round(rawX / 12) * 12
      rawY = Math.round(rawY / 12) * 12
    }

    onAtualizarPosicaoNode(draggingNodeId, Math.max(10, rawX), Math.max(10, rawY))
    atualizarDimensoesNos()
  }

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null)
      atualizarDimensoesNos()
    }
  }

  // Retorna a cor da linha por tipo de conexão
  const getCorLinha = (tipo: TipoConexao) => {
    switch (tipo) {
      case 'fibra':
        return '#0891b2' // cyan-600
      case 'rede':
        return '#2563eb' // blue-600
      case 'eletrica':
        return '#d97706' // amber-600
      case 'telefonia':
        return '#9333ea' // purple-600
      default:
        return '#64748b' // slate-500
    }
  }

  return (
    <div className="space-y-3">
      {/* Barra de Ferramentas do Canvas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {modoEdicao ? (
            <Badge className="bg-amber-600 text-white font-bold gap-1 px-2.5 py-1">
              <Move className="w-3.5 h-3.5" />
              <span>Modo Editor Ativo — Arraste nós, adicione componentes e gerencie conexões</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-700 border-slate-300 font-medium">
              Modo Visualização Oficial
            </Badge>
          )}

          <span className="text-slate-400">•</span>
          <span className="text-slate-600">
            <strong>{equipamentos.length}</strong> nós • <strong>{conexoes.length}</strong> conexões
          </span>
        </div>

        {/* Controles de Zoom e Grade */}
        <div className="flex items-center gap-2">
          {modoEdicao && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAbrirNovaConexao()}
              className="text-xs h-7 gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Cable className="w-3.5 h-3.5 text-blue-600" />
              <span>Conectar Nós</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExibirGrid(!exibirGrid)}
            className={`text-xs h-7 gap-1 ${exibirGrid ? 'text-blue-700 bg-blue-50' : 'text-slate-600'}`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grade</span>
          </Button>

          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="px-2 py-1 text-slate-600 hover:bg-white text-xs"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-2 text-[10px] font-mono text-slate-700 bg-white border-x border-slate-200">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="px-2 py-1 text-slate-600 hover:bg-white text-xs"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(1)}
            className="text-xs h-7 text-slate-500 hover:text-slate-800"
            title="Resetar Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ÁREA DO CANVAS INTERATIVO */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full min-h-[720px] rounded-2xl border border-slate-200 p-6 overflow-x-auto select-none transition-all ${
          exibirGrid
            ? 'bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] bg-slate-50/70'
            : 'bg-slate-50/60'
        }`}
        style={{
          transformOrigin: 'top left',
        }}
      >
        {/* Camada SVG para traçar conexões entre os nós */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ minWidth: '1000px', minHeight: '700px' }}
        >
          <defs>
            {TIPOS_CONEXAO_CATALOGO.map((t) => (
              <marker
                key={t.tipo}
                id={`arrow-${t.tipo}`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill={t.cor} />
              </marker>
            ))}
          </defs>

          {conexoesFiltradas.map((cx) => {
            const pOrigem = nodePositions[cx.origemId]
            const pDestino = nodePositions[cx.destinoId]
            if (!pOrigem || !pDestino) return null

            const x1 = pOrigem.x + pOrigem.w / 2
            const y1 = pOrigem.y + pOrigem.h / 2
            const x2 = pDestino.x + pDestino.w / 2
            const y2 = pDestino.y + pDestino.h / 2

            // Ponto médio para curva de bezier suave
            const dx = x2 - x1
            const dy = y2 - y1
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2 - Math.min(30, Math.abs(dx) * 0.15)
            const pathD = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
            const cor = getCorLinha(cx.tipo)

            return (
              <g
                key={cx.id}
                className="group/cx cursor-pointer pointer-events-auto"
                onClick={() => modoEdicao && onEditarConexao(cx)}
              >
                {/* Linha de fundo para ampliar área clicável */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="14"
                  className="cursor-pointer"
                />

                {/* Linha principal da conexão */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={cor}
                  strokeWidth={modoEdicao ? '2.5' : '2'}
                  strokeDasharray={
                    cx.tipo === 'fibra' ? '4 3' : cx.tipo === 'eletrica' ? '6 4' : 'none'
                  }
                  markerEnd={`url(#arrow-${cx.tipo})`}
                  className={`${cx.animada ? 'animate-pulse' : ''} transition-all group-hover/cx:stroke-width-[3.5]`}
                />

                {/* Rótulo da conexão centralizado */}
                {cx.rotulo && (
                  <g transform={`translate(${mx}, ${my - 6})`}>
                    <rect
                      x={-(cx.rotulo.length * 3.3) - 8}
                      y="-10"
                      width={cx.rotulo.length * 6.6 + 16}
                      height="18"
                      rx="6"
                      fill="white"
                      stroke={cor}
                      strokeWidth="1"
                      className="shadow-2xs"
                    />
                    <text
                      textAnchor="middle"
                      dy="2"
                      className="text-[9px] font-bold fill-slate-700 font-mono"
                    >
                      {cx.rotulo}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* SEÇÕES EM BLOCOS DE CAMADAS/SETORES */}
        <div
          className="relative z-10 flex flex-col gap-6"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {CAMADAS_TOPOLOGIA.map((camada) => {
            const itensCamada = equipamentosPorCamada[camada.id] || []

            return (
              <section
                key={camada.id}
                className={`bg-white rounded-2xl border ${camada.corBorda} shadow-2xs overflow-hidden transition-all`}
              >
                {/* Cabeçalho da Camada / Setor */}
                <div
                  className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${camada.corFundo}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                    <div>
                      <h3
                        className={`text-sm font-extrabold flex items-center gap-2 ${camada.corCabecalho}`}
                      >
                        {camada.titulo}
                        <Badge variant="outline" className={`text-[10px] py-0 ${camada.corBadge}`}>
                          {camada.badge}
                        </Badge>
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5">{camada.subtitulo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-medium text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                      {itensCamada.length} equipamento(s)
                    </span>

                    {/* Botão de Adicionar Nó nesta Camada */}
                    {modoEdicao && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAdicionarNodeNaCamada(camada.id)}
                        className="text-xs h-7 bg-white hover:bg-slate-50 border-slate-300 text-slate-800 gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Adicionar Nó</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Área dos Nós da Camada */}
                <div className="p-4 sm:p-5">
                  {itensCamada.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-300/80 bg-slate-50/40 p-6 flex flex-col items-center justify-center text-center space-y-2 min-h-[110px]">
                      <span className="text-xs font-semibold text-slate-600">
                        Nenhum nó posicionado nesta camada
                      </span>
                      {modoEdicao && (
                        <Button
                          size="sm"
                          onClick={() => onAdicionarNodeNaCamada(camada.id)}
                          className="text-xs h-7 bg-[#0B2545] text-white hover:bg-[#124E78] gap-1 mt-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar Nó a esta camada</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
                      {itensCamada.map((eq) => {
                        const isSelected = eq.id === equipamentoSelecionadoId
                        const isDragging = eq.id === draggingNodeId

                        return (
                          <div
                            key={eq.id}
                            id={`node-card-${eq.id}`}
                            onMouseDown={(e) => handleMouseDownNode(e, eq)}
                            className={`relative group/node ${
                              modoEdicao ? 'cursor-grab active:cursor-grabbing' : ''
                            } ${isDragging ? 'opacity-70 scale-95' : ''}`}
                            style={{
                              transform: eq.posicaoCanvas
                                ? `translate3d(${eq.posicaoCanvas.x % 40}px, 0px, 0px)`
                                : undefined,
                            }}
                          >
                            <MapaNodeCard
                              equipamento={eq}
                              selecionado={isSelected}
                              onClick={() => onSelectEquipamento(eq)}
                            />

                            {/* Overlay de Ações Rápidas no Modo de Edição */}
                            {modoEdicao && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity z-20">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditarNode(eq)
                                  }}
                                  title="Editar propriedades do nó / Imagem"
                                  className="w-6 h-6 rounded bg-white/95 border border-slate-300 text-slate-700 hover:text-blue-700 hover:border-blue-400 flex items-center justify-center shadow-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onAbrirNovaConexao(eq.id)
                                  }}
                                  title="Conectar a outro nó"
                                  className="w-6 h-6 rounded bg-white/95 border border-slate-300 text-slate-700 hover:text-cyan-700 hover:border-cyan-400 flex items-center justify-center shadow-xs"
                                >
                                  <Cable className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm(`Remover nó "${eq.nome}" do diagrama?`)) {
                                      onRemoverNode(eq.id)
                                    }
                                  }}
                                  title="Remover nó"
                                  className="w-6 h-6 rounded bg-white/95 border border-slate-300 text-slate-700 hover:text-red-700 hover:border-red-400 flex items-center justify-center shadow-xs"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Badge discreto indicando arrasto permitido */}
                            {modoEdicao && (
                              <div className="absolute bottom-1 right-2 opacity-0 group-hover/node:opacity-60 text-[9px] text-slate-400 font-mono pointer-events-none">
                                ⠿ arrastar
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default EditorCanvasDiagram
