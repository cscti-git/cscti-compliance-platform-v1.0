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
  Printer,
  FileImage,
  Pencil,
  Eye,
  Plus,
  Undo2,
  Save,
  Check,
  AlertTriangle,
  Move,
} from 'lucide-react'
import {
  EquipamentoSimulado,
  TopologiaConexao,
  CamadaId,
} from '@/components/infraestrutura/mapa/topologiaData'
import { MapaNodeDetailsDrawer } from '@/components/infraestrutura/mapa/MapaNodeDetailsDrawer'
import { MapaConexoesLegenda } from '@/components/infraestrutura/mapa/MapaConexoesLegenda'
import { MapaProtecaoOverlay } from '@/components/infraestrutura/mapa/MapaProtecaoOverlay'
import {
  ImportarDiagramaModal,
  DiagramaReferenciaData,
} from '@/components/infraestrutura/mapa/ImportarDiagramaModal'
import { DiagramaReferenciaPanel } from '@/components/infraestrutura/mapa/DiagramaReferenciaPanel'
import { EditarNodeModal } from '@/components/infraestrutura/mapa/EditarNodeModal'
import { GerenciarConexaoModal } from '@/components/infraestrutura/mapa/GerenciarConexaoModal'
import { EditorCanvasDiagram } from '@/components/infraestrutura/mapa/EditorCanvasDiagram'
import {
  gerarTopologiaRealServentia,
  GeradorMapaRealResult,
} from '@/components/infraestrutura/mapa/geradorMapaReal'
import { listInventoryAssets, logAudit } from '@/services/csctiService'
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

  // MODO DE EDIÇÃO VISUAL FUNCIONAL (Apenas Administrador e Suporte: canEdit)
  const [modoEdicao, setModoEdicao] = useState(false)

  // Pilha de Undo em memória da sessão de edição
  const [historicoUndo, setHistoricoUndo] = useState<
    {
      equipamentos: EquipamentoSimulado[]
      conexoes: TopologiaConexao[]
    }[]
  >([])

  // Equipamentos e conexões editáveis no estado do componente
  const [equipamentosAtuais, setEquipamentosAtuais] = useState<EquipamentoSimulado[]>([])
  const [conexoesAtuais, setConexoesAtuais] = useState<TopologiaConexao[]>([])

  // Equipamento selecionado no drawer lateral
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoSimulado | null>(
    null,
  )

  // Filtro de conexões
  const [filtroConexao, setFiltroConexao] = useState<
    'todos' | 'eletrica' | 'fibra' | 'rede' | 'telefonia'
  >('todos')

  // Modais de Edição
  const [modalNodeAberto, setModalNodeAberto] = useState(false)
  const [nodeEmEdicao, setNodeEmEdicao] = useState<EquipamentoSimulado | null>(null)
  const [camadaParaNovoNode, setCamadaParaNovoNode] = useState<CamadaId>('sala_servidores')

  const [modalConexaoAberto, setModalConexaoAberto] = useState(false)
  const [conexaoEmEdicao, setConexaoEmEdicao] = useState<TopologiaConexao | null>(null)
  const [origemConexaoPreDefinida, setOrigemConexaoPreDefinida] = useState<string | undefined>(
    undefined,
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

  // Salva snapshot no histórico para permitir Desfazer (Undo)
  const registrarSnapshotUndo = useCallback(() => {
    setHistoricoUndo((prev) => [
      ...prev.slice(-15), // Limita a 15 passos de desfazer
      {
        equipamentos: JSON.parse(JSON.stringify(equipamentosAtuais)),
        conexoes: JSON.parse(JSON.stringify(conexoesAtuais)),
      },
    ])
  }, [equipamentosAtuais, conexoesAtuais])

  // Desfazer (Undo simples em memória)
  const handleDesfazer = () => {
    if (historicoUndo.length === 0) return
    const anterior = historicoUndo[historicoUndo.length - 1]
    setHistoricoUndo((prev) => prev.slice(0, prev.length - 1))
    setEquipamentosAtuais(anterior.equipamentos)
    setConexoesAtuais(anterior.conexoes)
    toast({
      title: 'Ação desfeita',
      description: 'O diagrama retornou ao estado anterior da sessão.',
    })
  }

  // Função para carregar dados reais e gerar topologia do banco
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
            if (
              mapa.equipamentos_snapshot &&
              Array.isArray(mapa.equipamentos_snapshot) &&
              mapa.equipamentos_snapshot.length > 0
            ) {
              setEquipamentosAtuais(mapa.equipamentos_snapshot)
              setConexoesAtuais(mapa.conexoes_snapshot || [])
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
                  (e: any) => e.evidenciaFotoSimulada || e.imagemAnexada,
                ).length,
                nosReaisCount: mapa.nos_reais_count || mapa.equipamentos_snapshot.length,
                autonomiaTotalMinutos: mapa.autonomia_minutos || 0,
                velocidadeTotalMbps: mapa.velocidade_mbps || 0,
                temDadosSuficientes: true,
                resumoPorCamada: mapa.resumo_camadas || {},
              })
            } else {
              const result = await gerarTopologiaDoBanco()
              if (result) {
                setEquipamentosAtuais(result.equipamentos)
                setConexoesAtuais(result.conexoes)
              }
            }

            if (mapa.diagrama_referencia_snapshot) {
              setDiagramaReferencia(mapa.diagrama_referencia_snapshot)
            }
          } else {
            setModoMapa('em_branco')
            setEquipamentosAtuais([])
            setConexoesAtuais([])
          }
        } else {
          setModoMapa('em_branco')
          setEquipamentosAtuais([])
          setConexoesAtuais([])
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

    if (modoEdicao || equipamentosAtuais.some((e) => e.isCriadoManualmente)) {
      const confirmou = confirm(
        'Atenção: Você realizou edições manuais no mapa. Deseja realmente regenerar a partir do banco e substituir as alterações manuais?',
      )
      if (!confirmou) return
    }

    setCarregandoDadosReais(true)
    try {
      const result = await gerarTopologiaDoBanco()
      if (!result) throw new Error('Falha na geração da topologia')

      setModoMapa('real')
      setEquipamentoSelecionado(null)
      setEquipamentosAtuais(result.equipamentos)
      setConexoesAtuais(result.conexoes)
      setHistoricoUndo([])

      // Calcula hash de integridade SHA-256 do snapshot do mapa
      const payloadStr = JSON.stringify({
        orgId,
        equipamentos: result.equipamentos.map((e) => ({
          id: e.id,
          nome: e.nome,
          codigo: e.codigoAtivo,
          camada: e.camadaId,
          status: e.status,
          imgSha: e.imagemAnexada?.sha256,
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

    if (
      !confirm(
        'Tem certeza que deseja redefinir o mapa para em branco? Esta ação gravará uma nova versão no banco.',
      )
    ) {
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
      setEquipamentosAtuais([])
      setConexoesAtuais([])
      setModoEdicao(false)
      setHistoricoUndo([])

      toast({
        title: 'Mapa Redefinido',
        description: 'O mapa da infraestrutura agora está em branco.',
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

  // Ação de Salvar Alterações da Edição Manual (grava nova versão no banco com SHA-256 e auditoria)
  const handleSalvarEdicaoManual = async () => {
    if (!canEdit) return
    setSalvando(true)

    try {
      const payloadStr = JSON.stringify({
        orgId,
        equipamentos: equipamentosAtuais.map((e) => ({
          id: e.id,
          nome: e.nome,
          codigo: e.codigoAtivo,
          camada: e.camadaId,
          status: e.status,
          pos: e.posicaoCanvas,
          imgSha: e.imagemAnexada?.sha256,
        })),
        conexoes: conexoesAtuais,
        dataSalvo: new Date().toISOString(),
      })
      const hash = await calculateTextSha256(payloadStr)

      const salvo = await saveInfraMapaServentia(orgId, {
        status: 'revisado',
        hash_sha256: hash,
        total_nos: equipamentosAtuais.length,
        total_conexoes: conexoesAtuais.length,
        nos_reais_count: equipamentosAtuais.filter((e) => e.isRealData).length,
        autonomia_minutos: mapaSalvo?.autonomia_minutos || 0,
        velocidade_mbps: mapaSalvo?.velocidade_mbps || 0,
        equipamentos_snapshot: equipamentosAtuais,
        conexoes_snapshot: conexoesAtuais,
        resumo_camadas: mapaSalvo?.resumo_camadas || {},
        diagrama_referencia_snapshot: diagramaReferencia,
        gerado_por_nome: user?.name || user?.email || 'Usuário CSCTI',
        gerado_por_email: user?.email || '',
        observacoes: `Diagrama editado visualmente por ${user?.name || user?.email || 'Usuário'} em ${new Date().toLocaleString('pt-BR')}.`,
      })

      // Registro adicional de auditoria detalhada append-only
      await logAudit({
        action: 'INFRA_MAPA_EDIT',
        entity: 'Mapa da Infraestrutura',
        detail: `Diagrama v${salvo.versao} editado visualmente: ${equipamentosAtuais.length} nós e ${conexoesAtuais.length} conexões`,
        organizationId: orgId,
        metadata: {
          versao: salvo.versao,
          hash_sha256: hash,
          total_nos: equipamentosAtuais.length,
          total_conexoes: conexoesAtuais.length,
          com_imagem: equipamentosAtuais.filter((e) => e.imagemAnexada).length,
        },
      })

      setMapaSalvo(salvo)
      setModoMapa('real')
      setModoEdicao(false)
      setHistoricoUndo([])

      toast({
        title: `Versão v${salvo.versao} do Mapa Salva com Sucesso`,
        description: `Topologia atualizada com ${equipamentosAtuais.length} nós e hash SHA-256 de integridade.`,
      })
    } catch (err) {
      console.error('[InfraMapaTab] Erro ao salvar edição do mapa:', err)
      toast({
        title: 'Erro ao salvar alterações',
        description: 'Não foi possível gravar a nova versão do mapa no banco.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Adicionar / Salvar Nó
  const handleSalvarNode = (nodeSalvo: EquipamentoSimulado) => {
    registrarSnapshotUndo()

    setEquipamentosAtuais((prev) => {
      const idx = prev.findIndex((e) => e.id === nodeSalvo.id)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = nodeSalvo
        return novo
      }
      return [...prev, nodeSalvo]
    })

    if (modoMapa === 'em_branco') {
      setModoMapa('real')
    }

    toast({
      title: 'Nó atualizado',
      description: `Equipamento "${nodeSalvo.nome}" salvo no diagrama.`,
    })
  }

  // Remover Nó
  const handleRemoverNode = (nodeId: string) => {
    registrarSnapshotUndo()

    setEquipamentosAtuais((prev) => prev.filter((e) => e.id !== nodeId))
    setConexoesAtuais((prev) => prev.filter((c) => c.origemId !== nodeId && c.destinoId !== nodeId))
    if (equipamentoSelecionado?.id === nodeId) {
      setEquipamentoSelecionado(null)
    }

    toast({
      title: 'Nó removido',
      description: 'O equipamento e suas conexões associadas foram removidos.',
    })
  }

  // Atualizar Posição do Nó ao arrastar no Canvas
  const handleAtualizarPosicaoNode = (nodeId: string, x: number, y: number) => {
    setEquipamentosAtuais((prev) =>
      prev.map((e) => (e.id === nodeId ? { ...e, posicaoCanvas: { x, y } } : e)),
    )
  }

  // Adicionar / Salvar Conexão
  const handleSalvarConexao = (conexaoSalva: TopologiaConexao) => {
    registrarSnapshotUndo()

    setConexoesAtuais((prev) => {
      const idx = prev.findIndex((c) => c.id === conexaoSalva.id)
      if (idx >= 0) {
        const nova = [...prev]
        nova[idx] = conexaoSalva
        return nova
      }
      return [...prev, conexaoSalva]
    })

    toast({
      title: 'Conexão salva',
      description: `Interligação ${conexaoSalva.rotulo || conexaoSalva.tipo} registrada entre os nós.`,
    })
  }

  // Remover Conexão
  const handleRemoverConexao = (conexaoId: string) => {
    registrarSnapshotUndo()
    setConexoesAtuais((prev) => prev.filter((c) => c.id !== conexaoId))
    toast({
      title: 'Conexão removida',
      description: 'A interligação foi removida do diagrama.',
    })
  }

  // KPIs
  const kpiTotalNos = equipamentosAtuais.length
  const kpiBackbone =
    modoMapa === 'real' && mapaSalvo?.velocidade_mbps
      ? `${mapaSalvo.velocidade_mbps} Mbps`
      : conexoesAtuais.some((c) => c.tipo === 'fibra')
        ? 'Fibra SFP+'
        : '0 Mbps'

  const kpiAutonomia =
    modoMapa === 'real' && mapaSalvo?.autonomia_minutos
      ? `${mapaSalvo.autonomia_minutos} min`
      : equipamentosAtuais.some((e) => e.iconKey === 'nobreak')
        ? 'Nobreak Ativo'
        : '0 min'

  const kpiStatus =
    equipamentosAtuais.length > 0 ? `${equipamentosAtuais.length} nós ativos` : 'Em Branco'

  return (
    <div className="space-y-6">
      {/* 1. BARRA SUPERIOR DE CONTROLE E AÇÕES DO MAPA OFICIAL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  modoEdicao
                    ? 'bg-amber-500 animate-ping'
                    : modoMapa === 'real'
                      ? 'bg-emerald-600 animate-pulse'
                      : 'bg-slate-400'
                }`}
              />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Diagrama Topológico da Infraestrutura Técnica
              </h3>
              {mapaSalvo?.versao && modoMapa === 'real' && (
                <Badge variant="outline" className="text-[10px] font-mono border-slate-300">
                  v{mapaSalvo.versao}
                </Badge>
              )}
              {modoEdicao && (
                <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                  MODO EDITOR ATIVO
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Diagrama funcional editável da serventia ({serventiaNome}): arraste nós, anexe fotos,
              crie interligações e versionamento regulatório.
            </p>
          </div>

          {/* Botões de Ação do Mapa */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Alternador do Modo de Edição (Apenas Admin e Suporte; perfil Usuário nunca vê) */}
            {canEdit && (
              <>
                {!modoEdicao ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setModoEdicao(true)
                      setHistoricoUndo([])
                      toast({
                        title: 'Modo de Edição Visual Ativado',
                        description:
                          'Arraste nós livremente, dê duplo clique ou use as ações rápidas para editar, inserir imagens e conexões.',
                      })
                    }}
                    className="text-xs bg-[#0B2545] hover:bg-[#124E78] text-white shadow-xs gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-300" />
                    <span>Editar mapa</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-xl border border-amber-300">
                    {/* Botão Desfazer (Undo) */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDesfazer}
                      disabled={historicoUndo.length === 0}
                      className="text-xs h-8 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 gap-1"
                      title="Desfazer última alteração"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Desfazer</span>
                    </Button>

                    {/* Botão Adicionar Nó Novo */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNodeEmEdicao(null)
                        setCamadaParaNovoNode('sala_servidores')
                        setModalNodeAberto(true)
                      }}
                      className="text-xs h-8 bg-white border-blue-300 text-blue-700 hover:bg-blue-50 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Adicionar Nó</span>
                    </Button>

                    {/* Botão Conectar Nós */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConexaoEmEdicao(null)
                        setOrigemConexaoPreDefinida(undefined)
                        setModalConexaoAberto(true)
                      }}
                      className="text-xs h-8 bg-white border-cyan-300 text-cyan-700 hover:bg-cyan-50 gap-1"
                    >
                      <Cable className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Conexão</span>
                    </Button>

                    {/* Botão Salvar Alterações */}
                    <Button
                      size="sm"
                      onClick={handleSalvarEdicaoManual}
                      disabled={salvando}
                      className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white gap-1 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar alterações</span>
                    </Button>

                    {/* Botão Sair da Edição */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          historicoUndo.length > 0 &&
                          !confirm(
                            'Existem alterações não salvas. Deseja sair do modo de edição e descartá-las?',
                          )
                        ) {
                          return
                        }
                        setModoEdicao(false)
                      }}
                      className="text-xs h-8 text-slate-600 hover:text-slate-900"
                    >
                      <span>Fechar editor</span>
                    </Button>
                  </div>
                )}
              </>
            )}

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
            {canEdit && !modoEdicao && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGerarMapaReal}
                disabled={carregandoDadosReais || salvando}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${carregandoDadosReais ? 'animate-spin' : ''}`}
                />
                <span>
                  {modoMapa === 'real'
                    ? 'Regenerar mapa a partir dos dados'
                    : 'Gerar mapa a partir dos dados'}
                </span>
              </Button>
            )}

            {/* Limpar e Deixar em Branco */}
            {canEdit && modoMapa === 'real' && !modoEdicao && (
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
            {canEdit && !modoEdicao && (
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
            {diagramaReferencia && !modoEdicao && (
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
                  {equipamentosAtuais.length} nós ({conexoesAtuais.length} conexões)
                </Badge>
                {equipamentosAtuais.filter((e) => e.imagemAnexada).length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-800 border-blue-300 text-[10px]"
                  >
                    📷 {equipamentosAtuais.filter((e) => e.imagemAnexada).length} com foto
                  </Badge>
                )}
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
          secondaryValue={modoMapa === 'real' ? 'reais + editados' : 'equipamentos'}
          supportText={
            modoMapa === 'real'
              ? `${equipamentosAtuais.filter((e) => e.isRealData).length} nós reais da serventia`
              : 'Camadas físicas e lógicas da serventia'
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
              ? 'Nobreaks cadastrados na infraestrutura'
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
            equipamentosAtuais.length > 0
              ? `${conexoesAtuais.length} interligações físicas/lógicas`
              : 'Aguardando geração do mapa a partir do banco'
          }
          icon={CheckCircle2}
          iconColor="text-emerald-700"
          iconBgColor="bg-emerald-100"
        />
      </div>

      {/* 3. VISUALIZAÇÃO EM COTEJO: GABARITO DE REFERÊNCIA LADO A LADO */}
      {layoutVisualizacao === 'lado_a_lado' && diagramaReferencia && !modoEdicao && (
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

              <EditorCanvasDiagram
                equipamentos={equipamentosAtuais}
                conexoes={conexoesAtuais}
                modoEdicao={false}
                filtroConexao={filtroConexao}
                equipamentoSelecionadoId={equipamentoSelecionado?.id || null}
                onSelectEquipamento={(eq) => setEquipamentoSelecionado(eq)}
                onEditarNode={(eq) => {
                  setNodeEmEdicao(eq)
                  setModalNodeAberto(true)
                }}
                onRemoverNode={handleRemoverNode}
                onAtualizarPosicaoNode={handleAtualizarPosicaoNode}
                onAdicionarNodeNaCamada={(camadaId) => {
                  setNodeEmEdicao(null)
                  setCamadaParaNovoNode(camadaId)
                  setModalNodeAberto(true)
                }}
                onAbrirNovaConexao={(origemId) => {
                  setConexaoEmEdicao(null)
                  setOrigemConexaoPreDefinida(origemId)
                  setModalConexaoAberto(true)
                }}
                onEditarConexao={(cx) => {
                  setConexaoEmEdicao(cx)
                  setModalConexaoAberto(true)
                }}
                onRemoverConexao={handleRemoverConexao}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. VISUALIZAÇÃO PADRÃO OU MODO EDITOR VISUAL COMPLETO */}
      {(layoutVisualizacao === 'apenas_mapa' || modoEdicao) && (
        <>
          {/* Gabarito colapsado com resumo (quando não em edição) */}
          {diagramaReferencia && !modoEdicao && (
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
          <MapaConexoesLegenda
            filtroConexao={filtroConexao === 'telefonia' ? 'todos' : (filtroConexao as any)}
            onSelectFiltro={(f) => setFiltroConexao(f)}
          />

          {/* DIAGRAMA / CANVAS VISUAL FUNCIONAL */}
          {equipamentosAtuais.length === 0 && !modoEdicao ? (
            <div className="w-full bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-5 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 mx-auto flex items-center justify-center border border-blue-200 shadow-xs">
                <Layers className="w-8 h-8 text-blue-600 animate-pulse" />
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
                  Gere o mapa a partir dos dados reais da serventia ou clique em &quot;Editar
                  mapa&quot; para desenhar os nós manualmente.
                </p>
              </div>

              {canEdit && (
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Button
                    size="default"
                    onClick={handleGerarMapaReal}
                    className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs sm:text-sm font-semibold shadow-md gap-2 px-6"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-300" />
                    <span>Gerar mapa a partir dos dados da serventia</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => {
                      setModoEdicao(true)
                      setNodeEmEdicao(null)
                      setCamadaParaNovoNode('sala_servidores')
                      setModalNodeAberto(true)
                    }}
                    className="text-xs sm:text-sm font-semibold border-blue-300 text-blue-700 hover:bg-blue-50 gap-2"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Criar diagrama do zero</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EditorCanvasDiagram
              equipamentos={equipamentosAtuais}
              conexoes={conexoesAtuais}
              modoEdicao={modoEdicao}
              filtroConexao={filtroConexao}
              equipamentoSelecionadoId={equipamentoSelecionado?.id || null}
              onSelectEquipamento={(eq) => setEquipamentoSelecionado(eq)}
              onEditarNode={(eq) => {
                setNodeEmEdicao(eq)
                setModalNodeAberto(true)
              }}
              onRemoverNode={handleRemoverNode}
              onAtualizarPosicaoNode={handleAtualizarPosicaoNode}
              onAdicionarNodeNaCamada={(camadaId) => {
                setNodeEmEdicao(null)
                setCamadaParaNovoNode(camadaId)
                setModalNodeAberto(true)
              }}
              onAbrirNovaConexao={(origemId) => {
                setConexaoEmEdicao(null)
                setOrigemConexaoPreDefinida(origemId)
                setModalConexaoAberto(true)
              }}
              onEditarConexao={(cx) => {
                setConexaoEmEdicao(cx)
                setModalConexaoAberto(true)
              }}
              onRemoverConexao={handleRemoverConexao}
            />
          )}

          {/* Bloco de Proteção Sobreposta (quando não estiver em edição para manter foco) */}
          {!modoEdicao && <MapaProtecaoOverlay />}
        </>
      )}

      {/* 5. DRAWER LATERAL DE DETALHES DO NÓ */}
      <MapaNodeDetailsDrawer
        equipamento={equipamentoSelecionado}
        onClose={() => setEquipamentoSelecionado(null)}
      />

      {/* 6. MODAL DE ADIÇÃO/EDIÇÃO DE NÓ (COM UPLOAD DE IMAGEM HASH SHA-256) */}
      <EditarNodeModal
        isOpen={modalNodeAberto}
        onClose={() => setModalNodeAberto(false)}
        onSalvar={handleSalvarNode}
        nodeExistente={nodeEmEdicao}
        camadaSugerida={camadaParaNovoNode}
      />

      {/* 7. MODAL DE CONEXÃO ENTRE NÓS */}
      <GerenciarConexaoModal
        isOpen={modalConexaoAberto}
        onClose={() => setModalConexaoAberto(false)}
        onSalvar={handleSalvarConexao}
        onRemover={handleRemoverConexao}
        conexaoExistente={conexaoEmEdicao}
        equipamentos={equipamentosAtuais}
        origemPreDefinidaId={origemConexaoPreDefinida}
      />

      {/* 8. MODAL DE IMPORTAÇÃO DE GABARITO COM HASH SHA-256 */}
      <ImportarDiagramaModal
        isOpen={modalImportarAberto}
        onClose={() => setModalImportarAberto(false)}
        onSalvar={async (novoDiagrama) => {
          setDiagramaReferencia(novoDiagrama)
          setLayoutVisualizacao('lado_a_lado')

          if (mapaSalvo?.id) {
            await saveInfraMapaServentia(orgId, {
              status: mapaSalvo.status,
              hash_sha256: mapaSalvo.hash_sha256,
              total_nos: equipamentosAtuais.length,
              total_conexoes: conexoesAtuais.length,
              nos_reais_count: equipamentosAtuais.filter((e) => e.isRealData).length,
              autonomia_minutos: mapaSalvo.autonomia_minutos,
              velocidade_mbps: mapaSalvo.velocidade_mbps,
              equipamentos_snapshot: equipamentosAtuais,
              conexoes_snapshot: conexoesAtuais,
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
