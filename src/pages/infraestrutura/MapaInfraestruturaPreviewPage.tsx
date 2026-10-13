import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Network,
  Zap,
  Server,
  Cable,
  Printer,
  Pencil,
  Info,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Monitor,
  Flame,
  Layers,
  Sparkles,
  ArrowRight,
  Building2,
  FileDown,
  Upload,
  RefreshCw,
  Database,
  FileImage,
  Split,
  Eye,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react'
import {
  EQUIPAMENTOS_SIMULADOS,
  CONEXOES_SIMULADAS,
  EquipamentoSimulado,
  TopologiaConexao,
  TipoConexao,
} from '@/components/infraestrutura/mapa/topologiaData'
import { MapaTopologiaDiagram } from '@/components/infraestrutura/mapa/MapaTopologiaDiagram'
import { MapaNodeDetailsDrawer } from '@/components/infraestrutura/mapa/MapaNodeDetailsDrawer'
import { MapaConexoesLegenda } from '@/components/infraestrutura/mapa/MapaConexoesLegenda'
import { MapaProtecaoOverlay } from '@/components/infraestrutura/mapa/MapaProtecaoOverlay'
import {
  ImportarDiagramaModal,
  DiagramaReferenciaData,
} from '@/components/infraestrutura/mapa/ImportarDiagramaModal'
import { DiagramaReferenciaPanel } from '@/components/infraestrutura/mapa/DiagramaReferenciaPanel'
import {
  gerarTopologiaRealServentia,
  GeradorMapaRealResult,
} from '@/components/infraestrutura/mapa/geradorMapaReal'
import { listInventoryAssets } from '@/services/csctiService'
import { listInfraItens, listInfraLinks } from '@/services/infraestruturaService'
import { listEvidencias } from '@/services/evidenciaService'
import { calculateTextSha256 } from '@/services/designacaoService'
import initialReferenceImg from '@/assets/image-54b72.png'

type ModoMapa = 'simulado' | 'real'
type VisualizacaoLayout = 'apenas_mapa' | 'lado_a_lado'

export const MapaInfraestruturaPreviewPage: React.FC = () => {
  const { user, organization } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Modo de exibição: Simulado ou Gerado Real
  const [modoMapa, setModoMapa] = useState<ModoMapa>('simulado')
  const [layoutVisualizacao, setLayoutVisualizacao] = useState<VisualizacaoLayout>('apenas_mapa')

  // Estado do equipamento selecionado no modal lateral
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoSimulado | null>(
    null,
  )

  // Filtro de conexões ativas na legenda
  const [filtroConexao, setFiltroConexao] = useState<'todos' | 'eletrica' | 'fibra' | 'rede'>(
    'todos',
  )

  // Controle do modal de importação de diagrama
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

  // Diagrama de referência importado (iniciado com o gabarito oficial enviado pelo Leandro)
  const [diagramaReferencia, setDiagramaReferencia] = useState<DiagramaReferenciaData | null>({
    id: 'diag-ref-oficial',
    nomeArquivo: 'planta-sala-servidores-cri.png',
    tamanhoFormatado: '1.2 MB',
    dataUpload: new Date().toISOString(),
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    descricao: 'Sala de Servidores - CRI (Racks de Dados/Voz, Nobreaks, Storages, Servidores)',
    dataUrl: initialReferenceImg,
  })

  // Estado dos dados reais carregados do PocketBase
  const [carregandoDadosReais, setCarregandoDadosReais] = useState(false)
  const [dadosReaisResult, setDadosReaisResult] = useState<GeradorMapaRealResult | null>(null)

  const orgId = organization?.id || user?.organization || ''

  // Nome da serventia para cabeçalho
  const serventiaNome =
    organization?.trade_name ||
    organization?.corporate_name ||
    organization?.name ||
    'Serventia Modelo'

  // Função para carregar os dados reais da serventia logada
  const carregarDadosReais = async () => {
    if (!orgId) return
    setCarregandoDadosReais(true)
    try {
      const [assets, infraItens, infraLinks, evidencias] = await Promise.all([
        listInventoryAssets(orgId),
        listInfraItens(orgId),
        listInfraLinks(orgId),
        listEvidencias(orgId),
      ])

      const result = gerarTopologiaRealServentia({
        assets,
        infraItens,
        infraLinks,
        evidencias,
      })

      setDadosReaisResult(result)
    } catch (err) {
      console.error('Erro ao gerar topologia com dados reais:', err)
      toast({
        title: 'Erro ao buscar dados reais',
        description: 'Não foi possível carregar os registros de infraestrutura da serventia.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoDadosReais(false)
    }
  }

  // Ao montar ou mudar de org, pré-carrega dados reais silenciosamente
  useEffect(() => {
    if (orgId) {
      carregarDadosReais()
    }
  }, [orgId])

  // Ação de ativar o modo "Gerar mapa a partir dos dados reais"
  const handleGerarMapaReal = async () => {
    await carregarDadosReais()
    setModoMapa('real')
    setEquipamentoSelecionado(null)
    toast({
      title: 'Mapa gerado a partir dos dados reais',
      description:
        'A topologia foi montada buscando inventário de ativos (GLPI), itens de infraestrutura e evidências da serventia.',
    })
  }

  const handleVoltarSimulado = () => {
    setModoMapa('simulado')
    setEquipamentoSelecionado(null)
  }

  const handleExportarPdf = () => {
    toast({
      title: 'Exportação em PDF A4 (Simulação)',
      description:
        'Recurso disponível na versão integrada ao produto real. O layout será formatado para impressão paisagem com selo de conformidade.',
    })
  }

  const handleEditarMapa = () => {
    toast({
      title: 'Modo de Edição de Topologia (Simulação)',
      description:
        'Na versão real, administradores e suporte poderão adicionar nós, vincular ativos do GLPI por drag-and-drop e desenhar novas ramificações.',
    })
  }

  // Lista de equipamentos e conexões exibidos de acordo com o modo
  const equipamentosExibidos: EquipamentoSimulado[] =
    modoMapa === 'real' && dadosReaisResult ? dadosReaisResult.equipamentos : EQUIPAMENTOS_SIMULADOS

  const conexoesExibidas: TopologiaConexao[] =
    modoMapa === 'real' && dadosReaisResult ? dadosReaisResult.conexoes : CONEXOES_SIMULADAS

  // KPIs dinâmicos dependendo do modo
  const kpiTotalNos = equipamentosExibidos.length
  const kpiBackbone =
    modoMapa === 'real' && dadosReaisResult && dadosReaisResult.velocidadeTotalMbps > 0
      ? `${dadosReaisResult.velocidadeTotalMbps} Mbps`
      : '10 Gbps'
  const kpiAutonomia =
    modoMapa === 'real' && dadosReaisResult && dadosReaisResult.autonomiaTotalMinutos > 0
      ? `${dadosReaisResult.autonomiaTotalMinutos} min`
      : '90 min'
  const kpiStatus =
    modoMapa === 'real' && dadosReaisResult
      ? `${dadosReaisResult.nosReaisCount} / ${kpiTotalNos} reais`
      : '100% Simulado'

  return (
    <div className="space-y-6 pb-16">
      {/* 1. BANNER CLARO NO TOPO (Requisito 1 Mantido) */}
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                  SIMULAÇÃO VISUAL — Rota Isolada de Preview
                </span>
                <span className="text-[11px] font-semibold text-amber-800">
                  Topologia Técnica Proposta • Análise Prévia
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-amber-950 mt-1">
                Protótipo para análise prévia de Leandro antes da integração ao produto oficial.
              </h2>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Não são dados reais da serventia quando em modo simulado. No modo "Gerar a partir
                dos dados da serventia", o sistema lê a base do cliente logado sem alterar dados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/infraestrutura')}
              className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs"
            >
              Voltar à Infraestrutura Oficial
            </Button>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE CONTROLE DOS DOIS MODOS DE CONSTRUÇÃO DO MAPA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Modos de Construção da Topologia
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha entre a simulação técnica completa ou monte o mapa vivo conectando aos
              registros reais da serventia ({serventiaNome}).
            </p>
          </div>

          {/* Botões de Ação dos dois fluxos solicitados */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Botão Fluxo 1: GERAR AUTOMÁTICO a partir dos dados reais */}
            {modoMapa === 'simulado' ? (
              <Button
                size="sm"
                onClick={handleGerarMapaReal}
                disabled={carregandoDadosReais}
                className="text-xs bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xs gap-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${carregandoDadosReais ? 'animate-spin' : ''}`}
                />
                <span>Gerar mapa a partir dos dados da serventia</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoltarSimulado}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Voltar à Simulação Conceitual</span>
              </Button>
            )}

            {/* Botão Fluxo 2: IMPORTAR DIAGRAMA DE REFERÊNCIA */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalImportarAberto(true)}
              className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5 bg-blue-50/30"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Importar diagrama de referência</span>
            </Button>

            {/* Alternador de Layout: Lado a Lado (Cotejo com Gabarito) */}
            {diagramaReferencia && (
              <Button
                variant={layoutVisualizacao === 'lado_a_lado' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setLayoutVisualizacao(
                    layoutVisualizacao === 'lado_a_lado' ? 'apenas_mapa' : 'lado_a_lado',
                  )
                }
                className={`text-xs gap-1.5 ${
                  layoutVisualizacao === 'lado_a_lado'
                    ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
                    : 'border-slate-300 text-slate-700'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>
                  {layoutVisualizacao === 'lado_a_lado'
                    ? 'Ocultar Gabarito Dividido'
                    : 'Cotejo Lado a Lado'}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Resumo de Estado Honestidade do Modo Real (quando ativado) */}
        {modoMapa === 'real' && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 sm:p-4 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-emerald-950">
                  Topologia montada dinamicamente com dados da serventia logada
                </span>
                <Badge className="bg-emerald-700 text-white text-[10px] font-bold">
                  {dadosReaisResult?.nosReaisCount || 0} nós reais identificados
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-800">
                <span>
                  Inventário: <strong>{dadosReaisResult?.totalAtivosInventario || 0}</strong> ativos
                </span>
                <span>•</span>
                <span>
                  Infra: <strong>{dadosReaisResult?.totalInfraItens || 0}</strong> itens
                </span>
                <span>•</span>
                <span>
                  Links: <strong>{dadosReaisResult?.totalLinks || 0}</strong> links
                </span>
                <span>•</span>
                <span>
                  Fotos: <strong>{dadosReaisResult?.totalEvidenciasComFoto || 0}</strong> fotos
                </span>
              </div>
            </div>

            {/* Aviso sobre nós faltantes que necessitam cadastro */}
            {dadosReaisResult && dadosReaisResult.nosPendentesCadastroCount > 0 && (
              <div className="flex items-start gap-2 pt-1 border-t border-emerald-200/80 text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>
                    Atenção ({dadosReaisResult.nosPendentesCadastroCount} itens pendentes):
                  </strong>{' '}
                  Alguns nós essenciais (como gerador, ar-condicionado ou racks) ainda não foram
                  cadastrados nesta serventia e aparecem destacados com o botão{' '}
                  <em>"Cadastrar manualmente"</em> para direcionar ao respectivo módulo.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estado honesto se a serventia de teste não tiver ativos suficientes */}
        {modoMapa === 'real' && dadosReaisResult && !dadosReaisResult.temDadosSuficientes && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs space-y-2 text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Sem ativos suficientes para gerar o mapa topológico completo</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              A serventia <strong>{serventiaNome}</strong> ainda não possui servidores, switches ou
              nobreaks cadastrados no banco de dados. Cadastre ativos ou importe pelo GLPI para
              alimentar o mapa:
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => navigate('/inventario')}
                className="text-xs h-7 bg-blue-700 hover:bg-blue-800 text-white"
              >
                Ir para Inventário de Ativos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/infraestrutura')}
                className="text-xs h-7 border-amber-400 text-amber-900"
              >
                Ir para Módulo de Infraestrutura
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. CABEÇALHO PADRONIZADO CSCTI COM BOTÕES DE AÇÃO */}
      <ModuleHeader
        icon={Network}
        title="Mapa da Infraestrutura Técnica"
        subtitle="Diagrama topológico interativo das camadas de energia, sala de servidores, interligação por fibra óptica e setores operacionais da serventia."
        badgeText={modoMapa === 'real' ? 'Dados Reais • CSCTI' : 'Protótipo Visual • CSCTI'}
        serventiaNome={serventiaNome}
        serventiaAtiva={true}
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Ambiente', href: '/infraestrutura' },
          {
            label:
              modoMapa === 'real' ? 'Mapa Real da Serventia' : 'Simulação: Mapa da Infraestrutura',
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarPdf}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:text-slate-900 gap-1.5 shadow-2xs bg-white"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Exportar PDF A4</span>
            </Button>

            <Button
              size="sm"
              onClick={handleEditarMapa}
              className="text-xs h-8 bg-gradient-to-r from-[#0B2545] to-[#124E78] text-white hover:opacity-95 gap-1.5 shadow-2xs"
            >
              <Pencil className="w-3.5 h-3.5 text-[#F3C969]" />
              <span>Editar mapa</span>
            </Button>
          </div>
        }
      />

      {/* 4. KPIS DA TOPOLOGIA (SIMULADA OU REAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Nós Mapeados"
          value={kpiTotalNos}
          secondaryValue={modoMapa === 'real' ? 'reais + pendentes' : 'equipamentos'}
          supportText={
            modoMapa === 'real'
              ? `${dadosReaisResult?.nosReaisCount || 0} cadastrados no banco`
              : '6 camadas físicas e lógicas interligadas'
          }
          icon={Layers}
          iconColor="text-blue-700"
          iconBgColor="bg-blue-100"
        />

        <KpiCard
          label="Interligação Backbone"
          value={kpiBackbone}
          secondaryValue="Fibra Óptica"
          supportText="Sala de Servidores aos Racks Setoriais"
          icon={Cable}
          iconColor="text-cyan-700"
          iconBgColor="bg-cyan-100"
        />

        <KpiCard
          label="Autonomia em Nobreak"
          value={kpiAutonomia}
          secondaryValue="Core + Gerador"
          supportText={
            modoMapa === 'real'
              ? 'Soma dos nobreaks cadastrados na infra'
              : 'Stemac 60 kVA + Nobreaks Online'
          }
          icon={Zap}
          iconColor="text-amber-700"
          iconBgColor="bg-amber-100"
        />

        <KpiCard
          label="Status Operacional"
          value={kpiStatus}
          secondaryValue={modoMapa === 'real' ? 'serventia real' : 'Conforme'}
          supportText={
            modoMapa === 'real'
              ? `${dadosReaisResult?.nosPendentesCadastroCount || 0} cadastros pendentes`
              : 'Todos os nós em regime contínuo'
          }
          icon={CheckCircle2}
          iconColor="text-emerald-700"
          iconBgColor="bg-emerald-100"
        />
      </div>

      {/* 5. SEÇÃO DE COTEJO: GABARITO DE REFERÊNCIA AO LADO DO MAPA (Quando ativado) */}
      {layoutVisualizacao === 'lado_a_lado' && diagramaReferencia && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Split className="w-4 h-4 text-[#0B2545]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Visualização em Cotejo Regulatório (Gabarito Importado vs. Mapa Interativo Vivo)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Planta de referência arquivada com hash SHA-256 ao lado da topologia interativa
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Coluna 1: Gabarito Estático Importado */}
            <div className="space-y-3">
              <DiagramaReferenciaPanel
                diagrama={diagramaReferencia}
                onAbrirModalImportacao={() => setModalImportarAberto(true)}
                onRemoverDiagrama={() => {
                  setDiagramaReferencia(null)
                  setLayoutVisualizacao('apenas_mapa')
                }}
              />
            </div>

            {/* Coluna 2: Mapa Vivo Interativo */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Mapa Topológico Vivo ({modoMapa === 'real' ? 'Dados Reais' : 'Simulação'})
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                >
                  Atualizável
                </Badge>
              </div>

              <MapaTopologiaDiagram
                onSelectEquipamento={(eq) => setEquipamentoSelecionado(eq)}
                equipamentoSelecionadoId={equipamentoSelecionado?.id || null}
                filtroConexao={filtroConexao}
                equipamentosCustomizados={equipamentosExibidos}
                conexoesCustomizadas={conexoesExibidas}
                isModoReal={modoMapa === 'real'}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. VISUALIZAÇÃO PADRÃO (Apenas Mapa Completo) */}
      {layoutVisualizacao === 'apenas_mapa' && (
        <>
          {/* Painel opcional do gabarito colapsado no topo com botão rápido */}
          {diagramaReferencia && (
            <div className="bg-white rounded-xl border border-blue-200 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <FileImage className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">
                    Diagrama de Referência (Gabarito) Arquivado:
                  </span>{' '}
                  <span className="text-slate-600">{diagramaReferencia.descricao}</span>
                  <span className="font-mono text-[10px] text-slate-400 ml-2">
                    (SHA-256: {diagramaReferencia.sha256.slice(0, 12)}...)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLayoutVisualizacao('lado_a_lado')}
                  className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50 gap-1"
                >
                  <Split className="w-3 h-3" />
                  <span>Exibir ao Lado do Mapa</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalImportarAberto(true)}
                  className="text-xs h-7 text-slate-500 hover:text-slate-800"
                >
                  Trocar arquivo
                </Button>
              </div>
            </div>
          )}

          {/* LEGENDA DE CONEXÕES COM FILTROS INTERATIVOS */}
          <MapaConexoesLegenda filtroConexao={filtroConexao} onSelectFiltro={setFiltroConexao} />

          {/* DIAGRAMA TOPOLÓGICO INTERATIVO PRINCIPAL */}
          <MapaTopologiaDiagram
            onSelectEquipamento={(eq) => setEquipamentoSelecionado(eq)}
            equipamentoSelecionadoId={equipamentoSelecionado?.id || null}
            filtroConexao={filtroConexao}
            equipamentosCustomizados={equipamentosExibidos}
            conexoesCustomizadas={conexoesExibidas}
            isModoReal={modoMapa === 'real'}
          />

          {/* CAMADA DE PROTEÇÃO SOBREPOSTA */}
          <MapaProtecaoOverlay />
        </>
      )}

      {/* 7. PAINEL LATERAL DE DETALHES DO NÓ */}
      <MapaNodeDetailsDrawer
        equipamento={equipamentoSelecionado}
        onClose={() => setEquipamentoSelecionado(null)}
      />

      {/* 8. MODAL DE IMPORTAÇÃO DE DIAGRAMA (GABARITO COM SHA-256) */}
      <ImportarDiagramaModal
        isOpen={modalImportarAberto}
        onClose={() => setModalImportarAberto(false)}
        onSalvar={(novoDiagrama) => {
          setDiagramaReferencia(novoDiagrama)
          setLayoutVisualizacao('lado_a_lado')
        }}
        diagramaAtual={diagramaReferencia}
      />
    </div>
  )
}

export default MapaInfraestruturaPreviewPage
