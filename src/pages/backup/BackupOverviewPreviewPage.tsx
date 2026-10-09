import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDateTime, formatDate, formatTime } from '@/lib/dateTime'
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  MoreVertical,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Server,
  Layers,
  FileCheck2,
  HardDriveDownload,
  AlertCircle,
  PlayCircle,
  Sliders,
  Check,
  UserCheck,
} from 'lucide-react'
import {
  listBackupEscopos,
  listBackupPlanos,
  listBackupRotinas,
  listBackupFontes,
  listBackupRegras,
  listBackupEvidencias,
  listBackupExecucoes,
  listBackupOcorrencias,
  listBackupTestes,
  listBackupMonitoramentos,
  getBackupConfronto,
} from '@/services/backupService'
import { listInventoryAssets, listOrganizations } from '@/services/csctiService'
import type {
  BackupEscopoItem,
  BackupPlanoItem,
  BackupRotinaItem,
  BackupFonteItem,
  BackupRegraIdentificacaoItem,
  BackupEvidenciaItem,
  BackupExecucaoItem,
  BackupOcorrenciaItem,
  BackupTesteRecuperacaoItem,
  InventoryAssetItem,
  BackupMonitoramentoExternoItem,
  BackupConfrontoResponse,
  OrganizationItem,
} from '@/types/cscti'
import { SvgDonutChart, HorizontalStackedBar } from '@/components/backup/BackupPreviewCharts'

export const BackupOverviewPreviewPage: React.FC = () => {
  const { organization, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const orgId = organization?.id || ''
  const canOperate = role === 'admin' || role === 'suporte'

  // Estados de dados reais
  const [loading, setLoading] = useState(true)
  const [escopos, setEscopos] = useState<BackupEscopoItem[]>([])
  const [planos, setPlanos] = useState<BackupPlanoItem[]>([])
  const [rotinas, setRotinas] = useState<BackupRotinaItem[]>([])
  const [fontes, setFontes] = useState<BackupFonteItem[]>([])
  const [regras, setRegras] = useState<BackupRegraIdentificacaoItem[]>([])
  const [evidencias, setEvidencias] = useState<BackupEvidenciaItem[]>([])
  const [execucoes, setExecucoes] = useState<BackupExecucaoItem[]>([])
  const [ocorrencias, setOcorrencias] = useState<BackupOcorrenciaItem[]>([])
  const [testes, setTestes] = useState<BackupTesteRecuperacaoItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [monitoramentos, setMonitoramentos] = useState<BackupMonitoramentoExternoItem[]>([])
  const [confrontoData, setConfrontoData] = useState<BackupConfrontoResponse | null>(null)

  // Data/hora da última atividade real
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Filtros da tabela
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipoAtivo, setFilterTipoAtivo] = useState('todos')
  const [filterStatusExecucao, setFilterStatusExecucao] = useState('todos')
  const [filterConformidade, setFilterConformidade] = useState('todos')
  const [filterPeriodo, setFilterPeriodo] = useState('todos') // 'todos' | '30dias' | '7dias' | '24h'

  // Seleção e paginação da tabela
  const [selectedExecIds, setSelectedExecIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5 // Conforme o esboço: "Mostrando 1 a 5 de N registros"

  // Modal de Detalhes da Execução
  const [execDetail, setExecDetail] = useState<BackupExecucaoItem | null>(null)

  // Carregar dados
  const loadAllData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [
        escData,
        plaData,
        rotData,
        fonData,
        regData,
        eviData,
        exeData,
        ocoData,
        tesData,
        assData,
        nocData,
        confData,
      ] = await Promise.all([
        listBackupEscopos(orgId),
        listBackupPlanos(orgId),
        listBackupRotinas(orgId),
        listBackupFontes(orgId),
        listBackupRegras(orgId),
        listBackupEvidencias(orgId),
        listBackupExecucoes(orgId),
        listBackupOcorrencias(orgId),
        listBackupTestes(orgId),
        listInventoryAssets(orgId),
        listBackupMonitoramentos(orgId),
        getBackupConfronto(orgId).catch(() => null),
      ])

      setEscopos(escData)
      setPlanos(plaData)
      setRotinas(rotData)
      setFontes(fonData)
      setRegras(regData)
      setEvidencias(eviData)
      setExecucoes(exeData)
      setOcorrencias(ocoData)
      setTestes(tesData)
      setAssets(assData)
      setMonitoramentos(nocData)
      setConfrontoData(confData)

      // Determinar data/hora da última atividade real (ou agora)
      let ultimaData = new Date()
      if (exeData.length > 0 && exeData[0].created) {
        ultimaData = new Date(exeData[0].created)
      } else if (eviData.length > 0 && eviData[0].created) {
        ultimaData = new Date(eviData[0].created)
      }
      const dd = String(ultimaData.getDate()).padStart(2, '0')
      const mm = String(ultimaData.getMonth() + 1).padStart(2, '0')
      const hh = String(ultimaData.getHours()).padStart(2, '0')
      const min = String(ultimaData.getMinutes()).padStart(2, '0')
      setLastUpdated(`${dd}/${mm} ${hh}:${min}`)
    } catch (err) {
      console.error('Erro ao carregar dados do preview de backup:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [orgId])

  // Mapas rápidos para junção
  const assetsMap = useMemo(() => {
    const map = new Map<string, InventoryAssetItem>()
    assets.forEach((a) => map.set(a.id, a))
    return map
  }, [assets])

  const rotinasMap = useMemo(() => {
    const map = new Map<string, BackupRotinaItem>()
    rotinas.forEach((r) => map.set(r.id, r))
    return map
  }, [rotinas])

  const planosMap = useMemo(() => {
    const map = new Map<string, BackupPlanoItem>()
    planos.forEach((p) => map.set(p.id, p))
    return map
  }, [planos])

  // Ativos com exigências de backup
  const ativosExigemBackup = useMemo(() => {
    return assets.filter(
      (a) => a.exige_backup_local || a.exige_backup_nuvem || a.exige_backup_replicacao,
    )
  }, [assets])

  // ---------------------------------------------------------------------------
  // 1. DADOS DOS 4 KPIS SUPERIORES (reais)
  // ---------------------------------------------------------------------------
  const totalAtivosInventariados = assets.length
  const totalAtivosProtegidos = useMemo(() => {
    if (confrontoData?.totais?.total_protegidos !== undefined) {
      return confrontoData.totais.total_protegidos
    }
    // Fallback: se houver confronto, contar PROTEGIDO
    if (confrontoData?.confronto) {
      return confrontoData.confronto.filter((a) => a.status_consolidado === 'PROTEGIDO').length
    }
    return 0
  }, [confrontoData])

  const totalExecucoes = execucoes.length
  const execucoesComSucesso = useMemo(
    () => execucoes.filter((e) => e.status === 'sucesso').length,
    [execucoes],
  )
  const execucoesComAlertas = useMemo(
    () => execucoes.filter((e) => e.status === 'parcial').length,
    [execucoes],
  )
  const execucoesComFalha = useMemo(
    () => execucoes.filter((e) => e.status === 'erro').length,
    [execucoes],
  )
  const execucoesNaoExecutadas = useMemo(
    () => execucoes.filter((e) => e.status === 'nao_executada').length,
    [execucoes],
  )

  const pctAlertas =
    totalExecucoes > 0 ? ((execucoesComAlertas / totalExecucoes) * 100).toFixed(1) : '0,0'
  const pctFalhas =
    totalExecucoes > 0 ? ((execucoesComFalha / totalExecucoes) * 100).toFixed(1) : '0,0'

  // ---------------------------------------------------------------------------
  // 2. DADOS DOS 3 PAINÉIS ANALÍTICOS (estilo InventoryCharts do Leandro)
  // ---------------------------------------------------------------------------
  // Painel A: Status das Execuções (Donut)
  const statusExecucoesData = useMemo(() => {
    const total = totalExecucoes || 1
    return [
      {
        label: 'Sucesso',
        value: execucoesComSucesso,
        percent: totalExecucoes > 0 ? Math.round((execucoesComSucesso / total) * 100) : 0,
        color: '#10B981', // emerald-500
      },
      {
        label: 'Com alertas',
        value: execucoesComAlertas,
        percent: totalExecucoes > 0 ? Math.round((execucoesComAlertas / total) * 100) : 0,
        color: '#F59E0B', // amber-500
      },
      {
        label: 'Falhas',
        value: execucoesComFalha,
        percent: totalExecucoes > 0 ? Math.round((execucoesComFalha / total) * 100) : 0,
        color: '#EF4444', // red-500
      },
      {
        label: 'Não executadas',
        value: execucoesNaoExecutadas,
        percent: totalExecucoes > 0 ? Math.round((execucoesNaoExecutadas / total) * 100) : 0,
        color: '#94A3B8', // slate-400
      },
    ]
  }, [
    totalExecucoes,
    execucoesComSucesso,
    execucoesComAlertas,
    execucoesComFalha,
    execucoesNaoExecutadas,
  ])

  // Painel B: Cobertura de Proteção por Tipo de Ativo (Barras horizontais reais)
  const coberturaPorTipoAtivo = useMemo(() => {
    // Categorias reais do inventário
    const categoriasBase = [
      {
        key: 'servidor',
        label: 'Servidores',
        tipos: ['servidor_virtualizado', 'servidor_aplicacao'],
      },
      {
        key: 'estacao',
        label: 'Estações de trabalho',
        tipos: ['estacao'],
      },
      {
        key: 'sistema',
        label: 'Sistemas e aplicações',
        tipos: ['servico_nuvem', 'impressora_multifuncional'],
      },
      {
        key: 'banco',
        label: 'Bancos de dados',
        tipos: ['banco_dados'],
      },
      {
        key: 'rede',
        label: 'Rede e segurança',
        tipos: ['equipamento_rede'],
      },
      {
        key: 'outros',
        label: 'Outros',
        tipos: ['storage_backup', 'outro'],
      },
    ]

    const confrontoItems = confrontoData?.confronto || []

    const resultados = categoriasBase
      .map((cat) => {
        // Encontrar todos os ativos desta categoria que exigem backup
        const ativosDaCat = ativosExigemBackup.filter((a) => cat.tipos.includes(a.tipo))
        const total = ativosDaCat.length
        if (total === 0) return null

        let protegidos = 0
        let parciais = 0
        let semProtecao = 0

        ativosDaCat.forEach((ativo) => {
          const conf = confrontoItems.find((c) => c.id === ativo.id)
          if (conf) {
            if (conf.status_consolidado === 'PROTEGIDO') {
              protegidos++
            } else if (conf.status_consolidado === 'PARCIAL') {
              parciais++
            } else {
              semProtecao++
            }
          } else {
            semProtecao++
          }
        })

        const percentProtegido = total > 0 ? Math.round((protegidos / total) * 100) : 0

        return {
          categoria: cat.label,
          total,
          protegidos,
          parciais,
          semProtecao,
          percentProtegido,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return resultados
  }, [ativosExigemBackup, confrontoData])

  // Painel C: Conformidade das Rotinas (Donut real)
  const conformidadeRotinas = useMemo(() => {
    const totalRotinas = rotinas.length
    // Rotina é conforme se tiver status 'ativo' e última execução com sucesso
    // Pendente se ativa mas sem execuções recentes
    // Não conforme se status 'inativo' ou última execução com erro
    let conformes = 0
    let pendentes = 0
    let naoConformes = 0

    rotinas.forEach((r) => {
      if (r.status === 'inativo') {
        naoConformes++
        return
      }
      const execsDaRotina = execucoes.filter((e) => e.rotina === r.id)
      if (execsDaRotina.length === 0) {
        pendentes++
      } else {
        const ult = execsDaRotina[0] // já ordenado -created
        if (ult.status === 'sucesso') conformes++
        else if (ult.status === 'parcial') pendentes++
        else naoConformes++
      }
    })

    const pctConforme = totalRotinas > 0 ? Math.round((conformes / totalRotinas) * 100) : 0
    const pctPendente = totalRotinas > 0 ? Math.round((pendentes / totalRotinas) * 100) : 0
    const pctNaoConforme = totalRotinas > 0 ? Math.round((naoConformes / totalRotinas) * 100) : 0

    return {
      total: totalRotinas,
      pctConforme,
      segments: [
        { label: 'Conforme', value: conformes, color: '#10B981', percent: pctConforme },
        { label: 'Pendente', value: pendentes, color: '#F59E0B', percent: pctPendente },
        { label: 'Não conforme', value: naoConformes, color: '#EF4444', percent: pctNaoConforme },
      ],
    }
  }, [rotinas, execucoes])

  // ---------------------------------------------------------------------------
  // 3. ENRIQUECIMENTO E FILTRAGEM DA TABELA DE EXECUÇÕES
  // ---------------------------------------------------------------------------
  interface ExecucaoEnriquecida extends BackupExecucaoItem {
    ativoNome: string
    ativoCategoria: string
    ativoTipo: string
    tipoBackupLabel: 'Completo' | 'Incremental' | 'Configuração'
    planoNome: string
    rotinaNome: string
    duracaoFormatada: string
    tamanhoDisplay: string
    dataHoraFormatada: string
  }

  const enrichedExecucoes = useMemo<ExecucaoEnriquecida[]>(() => {
    return execucoes.map((exec) => {
      const rotina = rotinasMap.get(exec.rotina)
      const plano = rotina ? planosMap.get(rotina.plano) : undefined

      // Descobrir ativo vinculado (via detalhes_vms, ou confronto_escopo, ou fonte)
      let ativoNome = 'Ativo Geral'
      let ativoCategoria = 'Servidor'
      let ativoTipo = 'servidor_virtualizado'

      if (exec.detalhes_vms && Array.isArray(exec.detalhes_vms) && exec.detalhes_vms.length > 0) {
        const firstVm = exec.detalhes_vms[0]
        ativoNome = firstVm.nome || ativoNome
        if (firstVm.ativo_id && assetsMap.has(firstVm.ativo_id)) {
          const a = assetsMap.get(firstVm.ativo_id)!
          ativoCategoria = a.localizacao || 'Servidor virtualizado'
          ativoTipo = a.tipo
        }
      } else if (exec.confronto_escopo && (exec.confronto_escopo as any).comprovado?.length > 0) {
        const comp = (exec.confronto_escopo as any).comprovado[0]
        ativoNome = comp.ativo_nome || ativoNome
        ativoTipo = comp.ativo_tipo || ativoTipo
        ativoCategoria = 'Servidor virtualizado'
      }

      // Tipo de Backup visual Pastel: Completo, Incremental ou Configuração
      let tipoBackupLabel: 'Completo' | 'Incremental' | 'Configuração' = 'Incremental'
      if (rotina?.tipo_execucao === 'completo') {
        tipoBackupLabel = 'Completo'
      } else if (rotina?.tipo_execucao === 'incremental') {
        tipoBackupLabel = 'Incremental'
      } else if (
        exec.observacao?.toLowerCase().includes('config') ||
        ativoTipo === 'equipamento_rede'
      ) {
        tipoBackupLabel = 'Configuração'
      }

      // Duração calculada a partir de data_inicio e data_fim (se houver) ou observação
      let duracaoFormatada = '—'
      if (exec.data_inicio && exec.data_fim) {
        const diffMs = new Date(exec.data_fim).getTime() - new Date(exec.data_inicio).getTime()
        if (diffMs > 0) {
          const totalSec = Math.floor(diffMs / 1000)
          const h = Math.floor(totalSec / 3600)
          const m = Math.floor((totalSec % 3600) / 60)
          if (h > 0) duracaoFormatada = `${h}h ${m}m`
          else duracaoFormatada = `${m}m`
        }
      }
      if (duracaoFormatada === '—' && exec.observacao) {
        const mDur = exec.observacao.match(/Dura[çc][ãa]o:\s*([0-9:]+)/i)
        if (mDur && mDur[1] && mDur[1] !== 'n/d') {
          duracaoFormatada = mDur[1]
        }
      }

      // Tamanho formatado
      const tamanhoDisplay =
        exec.tamanho_formatado ||
        (exec.tamanho_bytes ? `${Math.round(exec.tamanho_bytes / (1024 * 1024))} MB` : '—')

      // Data/Hora
      const dataIso = exec.data_email || exec.data_inicio || exec.created
      let dataHoraFormatada = '—'
      if (dataIso) {
        try {
          dataHoraFormatada = formatDateTime(dataIso, { includeSeconds: false })
        } catch (_) {
          dataHoraFormatada = dataIso
        }
      }

      return {
        ...exec,
        ativoNome,
        ativoCategoria,
        ativoTipo,
        tipoBackupLabel,
        planoNome: plano?.nome || 'Plano Principal',
        rotinaNome: rotina?.nome || 'Rotina Geral',
        duracaoFormatada,
        tamanhoDisplay,
        dataHoraFormatada,
      }
    })
  }, [execucoes, rotinasMap, planosMap, assetsMap])

  // Filtragem da tabela
  const filteredExecucoes = useMemo(() => {
    return enrichedExecucoes.filter((exec) => {
      // Busca textual
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const match =
          exec.ativoNome.toLowerCase().includes(q) ||
          exec.rotinaNome.toLowerCase().includes(q) ||
          exec.planoNome.toLowerCase().includes(q) ||
          exec.status.toLowerCase().includes(q) ||
          exec.tipoBackupLabel.toLowerCase().includes(q)
        if (!match) return false
      }

      // Tipo de Ativo
      if (filterTipoAtivo !== 'todos') {
        if (filterTipoAtivo === 'servidor' && !exec.ativoTipo.includes('servidor')) return false
        if (filterTipoAtivo === 'estacao' && exec.ativoTipo !== 'estacao') return false
        if (filterTipoAtivo === 'rede' && exec.ativoTipo !== 'equipamento_rede') return false
        if (filterTipoAtivo === 'banco' && exec.ativoTipo !== 'banco_dados') return false
      }

      // Status da Execução
      if (filterStatusExecucao !== 'todos') {
        if (exec.status !== filterStatusExecucao) return false
      }

      // Período (com base em data_inicio/created)
      if (filterPeriodo !== 'todos') {
        const execDate = new Date(exec.data_email || exec.data_inicio || exec.created).getTime()
        const now = Date.now()
        if (filterPeriodo === '24h' && now - execDate > 24 * 60 * 60 * 1000) return false
        if (filterPeriodo === '7dias' && now - execDate > 7 * 24 * 60 * 60 * 1000) return false
        if (filterPeriodo === '30dias' && now - execDate > 30 * 24 * 60 * 60 * 1000) return false
      }

      return true
    })
  }, [enrichedExecucoes, searchTerm, filterTipoAtivo, filterStatusExecucao, filterPeriodo])

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredExecucoes.length / pageSize))
  const paginatedExecucoes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredExecucoes.slice(start, start + pageSize)
  }, [filteredExecucoes, currentPage, pageSize])

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipoAtivo, filterStatusExecucao, filterConformidade, filterPeriodo])

  // Checkbox de seleção da página
  const allCurrentIds = paginatedExecucoes.map((e) => e.id)
  const isAllCurrentSelected =
    allCurrentIds.length > 0 && allCurrentIds.every((id) => selectedExecIds.has(id))

  const toggleSelectAll = () => {
    const next = new Set(selectedExecIds)
    if (isAllCurrentSelected) {
      allCurrentIds.forEach((id) => next.delete(id))
    } else {
      allCurrentIds.forEach((id) => next.add(id))
    }
    setSelectedExecIds(next)
  }

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedExecIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedExecIds(next)
  }

  // ---------------------------------------------------------------------------
  // 4. COLUNA LATERAL DIREITA: PRÓXIMAS EXECUÇÕES, ÚLTIMAS OCORRÊNCIAS, AÇÕES
  // ---------------------------------------------------------------------------
  // Cálculo honesto das próximas 4 execuções agendadas reais com base na periodicidade
  interface ProximaExecucaoItem {
    ativoNome: string
    tipoBackup: string
    rotinaNome: string
    proximoHorarioLabel: string
  }

  const proximasExecucoesCalculadas = useMemo<ProximaExecucaoItem[]>(() => {
    const rotinasAtivas = rotinas.filter((r) => r.status === 'ativo')
    if (rotinasAtivas.length === 0) return []

    const list: ProximaExecucaoItem[] = []

    rotinasAtivas.forEach((rot) => {
      // Buscar fontes vinculadas a esta rotina para obter nome dos ativos reais
      const fontesDaRotina = fontes.filter((f) => f.rotina === rot.id && f.ativo)
      const nomesAtivos =
        fontesDaRotina.length > 0
          ? fontesDaRotina
              .map((f) => {
                const at = assetsMap.get(f.ativo_inventario)
                return at?.name || f.caminho_identificacao || 'Ativo'
              })
              .slice(0, 2)
          : [rot.nome]

      let horarioLabel = ''
      if (rot.periodicidade === 'intervalo_minutos') {
        horarioLabel = `A cada ${rot.intervalo_minutos || 30} min`
      } else if (rot.horario) {
        horarioLabel = `Hoje às ${rot.horario}`
      } else {
        horarioLabel = 'Agendamento diário'
      }

      nomesAtivos.forEach((nome) => {
        list.push({
          ativoNome: nome,
          tipoBackup:
            rot.tipo_execucao === 'completo'
              ? 'Backup completo'
              : rot.tipo_execucao === 'incremental'
                ? 'Backup incremental'
                : 'Backup de rotina',
          rotinaNome: rot.nome,
          proximoHorarioLabel: horarioLabel,
        })
      })
    })

    return list.slice(0, 4)
  }, [rotinas, fontes, assetsMap])

  // Últimas ocorrências reais (máx 4)
  const ultimasOcorrencias = useMemo(() => {
    return ocorrencias.slice(0, 4)
  }, [ocorrencias])

  // Contadores para o Ciclo de Continuidade Operacional
  const ocorrenciasAbertasCount = useMemo(
    () => ocorrencias.filter((o) => o.status !== 'resolvida').length,
    [ocorrencias],
  )

  const cicloSteps = [
    {
      id: 'escopo',
      title: '1. Escopo',
      subtitle: `${ativosExigemBackup.length} ativos exigem backup`,
      count: ativosExigemBackup.length,
      icon: Layers,
      tab: 'escopo',
      status: ativosExigemBackup.length > 0 ? 'Ativo' : 'Vazio',
    },
    {
      id: 'planos',
      title: '2. Planos',
      subtitle: 'RTO / RPO / 3-2-1',
      count: planos.length,
      icon: Sliders,
      tab: 'planos',
      status: planos.length > 0 ? 'Ativo' : 'Vazio',
    },
    {
      id: 'rotinas',
      title: '3. Rotinas',
      subtitle: 'Agendamentos e janelas',
      count: rotinas.length,
      icon: Calendar,
      tab: 'rotinas',
      status: rotinas.length > 0 ? 'Ativo' : 'Vazio',
    },
    {
      id: 'fontes',
      title: '4. Fontes',
      subtitle: 'Regras & Adaptadores',
      count: regras.length,
      icon: Database,
      tab: 'regras',
      status: regras.length > 0 ? 'Ativo' : 'Vazio',
    },
    {
      id: 'evidencias',
      title: '5. Evidências',
      subtitle: 'Comprovantes & Hashes',
      count: evidencias.length,
      nocCount: monitoramentos.length,
      icon: FileCheck2,
      tab: 'evidencias',
      status: evidencias.length > 0 ? 'Ativo' : 'Vazio',
    },
    {
      id: 'execucoes',
      title: '6. Execuções',
      subtitle: 'Histórico & Laudos',
      count: execucoes.length,
      icon: PlayCircle,
      tab: 'execucoes',
      status: execucoes.length > 0 ? 'Ativo' : 'Vazio',
    },
    {
      id: 'ocorrencias',
      title: '7. Ocorrências',
      subtitle: 'Lapsos e falhas',
      count: ocorrenciasAbertasCount,
      icon: AlertTriangle,
      tab: 'ocorrencias',
      status: ocorrenciasAbertasCount === 0 ? 'Em dia' : 'Em aberto',
    },
    {
      id: 'testes',
      title: '8. Testes',
      subtitle: 'Restauração periódica',
      count: testes.length,
      icon: CheckCircle2,
      tab: 'testes',
      status: testes.length > 0 ? 'Ativo' : 'Vazio',
    },
  ]

  return (
    <div className="space-y-5 text-slate-900 font-sans pb-10">
      {/* BANNER DISCRETO DE PREVIEW / HOMOLOGAÇÃO */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs border border-amber-600/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-pulse" />
          <span>
            <strong>PRÉVIA DE HOMOLOGAÇÃO</strong> — Esta é uma rota de preview visual
            (/backup/preview). A tela oficial em produção permanece intocada em /backup até
            aprovação.
          </span>
        </div>
        <Link
          to="/backup"
          className="underline text-[11px] font-bold hover:text-white transition whitespace-nowrap"
        >
          Ir para a tela atual
        </Link>
      </div>

      {/* 1. CABEÇALHO DO ESBOÇO */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5">
          {/* Ícone de database em quadrado azul-escuro arredondado */}
          <div className="w-12 h-12 rounded-xl bg-[#0B2545] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Backup e Recuperação
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Preview Visual
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Gestão, monitoramento e conformidade da proteção dos ativos
            </p>
          </div>
        </div>

        {/* À direita: Pill com última atualização + Botão + Novo Plano + Menu ⋮ */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Pill Última atualização */}
          <div
            onClick={loadAllData}
            role="button"
            className="flex items-center gap-2 text-right cursor-pointer hover:bg-slate-50 transition bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
            title="Recarregar dados reais"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${loading ? 'animate-spin' : ''}`}
            />
            <div className="text-left leading-tight">
              <span className="text-[10px] text-slate-400 font-medium block">
                Última atualização
              </span>
              <span className="text-[11px] font-semibold text-slate-700 font-mono block">
                {lastUpdated || 'Carregando...'}
              </span>
            </div>
          </div>

          {/* Botão primário azul: + Novo Plano */}
          {canOperate && (
            <Button
              onClick={() => navigate('/backup?tab=planos&action=novo')}
              className="bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Novo Plano
            </Button>
          )}

          {/* Botão menu ⋮ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem
                onClick={() => window.open('/relatorios/backup', '_blank')}
                className="cursor-pointer gap-2"
              >
                <FileCheck2 className="w-4 h-4 text-slate-500" /> Relatório Comprobatório A4
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/backup/guia')}
                className="cursor-pointer gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-slate-500" /> Guia de Backup
              </DropdownMenuItem>
              <DropdownMenuItem onClick={loadAllData} className="cursor-pointer gap-2">
                <RefreshCw className="w-4 h-4 text-slate-500" /> Atualizar dados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* BLOCO: CICLO DE CONTINUIDADE OPERACIONAL (mantido a pedido do Leandro no formato do esboço) */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0B2545]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B2545]">
              Ciclo de Continuidade Operacional
            </span>
            <span className="text-slate-300 text-xs hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Clique em qualquer etapa para acessar a aba e configurar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold gap-1 py-0.5">
              <Check className="w-3 h-3 text-emerald-600" />
              Ciclo completamente configurado
            </Badge>
            <Link
              to="/backup/guia"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded-md transition shadow-2xs"
            >
              Guia de Backup
            </Link>
          </div>
        </div>

        {/* 8 Etapas em Cards Brancos com badge no canto superior direito, status verde e seta > */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {cicloSteps.map((st) => {
            const Icon = st.icon
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => navigate(`/backup?tab=${st.tab}`)}
                className="group relative p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 text-left transition flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {/* Badge de contagem real + roxo de NOC se etapa for evidências */}
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {st.count}
                      </span>
                      {st.nocCount !== undefined && st.nocCount > 0 && (
                        <span
                          className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5"
                          title="Monitoramentos do NOC"
                        >
                          <UserCheck className="w-2.5 h-2.5" />
                          {st.nocCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-900 truncate">
                    {st.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-tight">
                    {st.subtitle}
                  </p>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {st.status}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ESTRUTURA PRINCIPAL (ALINHADA COM O ESBOÇO ORIGINAL DO USUÁRIO):
          - Coluna esquerda (largura flexível): 4 KPIs no topo, depois 3 painéis analíticos, depois filtros e tabela de execuções
          - Coluna direita (~280-320px): Sidebar contínua alinhada no topo com os 4 KPIs (Próximas Execuções, Últimas Ocorrências, Ações Rápidas)
      */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* COLUNA ESQUERDA: KPIs + Gráficos Analíticos + Filtros + Tabela */}
        <div className="xl:col-span-9 space-y-5 min-w-0">
          {/* 2. LINHA DE 4 KPIS (Cards brancos com círculo de ícone colorido à esquerda, compactos para caber em 4 colunas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Total de Ativos Protegidos (Database verde) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 block truncate">
                    Total de Ativos Protegidos
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xl sm:text-[26px] font-extrabold text-slate-900 leading-none">
                      {totalAtivosProtegidos}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                    de {totalAtivosInventariados} ativos inventariados
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Execuções Realizadas (Check verde) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 block truncate">
                    Execuções Realizadas
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xl sm:text-[26px] font-extrabold text-slate-900 leading-none">
                      {totalExecucoes}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                    registradas no histórico
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Execuções com Alertas (Alerta âmbar) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 block truncate">
                    Execuções com Alertas
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xl sm:text-[26px] font-extrabold text-slate-900 leading-none">
                      {execucoesComAlertas}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                    {pctAlertas}% do total
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Execuções com Falha (X vermelho) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 block truncate">
                    Execuções com Falha
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xl sm:text-[26px] font-extrabold text-slate-900 leading-none">
                      {execucoesComFalha}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                    {pctFalhas}% do total
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. LINHA DE 3 PAINÉIS ANALÍTICOS (Linguagem idêntica aos gráficos homologados do Inventário) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Painel A: Status das Execuções (Donut) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[250px]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 sm:mb-4">
                  Status das Execuções
                </h3>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 py-0.5">
                  <div className="shrink-0 flex items-center justify-center">
                    <SvgDonutChart
                      data={statusExecucoesData.map((s) => ({
                        label: s.label,
                        value: s.value,
                        color: s.color,
                      }))}
                      totalLabel={String(totalExecucoes)}
                      subLabel="Execuções"
                      size={110}
                      strokeWidth={16}
                    />
                  </div>

                  {/* Legenda com contagem e percentual real */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    {statusExecucoesData.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-slate-600 truncate" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 text-xs whitespace-nowrap pl-1 text-right">
                          {item.value}{' '}
                          <span className="font-normal text-slate-500">({item.percent}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Painel B: Cobertura de Proteção por Tipo de Ativo (Barras horizontais reais) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[250px]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Cobertura de Proteção por Tipo de Ativo
                </h3>
                <div className="my-1">
                  <HorizontalStackedBar categories={coberturaPorTipoAtivo} />
                </div>
              </div>
              {/* Legenda inferior */}
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-center gap-3 text-[11px] text-slate-600 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Protegidos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Parciais
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Sem proteção
                </span>
              </div>
            </Card>

            {/* Painel C: Conformidade das Rotinas (Donut real) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl p-4 sm:p-5 flex flex-col justify-between min-h-[250px]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 sm:mb-4">
                  Conformidade das Rotinas
                </h3>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 py-0.5">
                  <div className="shrink-0 flex items-center justify-center">
                    <SvgDonutChart
                      data={conformidadeRotinas.segments.map((s) => ({
                        label: s.label,
                        value: s.value,
                        color: s.color,
                      }))}
                      totalLabel={`${conformidadeRotinas.pctConforme}%`}
                      subLabel="Conforme"
                      size={110}
                      strokeWidth={16}
                    />
                  </div>

                  {/* Legenda com NOME, QUANTIDADE REAL e PERCENTUAL */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    {conformidadeRotinas.segments.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-slate-600 truncate" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 text-xs whitespace-nowrap pl-1 text-right">
                          {item.percent}%{' '}
                          <span className="font-normal text-slate-500">({item.value})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-2 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
                Total de rotinas:{' '}
                <strong className="text-slate-800">{conformidadeRotinas.total}</strong>
              </div>
            </Card>
          </div>

          {/* BARRA DE FILTROS */}
          <Card className="bg-white border-slate-200 shadow-2xs rounded-xl p-3">
            <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
              {/* Campo de Busca */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por ativo, plano, rotina ou status..."
                  className="pl-9 h-9 text-xs bg-slate-50/70 border-slate-200 rounded-lg placeholder:text-slate-400"
                />
              </div>

              {/* Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Tipo de Ativo */}
                <Select value={filterTipoAtivo} onValueChange={setFilterTipoAtivo}>
                  <SelectTrigger className="h-9 text-xs w-[140px] bg-white border-slate-200">
                    <span className="text-slate-500 mr-1">Tipo:</span>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="servidor">Servidores</SelectItem>
                    <SelectItem value="estacao">Estações</SelectItem>
                    <SelectItem value="banco">Bancos de dados</SelectItem>
                    <SelectItem value="rede">Rede</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status da Execução */}
                <Select value={filterStatusExecucao} onValueChange={setFilterStatusExecucao}>
                  <SelectTrigger className="h-9 text-xs w-[150px] bg-white border-slate-200">
                    <span className="text-slate-500 mr-1">Status:</span>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sucesso">Sucesso</SelectItem>
                    <SelectItem value="parcial">Com alertas</SelectItem>
                    <SelectItem value="erro">Falhas</SelectItem>
                    <SelectItem value="nao_executada">Não executadas</SelectItem>
                  </SelectContent>
                </Select>

                {/* Período */}
                <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                  <SelectTrigger className="h-9 text-xs w-[150px] bg-white border-slate-200">
                    <span className="text-slate-500 mr-1">Período:</span>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todo o histórico</SelectItem>
                    <SelectItem value="24h">Últimas 24h</SelectItem>
                    <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                    <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>

                {/* Botão Limpar / Mais filtros */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterTipoAtivo('todos')
                    setFilterStatusExecucao('todos')
                    setFilterConformidade('todos')
                    setFilterPeriodo('todos')
                  }}
                  className="h-9 text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
                  title="Limpar filtros"
                >
                  Limpar
                </Button>
              </div>
            </div>
          </Card>

          {/* TABELA "ÚLTIMAS EXECUÇÕES DE BACKUP" */}
          <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Últimas Execuções de Backup</h2>
              <Button
                onClick={() => navigate('/backup?tab=execucoes')}
                className="bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-semibold h-8 px-3 gap-1 shadow-2xs"
              >
                Ver histórico completo
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-[11px] select-none">
                    <th className="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Data/Hora
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Ativo
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Tipo
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Rotina / Plano
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Resultado
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Duração
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Tamanho
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700 text-right">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                        Carregando execuções de backup...
                      </td>
                    </tr>
                  ) : paginatedExecucoes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Server className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="font-semibold text-slate-700 block text-xs">
                          Nenhuma execução encontrada
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Ajuste os filtros ou verifique as evidências recebidas.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedExecucoes.map((exec) => {
                      const isChecked = selectedExecIds.has(exec.id)

                      return (
                        <tr
                          key={exec.id}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                          onClick={() => setExecDetail(exec)}
                        >
                          {/* Checkbox */}
                          <td
                            className="py-3 px-3.5 text-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSelectRow(exec.id)
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                            />
                          </td>

                          {/* Data/Hora */}
                          <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-700 text-[11px]">
                            {exec.dataHoraFormatada}
                          </td>

                          {/* Ativo: ícone por tipo + nome em negrito + subtítulo categoria */}
                          <td className="py-3 px-3.5 min-w-[170px]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/80">
                                <Server className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block leading-tight truncate">
                                  {exec.ativoNome}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {exec.ativoCategoria}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Tipo: Badges pastel distintas (Completo, Incremental, Configuração) */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {exec.tipoBackupLabel === 'Completo' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                Completo
                              </span>
                            ) : exec.tipoBackupLabel === 'Incremental' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-700 border border-sky-200">
                                Incremental
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                Configuração
                              </span>
                            )}
                          </td>

                          {/* Rotina / Plano: plano em negrito + rotina em cinza */}
                          <td className="py-3 px-3.5 min-w-[160px]">
                            <span className="font-bold text-slate-900 block leading-tight truncate">
                              {exec.planoNome}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {exec.rotinaNome}
                            </span>
                          </td>

                          {/* Resultado: Sucesso verde, Falha vermelha, Com alertas âmbar */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {exec.status === 'sucesso' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sucesso
                              </span>
                            ) : exec.status === 'erro' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" /> Falha
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Com alertas
                              </span>
                            )}
                          </td>

                          {/* Duração */}
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                            {exec.duracaoFormatada}
                          </td>

                          {/* Tamanho */}
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                            {exec.tamanhoDisplay}
                          </td>

                          {/* Menu ⋯ por linha */}
                          <td
                            className="py-3 px-3.5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={() => setExecDetail(exec)}>
                                  Ver detalhes completos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/backup?tab=execucoes')}>
                                  Abrir na aba Execuções
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação real: "Mostrando 1 a 5 de N registros" */}
            <div className="p-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Mostrando{' '}
                <strong className="text-slate-800">
                  {filteredExecucoes.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </strong>{' '}
                a{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * pageSize, filteredExecucoes.length)}
                </strong>{' '}
                de <strong className="text-slate-800">{filteredExecucoes.length}</strong> registros
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 text-slate-600 border-slate-200"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pNum = i + 1
                  return (
                    <Button
                      key={pNum}
                      variant={currentPage === pNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pNum)}
                      className={`h-7 w-7 p-0 text-xs ${
                        currentPage === pNum
                          ? 'bg-[#1A56DB] text-white hover:bg-[#1E429F]'
                          : 'text-slate-700 border-slate-200'
                      }`}
                    >
                      {pNum}
                    </Button>
                  )
                })}

                {totalPages > 5 && (
                  <>
                    <span className="px-1 text-slate-400">…</span>
                    <Button
                      variant={currentPage === totalPages ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-7 w-7 p-0 text-xs text-slate-700 border-slate-200"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 text-slate-600 border-slate-200"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* COLUNA LATERAL DIREITA: sidebar contínua (~280-320px) alinhada no topo com os KPIs */}
        <div className="xl:col-span-3 space-y-4">
          {/* Card 1: Próximas Execuções */}
          <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Próximas Execuções</span>
              <button
                type="button"
                onClick={() => navigate('/backup?tab=rotinas')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                Ver todas
              </button>
            </div>
            <div className="p-3 space-y-3">
              {proximasExecucoesCalculadas.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  Nenhuma execução agendada com base nas rotinas ativas.
                </div>
              ) : (
                proximasExecucoesCalculadas.map((prox, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                      <Server className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {prox.ativoNome}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {prox.tipoBackup}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {prox.proximoHorarioLabel}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Card 2: Últimas Ocorrências */}
          <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Últimas Ocorrências</span>
              <button
                type="button"
                onClick={() => navigate('/backup?tab=ocorrencias')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                Ver todas
              </button>
            </div>
            <div className="p-3 space-y-3">
              {ultimasOcorrencias.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  Nenhuma ocorrência registrada no ambiente.
                </div>
              ) : (
                ultimasOcorrencias.map((oco) => {
                  const dataFormatada = oco.created
                    ? formatDateTime(oco.created, { includeSeconds: false })
                    : '—'
                  const isResolvida = oco.status === 'resolvida'

                  return (
                    <div key={oco.id} className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isResolvida
                            ? 'bg-emerald-100 text-emerald-700'
                            : oco.severidade === 'alta'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isResolvida ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : oco.severidade === 'alta' ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs text-slate-900 block truncate leading-tight">
                          {oco.titulo}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {oco.descricao || 'Ocorrência operacional'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {dataFormatada}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Card 3: Ações Rápidas (atalhos reais existentes no módulo via ?tab=) */}
          <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">Ações Rápidas</span>
            </div>
            <div className="p-3 space-y-2">
              {canOperate ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/backup?tab=execucoes&action=nova')}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <PlayCircle className="w-4 h-4 text-blue-600" /> Registrar execução manual
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/backup?tab=rotinas&action=nova')}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" /> Agendar nova rotina
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/backup?tab=testes&action=novo')}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Registrar teste de
                    recuperação
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/backup?tab=evidencias&action=nova')}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <FileCheck2 className="w-4 h-4 text-purple-600" /> Importar evidências
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/integracoes')}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <Sliders className="w-4 h-4 text-slate-600" /> Configurar integração
                  </Button>
                </>
              ) : (
                <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Perfil <strong>Usuário (Consulta)</strong>: acesso apenas para visualização e
                  relatórios.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* DIALOG DE DETALHES DA EXECUÇÃO SELECIONADA */}
      <Dialog open={Boolean(execDetail)} onOpenChange={(open) => !open && setExecDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              Detalhes da Execução de Backup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registro auditável processado pela plataforma CSCTI
            </DialogDescription>
          </DialogHeader>

          {execDetail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Status
                  </span>
                  <Badge
                    variant="outline"
                    className={`mt-1 font-bold ${
                      execDetail.status === 'sucesso'
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                        : execDetail.status === 'erro'
                          ? 'text-rose-800 bg-rose-50 border-rose-300'
                          : 'text-amber-800 bg-amber-50 border-amber-300'
                    }`}
                  >
                    {execDetail.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Origem do Registro
                  </span>
                  <span className="font-semibold text-slate-800 block mt-1 uppercase">
                    {execDetail.origem_registro || 'evidencia'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Data do Comprovante
                  </span>
                  <span className="font-mono text-slate-700 block mt-1">
                    {execDetail.data_email
                      ? formatDateTime(execDetail.data_email, { includeSeconds: false })
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Destino da Cópia
                  </span>
                  <span className="font-semibold text-slate-800 block mt-1">
                    {execDetail.destino || 'Repositório configurado'}
                  </span>
                </div>
              </div>

              {execDetail.observacao && (
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Observações do Processamento
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                    {execDetail.observacao}
                  </p>
                </div>
              )}

              {execDetail.detalhes_vms &&
                Array.isArray(execDetail.detalhes_vms) &&
                execDetail.detalhes_vms.length > 0 && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                      Máquinas / Ativos Inspecionados ({execDetail.detalhes_vms.length})
                    </span>
                    <div className="space-y-1">
                      {execDetail.detalhes_vms.map((vm: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-50 text-[11px]"
                        >
                          <span className="font-bold text-slate-800">{vm.nome}</span>
                          <span
                            className={`font-semibold ${
                              vm.status === 'success' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {vm.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BackupOverviewPreviewPage
