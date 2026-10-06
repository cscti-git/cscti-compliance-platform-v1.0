import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { listInventoryAssets, deleteInventoryAsset } from '@/services/csctiService'
import type {
  InventoryAssetItem,
  AssetType,
  AssetStatus,
  AssetCriticality,
  AssetOrigin,
} from '@/types/cscti'
import { AssetModal, ASSET_TYPES } from './AssetModal'
import { GlpiSyncTab } from './GlpiSyncTab'
import {
  Server,
  Plus,
  Printer,
  Search,
  Filter,
  RefreshCw,
  HardDrive,
  Database,
  Cloud,
  Monitor,
  Wifi,
  Shield,
  Trash2,
  Edit2,
  AlertCircle,
  FileText,
  Boxes,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react'

export const AssetsPage: React.FC = () => {
  const { organization, role } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const orgId = organization?.id || ''
  const canOperate = role === 'admin' || role === 'suporte'

  const activeTab = searchParams.get('tab') || 'ativos'

  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('todos')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')
  const [selectedCriticidade, setSelectedCriticidade] = useState<string>('todos')
  const [selectedOrigem, setSelectedOrigem] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<InventoryAssetItem | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<InventoryAssetItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadAssets = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await listInventoryAssets(orgId, {
        search,
        tipo: selectedType,
        status: selectedStatus,
        criticidade: selectedCriticidade,
        origem: selectedOrigem,
      })
      setAssets(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [orgId, selectedType, selectedStatus, selectedCriticidade, selectedOrigem])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadAssets()
  }

  const handleDelete = async () => {
    if (!deletingAsset || !orgId) return
    setDeleteLoading(true)
    try {
      await deleteInventoryAsset(deletingAsset.id, orgId, deletingAsset.name)
      toast({
        title: 'Ativo excluído',
        description: `O ativo ${deletingAsset.name} foi removido do inventário.`,
      })
      setDeletingAsset(null)
      loadAssets()
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

  // Contadores e métricas
  const totalAssets = assets.length
  const criticalAssets = assets.filter((a) => a.criticidade === 'alta').length
  const activeAssets = assets.filter((a) => a.status === 'ativo').length
  const glpiAssets = assets.filter((a) => a.origem === 'glpi').length

  const getTypeIcon = (tipo: AssetType) => {
    switch (tipo) {
      case 'servidor_aplicacao':
        return <Server className="w-4 h-4 text-indigo-600" />
      case 'banco_dados':
        return <Database className="w-4 h-4 text-blue-600" />
      case 'storage_backup':
        return <HardDrive className="w-4 h-4 text-emerald-600" />
      case 'servico_nuvem':
        return <Cloud className="w-4 h-4 text-cyan-600" />
      case 'estacao':
        return <Monitor className="w-4 h-4 text-slate-600" />
      case 'equipamento_rede':
        return <Wifi className="w-4 h-4 text-amber-600" />
      case 'impressora_multifuncional':
        return <Printer className="w-4 h-4 text-purple-600" />
      default:
        return <Boxes className="w-4 h-4 text-slate-500" />
    }
  }

  const getTypeLabel = (tipo: AssetType) => {
    const found = ASSET_TYPES.find((t) => t.value === tipo)
    return found ? found.label : tipo
  }

  const getCriticidadeBadge = (crit: AssetCriticality) => {
    switch (crit) {
      case 'alta':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 font-semibold text-[10px]">
            Alta Criticidade
          </Badge>
        )
      case 'media':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[10px]">
            Média Criticidade
          </Badge>
        )
      case 'baixa':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-semibold text-[10px]">
            Baixa Criticidade
          </Badge>
        )
    }
  }

  const getStatusBadge = (st: AssetStatus) => {
    switch (st) {
      case 'ativo':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ativo
          </span>
        )
      case 'inativo':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Inativo
          </span>
        )
      case 'desativado':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Desativado
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Inventário de Ativos Tecnológicos
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              Fase 2 • Continuidade
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mapeamento dos servidores, bancos de dados, storages e estações da serventia (base
            funcional para escopo de continuidade e rotinas de backup).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/relatorios/inventario" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1.5 shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Exportar Relatório
            </Button>
          </Link>

          {canOperate && (
            <Button
              onClick={() => {
                setEditingAsset(null)
                setModalOpen(true)
              }}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Novo Ativo
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Principais: Ativos vs Sincronização GLPI */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setSearchParams({ tab: val })
        }}
        className="w-full"
      >
        <TabsList className="bg-slate-100 p-1 border border-slate-200/80 mb-6">
          <TabsTrigger
            value="ativos"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <Server className="w-3.5 h-3.5 mr-1.5" /> Ativos do Cartório ({totalAssets})
          </TabsTrigger>
          <TabsTrigger
            value="glpi"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sincronização GLPI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="space-y-6">
          {/* Cartões de Indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total de Ativos
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalAssets}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                  <Boxes className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ativos em Operação
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 mt-0.5">{activeAssets}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Alta Criticidade
                  </p>
                  <p className="text-2xl font-bold text-red-700 mt-0.5">{criticalAssets}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Origem GLPI
                  </p>
                  <p className="text-2xl font-bold text-[#0B2545] mt-0.5">{glpiAssets}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Server className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Filtros e Busca */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Campo de Busca */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex-1 flex items-center gap-2 max-w-md"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Buscar por nome, IP, localização ou serial..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="sm" className="text-xs h-9 px-3">
                    Buscar
                  </Button>
                </form>

                {/* Filtros em Linha */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="text-xs h-9 w-[150px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Tipos</SelectItem>
                      {ASSET_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedCriticidade} onValueChange={setSelectedCriticidade}>
                    <SelectTrigger className="text-xs h-9 w-[130px]">
                      <SelectValue placeholder="Criticidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas Criticidades</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="text-xs h-9 w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="desativado">Desativado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedOrigem} onValueChange={setSelectedOrigem}>
                    <SelectTrigger className="text-xs h-9 w-[120px]">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas Origens</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="glpi">GLPI</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setSelectedType('todos')
                      setSelectedCriticidade('todos')
                      setSelectedStatus('todos')
                      setSelectedOrigem('todos')
                    }}
                    className="text-xs h-9 px-2 text-slate-500 hover:text-slate-800"
                    title="Limpar Filtros"
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Ativos */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Ativos Catalogados ({assets.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Base cadastral para vinculação de escopo das rotinas de backup da serventia.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadAssets}
                disabled={loading}
                className="text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />{' '}
                Atualizar
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0B2545]" />
                  Carregando ativos do inventário...
                </div>
              ) : assets.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  <Server className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">Nenhum ativo encontrado</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {search || selectedType !== 'todos'
                      ? 'Nenhum ativo corresponde aos filtros aplicados. Tente limpar os critérios de busca.'
                      : 'Cadastre o primeiro ativo tecnológico da serventia ou execute a sincronização GLPI.'}
                  </p>
                  {canOperate && !search && selectedType === 'todos' && (
                    <Button
                      onClick={() => {
                        setEditingAsset(null)
                        setModalOpen(true)
                      }}
                      size="sm"
                      className="mt-4 bg-[#0B2545] hover:bg-[#124E78] text-white text-xs"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Cadastrar Primeiro Ativo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Identificação / Ativo</th>
                        <th className="py-2.5 px-4">Tipo</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Criticidade</th>
                        <th className="py-2.5 px-4">Localização / IP</th>
                        <th className="py-2.5 px-4">Origem</th>
                        <th className="py-2.5 px-4">Responsável</th>
                        {canOperate && <th className="py-2.5 px-4 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded bg-slate-100 text-slate-700">
                                {getTypeIcon(asset.tipo)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{asset.name}</span>
                                {asset.serial_number && (
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    S/N: {asset.serial_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-slate-700">{getTypeLabel(asset.tipo)}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getStatusBadge(asset.status)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getCriticidadeBadge(asset.criticidade)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-700">
                              <span>{asset.localizacao || '—'}</span>
                              {asset.ip_address && (
                                <span className="block text-[11px] font-mono text-slate-500">
                                  IP: {asset.ip_address}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {asset.origem === 'glpi' ? (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-300 font-semibold text-[10px]"
                              >
                                GLPI #{asset.external_id || ''}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]"
                              >
                                Manual
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {asset.expand?.responsavel?.name || '—'}
                          </td>
                          {canOperate && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                  onClick={() => {
                                    setEditingAsset(asset)
                                    setModalOpen(true)
                                  }}
                                  title="Editar Ativo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => setDeletingAsset(asset)}
                                  title="Excluir Ativo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glpi">
          <GlpiSyncTab />
        </TabsContent>
      </Tabs>

      {/* Modal Criar / Editar Ativo */}
      <AssetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingAsset(null)
        }}
        onSaved={loadAssets}
        orgId={orgId}
        asset={editingAsset}
      />

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
