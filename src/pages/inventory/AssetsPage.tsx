import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  listInventoryAssets,
  deleteInventoryAsset,
  listOrganizations,
} from '@/services/csctiService'
import { getBackupConfronto } from '@/services/backupService'
import type {
  InventoryAssetItem,
  AssetType,
  OrganizationItem,
  BackupConfrontoResponse,
  ConfrontoAtivoItem,
} from '@/types/cscti'
import { AssetModal, ASSET_TYPES } from './AssetModal'
import { GlpiSyncTab } from './GlpiSyncTab'
import { SvgDonutChart, SvgBarChart } from './InventoryCharts'
import { AssetDetailsDrawer, AssetDisplayItem, getAssetTypeIcon } from './AssetDetailsDrawer'
import {
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Bell,
  MoreVertical,
  MoreHorizontal,
  FileText,
  Printer,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Boxes,
  Server,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'

// Categorias padronizadas da visualização
const CATEGORY_GROUPS = [
  { value: 'todas', label: 'Todas as Categorias' },
  { value: 'servidor', label: 'Servidores virtualizados' },
  { value: 'estacao', label: 'Estações de trabalho' },
  { value: 'rede', label: 'Rede e segurança' },
  { value: 'sistema', label: 'Sistemas e aplicações' },
  { value: 'dados', label: 'Dados e outros' },
]

export const AssetsPage: React.FC = () => {
  const { user, organization, role, refreshOrganization } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const orgId = organization?.id || ''
  const canOperate = role === 'admin' || role === 'suporte'

  // Serventias para o Topbar
  const [allOrgs, setAllOrgs] = useState<OrganizationItem[]>([])

  // Dados reais
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [confronto, setConfronto] = useState<BackupConfrontoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    const d = new Date()
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  })

  // Filtros
  const [search, setSearch] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('todas')
  const [filterCriticidade, setFilterCriticidade] = useState<string>('todas')
  const [filterConformidade, setFilterConformidade] = useState<string>('todas')
  const [filterEstado, setFilterEstado] = useState<string>('todos')

  // Seleção e Paginação
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 5 // Conforme o esboço ("Mostrando 1 a 5 de X registros")

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<InventoryAssetItem | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<InventoryAssetItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [fullSheetAsset, setFullSheetAsset] = useState<AssetDisplayItem | null>(null)

  // Aba GLPI opcional via query param tab=glpi
  const showGlpiTab = searchParams.get('tab') === 'glpi'

  // Carregar organizações para o seletor da Topbar
  useEffect(() => {
    listOrganizations().then((res) => setAllOrgs(res))
  }, [])

  // Carregar ativos e dados de conformidade
  const loadData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [assetsData, confrontoData] = await Promise.all([
        listInventoryAssets(orgId),
        getBackupConfronto(orgId).catch(() => null),
      ])
      setAssets(assetsData)
      setConfronto(confrontoData)

      const d = new Date()
      setLastUpdated(
        `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      )
    } catch (err) {
      console.error('Erro ao carregar ativos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [orgId])

  // Normalização e enriquecimento dos itens com base no confronto real
  const displayAssets: AssetDisplayItem[] = useMemo(() => {
    const confrontoMap = new Map<string, ConfrontoAtivoItem>()
    if (confronto?.confronto) {
      for (const item of confronto.confronto) {
        confrontoMap.set(item.id, item)
      }
    }

    return assets.map((a, idx) => {
      // Código visual formatado ATV-0001128
      const numCode = String(1000 + idx + 1).padStart(7, '0')
      const displayCode = `ATV-${numCode}`

      // Status de conformidade vindo do motor de confronto
      const confItem = confrontoMap.get(a.id)
      let conformidadeStatus: AssetDisplayItem['conformidadeStatus'] = 'conforme'

      if (confItem) {
        if (confItem.status_consolidado === 'PROTEGIDO') {
          conformidadeStatus = 'conforme'
        } else if (confItem.status_consolidado === 'PARCIAL') {
          conformidadeStatus = 'pendente'
        } else if (confItem.status_consolidado === 'NAO_PROTEGIDO') {
          conformidadeStatus = 'nao_conforme'
        } else {
          conformidadeStatus = 'nao_avaliado'
        }
      } else {
        // Regra padrão de fallback: alta sem backup = pendente, ativo = conforme
        if (a.criticidade === 'alta' && !a.exige_backup_local && !a.exige_backup_nuvem) {
          conformidadeStatus = 'pendente'
        } else if (a.status === 'inativo') {
          conformidadeStatus = 'nao_conforme'
        } else {
          conformidadeStatus = 'conforme'
        }
      }

      // Categoria e Subtipo visual
      let subtipoFormatado = 'Servidor virtualizado'
      if (a.tipo === 'servidor_virtualizado') subtipoFormatado = 'Servidor virtualizado'
      else if (a.tipo === 'servidor_aplicacao') subtipoFormatado = 'Servidor de Aplicação'
      else if (a.tipo === 'banco_dados') subtipoFormatado = 'Banco de dados'
      else if (a.tipo === 'storage_backup') subtipoFormatado = 'Storage e Backup'
      else if (a.tipo === 'estacao') subtipoFormatado = 'Estação de trabalho'
      else if (a.tipo === 'equipamento_rede') subtipoFormatado = 'Rede e segurança'
      else if (a.tipo === 'servico_nuvem') subtipoFormatado = 'SaaS / Nuvem'
      else if (a.tipo === 'impressora_multifuncional') subtipoFormatado = 'Multifuncional'
      else subtipoFormatado = 'Outro'

      // Datas formatadas
      const createdDate = a.created ? new Date(a.created) : new Date()
      const ultimaValidacao = createdDate.toLocaleDateString('pt-BR')
      const nextDate = new Date(createdDate.getTime() + 180 * 24 * 60 * 60 * 1000)
      const proximaRevisao = nextDate.toLocaleDateString('pt-BR')

      return {
        ...a,
        displayCode,
        conformidadeStatus,
        ultimaValidacao,
        proximaRevisao,
        subtipoFormatado,
        classificacaoInformacao: a.criticidade === 'alta' ? 'Confidencial / Restrito' : 'Interno',
      }
    })
  }, [assets, confronto])

  // Ativo atualmente selecionado para o painel lateral (apenas se selectedAssetId não for null)
  const currentAsset = useMemo(() => {
    if (!selectedAssetId) return null
    return displayAssets.find((a) => a.id === selectedAssetId) || null
  }, [displayAssets, selectedAssetId])

  // Confronto do ativo atualmente selecionado (se houver)
  const currentConfrontoAtivo = useMemo(() => {
    if (!selectedAssetId || !confronto?.confronto) return null
    return confronto.confronto.find((item) => item.id === selectedAssetId) || null
  }, [confronto, selectedAssetId])

  // CÁLCULOS DOS 4 CARDS SUPERIORES
  const totalAssetsCount = displayAssets.length
  const criticalAssetsCount = displayAssets.filter(
    (a) => a.criticidade === 'alta' || (a as any).criticidade === 'critica',
  ).length
  const validatedAssetsCount = displayAssets.filter(
    (a) => a.conformidadeStatus === 'conforme',
  ).length
  const pendingAssetsCount = displayAssets.filter(
    (a) => a.conformidadeStatus === 'pendente' || a.conformidadeStatus === 'nao_conforme',
  ).length

  const criticalPercent =
    totalAssetsCount > 0 ? ((criticalAssetsCount / totalAssetsCount) * 100).toFixed(1) : '0'
  const validatedPercent =
    totalAssetsCount > 0 ? Math.round((validatedAssetsCount / totalAssetsCount) * 100) : 0
  const pendingPercent =
    totalAssetsCount > 0 ? ((pendingAssetsCount / totalAssetsCount) * 100).toFixed(1) : '0'

  // DADOS DO GRÁFICO 1: ATIVOS POR CATEGORIA (Ordenado por quantidade decrescente conforme solicitação)
  const categoryStats = useMemo(() => {
    const estacoes = displayAssets.filter((a) => a.tipo === 'estacao').length
    const servidores = displayAssets.filter(
      (a) => a.tipo === 'servidor_aplicacao' || a.tipo === 'servidor_virtualizado',
    ).length
    const rede = displayAssets.filter((a) => a.tipo === 'equipamento_rede').length
    const sistemas = displayAssets.filter(
      (a) => a.tipo === 'servico_nuvem' || a.tipo === 'impressora_multifuncional',
    ).length
    const dados = displayAssets.filter(
      (a) => a.tipo === 'banco_dados' || a.tipo === 'storage_backup' || a.tipo === 'outro',
    ).length

    const total = totalAssetsCount || 1

    const list = [
      {
        label: 'Servidores virtualizados',
        value: servidores,
        percent: totalAssetsCount > 0 ? Math.round((servidores / total) * 100) : 0,
        color: '#38BDF8', // sky-400 / ciano claro
      },
      {
        label: 'Estações de trabalho',
        value: estacoes,
        percent: totalAssetsCount > 0 ? Math.round((estacoes / total) * 100) : 0,
        color: '#2563EB', // azul royal
      },
      {
        label: 'Rede e segurança',
        value: rede,
        percent: totalAssetsCount > 0 ? Math.round((rede / total) * 100) : 0,
        color: '#10B981', // emerald-500
      },
      {
        label: 'Sistemas e aplicações',
        value: sistemas,
        percent: totalAssetsCount > 0 ? Math.round((sistemas / total) * 100) : 0,
        color: '#FB923C', // laranja
      },
      {
        label: 'Dados e outros',
        value: dados,
        percent: totalAssetsCount > 0 ? Math.round((dados / total) * 100) : 0,
        color: '#C084FC', // roxo/lilás
      },
    ]

    // Ordenar por quantidade real decrescente
    return list.sort((a, b) => b.value - a.value)
  }, [displayAssets, totalAssetsCount])

  // DADOS DO GRÁFICO 2: CLASSIFICAÇÃO DE CRITICIDADE (Barras)
  // Baseado unicamente nas contagens reais dos ativos da organização
  const criticalityStats = useMemo(() => {
    // Ordem fixa do esboço: Crítica, Alta, Média, Baixa
    // No backend/formulário criticidade pode ser 'critica' ou 'alta' ou 'media' ou 'baixa'
    const critica = displayAssets.filter((a) => (a as any).criticidade === 'critica').length
    const alta = displayAssets.filter((a) => a.criticidade === 'alta').length
    const media = displayAssets.filter((a) => a.criticidade === 'media').length
    const baixa = displayAssets.filter((a) => a.criticidade === 'baixa').length

    return [
      { label: 'Crítica', value: critica, color: '#EF4444' }, // red-500
      { label: 'Alta', value: alta, color: '#FB923C' }, // orange-400
      { label: 'Média', value: media, color: '#FBBF24' }, // amber-400
      { label: 'Baixa', value: baixa, color: '#10B981' }, // emerald-500
    ]
  }, [displayAssets])

  // DADOS DO GRÁFICO 3: SITUAÇÃO DE CONFORMIDADE (Conforme esboço: Conforme, Pendente, Não conforme, Não avaliado)
  const conformidadeStats = useMemo(() => {
    const conforme = displayAssets.filter((a) => a.conformidadeStatus === 'conforme').length
    const pendente = displayAssets.filter((a) => a.conformidadeStatus === 'pendente').length
    const naoConforme = displayAssets.filter((a) => a.conformidadeStatus === 'nao_conforme').length
    const naoAvaliado = displayAssets.filter((a) => a.conformidadeStatus === 'nao_avaliado').length

    const total = totalAssetsCount || 1

    const list = [
      {
        label: 'Conforme',
        value: conforme,
        percent: totalAssetsCount > 0 ? Math.round((conforme / total) * 100) : 0,
        color: '#10B981', // emerald-500 verde
      },
      {
        label: 'Pendente',
        value: pendente,
        percent: totalAssetsCount > 0 ? Math.round((pendente / total) * 100) : 0,
        color: '#FBBF24', // âmbar/amarelo
      },
      {
        label: 'Não conforme',
        value: naoConforme,
        percent: totalAssetsCount > 0 ? Math.round((naoConforme / total) * 100) : 0,
        color: '#EF4444', // vermelho
      },
      {
        label: 'Não avaliado',
        value: naoAvaliado,
        percent: totalAssetsCount > 0 ? Math.round((naoAvaliado / total) * 100) : 0,
        color: '#94A3B8', // cinza
      },
    ]

    return list
  }, [displayAssets, totalAssetsCount])

  // FILTRAGEM EM TEMPO REAL DA TABELA
  const filteredAssets = useMemo(() => {
    return displayAssets.filter((asset) => {
      // Busca por texto (Código, Nome, Categoria, Responsável, IP, Serial)
      const q = (search || globalSearch).toLowerCase().trim()
      if (q) {
        const matchesName = asset.name.toLowerCase().includes(q)
        const matchesCode = asset.displayCode.toLowerCase().includes(q)
        const matchesDesc = (asset.descricao || '').toLowerCase().includes(q)
        const matchesResp = (asset.expand?.responsavel?.name || '').toLowerCase().includes(q)
        const matchesSubtipo = asset.subtipoFormatado.toLowerCase().includes(q)
        const matchesIp = (asset.ip_address || '').toLowerCase().includes(q)
        const matchesSerial = (asset.serial_number || '').toLowerCase().includes(q)
        if (
          !matchesName &&
          !matchesCode &&
          !matchesDesc &&
          !matchesResp &&
          !matchesSubtipo &&
          !matchesIp &&
          !matchesSerial
        ) {
          return false
        }
      }

      // Filtro por Categoria
      if (filterCategory !== 'todas') {
        if (filterCategory === 'estacao' && asset.tipo !== 'estacao') return false
        if (
          filterCategory === 'servidor' &&
          asset.tipo !== 'servidor_aplicacao' &&
          asset.tipo !== 'servidor_virtualizado'
        )
          return false
        if (filterCategory === 'rede' && asset.tipo !== 'equipamento_rede') return false
        if (
          filterCategory === 'sistema' &&
          asset.tipo !== 'servico_nuvem' &&
          asset.tipo !== 'impressora_multifuncional'
        )
          return false
        if (
          filterCategory === 'dados' &&
          asset.tipo !== 'banco_dados' &&
          asset.tipo !== 'storage_backup' &&
          asset.tipo !== 'outro'
        )
          return false
      }

      // Filtro por Criticidade
      if (filterCriticidade !== 'todas') {
        if (asset.criticidade !== filterCriticidade) return false
      }

      // Filtro por Conformidade
      if (filterConformidade !== 'todas') {
        if (asset.conformidadeStatus !== filterConformidade) return false
      }

      // Filtro por Estado Operacional
      if (filterEstado !== 'todos') {
        if (asset.status !== filterEstado) return false
      }

      return true
    })
  }, [
    displayAssets,
    search,
    globalSearch,
    filterCategory,
    filterCriticidade,
    filterConformidade,
    filterEstado,
  ])

  // PAGINAÇÃO
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize))
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAssets.slice(start, start + pageSize)
  }, [filteredAssets, currentPage, pageSize])

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [search, globalSearch, filterCategory, filterCriticidade, filterConformidade, filterEstado])

  // Checkbox de todas as linhas
  const allPageIds = paginatedAssets.map((a) => a.id)
  const isAllPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedRows.has(id))

  const toggleSelectAll = () => {
    const next = new Set(selectedRows)
    if (isAllPageSelected) {
      allPageIds.forEach((id) => next.delete(id))
    } else {
      allPageIds.forEach((id) => next.add(id))
    }
    setSelectedRows(next)
  }

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(selectedRows)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedRows(next)
  }

  // Ações de exclusão
  const handleDelete = async () => {
    if (!deletingAsset || !orgId) return
    setDeleteLoading(true)
    try {
      await deleteInventoryAsset(deletingAsset.id, orgId, deletingAsset.name)
      toast({
        title: 'Ativo excluído',
        description: `O ativo ${deletingAsset.name} foi removido com sucesso.`,
      })
      setDeletingAsset(null)
      loadData()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Falha na exclusão do ativo.',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Rótulo da role do usuário logado
  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'suporte':
        return 'Suporte Técnico'
      case 'usuario':
        return 'Usuário'
      default:
        return 'Colaborador'
    }
  }

  const getUserInitials = () => {
    const name = user?.name || user?.email || 'TI'
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const headerActions = (
    <>
      {/* Botão Imprimir Relatório */}
      <Button
        asChild
        variant="outline"
        className="border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold h-9 px-3 gap-1.5 shadow-2xs rounded-xl"
        title="Abrir relatório de inventário para impressão e PDF"
      >
        <Link to="/relatorios/inventario">
          <Printer className="w-4 h-4 text-slate-600" />
          <span>Imprimir Relatório</span>
        </Link>
      </Button>

      {/* Botão Primário Azul + Novo Ativo */}
      {canOperate && (
        <Button
          onClick={() => {
            setEditingAsset(null)
            setModalOpen(true)
          }}
          className="bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-xs rounded-xl"
        >
          <Plus className="w-4 h-4" /> Novo Ativo
        </Button>
      )}

      {/* Menu de Três Pontos */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-2xs rounded-xl"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 text-xs">
          <DropdownMenuItem asChild>
            <Link to="/relatorios/inventario" className="cursor-pointer gap-2">
              <Printer className="w-4 h-4 text-slate-500" /> Imprimir Relatório
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSearchParams(showGlpiTab ? {} : { tab: 'glpi' })
            }}
            className="cursor-pointer gap-2"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            {showGlpiTab ? 'Ver Visão Geral' : 'Sincronização GLPI'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={loadData} className="cursor-pointer gap-2">
            <RefreshCw className="w-4 h-4 text-slate-500" /> Atualizar Inventário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  const serventiaNome =
    organization?.trade_name ||
    organization?.corporate_name ||
    organization?.name ||
    'Serventia Conectada'
  const serventiaAtiva = organization?.status !== 'inativa'

  return (
    <div className="space-y-5 text-slate-900 font-sans pb-12">
      {/* 1. CABEÇALHO PADRÃO DO PRODUTO (ModuleHeader) */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Inventário de Ativos', href: '/ativos' },
          { label: showGlpiTab ? 'Sincronização GLPI' : 'Visão Geral' },
        ]}
        icon={Server}
        title="Inventário de Ativos"
        subtitle="Gestão, classificação e conformidade dos ativos da organização"
        serventiaNome={serventiaNome}
        serventiaAtiva={serventiaAtiva}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadData}
        actions={headerActions}
      />

      {/* CONTEÚDO CONDICIONAL: GLPI TAB OU VISÃO GERAL COMPLETA */}
      {showGlpiTab ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-sm font-bold text-slate-800">Módulo de Sincronização GLPI</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchParams({})}
              className="text-xs"
            >
              Voltar ao Inventário
            </Button>
          </div>
          <GlpiSyncTab />
        </div>
      ) : (
        <>
          {/* 3. LINHA DE 4 CARDS DE ESTATÍSTICAS (KpiCard padronizado do produto) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total de Ativos (Ícone Server exatamente igual ao Dashboard) */}
            <KpiCard
              label="Total de Ativos"
              value={totalAssetsCount}
              supportText="Ativos cadastrados na serventia"
              icon={Server}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
            />

            {/* Card 2: Ativos Críticos (Ícone AlertTriangle igual ao Dashboard) */}
            <KpiCard
              label="Ativos Críticos"
              value={criticalAssetsCount}
              supportText={`${criticalPercent}% do total`}
              icon={AlertTriangle}
              iconBgColor="bg-red-100"
              iconColor="text-red-600"
            />

            {/* Card 3: Inventário Validado (Ícone ShieldCheck igual à Conformidade Geral) */}
            <KpiCard
              label="Inventário Validado"
              value={validatedAssetsCount}
              supportText={
                totalAssetsCount > 0 && validatedAssetsCount === totalAssetsCount
                  ? 'Dados validados e completos'
                  : `${validatedPercent}% dos ativos validados`
              }
              icon={ShieldCheck}
              iconBgColor="bg-emerald-100"
              iconColor="text-emerald-600"
            />

            {/* Card 4: Com Pendências (Ícone ShieldAlert igual a Pendências da Dashboard e Backup) */}
            <KpiCard
              label="Com Pendências"
              value={pendingAssetsCount}
              supportText={
                pendingAssetsCount === 0
                  ? 'Nenhuma pendência identificada'
                  : `${pendingPercent}% requerem atenção`
              }
              icon={ShieldAlert}
              iconBgColor="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>

          {/* 4. LINHA ANALÍTICA (3 painéis fixos em grid de 3 colunas, NUNCA sofrem reflow) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Gráfico 1: Ativos por Categoria — Donut à esquerda + Legenda descritiva ao lado com espaçamento generoso */}
            <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-5 sm:p-6 flex flex-col justify-between min-h-[230px]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4">Ativos por Categoria</h3>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 py-0.5">
                  {/* Donut com total no centro com respiro */}
                  <div className="shrink-0 flex items-center justify-center">
                    <SvgDonutChart
                      data={categoryStats.map((c) => ({
                        label: c.label,
                        value: c.value,
                        color: c.color,
                      }))}
                      totalLabel={String(totalAssetsCount)}
                      subLabel="Ativos"
                      size={118}
                      strokeWidth={18}
                    />
                  </div>

                  {/* Legenda ao lado com NOME, QUANTIDADE REAL e PERCENTUAL alinhado à direita com respiro */}
                  <div className="flex-1 w-full space-y-2.5 text-xs">
                    {categoryStats.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 text-slate-700 hover:text-slate-900 transition-colors"
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

            {/* Gráfico 2: Classificação de Criticidade (Barras com escala dinâmica honesta e altura consistente) */}
            <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-5 sm:p-6 flex flex-col justify-between min-h-[230px]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Classificação de Criticidade
                </h3>
                <div className="my-0.5">
                  <SvgBarChart data={criticalityStats} />
                </div>
              </div>
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total crítico / alta:</span>
                <strong className="text-red-600 font-bold">{criticalAssetsCount} ativos</strong>
              </div>
            </Card>

            {/* Gráfico 3: Situação de Conformidade — Donut à esquerda + Legenda descritiva ao lado com respiro */}
            <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-5 sm:p-6 flex flex-col justify-between min-h-[230px]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4">Situação de Conformidade</h3>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 py-0.5">
                  {/* Donut com total no centro */}
                  <div className="shrink-0 flex items-center justify-center">
                    <SvgDonutChart
                      data={conformidadeStats.map((c) => ({
                        label: c.label,
                        value: c.value,
                        color: c.color,
                      }))}
                      totalLabel={String(totalAssetsCount)}
                      subLabel="Ativos"
                      size={118}
                      strokeWidth={18}
                    />
                  </div>

                  {/* Legenda ao lado com NOME, QUANTIDADE REAL e PERCENTUAL alinhado à direita com respiro */}
                  <div className="flex-1 w-full space-y-2.5 text-xs">
                    {conformidadeStats.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 text-slate-700 hover:text-slate-900 transition-colors"
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
          </div>

          {/* 5. BARRA DE FILTROS */}
          <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-3">
            <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
              {/* Campo de Busca Principal */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por código, nome, categoria, responsável..."
                  className="pl-9 h-9 text-xs bg-slate-50/70 border-slate-200 rounded-lg placeholder:text-slate-400"
                />
              </div>

              {/* Selects de Filtros */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Categoria */}
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 text-xs w-[150px] bg-white border-slate-200">
                    <span className="text-slate-500 mr-1">Categoria:</span>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as categorias</SelectItem>
                    <SelectItem value="servidor">Servidores virtualizados</SelectItem>
                    <SelectItem value="estacao">Estações de trabalho</SelectItem>
                    <SelectItem value="rede">Rede e segurança</SelectItem>
                    <SelectItem value="sistema">Sistemas e aplicações</SelectItem>
                    <SelectItem value="dados">Dados e outros</SelectItem>
                  </SelectContent>
                </Select>

                {/* Criticidade */}
                <Select value={filterCriticidade} onValueChange={setFilterCriticidade}>
                  <SelectTrigger className="h-9 text-xs w-[140px] bg-white border-slate-200">
                    <span className="text-slate-500 mr-1">Criticidade:</span>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="alta">Crítica / Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>

                {/* Conformidade */}
                <Select value={filterConformidade} onValueChange={setFilterConformidade}>
                  <SelectTrigger className="h-9 text-xs w-[160px] bg-white border-slate-200">
                    <span className="text-slate-500 mr-1">Conformidade:</span>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="nao_conforme">Não conforme</SelectItem>
                    <SelectItem value="nao_avaliado">Não avaliado</SelectItem>
                  </SelectContent>
                </Select>

                {/* Estado operacional */}
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="h-9 text-xs w-[160px] bg-white border-slate-200">
                    <span className="text-slate-500 mr-1">Estado op.:</span>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Em operação</SelectItem>
                    <SelectItem value="inativo">Em manutenção</SelectItem>
                    <SelectItem value="desativado">Desativado</SelectItem>
                  </SelectContent>
                </Select>

                {/* Botão Mais Filtros */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilterCategory('todas')
                    setFilterCriticidade('todas')
                    setFilterConformidade('todas')
                    setFilterEstado('todos')
                  }}
                  className="h-9 text-xs text-slate-600 border-slate-200 gap-1.5 hover:bg-slate-50"
                  title="Limpar todos os filtros"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> Mais filtros
                </Button>
              </div>
            </div>
          </Card>

          {/* 6. TABELA PRINCIPAL DE ATIVOS */}
          <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold text-[11px] select-none">
                    <th className="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Código
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Nome do Ativo
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Categoria
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Criticidade
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Estado
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Conformidade
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Responsável
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700">
                      Última Validação
                    </th>
                    <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-slate-700 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                        Carregando inventário de ativos da serventia...
                      </td>
                    </tr>
                  ) : paginatedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Server className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="font-semibold text-slate-700 block text-xs">
                          Nenhum ativo encontrado
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Tente ajustar os critérios de busca ou cadastre um novo ativo.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAssets.map((asset) => {
                      const isSelected = selectedAssetId === asset.id
                      const isChecked = selectedRows.has(asset.id)

                      return (
                        <tr
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/40 border-l-4 border-l-[#1A56DB]'
                              : 'hover:bg-slate-50/70 border-l-4 border-l-transparent'
                          }`}
                        >
                          {/* Checkbox */}
                          <td
                            className="py-3 px-3.5 text-center"
                            onClick={(e) => toggleSelectRow(asset.id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                            />
                          </td>

                          {/* Código com ícone circular do tipo (conforme esboço de referência) */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                                {getAssetTypeIcon(asset.tipo, 'w-4 h-4 text-slate-700')}
                              </div>
                              <span className="font-mono text-xs font-bold text-slate-700">
                                {asset.displayCode}
                              </span>
                            </div>
                          </td>

                          {/* Nome do Ativo (Nome em negrito + subtipo em cinza embaixo) */}
                          <td className="py-3 px-3.5 min-w-[180px]">
                            <span className="font-bold text-slate-900 block leading-tight">
                              {asset.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-xs">
                              {asset.descricao || asset.subtipoFormatado}
                            </span>
                          </td>

                          {/* Categoria */}
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-medium">
                            {asset.subtipoFormatado}
                          </td>

                          {/* Criticidade: Badge com ponto colorido */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {asset.criticidade === 'alta' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                Crítica
                              </span>
                            ) : asset.criticidade === 'media' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Média
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Baixa
                              </span>
                            )}
                          </td>

                          {/* Estado Operacional */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {asset.status === 'ativo' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Em operação
                              </span>
                            ) : asset.status === 'inativo' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Em manutenção
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Desativado
                              </span>
                            )}
                          </td>

                          {/* Conformidade */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {asset.conformidadeStatus === 'conforme' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Conforme
                              </span>
                            ) : asset.conformidadeStatus === 'pendente' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Pendente
                              </span>
                            ) : asset.conformidadeStatus === 'nao_conforme' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                Não conforme
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Não avaliado
                              </span>
                            )}
                          </td>

                          {/* Responsável */}
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-medium">
                            {asset.expand?.responsavel?.name || '—'}
                          </td>

                          {/* Última Validação */}
                          <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {asset.ultimaValidacao}
                          </td>

                          {/* Ações (menu ⋯) */}
                          <td
                            className="py-3 px-3.5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-400 hover:text-slate-800 rounded-full"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 text-xs">
                                <DropdownMenuItem
                                  onClick={() => setFullSheetAsset(asset)}
                                  className="cursor-pointer gap-2"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Ver detalhes
                                </DropdownMenuItem>
                                {canOperate && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingAsset(asset)
                                        setModalOpen(true)
                                      }}
                                      className="cursor-pointer gap-2"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-slate-600" /> Editar ativo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDeletingAsset(asset)}
                                      className="cursor-pointer gap-2 text-red-600 focus:text-red-700"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-600" /> Excluir ativo
                                    </DropdownMenuItem>
                                  </>
                                )}
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

            {/* 7. RODAPÉ DA TABELA: Mostrando X a Y de Z registros + Paginação */}
            <div className="p-3 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Mostrando{' '}
                <strong className="text-slate-800">
                  {filteredAssets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * pageSize, filteredAssets.length)}
                </strong>{' '}
                de <strong className="text-slate-800">{filteredAssets.length}</strong> registros
              </div>

              {/* Controles de Paginação */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 text-slate-600 border-slate-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  const isActive = currentPage === pageNum
                  return (
                    <Button
                      key={pageNum}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 text-xs font-semibold ${
                        isActive
                          ? 'bg-[#1A56DB] hover:bg-[#1E429F] text-white border-transparent'
                          : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
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
                      className={`h-8 w-8 text-xs font-semibold ${
                        currentPage === totalPages
                          ? 'bg-[#1A56DB] text-white'
                          : 'text-slate-700 border-slate-200'
                      }`}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 text-slate-600 border-slate-200"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modal Criar / Editar Ativo */}
      <AssetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingAsset(null)
        }}
        onSaved={loadData}
        orgId={orgId}
        asset={editingAsset}
      />

      {/* Modal Ficha Completa do Ativo */}
      <Dialog
        open={Boolean(fullSheetAsset)}
        onOpenChange={(val) => !val && setFullSheetAsset(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                {fullSheetAsset && getAssetTypeIcon(fullSheetAsset.tipo, 'w-5 h-5')}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {fullSheetAsset?.name} ({fullSheetAsset?.displayCode})
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Ficha detalhada de conformidade e salvaguarda do ativo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {fullSheetAsset && (
            <div className="space-y-3 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Tipo de Ativo
                  </span>
                  <span className="font-semibold text-slate-800">
                    {fullSheetAsset.subtipoFormatado}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Status Operacional
                  </span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {fullSheetAsset.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Criticidade
                  </span>
                  <span className="font-semibold text-red-600 uppercase">
                    {fullSheetAsset.criticidade}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Conformidade
                  </span>
                  <span className="font-semibold text-emerald-600 uppercase">
                    {fullSheetAsset.conformidadeStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Descrição Técnica
                  </span>
                  <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                    {fullSheetAsset.descricao || 'Sem descrição cadastrada.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Localização Física / IP
                    </span>
                    <span className="text-slate-800">
                      {fullSheetAsset.localizacao || '—'}
                      {fullSheetAsset.ip_address ? ` (${fullSheetAsset.ip_address})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Responsável Designado
                    </span>
                    <span className="text-slate-800">
                      {fullSheetAsset.expand?.responsavel?.name || 'Não informado'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Número de Série
                    </span>
                    <span className="font-mono text-slate-800">
                      {fullSheetAsset.serial_number || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Origem do Cadastro
                    </span>
                    <span className="text-slate-800 uppercase font-semibold">
                      {fullSheetAsset.origem === 'glpi'
                        ? `GLPI #${fullSheetAsset.external_id || ''}`
                        : 'Manual'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <Link to="/relatorios/inventario" target="_blank">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Imprimir Relatório
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullSheetAsset(null)}
                className="text-xs"
              >
                Fechar
              </Button>
              {canOperate && fullSheetAsset && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAsset(fullSheetAsset)
                    setFullSheetAsset(null)
                    setModalOpen(true)
                  }}
                  className="bg-[#1A56DB] text-white text-xs gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar Ativo
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog
        open={Boolean(deletingAsset)}
        onOpenChange={(val) => !val && setDeletingAsset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Confirmar exclusão de ativo
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              Tem certeza que deseja excluir o ativo{' '}
              <strong className="text-slate-900">{deletingAsset?.name}</strong> do inventário da
              serventia? Esta ação será registrada no log de auditoria append-only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? 'Excluindo...' : 'Sim, excluir ativo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PAINEL DESLIZANTE LATERAL (DRAWER SOBREPOSTO) - SEM REFLOW DOS PAINÉIS ANALÍTICOS */}
      {currentAsset && (
        <>
          {/* Backdrop suave que fecha ao clicar */}
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedAssetId(null)}
            aria-hidden="true"
          />

          {/* Drawer sobreposto à direita com slide-in suave e sombra */}
          <aside
            aria-label="Detalhes do Ativo"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] md:w-[420px] bg-white shadow-2xl border-l border-slate-200/90 flex flex-col transition-transform transform duration-300 ease-out animate-in slide-in-from-right"
          >
            <AssetDetailsDrawer
              asset={currentAsset}
              confrontoAtivo={currentConfrontoAtivo}
              orgId={orgId}
              onClose={() => setSelectedAssetId(null)}
              onEdit={(asset) => {
                setEditingAsset(asset)
                setModalOpen(true)
              }}
              onViewFullSheet={(asset) => setFullSheetAsset(asset)}
            />
          </aside>
        </>
      )}
    </div>
  )
}

export default AssetsPage
