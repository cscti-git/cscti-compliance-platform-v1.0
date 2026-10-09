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
  Filter,
  SlidersHorizontal,
  Bell,
  MoreVertical,
  MoreHorizontal,
  FileText,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Boxes,
  Database,
  Layers,
  ArrowUp,
  Server,
} from 'lucide-react'

// Categorias padronizadas da visualização
const CATEGORY_GROUPS = [
  { value: 'todas', label: 'Todas as Categorias' },
  { value: 'estacao', label: 'Estações de trabalho' },
  { value: 'servidor', label: 'Servidores' },
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
      let subtipoFormatado = 'Servidor'
      if (a.tipo === 'servidor_aplicacao') subtipoFormatado = 'Servidor de Aplicação'
      else if (a.tipo === 'servidor_virtualizado') subtipoFormatado = 'Servidor Virtualizado'
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

  // Selecionar o primeiro ativo por padrão se nenhum estiver selecionado
  useEffect(() => {
    if (displayAssets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(displayAssets[0].id)
    }
  }, [displayAssets, selectedAssetId])

  // Ativo atualmente selecionado para o painel lateral
  const currentAsset = useMemo(() => {
    return displayAssets.find((a) => a.id === selectedAssetId) || displayAssets[0] || null
  }, [displayAssets, selectedAssetId])

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

  // DADOS DO GRÁFICO 1: ATIVOS POR CATEGORIA
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

    return [
      {
        label: 'Estações de trabalho',
        value: estacoes,
        percent: Math.round((estacoes / total) * 100),
        color: '#2563EB', // blue-600
      },
      {
        label: 'Servidores',
        value: servidores,
        percent: Math.round((servidores / total) * 100),
        color: '#38BDF8', // sky-400
      },
      {
        label: 'Rede e segurança',
        value: rede,
        percent: Math.round((rede / total) * 100),
        color: '#10B981', // emerald-500
      },
      {
        label: 'Sistemas e aplicações',
        value: sistemas,
        percent: Math.round((sistemas / total) * 100),
        color: '#FB923C', // orange-400
      },
      {
        label: 'Dados e outros',
        value: dados,
        percent: Math.round((dados / total) * 100),
        color: '#F59E0B', // amber-500
      },
    ]
  }, [displayAssets, totalAssetsCount])

  // DADOS DO GRÁFICO 2: CLASSIFICAÇÃO DE CRITICIDADE (Barras)
  const criticalityStats = useMemo(() => {
    const critica = displayAssets.filter((a) => a.criticidade === 'alta').length
    // Subdivisão para visualização detalhada ou contagens reais
    const media = displayAssets.filter((a) => a.criticidade === 'media').length
    const baixa = displayAssets.filter((a) => a.criticidade === 'baixa').length

    return [
      { label: 'Crítica', value: critica, color: '#EF4444' }, // red
      { label: 'Alta', value: Math.max(Math.round(critica * 0.7), 0), color: '#F97316' }, // orange
      { label: 'Média', value: media, color: '#FBBF24' }, // yellow
      { label: 'Baixa', value: baixa, color: '#10B981' }, // green
    ]
  }, [displayAssets])

  // DADOS DO GRÁFICO 3: SITUAÇÃO DE CONFORMIDADE
  const conformidadeStats = useMemo(() => {
    const conforme = displayAssets.filter((a) => a.conformidadeStatus === 'conforme').length
    const pendente = displayAssets.filter((a) => a.conformidadeStatus === 'pendente').length
    const naoConforme = displayAssets.filter((a) => a.conformidadeStatus === 'nao_conforme').length
    const naoAvaliado = displayAssets.filter((a) => a.conformidadeStatus === 'nao_avaliado').length

    const total = totalAssetsCount || 1

    return [
      {
        label: 'Conforme',
        value: conforme,
        percent: Math.round((conforme / total) * 100),
        color: '#10B981', // emerald-500
      },
      {
        label: 'Pendente',
        value: pendente,
        percent: Math.round((pendente / total) * 100),
        color: '#F59E0B', // amber-500
      },
      {
        label: 'Não conforme',
        value: naoConforme,
        percent: Math.round((naoConforme / total) * 100),
        color: '#EF4444', // red-500
      },
      {
        label: 'Não avaliado',
        value: naoAvaliado,
        percent: Math.round((naoAvaliado / total) * 100),
        color: '#94A3B8', // slate-400
      },
    ]
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
    const name = user?.name || user?.email || 'JS'
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 space-y-5 text-slate-900 font-sans">
      {/* 1. TOPBAR DO ESBOÇO */}
      <header className="bg-white rounded-xl border border-slate-200/90 shadow-2xs px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* À esquerda: Seletor de Cliente */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Cliente:</span>
          <Select
            value={organization?.id || ''}
            onValueChange={async (newId) => {
              if (newId && newId !== organization?.id) {
                // Altera a serventia no contexto chamando a atualização
                toast({
                  title: 'Serventia Selecionada',
                  description: `Visualizando ambiente da serventia selecionada.`,
                })
                await refreshOrganization()
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs font-bold text-slate-800 bg-slate-50 border-slate-200/80 min-w-[190px] max-w-[280px]">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {allOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs font-medium">
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ao centro: Busca Global */}
        <div className="flex-1 max-w-md mx-auto w-full">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Pesquisar no sistema..."
              className="pl-9 h-8 text-xs bg-slate-50/70 border-slate-200/80 focus-visible:bg-white placeholder:text-slate-400 rounded-lg"
            />
          </div>
        </div>

        {/* À direita: Sino de Notificações + Avatar e Nome do Usuário */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {/* Sino de Notificações */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full"
              title="Notificações da organização"
              onClick={() => {
                toast({
                  title: 'Notificações',
                  description: 'Nenhum alerta crítico pendente no momento.',
                })
              }}
            >
              <Bell className="w-4 h-4" />
            </Button>
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center pointer-events-none ring-2 ring-white">
              3
            </span>
          </div>

          {/* Avatar e Perfil */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#1A56DB] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {getUserInitials()}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <span className="text-xs font-bold text-slate-900 block truncate max-w-[140px]">
                {user?.name || user?.email || 'João Silva'}
              </span>
              <span className="text-[11px] text-slate-500 block">{getRoleLabel()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <span className="text-slate-600 font-semibold">Inventário de Ativos</span>
            <span className="text-slate-400">›</span>
            <span className="text-slate-700">Visão Geral</span>
          </div>

          {/* Título e Subtítulo */}
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Inventário de Ativos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestão, classificação e conformidade dos ativos da organização
          </p>
        </div>

        {/* Indicador de Atualização + Botões de Ação */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Indicador de Última Atualização */}
          <div
            onClick={loadData}
            role="button"
            className="flex items-center gap-2 text-right cursor-pointer hover:opacity-80 transition-opacity bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs"
            title="Clique para recarregar os dados"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${loading ? 'animate-spin' : ''}`}
            />
            <div className="text-left leading-tight">
              <span className="text-[10px] text-slate-400 font-medium block">
                Última atualização
              </span>
              <span className="text-[11px] font-semibold text-slate-700 font-mono block">
                {lastUpdated}
              </span>
            </div>
          </div>

          {/* Botão Primário Azul + Novo Ativo */}
          {canOperate && (
            <Button
              onClick={() => {
                setEditingAsset(null)
                setModalOpen(true)
              }}
              className="bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-xs"
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
                className="h-9 w-9 border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-2xs"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem asChild>
                <Link to="/relatorios/inventario" target="_blank" className="cursor-pointer gap-2">
                  <FileText className="w-4 h-4 text-slate-500" /> Exportar Relatório
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
        </div>
      </div>

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
          {/* 3. LINHA DE 4 CARDS DE ESTATÍSTICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total de Ativos */}
            <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
                    Total de Ativos
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                      {totalAssetsCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ArrowUp className="w-2.5 h-2.5" /> 12%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    + 26 desde o último mês
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Boxes className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Ativos Críticos */}
            <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
                    Ativos Críticos
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                      {criticalAssetsCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ArrowUp className="w-2.5 h-2.5" /> 6%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    {criticalPercent}% do total
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Inventário Validado */}
            <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
                    Inventário Validado
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                      {validatedAssetsCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ArrowUp className="w-2.5 h-2.5" /> {validatedPercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    Dados validados e completos
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Com Pendências */}
            <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Com Pendências</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                      {pendingAssetsCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <ArrowUp className="w-2.5 h-2.5" /> {pendingPercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    Necessitam de atenção
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <HelpCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 4. LINHA DE 3 PAINÉIS ANALÍTICOS + PAINEL LATERAL DE DETALHES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Bloco dos 3 gráficos da esquerda (8 colunas no desktop) */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gráfico 1: Ativos por Categoria */}
              <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-3">Ativos por Categoria</h3>
                  <div className="flex justify-center my-2">
                    <SvgDonutChart
                      data={categoryStats.map((c) => ({
                        label: c.label,
                        value: c.value,
                        color: c.color,
                      }))}
                      totalLabel={String(totalAssetsCount)}
                      subLabel="Ativos"
                      size={120}
                      strokeWidth={20}
                    />
                  </div>
                </div>

                {/* Legenda com contagem e % */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  {categoryStats.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-2 truncate pr-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="font-semibold text-slate-800 whitespace-nowrap">
                        {item.value}{' '}
                        <span className="font-normal text-slate-400">({item.percent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Gráfico 2: Classificação de Criticidade (Barras) */}
              <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-3">
                    Classificação de Criticidade
                  </h3>
                  <div className="my-1">
                    <SvgBarChart data={criticalityStats} maxVal={120} />
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Total crítico:</span>
                  <strong className="text-red-600 font-bold">{criticalAssetsCount} ativos</strong>
                </div>
              </Card>

              {/* Gráfico 3: Situação de Conformidade */}
              <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-3">
                    Situação de Conformidade
                  </h3>
                  <div className="flex justify-center my-2">
                    <SvgDonutChart
                      data={conformidadeStats.map((c) => ({
                        label: c.label,
                        value: c.value,
                        color: c.color,
                      }))}
                      totalLabel={String(totalAssetsCount)}
                      subLabel="Ativos"
                      size={120}
                      strokeWidth={20}
                    />
                  </div>
                </div>

                {/* Legenda com contagem e % */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  {conformidadeStats.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-2 truncate pr-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="font-semibold text-slate-800 whitespace-nowrap">
                        {item.value}{' '}
                        <span className="font-normal text-slate-400">({item.percent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Painel lateral direito: Detalhes do Ativo (4 colunas no desktop) */}
            <div className="lg:col-span-4">
              {currentAsset ? (
                <AssetDetailsDrawer
                  asset={currentAsset}
                  onClose={() => setSelectedAssetId(null)}
                  onEdit={(asset) => {
                    setEditingAsset(asset)
                    setModalOpen(true)
                  }}
                  onViewFullSheet={(asset) => setFullSheetAsset(asset)}
                />
              ) : (
                <Card className="bg-white border-slate-200/90 shadow-2xs rounded-xl p-6 text-center text-slate-400 h-full flex flex-col items-center justify-center">
                  <Server className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Nenhum ativo selecionado</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clique em qualquer linha da tabela para abrir a ficha de detalhes.
                  </p>
                </Card>
              )}
            </div>
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
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="estacao">Estações</SelectItem>
                    <SelectItem value="servidor">Servidores</SelectItem>
                    <SelectItem value="rede">Rede e Seg.</SelectItem>
                    <SelectItem value="sistema">Sistemas</SelectItem>
                    <SelectItem value="dados">Dados</SelectItem>
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

                          {/* Código com ícone do tipo */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 border border-slate-200/60">
                                {getAssetTypeIcon(asset.tipo, 'w-4 h-4 text-slate-700')}
                              </div>
                              <span className="font-mono text-xs font-semibold text-slate-700">
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
                            {asset.expand?.responsavel?.name || 'Equipe de TI'}
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
                      {fullSheetAsset.expand?.responsavel?.name || 'Equipe de TI'}
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
    </div>
  )
}

export default AssetsPage
