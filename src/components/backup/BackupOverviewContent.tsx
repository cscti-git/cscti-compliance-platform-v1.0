import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateTime } from '@/lib/dateTime'
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Server,
  Layers,
  FileCheck2,
  PlayCircle,
  Sliders,
  Check,
  UserCheck,
  Calendar,
  ShieldCheck,
  HelpCircle,
  Printer,
  SlidersHorizontal,
  Monitor,
  Database as DatabaseIcon,
  HardDrive,
  FileText,
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
import { listInventoryAssets } from '@/services/csctiService'
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
} from '@/types/cscti'
import { SvgDonutChart, HorizontalStackedBar } from '@/components/backup/BackupPreviewCharts'
import { BackupNocValidacaoCard } from '@/components/backup/BackupNocValidacaoCard'
import { KpiCard } from '@/components/common/KpiCard'
import { PanelHeader } from '@/components/common/PanelHeader'

export interface BackupOverviewContentProps {
  showPreviewBanner?: boolean
  onSelectTab?: (tab: string, extraParams?: Record<string, string>) => void
}

export const BackupOverviewContent: React.FC<BackupOverviewContentProps> = ({
  showPreviewBanner = false,
  onSelectTab,
}) => {
  const { organization, role } = useAuth()
  const navigate = useNavigate()
  const orgId = organization?.id || ''
  const canOperate = role === 'admin' || role === 'suporte'

  // Navegação unificada: usa onSelectTab se fornecido (para abas da tela oficial) ou navigate (para preview)
  const handleNavigateTab = (tab: string, extraParams?: Record<string, string>) => {
    if (onSelectTab) {
      onSelectTab(tab, extraParams)
    } else {
      const q = new URLSearchParams({ tab, ...(extraParams || {}) }).toString()
      navigate(`/backup?${q}`)
    }
  }

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

  // Momento da última recarga efetiva dos dados
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    const d = new Date()
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  })

  // Filtros da tabela
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipoAtivo, setFilterTipoAtivo] = useState('todos')
  const [filterStatusExecucao, setFilterStatusExecucao] = useState('todos')
  const [filterConformidade, setFilterConformidade] = useState('todos') // 'todos' | 'conforme' | 'nao_conforme' | 'atencao'
  const [filterPeriodo, setFilterPeriodo] = useState('30dias') // Padrão conforme modelo de referência: 'Últimos 30 dias'
  const [filterModalidade, setFilterModalidade] = useState('todos') // 'todos' | 'local' | 'nuvem' | 'replicacao'
  const [filterTipoBackup, setFilterTipoBackup] = useState('todos') // 'todos' | 'completo' | 'incremental' | 'configuracao'
  const [maisFiltrosOpen, setMaisFiltrosOpen] = useState(false)

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

      // Atualizar para o momento exato da recarga efetiva dos dados (mesmo padrão de AssetsPage)
      const d = new Date()
      setLastUpdated(
        `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      )
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
  // 1. DADOS DOS 4 KPIS SUPERIORES
  // Comprovações efetivas registradas no histórico e confronto por ativo
  // ---------------------------------------------------------------------------
  interface VmItemResumo {
    nome: string
    status: string
    ativoId?: string
    localizacao?: string
    tipo?: string
  }

  type ModalidadeKey = 'local' | 'nuvem' | 'replicacao'

  const inferirModalidadeInfo = (
    obsStr: string,
    rotinaNome: string,
    destinoStr: string,
  ): { key: ModalidadeKey; label: 'Local' | 'Nuvem' | 'Replicação' } => {
    const obs = (obsStr || '').toLowerCase()
    const rot = (rotinaNome || '').toLowerCase()
    const dest = (destinoStr || '').toLowerCase()

    if (
      obs.includes('copy job:') ||
      obs.includes('backup copy job:') ||
      obs.includes('veeam backup_copy:')
    ) {
      return { key: 'nuvem', label: 'Nuvem' }
    }
    if (obs.includes('replication job:') || obs.includes('veeam replication:')) {
      return { key: 'replicacao', label: 'Replicação' }
    }
    if (obs.includes('backup job:') || obs.includes('veeam backup:')) {
      return { key: 'local', label: 'Local' }
    }

    if (/-\s*r[eé]plicas?$|\breplica[çc][aã]o$/i.test(rot)) {
      return { key: 'replicacao', label: 'Replicação' }
    }
    if (/to cloud/i.test(rot) || /-\s*nuvens?$/i.test(rot) || /cloud/i.test(rot)) {
      return { key: 'nuvem', label: 'Nuvem' }
    }
    if (/-\s*local$/i.test(rot)) {
      return { key: 'local', label: 'Local' }
    }

    const temLocal = /\blocal\b/i.test(dest)
    const temNuvem = /\b(?:nuvens?|cloud|s3)\b/i.test(dest)
    const temReplica = /\b(?:r[eé]plicas?|replication)\b/i.test(dest)
    const cnt = (temLocal ? 1 : 0) + (temNuvem ? 1 : 0) + (temReplica ? 1 : 0)
    if (cnt === 1) {
      if (temReplica) return { key: 'replicacao', label: 'Replicação' }
      if (temNuvem) return { key: 'nuvem', label: 'Nuvem' }
      if (temLocal) return { key: 'local', label: 'Local' }
    }

    return { key: 'local', label: 'Local' }
  }

  const normalizarNomeAtivo = (txt?: string) => {
    if (!txt) return ''
    return txt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim()
  }

  // Mapa de comprovações efetivas reais registradas por ativo e por modalidade
  // (exclusivamente execuções reais de backup com sucesso, jamais NOC)
  const ativosProtecaoEfetiva = useMemo(() => {
    return ativosExigemBackup.map((ativo) => {
      const normId = ativo.id
      const normNome = normalizarNomeAtivo(ativo.name)

      const comprovacoesPorMod = {
        local: false,
        nuvem: false,
        replicacao: false,
      }

      // 1. Verificar através das execuções reais de backup com sucesso
      execucoes
        .filter((e) => e.status === 'sucesso')
        .forEach((exec) => {
          const rotina = rotinasMap.get(exec.rotina)
          const rotinaNome = rotina?.nome || ''
          const modalidadeInfo = inferirModalidadeInfo(
            exec.observacao || '',
            rotinaNome,
            exec.destino || '',
          )
          const modKey = modalidadeInfo.key

          let bateuAtivo = false

          // Verifica em detalhes_vms
          if (Array.isArray(exec.detalhes_vms)) {
            for (const vm of exec.detalhes_vms) {
              const st = String(vm?.status || '').toLowerCase()
              const isOk = st === 'success' || st === 'ok' || !st
              if (isOk && (vm?.ativo_id === normId || normalizarNomeAtivo(vm?.nome) === normNome)) {
                bateuAtivo = true
                break
              }
            }
          }

          // Verifica em confronto_escopo.comprovado
          if (!bateuAtivo && (exec.confronto_escopo as any)?.comprovado) {
            const comps = (exec.confronto_escopo as any).comprovado
            if (Array.isArray(comps)) {
              for (const comp of comps) {
                if (
                  comp?.ativo_id === normId ||
                  normalizarNomeAtivo(comp?.ativo_nome) === normNome ||
                  normalizarNomeAtivo(comp?.item_comprovante) === normNome
                ) {
                  bateuAtivo = true
                  break
                }
              }
            }
          }

          if (bateuAtivo && (modKey === 'local' || modKey === 'nuvem' || modKey === 'replicacao')) {
            comprovacoesPorMod[modKey] = true
          }
        })

      // 2. Confronto direto por ativo (se houver comprovação registrada no motor de confronto)
      const confItem = confrontoData?.confronto?.find(
        (c) => c.id === ativo.id || normalizarNomeAtivo(c.nome) === normNome,
      )
      if (confItem?.modalidades) {
        if (confItem.modalidades.local?.ultima_comprovacao) comprovacoesPorMod.local = true
        if (confItem.modalidades.nuvem?.ultima_comprovacao) comprovacoesPorMod.nuvem = true
        if (confItem.modalidades.replicacao?.ultima_comprovacao)
          comprovacoesPorMod.replicacao = true
      }

      const exigeLocal = Boolean(ativo.exige_backup_local)
      const exigeNuvem = Boolean(ativo.exige_backup_nuvem)
      const exigeReplicacao = Boolean(ativo.exige_backup_replicacao)

      let exigidasCount = 0
      let atendidasCount = 0

      if (exigeLocal) {
        exigidasCount++
        if (comprovacoesPorMod.local) atendidasCount++
      }
      if (exigeNuvem) {
        exigidasCount++
        if (comprovacoesPorMod.nuvem) atendidasCount++
      }
      if (exigeReplicacao) {
        exigidasCount++
        if (comprovacoesPorMod.replicacao) atendidasCount++
      }

      if (exigidasCount === 0) {
        exigidasCount = 3
        if (comprovacoesPorMod.local) atendidasCount++
        if (comprovacoesPorMod.nuvem) atendidasCount++
        if (comprovacoesPorMod.replicacao) atendidasCount++
      }

      const completamenteProtegido = exigidasCount > 0 && atendidasCount === exigidasCount
      const parcialmenteProtegido = atendidasCount > 0

      return {
        ativo,
        exigidasCount,
        atendidasCount,
        completamenteProtegido,
        parcialmenteProtegido,
        comprovacoesPorMod,
      }
    })
  }, [ativosExigemBackup, execucoes, rotinasMap, confrontoData])

  const totalExigidosConfronto = useMemo(() => {
    if (ativosExigemBackup.length > 0) return ativosExigemBackup.length
    if (confrontoData?.totais?.total_ativos_exigidos !== undefined) {
      return confrontoData.totais.total_ativos_exigidos
    }
    return 0
  }, [ativosExigemBackup, confrontoData])

  const totalAtivosProtegidosCompleto = useMemo(() => {
    if (ativosProtecaoEfetiva.length > 0) {
      return ativosProtecaoEfetiva.filter((a) => a.completamenteProtegido).length
    }
    if (confrontoData?.totais?.total_protegidos_completo !== undefined) {
      return confrontoData.totais.total_protegidos_completo
    }
    return 0
  }, [ativosProtecaoEfetiva, confrontoData])

  const totalAtivosComProtecao = useMemo(() => {
    if (ativosProtecaoEfetiva.length > 0) {
      return ativosProtecaoEfetiva.filter((a) => a.parcialmenteProtegido).length
    }
    if (confrontoData?.totais?.total_parcialmente_protegidos !== undefined) {
      return confrontoData.totais.total_parcialmente_protegidos
    }
    return totalAtivosProtegidosCompleto
  }, [ativosProtecaoEfetiva, confrontoData, totalAtivosProtegidosCompleto])

  const percentualProtegidoConfronto = useMemo(() => {
    if (totalExigidosConfronto > 0) {
      const somaPonderada = ativosProtecaoEfetiva.reduce((acc, curr) => {
        return acc + (curr.exigidasCount > 0 ? curr.atendidasCount / curr.exigidasCount : 0)
      }, 0)
      return Math.round((somaPonderada / totalExigidosConfronto) * 100)
    }
    return 0
  }, [ativosProtecaoEfetiva, totalExigidosConfronto])

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
  const coberturaPorTipoAtivo = useMemo(() => {
    const categoriasBase = [
      {
        key: 'servidor',
        label: 'Servidores virtualizados',
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

    const resultados = categoriasBase
      .map((cat) => {
        const ativosDaCat = ativosExigemBackup.filter((a) => cat.tipos.includes(a.tipo))
        const total = ativosDaCat.length
        if (total === 0) return null

        let protegidos = 0
        let parciais = 0
        let semProtecao = 0

        ativosDaCat.forEach((ativo) => {
          const infoEfetiva = ativosProtecaoEfetiva.find((ap) => ap.ativo.id === ativo.id)
          if (infoEfetiva) {
            if (infoEfetiva.completamenteProtegido) {
              protegidos++
            } else if (infoEfetiva.parcialmenteProtegido) {
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
  }, [ativosExigemBackup, ativosProtecaoEfetiva])

  const conformidadeRotinas = useMemo(() => {
    // Decisão expressa do usuário: Validação Externa (NOC) é exclusivamente análise extra,
    // não fonte comprobatória. O donut e o percentual consideram EXCLUSIVAMENTE rotinas de backup reais.
    let conformes = 0
    let pendentes = 0
    let naoConformes = 0
    let totalRotinasBackup = 0
    let totalRotinasNoc = 0
    let rotinasNocAtivas = 0

    rotinas.forEach((r) => {
      const nomeUpper = (r.nome || '').toUpperCase()
      const isRotinaNoc =
        nomeUpper.includes('ANALISE PREVENTIVA') ||
        nomeUpper.includes('PREVENTIVA DIARIA') ||
        nomeUpper.includes('NOC') ||
        fontes.some(
          (f) =>
            f.rotina === r.id &&
            ((f.caminho_identificacao && f.caminho_identificacao.toUpperCase().includes('NOC')) ||
              regras.some((rg) => rg.fonte === f.id && rg.adaptador === 'NOC_DIARIO')),
        )

      if (isRotinaNoc) {
        totalRotinasNoc++
        if (r.status !== 'inativo') {
          rotinasNocAtivas++
        }
        return // Excluída da base de cálculo comprobatória do donut
      }

      totalRotinasBackup++

      if (r.status === 'inativo') {
        naoConformes++
        return
      }

      const execsDaRotina = execucoes.filter((e) => e.rotina === r.id)
      if (execsDaRotina.length === 0) {
        pendentes++
      } else {
        const ult = execsDaRotina[0]
        if (ult.status === 'sucesso') conformes++
        else if (ult.status === 'parcial') pendentes++
        else naoConformes++
      }
    })

    const pctConforme =
      totalRotinasBackup > 0 ? Math.round((conformes / totalRotinasBackup) * 100) : 0
    const pctPendente =
      totalRotinasBackup > 0 ? Math.round((pendentes / totalRotinasBackup) * 100) : 0
    const pctNaoConforme =
      totalRotinasBackup > 0 ? Math.round((naoConformes / totalRotinasBackup) * 100) : 0

    return {
      total: totalRotinasBackup,
      totalGeralComNoc: rotinas.length,
      totalRotinasNoc,
      rotinasNocAtivas,
      pctConforme,
      conformes,
      pendentes,
      naoConformes,
      segments: [
        { label: 'Conforme', value: conformes, color: '#10B981', percent: pctConforme },
        { label: 'Pendente', value: pendentes, color: '#F59E0B', percent: pctPendente },
        { label: 'Não conforme', value: naoConformes, color: '#EF4444', percent: pctNaoConforme },
      ],
    }
  }, [rotinas, execucoes, fontes, regras])

  // ---------------------------------------------------------------------------
  // 3. ENRIQUECIMENTO E FILTRAGEM DA TABELA DE EXECUÇÕES
  // ---------------------------------------------------------------------------
  interface ExecucaoEnriquecida extends BackupExecucaoItem {
    ativoTitulo: string
    ativoModalidadeLabel: 'Local' | 'Nuvem' | 'Replicação'
    ativoModalidadeKey: ModalidadeKey
    ativoSubtitulo: string
    ativoNome: string
    ativoCategoria: string
    ativoTipo: string
    vmsComprovadas: VmItemResumo[]
    vmsNomesFormatados: string
    temMultiplasVms: boolean
    tipoBackupLabel: 'Completo' | 'Incremental' | 'Configuração'
    planoNome: string
    rotinaNome: string
    duracaoFormatada: string
    tamanhoDisplay: string
    dataHoraFormatada: string
    dataEmailTime: number
  }

  const enrichedExecucoes = useMemo<ExecucaoEnriquecida[]>(() => {
    const list = execucoes.map((exec) => {
      const rotina = rotinasMap.get(exec.rotina)
      const plano = rotina ? planosMap.get(rotina.plano) : undefined
      const rotinaNome = rotina?.nome || 'Rotina Geral'
      const planoNome = plano?.nome || 'Plano Principal'

      const vmsComprovadas: VmItemResumo[] = []
      if (exec.detalhes_vms && Array.isArray(exec.detalhes_vms) && exec.detalhes_vms.length > 0) {
        exec.detalhes_vms.forEach((vm: any) => {
          const asset = vm.ativo_id ? assetsMap.get(vm.ativo_id) : undefined
          vmsComprovadas.push({
            nome: vm.nome || 'VM',
            status: vm.status || 'success',
            ativoId: vm.ativo_id,
            localizacao: asset?.localizacao,
            tipo: asset?.tipo || 'servidor_virtualizado',
          })
        })
      } else if (
        exec.confronto_escopo &&
        Array.isArray((exec.confronto_escopo as any).comprovado) &&
        (exec.confronto_escopo as any).comprovado.length > 0
      ) {
        ;(exec.confronto_escopo as any).comprovado.forEach((comp: any) => {
          const asset = comp.ativo_id ? assetsMap.get(comp.ativo_id) : undefined
          vmsComprovadas.push({
            nome: comp.ativo_nome || comp.item_comprovante || 'Ativo',
            status: 'success',
            ativoId: comp.ativo_id,
            localizacao: asset?.localizacao,
            tipo: comp.ativo_tipo || asset?.tipo || 'servidor_virtualizado',
          })
        })
      }

      const modalidadeInfo = inferirModalidadeInfo(
        exec.observacao || '',
        rotinaNome,
        exec.destino || '',
      )
      const ativoModalidadeLabel = modalidadeInfo.label
      const ativoModalidadeKey = modalidadeInfo.key

      let ativoTitulo = ''
      let ativoSubtitulo = ''
      const totalVms = vmsComprovadas.length
      const temMultiplasVms = totalVms > 1

      if (totalVms > 0) {
        if (totalVms === 1) {
          ativoTitulo = vmsComprovadas[0].nome
          ativoSubtitulo = '1 VM comprovada'
        } else {
          ativoTitulo = vmsComprovadas.map((v) => v.nome).join(', ')
          ativoSubtitulo = `${totalVms} VMs comprovadas`
        }
      } else {
        ativoTitulo = rotinaNome
        ativoSubtitulo = 'Rotina de backup'
      }

      const vmsNomesFormatados =
        vmsComprovadas.length > 0 ? vmsComprovadas.map((v) => v.nome).join(', ') : ativoTitulo

      const ativoNome = vmsComprovadas.length > 0 ? vmsComprovadas[0].nome : 'Ativo Geral'
      const ativoCategoria =
        vmsComprovadas.length > 0 && vmsComprovadas[0].localizacao
          ? vmsComprovadas[0].localizacao
          : 'Servidor virtualizado'
      const ativoTipo =
        vmsComprovadas.length > 0 && vmsComprovadas[0].tipo
          ? vmsComprovadas[0].tipo
          : 'servidor_virtualizado'

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

      const tamanhoDisplay =
        exec.tamanho_formatado ||
        (exec.tamanho_bytes ? `${Math.round(exec.tamanho_bytes / (1024 * 1024))} MB` : '—')

      const dataIso = exec.data_email || exec.data_inicio || exec.created
      let dataHoraFormatada = '—'
      let dataEmailTime = 0
      if (dataIso) {
        try {
          dataHoraFormatada = formatDateTime(dataIso, { includeSeconds: false })
          const parsed = new Date(dataIso.replace(' ', 'T')).getTime()
          dataEmailTime = isNaN(parsed) ? 0 : parsed
        } catch (_) {
          dataHoraFormatada = dataIso
        }
      }

      return {
        ...exec,
        ativoTitulo,
        ativoModalidadeLabel,
        ativoModalidadeKey,
        ativoSubtitulo,
        ativoNome,
        ativoCategoria,
        ativoTipo,
        vmsComprovadas,
        vmsNomesFormatados,
        temMultiplasVms,
        tipoBackupLabel,
        planoNome,
        rotinaNome,
        duracaoFormatada,
        tamanhoDisplay,
        dataHoraFormatada,
        dataEmailTime,
      }
    })

    list.sort((a, b) => b.dataEmailTime - a.dataEmailTime)
    return list
  }, [execucoes, rotinasMap, planosMap, assetsMap])

  const execucoesContextoFiltro = useMemo(() => {
    return enrichedExecucoes.filter((exec) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const match =
          exec.ativoTitulo.toLowerCase().includes(q) ||
          exec.vmsNomesFormatados.toLowerCase().includes(q) ||
          exec.ativoNome.toLowerCase().includes(q) ||
          exec.rotinaNome.toLowerCase().includes(q) ||
          exec.planoNome.toLowerCase().includes(q) ||
          exec.status.toLowerCase().includes(q) ||
          exec.tipoBackupLabel.toLowerCase().includes(q) ||
          exec.ativoModalidadeLabel.toLowerCase().includes(q)
        if (!match) return false
      }

      if (filterTipoAtivo !== 'todos') {
        const matchTipo = exec.vmsComprovadas.some((vm) => {
          if (!vm.tipo) return false
          if (filterTipoAtivo === 'servidor' && vm.tipo.includes('servidor')) return true
          if (filterTipoAtivo === 'estacao' && vm.tipo === 'estacao') return true
          if (filterTipoAtivo === 'rede' && vm.tipo === 'equipamento_rede') return true
          if (filterTipoAtivo === 'banco' && vm.tipo === 'banco_dados') return true
          return false
        })
        if (!matchTipo) {
          if (filterTipoAtivo === 'servidor' && !exec.ativoTipo.includes('servidor')) return false
          if (filterTipoAtivo === 'estacao' && exec.ativoTipo !== 'estacao') return false
          if (filterTipoAtivo === 'rede' && exec.ativoTipo !== 'equipamento_rede') return false
          if (filterTipoAtivo === 'banco' && exec.ativoTipo !== 'banco_dados') return false
        }
      }

      if (filterPeriodo !== 'todos') {
        if (exec.dataEmailTime > 0) {
          const now = Date.now()
          if (filterPeriodo === '24h' && now - exec.dataEmailTime > 24 * 60 * 60 * 1000)
            return false
          if (filterPeriodo === '7dias' && now - exec.dataEmailTime > 7 * 24 * 60 * 60 * 1000)
            return false
          if (filterPeriodo === '30dias' && now - exec.dataEmailTime > 30 * 24 * 60 * 60 * 1000)
            return false
        }
      }

      if (filterConformidade !== 'todos') {
        if (filterConformidade === 'conforme' && exec.status !== 'sucesso') return false
        if (filterConformidade === 'atencao' && exec.status !== 'parcial') return false
        if (
          filterConformidade === 'nao_conforme' &&
          exec.status !== 'erro' &&
          exec.status !== 'nao_executada'
        )
          return false
      }

      if (filterModalidade !== 'todos') {
        const modLower = (exec.ativoModalidadeKey || exec.ativoModalidadeLabel || '').toLowerCase()
        if (filterModalidade === 'local' && !modLower.includes('local')) return false
        if (
          filterModalidade === 'nuvem' &&
          !modLower.includes('nuvem') &&
          !modLower.includes('cloud')
        )
          return false
        if (
          filterModalidade === 'replicacao' &&
          !modLower.includes('replic') &&
          !modLower.includes('offsite')
        )
          return false
      }

      if (filterTipoBackup !== 'todos') {
        const tipoLabelLower = exec.tipoBackupLabel.toLowerCase()
        if (filterTipoBackup === 'completo' && tipoLabelLower !== 'completo') return false
        if (filterTipoBackup === 'incremental' && tipoLabelLower !== 'incremental') return false
        if (filterTipoBackup === 'configuracao' && tipoLabelLower !== 'configuração') return false
      }

      return true
    })
  }, [
    enrichedExecucoes,
    searchTerm,
    filterTipoAtivo,
    filterPeriodo,
    filterConformidade,
    filterModalidade,
    filterTipoBackup,
  ])

  const filteredExecucoes = useMemo(() => {
    if (filterStatusExecucao === 'todos') {
      return execucoesContextoFiltro
    }
    return execucoesContextoFiltro.filter((exec) => exec.status === filterStatusExecucao)
  }, [execucoesContextoFiltro, filterStatusExecucao])

  const statusExecucoesData = useMemo(() => {
    const total = execucoesContextoFiltro.length
    const sucessoCount = execucoesContextoFiltro.filter((e) => e.status === 'sucesso').length
    const alertaCount = execucoesContextoFiltro.filter((e) => e.status === 'parcial').length
    const falhaCount = execucoesContextoFiltro.filter((e) => e.status === 'erro').length
    const naoExecCount = execucoesContextoFiltro.filter((e) => e.status === 'nao_executada').length

    return {
      total,
      segments: [
        {
          label: 'Sucesso',
          value: sucessoCount,
          percent: total > 0 ? Math.round((sucessoCount / total) * 100) : 0,
          color: '#10B981',
        },
        {
          label: 'Com alertas',
          value: alertaCount,
          percent: total > 0 ? Math.round((alertaCount / total) * 100) : 0,
          color: '#F59E0B',
        },
        {
          label: 'Falhas',
          value: falhaCount,
          percent: total > 0 ? Math.round((falhaCount / total) * 100) : 0,
          color: '#EF4444',
        },
        {
          label: 'Não executadas',
          value: naoExecCount,
          percent: total > 0 ? Math.round((naoExecCount / total) * 100) : 0,
          color: '#94A3B8',
        },
      ],
    }
  }, [execucoesContextoFiltro])

  const totalPages = Math.max(1, Math.ceil(filteredExecucoes.length / pageSize))
  const paginatedExecucoes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredExecucoes.slice(start, start + pageSize)
  }, [filteredExecucoes, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchTerm,
    filterTipoAtivo,
    filterStatusExecucao,
    filterConformidade,
    filterPeriodo,
    filterModalidade,
    filterTipoBackup,
  ])

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
  interface ProximaExecucaoItem {
    ativoNome: string
    tipoBackup: string
    rotinaNome: string
    proximoHorarioLabel: string
    ordemPrioridade: number
  }

  const proximasExecucoesCalculadas = useMemo<ProximaExecucaoItem[]>(() => {
    const rotinasAtivas = rotinas.filter((r) => r.status === 'ativo')
    if (rotinasAtivas.length === 0) return []

    const list: ProximaExecucaoItem[] = []

    rotinasAtivas.forEach((rot) => {
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
      let ordemPrioridade = 999

      if (rot.periodicidade === 'intervalo_minutos') {
        horarioLabel = `A cada ${rot.intervalo_minutos || 30} min`
        ordemPrioridade = rot.intervalo_minutos || 30
      } else if (rot.horario) {
        horarioLabel = `Hoje às ${rot.horario}`
        const [hh, mm] = rot.horario.split(':').map(Number)
        ordemPrioridade = 1000 + (hh || 0) * 60 + (mm || 0)
      } else {
        horarioLabel = 'Agendamento diário'
        ordemPrioridade = 3000
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
          ordemPrioridade,
        })
      })
    })

    list.sort((a, b) => a.ordemPrioridade - b.ordemPrioridade)
    return list.slice(0, 4)
  }, [rotinas, fontes, assetsMap])

  const ultimasOcorrencias = useMemo(() => {
    return ocorrencias.slice(0, 4)
  }, [ocorrencias])

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
      {/* BANNER OPCIONAL DE PREVIEW / HOMOLOGAÇÃO (apenas na rota preview) */}
      {showPreviewBanner && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs border border-amber-600/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-pulse" />
            <span>
              <strong>PRÉVIA DE HOMOLOGAÇÃO</strong> — Esta é uma rota de preview visual
              (/backup/preview). A tela oficial em produção agora também renderiza este layout
              homologado.
            </span>
          </div>
          <Link
            to="/backup"
            className="underline text-[11px] font-bold hover:text-white transition whitespace-nowrap"
          >
            Ir para a tela oficial
          </Link>
        </div>
      )}

      {/* BLOCO: CICLO DE CONTINUIDADE OPERACIONAL */}
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
                onClick={() => handleNavigateTab(st.tab)}
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
                          title="Validação Externa (NOC) — Monitoramentos externos registrados"
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

      {/* ESTRUTURA PRINCIPAL:
          - Coluna esquerda: 4 KPIs no topo, depois 3 painéis analíticos, depois filtros e tabela de execuções
          - Coluna direita: Sidebar contínua alinhada no topo com os 4 KPIs (Próximas Execuções, Últimas Ocorrências, Ações Rápidas)
      */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* COLUNA ESQUERDA: KPIs + Gráficos Analíticos + Filtros + Tabela */}
        <div className="xl:col-span-9 space-y-5 min-w-0">
          {/* 2. LINHA DE 4 KPIS UNIFORMIZADOS (KpiCard padronizado do produto sem truncamento) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Total de Ativos Protegidos (Database verde) */}
            <KpiCard
              label="Total de Ativos Protegidos"
              value={totalAtivosProtegidosCompleto}
              secondaryValue={`/ ${totalExigidosConfronto} exigidos`}
              supportText={`${percentualProtegidoConfronto}% de cobertura • ${totalAtivosComProtecao} ativos`}
              icon={Database}
              iconBgColor="bg-emerald-100"
              iconColor="text-emerald-600"
              href="/backup?tab=escopo"
            />

            {/* KPI 2: Execuções Realizadas (CheckCircle2 verde) */}
            <KpiCard
              label="Execuções Realizadas"
              value={totalExecucoes}
              supportText="registradas no histórico"
              icon={CheckCircle2}
              iconBgColor="bg-emerald-100"
              iconColor="text-emerald-600"
              href="/backup?tab=execucoes"
            />

            {/* KPI 3: Execuções com Alertas (AlertTriangle âmbar) */}
            <KpiCard
              label="Execuções com Alertas"
              value={execucoesComAlertas}
              supportText={`${pctAlertas}% do total`}
              icon={AlertTriangle}
              iconBgColor={execucoesComAlertas > 0 ? 'bg-amber-100' : 'bg-slate-100'}
              iconColor={execucoesComAlertas > 0 ? 'text-amber-600' : 'text-slate-600'}
              href="/backup?tab=execucoes"
            />

            {/* KPI 4: Execuções com Falha (XCircle vermelho) */}
            <KpiCard
              label="Execuções com Falha"
              value={execucoesComFalha}
              supportText={`${pctFalhas}% do total`}
              icon={XCircle}
              iconBgColor={execucoesComFalha > 0 ? 'bg-rose-100' : 'bg-slate-100'}
              iconColor={execucoesComFalha > 0 ? 'text-rose-600' : 'text-slate-600'}
              href="/backup?tab=execucoes"
            />
          </div>

          {/* 3. LINHA DE 3 PAINÉIS ANALÍTICOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Painel A: Status das Execuções (Donut) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl p-3.5 sm:p-4 2xl:p-5 flex flex-col justify-between min-h-[250px] min-w-0 overflow-hidden">
              <div className="min-w-0 w-full">
                <div className="min-h-[38px] mb-2 sm:mb-3 flex items-start">
                  <h3 className="text-xs sm:text-[13px] 2xl:text-sm font-bold text-slate-900 leading-tight truncate">
                    Status das Execuções
                  </h3>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 py-0.5 min-w-0 w-full">
                  <div className="shrink-0 flex items-center justify-center">
                    <SvgDonutChart
                      data={statusExecucoesData.segments.map((s) => ({
                        label: s.label,
                        value: s.value,
                        color: s.color,
                      }))}
                      totalLabel={String(statusExecucoesData.total)}
                      subLabel="Execuções"
                      size={98}
                      strokeWidth={14}
                    />
                  </div>

                  {/* Legenda com contagem e percentual real sem estouro/corte */}
                  <div className="flex-1 min-w-0 w-full space-y-1.5 text-xs">
                    {statusExecucoesData.segments.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-1.5 text-slate-700 hover:text-slate-900 transition-colors min-w-0"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[11px] text-slate-600 truncate" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 text-[11px] whitespace-nowrap shrink-0 text-right tabular-nums">
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
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl p-3.5 sm:p-4 2xl:p-5 flex flex-col justify-between min-h-[250px] min-w-0 overflow-hidden">
              <div className="min-w-0 w-full">
                <div className="min-h-[38px] mb-2 sm:mb-3 flex items-start">
                  <h3
                    className="text-xs sm:text-[13px] 2xl:text-sm font-bold text-slate-900 leading-tight truncate"
                    title="Cobertura de Proteção por Tipo de Ativo"
                  >
                    Cobertura de Proteção por Tipo de Ativo
                  </h3>
                </div>
                <div className="my-1 min-w-0 w-full">
                  <HorizontalStackedBar categories={coberturaPorTipoAtivo} />
                </div>
              </div>
              {/* Legenda inferior */}
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-center gap-3 text-[11px] text-slate-600 flex-wrap">
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Protegidos
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Parciais
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Sem proteção
                </span>
              </div>
            </Card>

            {/* Painel C: Conformidade das Rotinas (Donut real considerando exclusivamente rotinas de backup) */}
            <Card className="bg-white border-slate-200 shadow-2xs rounded-xl p-3.5 sm:p-4 2xl:p-5 flex flex-col justify-between min-h-[250px] min-w-0 overflow-hidden">
              <div className="min-w-0 w-full">
                <div className="min-h-[38px] mb-2 sm:mb-3 flex flex-col justify-start gap-1">
                  <h3
                    className="text-xs sm:text-[13px] 2xl:text-sm font-bold text-slate-900 leading-tight whitespace-normal"
                    title="Conformidade das Rotinas"
                  >
                    Conformidade das Rotinas
                  </h3>
                  {conformidadeRotinas.totalRotinasNoc > 0 && (
                    <div className="min-w-0">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 max-w-full truncate"
                        title="Validação Externa (NOC) mantida como análise extra, fora do cálculo comprobatório"
                      >
                        <UserCheck className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">Análise extra — não comprobatória</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 py-0.5 min-w-0 w-full">
                  <div className="shrink-0 flex items-center justify-center">
                    <SvgDonutChart
                      data={conformidadeRotinas.segments.map((s) => ({
                        label: s.label,
                        value: s.value,
                        color: s.color,
                      }))}
                      totalLabel={`${conformidadeRotinas.pctConforme}%`}
                      subLabel="Conforme"
                      size={98}
                      strokeWidth={14}
                    />
                  </div>

                  {/* Legenda com NOME, QUANTIDADE REAL e PERCENTUAL com alinhamento consistente e wrap controlado */}
                  <div className="flex-1 min-w-0 w-full space-y-1.5 text-xs">
                    {conformidadeRotinas.segments.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-1.5 text-slate-700 hover:text-slate-900 transition-colors min-w-0"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[11px] text-slate-600 truncate" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 text-[11px] whitespace-nowrap shrink-0 text-right tabular-nums">
                          {item.percent}%{' '}
                          <span className="font-normal text-slate-500">({item.value})</span>
                        </span>
                      </div>
                    ))}

                    {/* Exibição visível mas separada da rotina do NOC como análise extra com wrap controlado */}
                    {conformidadeRotinas.totalRotinasNoc > 0 && (
                      <div
                        className="pt-1.5 mt-1 border-t border-dashed border-slate-200 text-slate-500 min-w-0"
                        title="Validação Externa (NOC): análise preventiva diária do NOC (camada analítica adicional, não comprobatória)"
                      >
                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                            <span
                              className="text-[11px] text-slate-600 font-medium truncate"
                              title="Validação Externa (NOC)"
                            >
                              Validação Externa (NOC)
                            </span>
                          </div>
                          <span className="text-[10.5px] font-semibold text-purple-700 whitespace-nowrap shrink-0 text-right">
                            {conformidadeRotinas.rotinasNocAtivas} ativa
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium min-w-0">
                <span className="truncate">
                  Rotinas de backup:{' '}
                  <strong className="text-slate-800">{conformidadeRotinas.total}</strong>
                </span>
                {conformidadeRotinas.totalRotinasNoc > 0 && (
                  <span className="text-[11px] text-slate-400 shrink-0 ml-1">
                    + {conformidadeRotinas.totalRotinasNoc} análise NOC
                  </span>
                )}
              </div>
            </Card>
          </div>

          {/* BARRA DE FILTROS (MODELO DE REFERÊNCIA) */}
          <div className="bg-white border border-slate-200/90 shadow-2xs rounded-xl p-3">
            <div className="flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center justify-between">
              {/* Campo de Busca */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por ativo, plano, rotina ou status..."
                  className="pl-9 h-9 text-xs bg-slate-50/70 border-slate-200 rounded-lg placeholder:text-slate-400"
                />
              </div>

              {/* Filtros em Linha: Tipo de Ativo, Status, Conformidade, Período + Mais Filtros */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Tipo de Ativo */}
                <div className="flex flex-col">
                  <Select value={filterTipoAtivo} onValueChange={setFilterTipoAtivo}>
                    <SelectTrigger className="h-9 text-xs w-[155px] bg-white border-slate-200 shadow-none">
                      <span className="text-slate-500 mr-1 font-normal">Tipo:</span>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="servidor">Servidores (VMs)</SelectItem>
                      <SelectItem value="estacao">Estações</SelectItem>
                      <SelectItem value="banco">Banco de dados</SelectItem>
                      <SelectItem value="rede">Rede / Firewall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status da Execução */}
                <div className="flex flex-col">
                  <Select value={filterStatusExecucao} onValueChange={setFilterStatusExecucao}>
                    <SelectTrigger className="h-9 text-xs w-[155px] bg-white border-slate-200 shadow-none">
                      <span className="text-slate-500 mr-1 font-normal">Status:</span>
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
                </div>

                {/* Conformidade */}
                <div className="flex flex-col">
                  <Select value={filterConformidade} onValueChange={setFilterConformidade}>
                    <SelectTrigger className="h-9 text-xs w-[165px] bg-white border-slate-200 shadow-none">
                      <span className="text-slate-500 mr-1 font-normal">Conformidade:</span>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="conforme">Conforme</SelectItem>
                      <SelectItem value="atencao">Em atenção</SelectItem>
                      <SelectItem value="nao_conforme">Não conforme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Período */}
                <div className="flex flex-col">
                  <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                    <SelectTrigger className="h-9 text-xs w-[170px] bg-white border-slate-200 shadow-none">
                      <span className="text-slate-500 mr-1 font-normal">Período:</span>
                      <SelectValue placeholder="Últimos 30 dias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                      <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                      <SelectItem value="24h">Últimas 24h</SelectItem>
                      <SelectItem value="todos">Todo o histórico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão Mais filtros (Popover com Modalidade e Tipo de Backup) */}
                <Popover open={maisFiltrosOpen} onOpenChange={setMaisFiltrosOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`h-9 px-3 text-xs gap-1.5 border-slate-200 font-medium ${
                        filterModalidade !== 'todos' || filterTipoBackup !== 'todos'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'text-[#1A56DB] hover:bg-blue-50/50 hover:text-blue-800'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#1A56DB]" />
                      <span>Mais filtros</span>
                      {(filterModalidade !== 'todos' || filterTipoBackup !== 'todos') && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 ml-0.5" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-3 space-y-3 text-xs">
                    <div className="font-semibold text-slate-800 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span>Filtros adicionais</span>
                      {(filterModalidade !== 'todos' || filterTipoBackup !== 'todos') && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterModalidade('todos')
                            setFilterTipoBackup('todos')
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-normal"
                        >
                          Limpar adicionais
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 block">
                        Modalidade Comprovada
                      </label>
                      <Select value={filterModalidade} onValueChange={setFilterModalidade}>
                        <SelectTrigger className="h-8 text-xs w-full bg-white border-slate-200">
                          <SelectValue placeholder="Todas as modalidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as modalidades</SelectItem>
                          <SelectItem value="local">Local (Disco / Storage)</SelectItem>
                          <SelectItem value="nuvem">Nuvem (Off-site / Cloud)</SelectItem>
                          <SelectItem value="replicacao">Replicação (Standby)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 block">
                        Tipo de Backup
                      </label>
                      <Select value={filterTipoBackup} onValueChange={setFilterTipoBackup}>
                        <SelectTrigger className="h-8 text-xs w-full bg-white border-slate-200">
                          <SelectValue placeholder="Todos os tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os tipos</SelectItem>
                          <SelectItem value="completo">Completo (Full)</SelectItem>
                          <SelectItem value="incremental">Incremental</SelectItem>
                          <SelectItem value="configuracao">Configuração / Export</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Botão Limpar (caso filtros estejam ativos) */}
                {(searchTerm ||
                  filterTipoAtivo !== 'todos' ||
                  filterStatusExecucao !== 'todos' ||
                  filterConformidade !== 'todos' ||
                  filterPeriodo !== '30dias' ||
                  filterModalidade !== 'todos' ||
                  filterTipoBackup !== 'todos') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterTipoAtivo('todos')
                      setFilterStatusExecucao('todos')
                      setFilterConformidade('todos')
                      setFilterPeriodo('30dias')
                      setFilterModalidade('todos')
                      setFilterTipoBackup('todos')
                    }}
                    className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="Limpar todos os filtros"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* TABELA "ÚLTIMAS EXECUÇÕES DE BACKUP" (REDESENHADA CONFORME MODELO DE REFERÊNCIA) */}
          <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl overflow-hidden">
            <PanelHeader
              title="Últimas Execuções de Backup"
              icon={CheckCircle2}
              iconBgColor="bg-emerald-100"
              iconColor="text-emerald-600"
              action={
                <Button
                  onClick={() => handleNavigateTab('execucoes')}
                  className="bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-semibold h-8 px-3.5 gap-1.5 shadow-2xs rounded-lg"
                >
                  Ver histórico completo
                </Button>
              }
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-[11px] select-none">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllCurrentSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                        title="Selecionar todos os registros desta página"
                      />
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 w-[125px] whitespace-nowrap">
                      Data/Hora
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 min-w-[210px] max-w-[280px]">
                      Ativo
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 w-[100px] whitespace-nowrap">
                      Tipo
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 min-w-[170px] max-w-[230px]">
                      Rotina / Plano
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 min-w-[140px] max-w-[220px]">
                      Resultado
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 w-[80px] whitespace-nowrap">
                      Duração
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 w-[80px] whitespace-nowrap">
                      Tamanho
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-slate-700 text-right w-[60px] whitespace-nowrap">
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
                          Ajuste os filtros de busca ou período para visualizar registros.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedExecucoes.map((exec) => {
                      const isChecked = selectedExecIds.has(exec.id)

                      // Resolução de ícone contextual para o tipo de ativo
                      const isBanco =
                        exec.ativoTipo === 'banco_dados' ||
                        exec.ativoTitulo.toLowerCase().includes('banco') ||
                        exec.ativoTitulo.toLowerCase().includes('sql')
                      const isRede =
                        exec.ativoTipo === 'equipamento_rede' ||
                        exec.ativoTitulo.toLowerCase().includes('firewall') ||
                        exec.ativoTitulo.toLowerCase().includes('router') ||
                        exec.ativoTitulo.toLowerCase().includes('switch')
                      const isEstacao =
                        exec.ativoTipo === 'estacao' ||
                        exec.ativoTitulo.toLowerCase().includes('pc-') ||
                        exec.ativoTitulo.toLowerCase().includes('desk')

                      const RowIcon = isBanco
                        ? DatabaseIcon
                        : isRede
                          ? ShieldCheck
                          : isEstacao
                            ? Monitor
                            : Server

                      return (
                        <tr
                          key={exec.id}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                          onClick={() => setExecDetail(exec)}
                        >
                          {/* Coluna 1: Checkbox */}
                          <td
                            className="py-3 px-3 text-center w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectRow(exec.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5 align-middle"
                            />
                          </td>

                          {/* Coluna 2: Data/Hora (regra de ouro: data_email com verdade temporal) */}
                          <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium text-[11.5px]">
                            {exec.dataHoraFormatada}
                          </td>

                          {/* Coluna 3: Ativo (nome em negrito + subtítulo descritivo abaixo) */}
                          <td className="py-3 px-3 min-w-[210px] max-w-[280px]">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/80 mt-0.5">
                                <RowIcon className="w-3.5 h-3.5 text-slate-700" />
                              </div>
                              <div className="min-w-0 flex-1">
                                {exec.vmsComprovadas.length > 0 ? (
                                  exec.temMultiplasVms ? (
                                    <>
                                      <span
                                        className="font-mono text-xs font-bold text-slate-900 block truncate leading-tight"
                                        title={exec.vmsNomesFormatados}
                                      >
                                        {exec.vmsComprovadas.map((v) => v.nome).join(', ')}
                                      </span>
                                      <span
                                        className="text-[11px] font-medium text-slate-500 block truncate mt-0.5"
                                        title={`${exec.vmsComprovadas.length} VMs comprovadas`}
                                      >
                                        {exec.vmsComprovadas.length} VMs comprovadas
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span
                                        className="font-mono text-xs font-bold text-slate-900 block truncate leading-tight"
                                        title={exec.ativoTitulo}
                                      >
                                        {exec.ativoTitulo}
                                      </span>
                                      <span
                                        className="text-[11px] font-medium text-slate-500 block truncate mt-0.5"
                                        title={exec.ativoNome || '1 VM comprovada'}
                                      >
                                        {exec.ativoNome && exec.ativoNome !== exec.ativoTitulo
                                          ? exec.ativoNome
                                          : '1 VM comprovada'}
                                      </span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <span
                                      className="font-semibold text-xs text-slate-900 block truncate leading-tight"
                                      title={exec.ativoTitulo}
                                    >
                                      {exec.ativoTitulo}
                                    </span>
                                    <span
                                      className="text-[11px] font-medium text-slate-500 block truncate mt-0.5"
                                      title={exec.ativoNome || exec.rotinaNome}
                                    >
                                      {exec.ativoNome || exec.rotinaNome}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coluna 4: Tipo (badge pastel conforme modelo de referência) */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {exec.tipoBackupLabel === 'Completo' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                Completo
                              </span>
                            ) : exec.tipoBackupLabel === 'Incremental' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-100 text-sky-700 border border-sky-200">
                                Incremental
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                Configuração
                              </span>
                            )}
                          </td>

                          {/* Coluna 5: Rotina / Plano (nome da rotina + subtítulo do plano) */}
                          <td className="py-3 px-3 min-w-[170px] max-w-[230px]">
                            <span
                              className="font-semibold text-xs text-slate-900 block truncate leading-tight"
                              title={exec.rotinaNome}
                            >
                              {exec.rotinaNome}
                            </span>
                            <span
                              className="text-[11px] font-medium text-slate-500 block truncate mt-0.5"
                              title={exec.planoNome}
                            >
                              {exec.planoNome}
                            </span>
                          </td>

                          {/* Coluna 6: Resultado (badge pastel com ícone + selo modalidade/data) */}
                          <td className="py-3 px-3 min-w-[140px] max-w-[220px]">
                            <div className="flex flex-col gap-1 items-start">
                              {exec.status === 'sucesso' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Sucesso</span>
                                </span>
                              ) : exec.status === 'erro' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Falha</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Com alertas</span>
                                </span>
                              )}

                              {/* Selo comprovatório de modalidade (regra de ouro do projeto) */}
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium truncate max-w-full"
                                title={`Modalidade ${exec.ativoModalidadeLabel} comprovada em ${exec.dataHoraFormatada}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="truncate">
                                  {exec.ativoModalidadeLabel}: {exec.dataHoraFormatada}
                                </span>
                              </span>
                            </div>
                          </td>

                          {/* Coluna 7: Duração */}
                          <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium text-[11.5px]">
                            {exec.duracaoFormatada}
                          </td>

                          {/* Coluna 8: Tamanho */}
                          <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium text-[11.5px]">
                            {exec.tamanhoDisplay}
                          </td>

                          {/* Coluna 9: Detalhes (menu "...") */}
                          <td
                            className="py-3 px-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs w-48">
                                <DropdownMenuItem onClick={() => setExecDetail(exec)}>
                                  Ver evidência / execução
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleNavigateTab('execucoes')}>
                                  Abrir no histórico de execuções
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

            {/* Rodapé de Paginação funcional (cliente) */}
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
                  title="Página anterior"
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
                      className={`h-7 w-7 p-0 text-xs font-semibold ${
                        currentPage === pNum
                          ? 'bg-[#1A56DB] text-white hover:bg-[#1E429F]'
                          : 'text-slate-700 border-slate-200 hover:bg-slate-50'
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
                      className="h-7 w-7 p-0 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
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
                  title="Próxima página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* COLUNA LATERAL DIREITA: sidebar contínua alinhada no topo com os KPIs */}
        <div className="xl:col-span-3 space-y-4">
          {/* Card 1: Próximas Execuções */}
          <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden">
            <PanelHeader
              title="Próximas Execuções"
              icon={Calendar}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
              action={
                <button
                  type="button"
                  onClick={() => handleNavigateTab('rotinas')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  Ver todas
                </button>
              }
            />
            <div className="p-3 space-y-3">
              {proximasExecucoesCalculadas.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  Nenhuma execução agendada com base nas rotinas ativas.
                </div>
              ) : (
                proximasExecucoesCalculadas.map((prox, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                      <Server className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span
                          className="font-bold text-xs text-slate-900 truncate"
                          title={prox.ativoNome}
                        >
                          {prox.ativoNome}
                        </span>
                      </div>
                      <span
                        className="text-[11px] text-slate-500 block truncate"
                        title={prox.tipoBackup}
                      >
                        {prox.tipoBackup}
                      </span>
                      <span
                        className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate"
                        title={prox.proximoHorarioLabel}
                      >
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
            <PanelHeader
              title="Últimas Ocorrências"
              icon={AlertTriangle}
              iconBgColor="bg-amber-100"
              iconColor="text-amber-600"
              action={
                <button
                  type="button"
                  onClick={() => handleNavigateTab('ocorrencias')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  Ver todas
                </button>
              }
            />
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
                    <div key={oco.id} className="flex items-start gap-2.5 min-w-0">
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
                        <span
                          className="font-bold text-xs text-slate-900 block truncate leading-tight"
                          title={oco.titulo}
                        >
                          {oco.titulo}
                        </span>
                        <span
                          className="text-[11px] text-slate-500 block truncate mt-0.5"
                          title={oco.descricao || 'Ocorrência operacional'}
                        >
                          {oco.descricao || 'Ocorrência operacional'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                          {dataFormatada}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Card 3: Ações Rápidas */}
          <Card className="bg-white border-slate-200 shadow-2xs rounded-xl overflow-hidden">
            <PanelHeader
              title="Ações Rápidas"
              icon={Sliders}
              iconBgColor="bg-slate-100"
              iconColor="text-slate-700"
            />
            <div className="p-3 space-y-2">
              {canOperate ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleNavigateTab('execucoes', { action: 'nova' })}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <PlayCircle className="w-4 h-4 text-blue-600" /> Registrar execução manual
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleNavigateTab('rotinas', { action: 'nova' })}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" /> Agendar nova rotina
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleNavigateTab('testes', { action: 'novo' })}
                    className="w-full justify-start text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-2 h-9"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Registrar teste de
                    recuperação
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleNavigateTab('evidencias', { action: 'nova' })}
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

      {/* CARD: VALIDAÇÃO EXTERNA (NOC) — Dupla Camada de Conformidade */}
      <BackupNocValidacaoCard
        monitoramentos={monitoramentos}
        loading={loading}
        onOpenNoc={() => handleNavigateTab('evidencias', { sub: 'monitoramento_externo' })}
      />

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

              {((execDetail.detalhes_vms &&
                Array.isArray(execDetail.detalhes_vms) &&
                execDetail.detalhes_vms.length > 0) ||
                (execDetail.confronto_escopo &&
                  Array.isArray((execDetail.confronto_escopo as any).comprovado) &&
                  (execDetail.confronto_escopo as any).comprovado.length > 0)) && (
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                    Máquinas / Ativos Comprovados nesta Execução (
                    {execDetail.detalhes_vms && execDetail.detalhes_vms.length > 0
                      ? execDetail.detalhes_vms.length
                      : (execDetail.confronto_escopo as any).comprovado.length}
                    )
                  </span>
                  <div className="space-y-1">
                    {execDetail.detalhes_vms && execDetail.detalhes_vms.length > 0
                      ? execDetail.detalhes_vms.map((vm: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 rounded bg-slate-50 text-[11px]"
                          >
                            <span className="font-bold text-slate-800">{vm.nome}</span>
                            <span
                              className={`font-semibold ${
                                String(vm.status || '')
                                  .toLowerCase()
                                  .includes('success')
                                  ? 'text-emerald-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {vm.status || 'success'}
                            </span>
                          </div>
                        ))
                      : (execDetail.confronto_escopo as any).comprovado.map(
                          (comp: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-1.5 rounded bg-slate-50 text-[11px]"
                            >
                              <span className="font-bold text-slate-800">
                                {comp.ativo_nome || comp.item_comprovante}
                              </span>
                              <span className="font-semibold text-emerald-700">comprovado</span>
                            </div>
                          ),
                        )}
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

export default BackupOverviewContent
