import React, { useState } from 'react'
import {
  EquipamentoSimulado,
  TopologiaConexao,
  CamadaConfig,
  CAMADAS_TOPOLOGIA,
  EQUIPAMENTOS_SIMULADOS,
  CONEXOES_SIMULADAS,
  TipoConexao,
} from './topologiaData'
import { MapaNodeCard } from './MapaNodeCard'
import {
  Zap,
  Cable,
  Network,
  Layers,
  ArrowRight,
  ArrowDown,
  Sparkles,
  Info,
  Radio,
  Eye,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface MapaTopologiaDiagramProps {
  onSelectEquipamento: (equipamento: EquipamentoSimulado) => void
  equipamentoSelecionadoId: string | null
  filtroConexao?: 'todos' | 'eletrica' | 'fibra' | 'rede'
  orientacao?: 'horizontal' | 'vertical'
}

export const MapaTopologiaDiagram: React.FC<MapaTopologiaDiagramProps> = ({
  onSelectEquipamento,
  equipamentoSelecionadoId,
  filtroConexao = 'todos',
  orientacao = 'horizontal',
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Encontra conexões relacionadas ao nó com hover
  const conexoesAtivas = React.useMemo(() => {
    return CONEXOES_SIMULADAS.filter((c) => {
      if (filtroConexao !== 'todos' && c.tipo !== filtroConexao) {
        return false
      }
      return true
    })
  }, [filtroConexao])

  // Identifica nós conectados ao nó focado para destaque
  const nósConectadosAoHover = React.useMemo(() => {
    if (!hoveredNodeId && !equipamentoSelecionadoId) return new Set<string>()
    const target = hoveredNodeId || equipamentoSelecionadoId
    const set = new Set<string>()
    if (target) set.add(target)

    CONEXOES_SIMULADAS.forEach((c) => {
      if (c.origemId === target) set.add(c.destinoId)
      if (c.destinoId === target) set.add(c.origemId)
    })
    return set
  }, [hoveredNodeId, equipamentoSelecionadoId])

  // Agrupa os equipamentos por camada
  const equipamentosPorCamada = React.useMemo(() => {
    const mapa: Record<string, EquipamentoSimulado[]> = {}
    CAMADAS_TOPOLOGIA.forEach((camada) => {
      mapa[camada.id] = EQUIPAMENTOS_SIMULADOS.filter((e) => e.camadaId === camada.id)
    })
    return mapa
  }, [])

  return (
    <div className="w-full bg-slate-100/70 rounded-2xl border border-slate-200/90 p-4 sm:p-6 space-y-6 overflow-x-auto shadow-inner">
      {/* Guia visual do fluxo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0B2545]" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Fluxo da Topologia: Entrada de Energia → Sala de Servidores (Core) → Interligação Óptica
            → Setores Finais
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>Interativo • Clique em qualquer equipamento</span>
        </div>
      </div>

      {/* Grid Principal das Camadas */}
      <div className="flex flex-col gap-6">
        {/* Camada 1: ENERGIA ELÉTRICA */}
        <section className="bg-white rounded-2xl border border-amber-200/80 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-white px-4 py-3 border-b border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  1. Camada de Energia e Continuidade
                  <Badge
                    variant="outline"
                    className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] py-0"
                  >
                    Alimentação Primária & Nobreaks
                  </Badge>
                </h3>
                <p className="text-[11px] text-amber-800/80">
                  Fluxo linear: Rede Concessionária → Grupo Gerador → QGBT Geral → Nobreak Central
                  Online
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200">
              4 Equipamentos Elétricos
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
              {equipamentosPorCamada['energia']?.map((eq, idx) => {
                const isSelected = eq.id === equipamentoSelecionadoId
                const isHighlighted = nósConectadosAoHover.has(eq.id)
                const isDimmed =
                  (hoveredNodeId !== null || equipamentoSelecionadoId !== null) &&
                  !nósConectadosAoHover.has(eq.id)

                return (
                  <div key={eq.id} className="relative flex flex-col">
                    <MapaNodeCard
                      equipamento={eq}
                      selecionado={isSelected}
                      onClick={onSelectEquipamento}
                      onHighlightHover={setHoveredNodeId}
                      isDestacado={isHighlighted}
                      isOfuscado={isDimmed}
                    />

                    {/* Seta indicativa de cascata elétrica entre os cartões da camada energia */}
                    {idx < (equipamentosPorCamada['energia']?.length || 0) - 1 && (
                      <div className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-amber-500 text-white items-center justify-center shadow-xs border border-white">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Linha de Transição 1: Da Energia para a Sala de Servidores */}
        <div className="flex items-center justify-center -my-2 relative z-10">
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-blue-700 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-xs border border-white">
            <Zap className="w-3.5 h-3.5" />
            <span>Alimentação Elétrica Ininterrupta (PDU Dupla A+B)</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Camada 2: SALA DE SERVIDORES (CPD) */}
        <section className="bg-white rounded-2xl border border-blue-200/90 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/10 via-blue-50 to-white px-4 py-3 border-b border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B2545] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Layers className="w-4 h-4 text-blue-200" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-blue-950 flex items-center gap-2">
                  2. Camada Sala de Servidores (CPD / Núcleo Central)
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] py-0"
                  >
                    Core & Processamento Central
                  </Badge>
                </h3>
                <p className="text-[11px] text-blue-800/80">
                  Racks 42U, Cluster de Virtualização, Storage SAN, Core Switches 10G, Links de
                  Fibra WAN e Climatização 24/7
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-blue-800 bg-blue-100/60 px-2 py-0.5 rounded border border-blue-200">
              8 Elementos de Núcleo
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {equipamentosPorCamada['sala_servidores']?.map((eq) => {
                const isSelected = eq.id === equipamentoSelecionadoId
                const isHighlighted = nósConectadosAoHover.has(eq.id)
                const isDimmed =
                  (hoveredNodeId !== null || equipamentoSelecionadoId !== null) &&
                  !nósConectadosAoHover.has(eq.id)

                return (
                  <MapaNodeCard
                    key={eq.id}
                    equipamento={eq}
                    selecionado={isSelected}
                    onClick={onSelectEquipamento}
                    onHighlightHover={setHoveredNodeId}
                    isDestacado={isHighlighted}
                    isOfuscado={isDimmed}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {/* Linha de Transição 2: INTERLIGAÇÃO POR FIBRA ÓPTICA DA SALA PARA OS SETORES (Requisito 2) */}
        <div className="rounded-2xl border-2 border-cyan-400 bg-gradient-to-r from-cyan-50 via-white to-cyan-50 p-4 shadow-sm relative">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Cable className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-900">
                    Backbone de Distribuição Estruturada
                  </span>
                  <Badge className="bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5">
                    Fibra Óptica (10 Gbps SFP+)
                  </Badge>
                </div>
                <p className="text-xs text-cyan-800 font-medium mt-0.5">
                  Interligação óptica direta em estrela da Sala de Servidores (Switches de Núcleo)
                  para os Racks Setoriais. Imune a descargas atmosféricas e interferências
                  eletromagnéticas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-900 bg-white px-3 py-1.5 rounded-xl border border-cyan-300 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping inline-block" />
              <span>3 Troncos Ópticos Ativos (Atendimento / Frente / Fundo)</span>
            </div>
          </div>
        </div>

        {/* Camadas dos Setores da Serventia em Colunas Paralelas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SETOR ATENDIMENTO AO PÚBLICO */}
          <section className="bg-white rounded-2xl border border-emerald-200/90 shadow-2xs overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-white px-4 py-3 border-b border-emerald-200/70">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  3. Setor Atendimento ao Público
                </h3>
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                >
                  Fibra → Rack Setorial
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Balcão, Totem de Senhas, Guichês e Impressão Térmica
              </p>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {equipamentosPorCamada['setor_atendimento']?.map((eq) => {
                const isSelected = eq.id === equipamentoSelecionadoId
                const isHighlighted = nósConectadosAoHover.has(eq.id)
                const isDimmed =
                  (hoveredNodeId !== null || equipamentoSelecionadoId !== null) &&
                  !nósConectadosAoHover.has(eq.id)

                return (
                  <MapaNodeCard
                    key={eq.id}
                    equipamento={eq}
                    selecionado={isSelected}
                    onClick={onSelectEquipamento}
                    onHighlightHover={setHoveredNodeId}
                    isDestacado={isHighlighted}
                    isOfuscado={isDimmed}
                  />
                )
              })}
            </div>
          </section>

          {/* SETOR INTERNO FRENTE */}
          <section className="bg-white rounded-2xl border border-indigo-200/90 shadow-2xs overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-500/10 via-indigo-50 to-white px-4 py-3 border-b border-indigo-200/70">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  4. Setor Interno Frente
                </h3>
                <Badge
                  variant="outline"
                  className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px]"
                >
                  Fibra → Rack Setorial
                </Badge>
              </div>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">
                Escrituras, Procurações e Minutas Registrais
              </p>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {equipamentosPorCamada['setor_frente']?.map((eq) => {
                const isSelected = eq.id === equipamentoSelecionadoId
                const isHighlighted = nósConectadosAoHover.has(eq.id)
                const isDimmed =
                  (hoveredNodeId !== null || equipamentoSelecionadoId !== null) &&
                  !nósConectadosAoHover.has(eq.id)

                return (
                  <MapaNodeCard
                    key={eq.id}
                    equipamento={eq}
                    selecionado={isSelected}
                    onClick={onSelectEquipamento}
                    onHighlightHover={setHoveredNodeId}
                    isDestacado={isHighlighted}
                    isOfuscado={isDimmed}
                  />
                )
              })}
            </div>
          </section>

          {/* SETOR INTERNO FUNDO */}
          <section className="bg-white rounded-2xl border border-purple-200/90 shadow-2xs overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-500/10 via-purple-50 to-white px-4 py-3 border-b border-purple-200/70">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-purple-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  5. Setor Interno Fundo
                </h3>
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800 border-purple-300 text-[10px]"
                >
                  Fibra → Rack Setorial
                </Badge>
              </div>
              <p className="text-[11px] text-purple-800/80 mt-0.5">
                Acervo, Digitalização Maciça, Financeiro e Livros
              </p>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {equipamentosPorCamada['setor_fundo']?.map((eq) => {
                const isSelected = eq.id === equipamentoSelecionadoId
                const isHighlighted = nósConectadosAoHover.has(eq.id)
                const isDimmed =
                  (hoveredNodeId !== null || equipamentoSelecionadoId !== null) &&
                  !nósConectadosAoHover.has(eq.id)

                return (
                  <MapaNodeCard
                    key={eq.id}
                    equipamento={eq}
                    selecionado={isSelected}
                    onClick={onSelectEquipamento}
                    onHighlightHover={setHoveredNodeId}
                    isDestacado={isHighlighted}
                    isOfuscado={isDimmed}
                  />
                )
              })}
            </div>
          </section>
        </div>

        {/* Camada 6: DIRETORIA E GABINETE */}
        <section className="bg-white rounded-2xl border border-slate-300 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-slate-200/50 via-slate-100 to-white px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Radio className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  6. Camada Diretoria e Gabinete do Oficial
                  <Badge
                    variant="outline"
                    className="bg-slate-200 text-slate-800 border-slate-300 text-[10px] py-0"
                  >
                    VLAN 50 • Acesso Restrito
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-600">
                  Estações de trabalho do Tabelião/Registrador Titular, Substitutos e Impressão de
                  Alta Segurança
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300">
              Ambiente de Decisão e Gestão
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
              {equipamentosPorCamada['setor_diretoria']?.map((eq) => {
                const isSelected = eq.id === equipamentoSelecionadoId
                const isHighlighted = nósConectadosAoHover.has(eq.id)
                const isDimmed =
                  (hoveredNodeId !== null || equipamentoSelecionadoId !== null) &&
                  !nósConectadosAoHover.has(eq.id)

                return (
                  <MapaNodeCard
                    key={eq.id}
                    equipamento={eq}
                    selecionado={isSelected}
                    onClick={onSelectEquipamento}
                    onHighlightHover={setHoveredNodeId}
                    isDestacado={isHighlighted}
                    isOfuscado={isDimmed}
                  />
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default MapaTopologiaDiagram
