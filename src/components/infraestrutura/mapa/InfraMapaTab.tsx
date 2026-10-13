import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { KpiCard } from '@/components/common/KpiCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Layers,
  Cable,
  Zap,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Upload,
  Split,
  FileDown,
  Printer,
  FileImage,
  AlertTriangle,
  Save,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react'
import {
  EquipamentoSimulado,
  TopologiaConexao,
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
import {
  listInfraItens,
  listInfraLinks,
  getInfraMapaServentia,
  saveInfraMapaServentia,
  InfraMapaRecord,
} from '@/services/infraestruturaService'
import { listEvidencias } from '@/services/evidenciaService'
import { calculateTextSha256 } from '@/services/designacaoService'
import initialReferenceImg from '@/assets/image-54b72.png'
import { formatSpDateTime } from '@/pages/backup/relatorioData'

type ModoMapa = 'em_branco' | 'real'
type VisualizacaoLayout = 'apenas_mapa' | 'lado_a_lado'

export interface InfraMapaTabProps {
  orgId: string
  serventiaNome: string
  canEdit: boolean
}

export const InfraMapaTab: React.FC<InfraMapaTabProps> = ({ orgId, serventiaNome, canEdit }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Modo de exibição: Inicia em branco ou Real conforme salvo no banco
  const [modoMapa, setModoMapa] = useState<ModoMapa>('em_branco')
  const [layoutVisualizacao, setLayoutVisualizacao] = useState<VisualizacaoLayout>('apenas_mapa')
  const [mapaSalvo, setMapaSalvo] = useState<InfraMapaRecord | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [carregandoInicial, setCarregandoInicial] = useState(true)

  // Equipamento selecionado no drawer lateral
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoSimulado | null>(
    null,
  )

  // Filtro de conexões
  const [filtroConexao, setFiltroConexao] = useState<'todos' | 'eletrica' | 'fibra' | 'rede'>(
    'todos',
  )

  // Modal de importação de gabarito
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

  // Diagrama de referência importado
  const [diagramaReferencia, setDiagramaReferencia] = useState<DiagramaReferenciaData | null>({
    id: 'diag-ref-oficial',
    nomeArquivo: 'planta-sala-servidores-cri.png',
    tamanhoFormatado: '1.2 MB',
    dataUpload: new Date().toISOString(),
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    descricao: 'Sala de Servidores - CRI (Racks de Dados/Voz, Nobreaks, Storages, Servidores)',
    dataUrl: initialReferenceImg,
  })

  // Estado dos dados gerados a partir do banco
  const [carregandoDadosReais, setCarregandoDadosReais] = useState(false)
  const [dadosReaisResult, setDadosReaisResult] = useState<GeradorMapaRealResult | null>(null)

  // Função para carregar dados reais e gerar topologia
  const gerarTopologiaDoBanco = useCallback(async (): Promise<GeradorMapaRealResult | null> => {
    if (!orgId) return null
    try {
      const [assets, infraItens, infraLinks, evidencias] = await Promise.all([
        listInventoryAssets(orgId).catch(() => []),
        listInfraItens(orgId).catch(() => []),
        listInfraLinks(orgId).catch(() => []),
        listEvidencias(orgId).catch(() => []),
      ])

      const result = gerarTopologiaRealServentia({
        assets,
        infraItens,
        infraLinks,
        evidencias,
      })

      setDadosReaisResult(result)
      return result
    } catch (err) {
      console.error('[InfraMapaTab] Erro ao gerar topologia:', err)
      return null
    }
  }, [orgId])

  // Carrega o mapa persistido no PocketBase
  useEffect(() => {
    if (!orgId) return
    let active = true

    async function carregarEstadoSalvo() {
      setCarregandoInicial(true)
      try {
        const mapa = await getInfraMapaServentia(orgId)
        if (!active) return

        if (mapa) {
          setMapaSalvo(mapa)
          if (mapa.status === 'gerado' || mapa.status === 'revisado') {
            setModoMapa('real')
            // Se houver snapshot persistido, ou regenera para pegar updates
            if (
              mapa.equipamentos_snapshot &&
              Array.isArray(mapa.equipamentos_snapshot) &&
              mapa.equipamentos_snapshot.length > 0
            ) {
              setDadosReaisResult({
                equipamentos: mapa.equipamentos_snapshot,
                conexoes: mapa.conexoes_snapshot || [],
                totalAtivosInventario: mapa.equipamentos_snapshot.filter(
                  (e: any) => e.assetOrigemId,
                ).length,
                totalInfraItens: mapa.equipamentos_snapshot.filter((e: any) => e.infraOrigemId)
                  .length,
                totalLinks: (mapa.conexoes_snapshot || []).filter((c: any) => c.tipo === 'fibra')
                  .length,
                totalEvidenciasComFoto: mapa.equipamentos_snapshot.filter(
                  (e: any) => e.evidenciaFotoSimulada,
                ).length,
                nosReaisCount: mapa.nos_reais_count || mapa.equipamentos_snapshot.length,
                autonomiaTotalMinutos: mapa.autonomia_minutos || 0,
                velocidadeTotalMbps: mapa.velocidade_mbps || 0,
                temDadosSuficientes: true,
                resumoPorCamada: mapa.resumo_camadas || {},
              })
            } else {
              await gerarTopologiaDoBanco()
            }

            if (mapa.diagrama_referencia_snapshot) {
              setDiagramaReferencia(mapa.diagrama_referencia_snapshot)
            }
          } else {
            setModoMapa('em_branco')
          }
        } else {
          setModoMapa('em_branco')
        }
      } catch (err) {
        console.error('[InfraMapaTab] Erro ao carregar mapa salvo:', err)
      } finally {
        if (active) setCarregandoInicial(false)
      }
    }

    carregarEstadoSalvo()

    return () => {
      active = false
    }
  }, [orgId, gerarTopologiaDoBanco])

  // Ação de Gerar/Regenerar o Mapa Real e persistir automaticamente no PocketBase
  const handleGerarMapaReal = async () => {
    if (!canEdit) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas Administradores e Suporte podem gerar o mapa.',
        variant: 'destructive',
      })
      return
    }

    setCarregandoDadosReais(true)
    try {
      const result = await gerarTopologiaDoBanco()
      if (!result) throw new Error('Falha na geração da topologia')

      setModoMapa('real')
      setEquipamentoSelecionado(null)

      // Calcula hash de integridade SHA-256 do snapshot do mapa
      const payloadStr = JSON.stringify({
        orgId,
        equipamentos: result.equipamentos.map((e) => ({
          id: e.id,
          nome: e.nome,
          codigo: e.codigoAtivo,
          camada: e.camadaId,
          status: e.status,
        })),
        conexoes: result.conexoes,
        geradoEm: new Date().toISOString(),
      })
      const hash = await calculateTextSha256(payloadStr)

      // Persistir no banco de dados
      const salvo = await saveInfraMapaServentia(orgId, {
        status: 'gerado',
        hash_sha256: hash,
        total_nos: result.equipamentos.length,
        total_conexoes: result.conexoes.length,
        nos_reais_count: result.nosReaisCount,
        autonomia_minutos: result.autonomiaTotalMinutos,
        velocidade_mbps: result.velocidadeTotalMbps,
        equipamentos_snapshot: result.equipamentos,
        conexoes_snapshot: result.conexoes,
        resumo_camadas: result.resumoPorCamada,
        diagrama_referencia_snapshot: diagramaReferencia,
        gerado_por_nome: user?.name || user?.email || 'Usuário CSCTI',
        gerado_por_email: user?.email || '',
        observacoes: `Topologia montada dinamicamente a partir dos registros do banco em ${new Date().toLocaleString('pt-BR')}.`,
      })

      setMapaSalvo(salvo)

      toast({
        title: 'Mapa da Infraestrutura Gerado e Salvo',
        description: `${result.nosReaisCount} nós reais identificados e registrados com hash SHA-256 no banco da serventia.`,
      })
    } catch (err) {
      console.error('[InfraMapaTab] Erro ao gerar e salvar mapa:', err)
      toast({
        title: 'Erro ao gerar mapa',
        description: 'Não foi possível compor o mapa a partir dos registros.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoDadosReais(false)
    }
  }

  // Ação de Limpar e Deixar em Branco
  const handleLimparEmBranco = async () => {
    if (!canEdit) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas Administradores e Suporte podem alterar o mapa.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const salvo = await saveInfraMapaServentia(orgId, {
        status: 'em_branco',
        hash_sha256: '',
        total_nos: 0,
        total_conexoes: 0,
        nos_reais_count: 0,
        autonomia_minutos: 0,
        velocidade_mbps: 0,
        equipamentos_snapshot: [],
        conexoes_snapshot: [],
        resumo_camadas: {},
        diagrama_referencia_snapshot: diagramaReferencia,
        gerado_por_nome: user?.name || user?.email || 'Usuário CSCTI',
        gerado_por_email: user?.email || '',
        observacoes: 'Mapa redefinido para em branco.',
      })

      setMapaSalvo(salvo)
      setModoMapa('em_branco')
      setEquipamentoSelecionado(null)
      setDadosReaisResult(null)

      toast({
        title: 'Mapa Redefinido',
        description: 'O mapa da infraestrutura agora está em branco e aguarda nova geração.',
      })
    } catch (err) {
      console.error('[InfraMapaTab] Erro ao limpar mapa:', err)
      toast({
        title: 'Erro ao redefinir mapa',
        description: 'Não foi possível atualizar o registro do mapa.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Equipamentos e conexões para exibição
  const equipamentosExibidos: EquipamentoSimulado[] =
    modoMapa === 'real' && dadosReaisResult ? dadosReaisResult.equipamentos : []

  const conexoesExibidas: TopologiaConexao[] =
    modoMapa === 'real' && dadosReaisResult ? dadosReaisResult.conexoes : []

  // KPIs
  const kpiTotalNos = equipamentosExibidos.length
  const kpiBackbone =
    modoMapa === 'real' && dadosReaisResult && dadosReaisResult.velocidadeTotalMbps > 0
      ? `${dadosReaisResult.velocidadeTotalMbps} Mbps`
      : modoMapa === 'real'
        ? 'Sem links'
        : '0 Mbps'

  const kpiAutonomia =
    modoMapa === 'real' && dadosReaisResult && dadosReaisResult.autonomiaTotalMinutos > 0
      ? `${dadosReaisResult.autonomiaTotalMinutos} min`
      : modoMapa === 'real'
        ? 'Sem nobreak'
        : '0 min'

  const kpiStatus =
    modoMapa === 'real' && dadosReaisResult
      ? `${dadosReaisResult.nosReaisCount} nós ativos`
      : 'Em Branco'

  return (
    <div className="space-y-6">
      {/* 1. BARRA SUPERIOR DE CONTROLE E AÇÕES DO MAPA OFICIAL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  modoMapa === 'real' ? 'bg-emerald-600' : 'bg-slate-400'
                } animate-pulse`}
              />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Topologia da Infraestrutura Técnica
              </h3>
              {mapaSalvo?.versao && modoMapa === 'real' && (
                <Badge variant="outline" className="text-[10px] font-mono border-slate-300">
                  v{mapaSalvo.versao}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Topologia viva montada exclusivamente a partir dos ativos do inventário,
              infraestrutura física, conectividade e evidências da serventia ({serventiaNome}).
            </p>
          </div>

          {/* Botões de Ação do Mapa */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Relatório A4 Oficial do Mapa */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/relatorios/mapa-infraestrutura')}
              className="text-xs border-slate-300 text-slate-700 hover:text-slate-900 gap-1.5 shadow-2xs bg-white"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Relatório A4 do Mapa</span>
            </Button>

            {/* Gerar / Regenerar a partir do banco (RBAC: Admin / Suporte) */}
            {canEdit && (
              <Button
                size="sm"
                onClick={handleGerarMapaReal}
                disabled={carregandoDadosReais || salvando}
                className="text-xs bg-[#0B2545] hover:bg-[#124E78] text-white shadow-xs gap-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${carregandoDadosReais ? 'animate-spin' : ''}`}
                />
                <span>
                  {modoMapa === 'real'
                    ? 'Regenerar mapa a partir dos dados'
                    : 'Gerar mapa a partir dos dados da serventia'}
                </span>
              </Button>
            )}

            {/* Limpar e Deixar em Branco */}
            {canEdit && modoMapa === 'real' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLimparEmBranco}
                disabled={salvando}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Limpar e Deixar em Branco</span>
              </Button>
            )}

            {/* Importar Diagrama de Referência */}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalImportarAberto(true)}
                className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5 bg-blue-50/30"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Importar diagrama de referência</span>
              </Button>
            )}

            {/* Alternador de Layout: Lado a Lado (Cotejo) */}
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
                  {layoutVisualizacao === 'lado_a_lado' ? 'Ocultar Cotejo' : 'Cotejo com Planta'}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Resumo do Mapa Salvo com Hash e Data */}
        {modoMapa === 'real' && mapaSalvo && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 sm:p-4 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-emerald-950">
                  Mapa da Infraestrutura Oficial Ativo
                </span>
                <Badge className="bg-emerald-700 text-white text-[10px] font-bold">
                  {dadosReaisResult?.nosReaisCount || mapaSalvo.nos_reais_count || 0} nós reais
                </Badge>
                {mapaSalvo.hash_sha256 && (
                  <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                    SHA-256: {mapaSalvo.hash_sha256.substring(0, 12)}...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-800">
                <span>
                  Atualizado em: <strong>{formatSpDateTime(mapaSalvo.updated)}</strong>
                </span>
                {mapaSalvo.gerado_por_nome && (
                  <>
                    <span>•</span>
                    <span>Por: {mapaSalvo.gerado_por_nome}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Aviso de perfil somente leitura */}
        {!canEdit && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-center justify-between">
            <span>
              Perfil <strong>Usuário</strong>: modo de visualização, exportação e impressão de
              relatórios.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/relatorios/mapa-infraestrutura')}
              className="text-xs h-7 gap-1"
            >
              <Printer className="w-3 h-3 text-blue-600" />
              <span>Imprimir Relatório</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2. KPIS DA TOPOLOGIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Nós Mapeados"
          value={kpiTotalNos}
          secondaryValue={modoMapa === 'real' ? 'reais + pendentes' : 'equipamentos'}
          supportText={
            modoMapa === 'real'
              ? `${dadosReaisResult?.nosReaisCount || 0} cadastrados no banco`
              : '6 camadas físicas e lógicas da serventia'
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
              : 'Sem nobreaks cadastrados'
          }
          icon={Zap}
          iconColor="text-amber-700"
          iconBgColor="bg-amber-100"
        />

        <KpiCard
          label="Status Operacional"
          value={kpiStatus}
          secondaryValue={modoMapa === 'real' ? 'serventia real' : 'Em Branco'}
          supportText={
            modoMapa === 'real'
              ? `${dadosReaisResult?.nosReaisCount || 0} nós reais em regime ativo`
              : 'Aguardando geração do mapa a partir do banco'
          }
          icon={CheckCircle2}
          iconColor="text-emerald-700"
          iconBgColor="bg-emerald-100"
        />
      </div>

      {/* 3. VISUALIZAÇÃO EM COTEJO: GABARITO DE REFERÊNCIA LADO A LADO */}
      {layoutVisualizacao === 'lado_a_lado' && diagramaReferencia && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Split className="w-4 h-4 text-[#0B2545]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Cotejo Técnico Regulatório (Planta Arquivada × Mapa Vivo)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Planta de referência com hash SHA-256 ao lado da topologia gerada
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Coluna 1: Planta Arquivada */}
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

            {/* Coluna 2: Mapa Vivo */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Mapa Topológico Oficial ({modoMapa === 'real' ? 'Dados Reais' : 'Em Branco'})
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                >
                  {modoMapa === 'real' ? 'Topologia Real' : 'Aguardando'}
                </Badge>
              </div>

              <MapaTopologiaDiagram
                onSelectEquipamento={(eq) => setEquipamentoSelecionado(eq)}
                equipamentoSelecionadoId={equipamentoSelecionado?.id || null}
                filtroConexao={filtroConexao}
                equipamentosCustomizados={equipamentosExibidos}
                conexoesCustomizadas={conexoesExibidas}
                isModoReal={modoMapa === 'real'}
                mapaVazioSemGeracao={modoMapa === 'em_branco'}
                onGerarMapa={handleGerarMapaReal}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. VISUALIZAÇÃO PADRÃO DO MAPA */}
      {layoutVisualizacao === 'apenas_mapa' && (
        <>
          {/* Gabarito colapsado com resumo */}
          {diagramaReferencia && (
            <div className="bg-white rounded-xl border border-blue-200 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <FileImage className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">
                    Planta Técnica de Referência Arquivada:
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
                  <span>Cotejo Lado a Lado</span>
                </Button>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalImportarAberto(true)}
                    className="text-xs h-7 text-slate-500 hover:text-slate-800"
                  >
                    Trocar arquivo
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Legenda de Conexões */}
          <MapaConexoesLegenda filtroConexao={filtroConexao} onSelectFiltro={setFiltroConexao} />

          {/* Diagrama Topológico Principal */}
          <MapaTopologiaDiagram
            onSelectEquipamento={(eq) => setEquipamentoSelecionado(eq)}
            equipamentoSelecionadoId={equipamentoSelecionado?.id || null}
            filtroConexao={filtroConexao}
            equipamentosCustomizados={equipamentosExibidos}
            conexoesCustomizadas={conexoesExibidas}
            isModoReal={modoMapa === 'real'}
            mapaVazioSemGeracao={modoMapa === 'em_branco'}
            onGerarMapa={handleGerarMapaReal}
          />

          {/* Bloco de Proteção Sobreposta */}
          <MapaProtecaoOverlay />
        </>
      )}

      {/* 5. DRAWER LATERAL DE DETALHES DO NÓ */}
      <MapaNodeDetailsDrawer
        equipamento={equipamentoSelecionado}
        onClose={() => setEquipamentoSelecionado(null)}
      />

      {/* 6. MODAL DE IMPORTAÇÃO DE GABARITO COM HASH SHA-256 */}
      <ImportarDiagramaModal
        isOpen={modalImportarAberto}
        onClose={() => setModalImportarAberto(false)}
        onSalvar={async (novoDiagrama) => {
          setDiagramaReferencia(novoDiagrama)
          setLayoutVisualizacao('lado_a_lado')

          // Se o mapa estiver gerado, atualiza o registro com o diagrama
          if (mapaSalvo?.id) {
            await saveInfraMapaServentia(orgId, {
              status: mapaSalvo.status,
              hash_sha256: mapaSalvo.hash_sha256,
              total_nos: mapaSalvo.total_nos,
              total_conexoes: mapaSalvo.total_conexoes,
              nos_reais_count: mapaSalvo.nos_reais_count,
              autonomia_minutos: mapaSalvo.autonomia_minutos,
              velocidade_mbps: mapaSalvo.velocidade_mbps,
              equipamentos_snapshot: mapaSalvo.equipamentos_snapshot,
              conexoes_snapshot: mapaSalvo.conexoes_snapshot,
              resumo_camadas: mapaSalvo.resumo_camadas,
              diagrama_referencia_snapshot: novoDiagrama,
              gerado_por_nome: user?.name || user?.email || '',
              gerado_por_email: user?.email || '',
              observacoes: 'Gabarito técnico de referência atualizado.',
            })
          }
        }}
        diagramaAtual={diagramaReferencia}
      />
    </div>
  )
}

export default InfraMapaTab
