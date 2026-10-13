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
  AlertTriangle,
  PlusCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export interface MapaTopologiaDiagramProps {
  onSelectEquipamento: (equipamento: EquipamentoSimulado) => void
  equipamentoSelecionadoId: string | null
  filtroConexao?: 'todos' | 'eletrica' | 'fibra' | 'rede'
  orientacao?: 'horizontal' | 'vertical'
  equipamentosCustomizados?: EquipamentoSimulado[]
  conexoesCustomizadas?: TopologiaConexao[]
  isModoReal?: boolean
  mapaVazioSemGeracao?: boolean
  onGerarMapa?: () => void
}

export const MapaTopologiaDiagram: React.FC<MapaTopologiaDiagramProps> = ({
  onSelectEquipamento,
  equipamentoSelecionadoId,
  filtroConexao = 'todos',
  orientacao = 'horizontal',
  equipamentosCustomizados,
  conexoesCustomizadas,
  isModoReal = false,
  mapaVazioSemGeracao = false,
  onGerarMapa,
}) => {
  const navigate = useNavigate()
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const listaEquipamentos = equipamentosCustomizados ?? EQUIPAMENTOS_SIMULADOS
  const listaConexoes = conexoesCustomizadas ?? CONEXOES_SIMULADAS

  // Encontra conexões relacionadas ao nó com hover
  const conexoesAtivas = React.useMemo(() => {
    return listaConexoes.filter((c) => {
      if (filtroConexao !== 'todos' && c.tipo !== filtroConexao) {
        return false
      }
      return true
    })
  }, [listaConexoes, filtroConexao])

  // Identifica nós conectados ao nó focado para destaque
  const nósConectadosAoHover = React.useMemo(() => {
    if (!hoveredNodeId && !equipamentoSelecionadoId) return new Set<string>()
    const target = hoveredNodeId || equipamentoSelecionadoId
    const set = new Set<string>()
    if (target) set.add(target)

    listaConexoes.forEach((c) => {
      if (c.origemId === target) set.add(c.destinoId)
      if (c.destinoId === target) set.add(c.origemId)
    })
    return set
  }, [hoveredNodeId, equipamentoSelecionadoId, listaConexoes])

  // Agrupa os equipamentos por camada
  const equipamentosPorCamada = React.useMemo(() => {
    const mapa: Record<string, EquipamentoSimulado[]> = {}
    CAMADAS_TOPOLOGIA.forEach((camada) => {
      mapa[camada.id] = listaEquipamentos.filter((e) => e.camadaId === camada.id)
    })
    return mapa
  }, [listaEquipamentos])

  // Componente de bloco tracejado honesto quando a camada não possui equipamentos cadastrados
  const BlocoCamadaVazia: React.FC<{
    camadaNome: string
    moduloNome: string
    rotaModulo: string
    iconeDica?: string
  }> = ({ camadaNome, moduloNome, rotaModulo }) => (
    <div className="rounded-xl border-2 border-dashed border-slate-300/80 bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center space-y-2 min-h-[140px] hover:border-slate-400 transition-colors">
      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
        <AlertTriangle className="w-4 h-4 text-slate-400" />
      </div>
      <div className="text-xs font-semibold text-slate-700">
        Sem equipamentos cadastrados nesta camada
      </div>
      <p className="text-[11px] text-slate-500 max-w-sm">
        Nenhum ativo ou elemento de <em>{camadaNome}</em> foi registrado no banco desta serventia.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(rotaModulo)}
        className="text-[11px] h-7 border-slate-300 text-slate-700 hover:text-blue-700 hover:border-blue-300 gap-1 mt-1 bg-white"
      >
        <span>Cadastrar no módulo {moduloNome}</span>
        <ExternalLink className="w-3 h-3 text-slate-400" />
      </Button>
    </div>
  )

  // Estado inicial: Mapa em branco aguardando acionamento do gerador real
  if (mapaVazioSemGeracao || listaEquipamentos.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 mx-auto flex items-center justify-center border border-blue-200 shadow-xs">
          <Network className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
        <div className="space-y-1.5 max-w-xl mx-auto">
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 text-[11px] font-bold uppercase tracking-wider"
          >
            Diagrama em Branco • Sem Dados Fictícios
          </Badge>
          <h3 className="text-lg font-bold text-slate-900">
            Nenhum diagrama fictício gerado previamente
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Conforme a diretriz de conformidade, a ferramenta não desenha topologias artificiais.
            Clique abaixo para que o motor consulte o inventário, os registros de infraestrutura
            física e as evidências fotográficas da serventia logada e monte o diagrama real.
          </p>
        </div>

        {onGerarMapa && (
          <div className="pt-2">
            <Button
              size="default"
              onClick={onGerarMapa}
              className="bg-gradient-to-r from-blue-700 via-indigo-700 to-[#0B2545] hover:opacity-95 text-white text-xs sm:text-sm font-semibold shadow-md gap-2 px-6"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Gerar mapa a partir dos dados da serventia</span>
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200/80 max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div
            onClick={() => navigate('/inventario')}
            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <div className="text-[11px] font-bold text-slate-800">1. Inventário GLPI</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Servidores, switches, PCs</div>
          </div>
          <div
            onClick={() => navigate('/infraestrutura')}
            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <div className="text-[11px] font-bold text-slate-800">2. Infraestrutura</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Nobreaks, gerador, links</div>
          </div>
          <div
            onClick={() => navigate('/evidencias')}
            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <div className="text-[11px] font-bold text-slate-800">3. Evidências</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Fotos e comprovações</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-slate-100/70 rounded-2xl border border-slate-200/90 p-4 sm:p-6 space-y-6 overflow-x-auto shadow-inner">
      {/* Guia visual do fluxo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0B2545]" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Topologia Real: Energia → CPD / Core → Interligação Óptica → Setores da Serventia
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px]"
          >
            Topologia montada com registros reais da serventia
          </Badge>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
          <span>Interativo • Clique em qualquer nó para detalhes</span>
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
                  Entrada da concessionária, laudo de aterramento, motogerador e nobreaks
                  cadastrados
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200">
              {equipamentosPorCamada['energia']?.length || 0} Equipamentos Cadastrados
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {!equipamentosPorCamada['energia'] || equipamentosPorCamada['energia'].length === 0 ? (
              <BlocoCamadaVazia
                camadaNome="Energia Elétrica (Nobreaks / Gerador / Aterramento)"
                moduloNome="Infraestrutura Física → Energia"
                rotaModulo="/infraestrutura"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
                {equipamentosPorCamada['energia'].map((eq, idx) => {
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

                      {idx < (equipamentosPorCamada['energia']?.length || 0) - 1 && (
                        <div className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-amber-500 text-white items-center justify-center shadow-xs border border-white">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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
                  Racks, Servidores Físicos/Hosts, Storages, Switches de Núcleo, Conectividade
                  Externa, Climatização e Acesso
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-blue-800 bg-blue-100/60 px-2 py-0.5 rounded border border-blue-200">
              {equipamentosPorCamada['sala_servidores']?.length || 0} Elementos Registrados
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {!equipamentosPorCamada['sala_servidores'] ||
            equipamentosPorCamada['sala_servidores'].length === 0 ? (
              <BlocoCamadaVazia
                camadaNome="Sala de Servidores (Servidores / Storages / Switches / Racks)"
                moduloNome="Inventário de Ativos & Infraestrutura"
                rotaModulo="/inventario"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {equipamentosPorCamada['sala_servidores'].map((eq) => {
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
            )}
          </div>
        </section>

        {/* Linha de Transição 2: INTERLIGAÇÃO POR FIBRA ÓPTICA DA SALA PARA OS SETORES */}
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
                    Fibra Óptica / Rede Lógica
                  </Badge>
                </div>
                <p className="text-xs text-cyan-800 font-medium mt-0.5">
                  Interligação óptica da Sala de Servidores aos Racks e Setores Operacionais da
                  serventia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-900 bg-white px-3 py-1.5 rounded-xl border border-cyan-300 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping inline-block" />
              <span>Distribuição aos Setores da Serventia</span>
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
                  {equipamentosPorCamada['setor_atendimento']?.length || 0} nós
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Balcão, Guichês, Totem e Impressão Documental
              </p>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {!equipamentosPorCamada['setor_atendimento'] ||
              equipamentosPorCamada['setor_atendimento'].length === 0 ? (
                <BlocoCamadaVazia
                  camadaNome="Atendimento ao Público"
                  moduloNome="Inventário de Ativos"
                  rotaModulo="/inventario"
                />
              ) : (
                equipamentosPorCamada['setor_atendimento'].map((eq) => {
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
                })
              )}
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
                  {equipamentosPorCamada['setor_frente']?.length || 0} nós
                </Badge>
              </div>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">
                Escrituras, Procurações e Minutas Registrais
              </p>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {!equipamentosPorCamada['setor_frente'] ||
              equipamentosPorCamada['setor_frente'].length === 0 ? (
                <BlocoCamadaVazia
                  camadaNome="Setor Interno Frente"
                  moduloNome="Inventário de Ativos"
                  rotaModulo="/inventario"
                />
              ) : (
                equipamentosPorCamada['setor_frente'].map((eq) => {
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
                })
              )}
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
                  {equipamentosPorCamada['setor_fundo']?.length || 0} nós
                </Badge>
              </div>
              <p className="text-[11px] text-purple-800/80 mt-0.5">
                Acervo, Digitalização, Financeiro e Livros
              </p>
            </div>

            <div className="p-4 space-y-3 flex-1">
              {!equipamentosPorCamada['setor_fundo'] ||
              equipamentosPorCamada['setor_fundo'].length === 0 ? (
                <BlocoCamadaVazia
                  camadaNome="Setor Interno Fundo"
                  moduloNome="Inventário de Ativos"
                  rotaModulo="/inventario"
                />
              ) : (
                equipamentosPorCamada['setor_fundo'].map((eq) => {
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
                })
              )}
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
                    VLAN • Acesso Restrito
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-600">
                  Estações de trabalho do Oficial Titular, Substitutos e Impressão de Segurança
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300">
              {equipamentosPorCamada['setor_diretoria']?.length || 0} Estações Registradas
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {!equipamentosPorCamada['setor_diretoria'] ||
            equipamentosPorCamada['setor_diretoria'].length === 0 ? (
              <BlocoCamadaVazia
                camadaNome="Gabinete / Diretoria"
                moduloNome="Inventário de Ativos"
                rotaModulo="/inventario"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                {equipamentosPorCamada['setor_diretoria'].map((eq) => {
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
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default MapaTopologiaDiagram
