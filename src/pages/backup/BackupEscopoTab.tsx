import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Plus,
  Edit2,
  Trash2,
  Layers,
  Server,
  Search,
  X,
  Check,
  CheckSquare,
  Square,
  HardDrive,
  Database,
  Cloud,
  Monitor,
  Printer,
  Network,
  Cpu,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveBackupEscopo, deleteBackupEscopo } from '@/services/backupService'
import { listInventoryAssets } from '@/services/csctiService'
import type { BackupEscopoItem, InventoryAssetItem, AssetType } from '@/types/cscti'
import { BackupAtivosExigencias } from '@/components/backup/BackupAtivosExigencias'

interface BackupEscopoTabProps {
  escopos: BackupEscopoItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

function getAssetTypeIcon(tipo: AssetType) {
  switch (tipo) {
    case 'servidor_virtualizado':
    case 'servidor_aplicacao':
      return <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" />
    case 'banco_dados':
      return <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
    case 'storage_backup':
      return <HardDrive className="w-3.5 h-3.5 text-purple-600 shrink-0" />
    case 'servico_nuvem':
      return <Cloud className="w-3.5 h-3.5 text-sky-600 shrink-0" />
    case 'estacao':
      return <Monitor className="w-3.5 h-3.5 text-slate-600 shrink-0" />
    case 'impressora_multifuncional':
      return <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
    case 'equipamento_rede':
      return <Network className="w-3.5 h-3.5 text-amber-600 shrink-0" />
    default:
      return <Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0" />
  }
}

function formatAssetTypeLabel(tipo: AssetType): string {
  switch (tipo) {
    case 'servidor_virtualizado':
      return 'Servidor Virtualizado (VM)'
    case 'servidor_aplicacao':
      return 'Servidor de Aplicação'
    case 'banco_dados':
      return 'Banco de Dados'
    case 'storage_backup':
      return 'Storage / Backup'
    case 'servico_nuvem':
      return 'Serviço em Nuvem'
    case 'estacao':
      return 'Estação de Trabalho'
    case 'impressora_multifuncional':
      return 'Impressora / Multifuncional'
    case 'equipamento_rede':
      return 'Equipamento de Rede'
    case 'outro':
      return 'Outro'
    default:
      return tipo
  }
}

export const BackupEscopoTab: React.FC<BackupEscopoTabProps> = ({
  escopos,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BackupEscopoItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<BackupEscopoItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Inventário de ativos da organização para o seletor
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [sistemasProtegidos, setSistemasProtegidos] = useState('')
  const [criticidade, setCriticidade] = useState<'baixa' | 'media' | 'alta'>('alta')
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'em_revisao'>('ativo')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [assetSearch, setAssetSearch] = useState('')

  const reloadAssets = async () => {
    if (!orgId) return
    setLoadingAssets(true)
    try {
      const data = await listInventoryAssets(orgId)
      setAssets(data)
    } catch (err) {
      console.error('Erro ao carregar ativos para escopo de backup:', err)
    } finally {
      setLoadingAssets(false)
    }
  }

  // Carrega ativos do inventário da serventia logada
  useEffect(() => {
    reloadAssets()
  }, [orgId])

  // Mapa rápido de ativo por ID para resolução no card mesmo sem expand
  const assetMap = useMemo(() => {
    const map = new Map<string, InventoryAssetItem>()
    assets.forEach((a) => map.set(a.id, a))
    return map
  }, [assets])

  const openNew = () => {
    setEditingItem(null)
    setNome('')
    setDescricao('')
    setSistemasProtegidos('')
    setCriticidade('alta')
    setStatus('ativo')
    setSelectedAssetIds([])
    setAssetSearch('')
    setModalOpen(true)
  }

  const openEdit = (item: BackupEscopoItem) => {
    setEditingItem(item)
    setNome(item.nome)
    setDescricao(item.descricao || '')
    setSistemasProtegidos(item.sistemas_protegidos || '')
    setCriticidade(item.criticidade)
    setStatus(item.status)
    setSelectedAssetIds(Array.isArray(item.ativos) ? [...item.ativos] : [])
    setAssetSearch('')
    setModalOpen(true)
  }

  // Filtragem dos ativos disponíveis para seleção
  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase()
    if (!q) return assets
    return assets.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        formatAssetTypeLabel(a.tipo).toLowerCase().includes(q) ||
        (a.ip_address && a.ip_address.toLowerCase().includes(q)) ||
        (a.localizacao && a.localizacao.toLowerCase().includes(q))
      )
    })
  }, [assets, assetSearch])

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId],
    )
  }

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredAssets.map((a) => a.id)
    setSelectedAssetIds((prev) => Array.from(new Set([...prev, ...idsToAdd])))
  }

  const handleClearSelection = () => {
    setSelectedAssetIds([])
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSubmitting(true)
    try {
      await saveBackupEscopo({
        id: editingItem?.id,
        organization: orgId,
        nome: nome.trim(),
        descricao: descricao.trim(),
        sistemas_protegidos: sistemasProtegidos.trim(),
        criticidade,
        status,
        ativos: selectedAssetIds,
      })
      toast({
        title: editingItem ? 'Escopo atualizado' : 'Escopo cadastrado',
        description: `O escopo "${nome}" foi salvo com ${selectedAssetIds.length} ativo(s) vinculado(s).`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar escopo',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    setSubmitting(true)
    try {
      await deleteBackupEscopo(deletingItem.id, orgId, deletingItem.nome)
      toast({
        title: 'Escopo excluído',
        description: `O escopo "${deletingItem.nome}" foi removido.`,
      })
      setDeletingItem(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir escopo',
        description: err instanceof Error ? err.message : 'Falha na exclusão.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Desvincular um ativo diretamente a partir do chip do card
  const handleRemoveAssetFromScope = async (scope: BackupEscopoItem, assetIdToRemove: string) => {
    if (!canOperate) return
    const currentAtivos = Array.isArray(scope.ativos) ? scope.ativos : []
    const updatedAtivos = currentAtivos.filter((id) => id !== assetIdToRemove)
    const assetToRemove = assetMap.get(assetIdToRemove)

    try {
      await saveBackupEscopo({
        id: scope.id,
        organization: orgId,
        nome: scope.nome,
        descricao: scope.descricao,
        sistemas_protegidos: scope.sistemas_protegidos,
        criticidade: scope.criticidade,
        status: scope.status,
        ativos: updatedAtivos,
      })
      toast({
        title: 'Ativo desvinculado',
        description: `O ativo "${assetToRemove?.name || assetIdToRemove}" foi desvinculado do escopo "${scope.nome}".`,
      })
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao desvincular ativo',
        description: err instanceof Error ? err.message : 'Falha na atualização.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1: NÚCLEO CENTRADO NO ATIVO — EXIGÊNCIAS DE BACKUP (LOCAL / NUVEM / REPLICAÇÃO) */}
      <BackupAtivosExigencias
        orgId={orgId}
        assets={assets}
        loadingAssets={loadingAssets}
        canOperate={canOperate}
        onReloadAssets={reloadAssets}
      />

      {/* SEÇÃO 2: ESCOPOS FORMAIS DE PROTEÇÃO (AGRUPADORES COM VÍNCULO DE ATIVOS) */}
      <div className="space-y-4 pt-2 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Agrupadores de Escopo de Proteção
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold bg-white text-slate-700 border-slate-300"
                >
                  {escopos.length} {escopos.length === 1 ? 'escopo' : 'escopos'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Organize os ativos com exigência de salvaguarda em agrupadores lógicos de sistemas
                críticos para associá-los aos planos de contingência e políticas de RTO/RPO.
              </p>
            </div>
          </div>

          {canOperate && (
            <Button
              onClick={openNew}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs shrink-0 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" /> Novo Escopo
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {escopos.length === 0 ? (
          <Card className="col-span-full border-dashed border-amber-300 bg-amber-50/30 p-8 text-center rounded-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Nenhum escopo de proteção cadastrado</p>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
              Esta é a primeira etapa do ciclo. Mapeie os sistemas críticos da serventia e vincule
              os ativos do inventário que exigem salvaguarda para associá-los a planos e rotinas.
            </p>
            {canOperate && (
              <Button
                onClick={openNew}
                size="sm"
                className="mt-4 text-xs bg-[#0B2545] hover:bg-[#124E78] text-white font-semibold gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Cadastre o Primeiro Escopo
              </Button>
            )}
          </Card>
        ) : (
          escopos.map((item) => {
            const scopeAssetIds = Array.isArray(item.ativos) ? item.ativos : []
            // Resolver ativos: primeiro tenta expand, depois o mapa local carregado da mesma organização
            const resolvedAssets = scopeAssetIds.map((id) => {
              const fromExpand = item.expand?.ativos?.find((a) => a.id === id)
              if (fromExpand) return fromExpand
              const fromMap = assetMap.get(id)
              if (fromMap) return fromMap
              return {
                id,
                name: `Ativo (${id.slice(0, 8)})`,
                tipo: 'outro' as AssetType,
                status: 'ativo' as const,
                criticidade: 'media' as const,
                origem: 'manual' as const,
                organization: orgId,
              }
            })

            return (
              <Card
                key={item.id}
                className="border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                    <div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold mb-1.5 ${
                          item.criticidade === 'alta'
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : item.criticidade === 'media'
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-slate-700 bg-slate-100'
                        }`}
                      >
                        Criticidade {item.criticidade}
                      </Badge>
                      <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                        {item.nome}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        item.status === 'ativo'
                          ? 'text-emerald-700 bg-emerald-50'
                          : item.status === 'em_revisao'
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-slate-500 bg-slate-100'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 text-xs space-y-3">
                    {item.descricao && (
                      <p className="text-slate-600 line-clamp-3">{item.descricao}</p>
                    )}

                    {/* Vínculo de Ativos do Inventário */}
                    <div className="p-2.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-blue-700" />
                          Ativos do Inventário Vinculados
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-white text-blue-800 border-blue-200"
                        >
                          {scopeAssetIds.length} {scopeAssetIds.length === 1 ? 'ativo' : 'ativos'}
                        </Badge>
                      </div>

                      {resolvedAssets.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">
                          Nenhum ativo do inventário vinculado diretamente.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {resolvedAssets.map((asset) => (
                            <span
                              key={asset.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs group"
                              title={`${asset.name} (${formatAssetTypeLabel(asset.tipo)})`}
                            >
                              {getAssetTypeIcon(asset.tipo)}
                              <span className="truncate max-w-[150px]">{asset.name}</span>
                              {canOperate && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveAssetFromScope(item, asset.id)
                                  }}
                                  className="text-slate-400 hover:text-red-600 transition-colors ml-0.5"
                                  title={`Desvincular "${asset.name}" deste escopo`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {item.sistemas_protegidos && (
                      <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                        <span className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Sistemas & Detalhes Descritivos:
                        </span>
                        <span className="text-slate-800 font-mono text-[11px]">
                          {item.sistemas_protegidos}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </div>

                {canOperate && (
                  <div className="p-4 pt-0">
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingItem(item)}
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Criar/Editar com seleção de Ativos do Inventário */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingItem ? 'Editar Escopo de Proteção' : 'Novo Escopo de Proteção'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mapeie os elementos críticos e selecione os ativos do inventário da serventia que
                devem ter salvaguarda garantida.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome do Escopo <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Base Central de Atos e Documentos Notariais"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Criticidade</label>
                  <Select
                    value={criticidade}
                    onValueChange={(val: 'baixa' | 'media' | 'alta') => setCriticidade(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta (Sistemas de Atos)</SelectItem>
                      <SelectItem value="media">Média (Apoio / Administrativo)</SelectItem>
                      <SelectItem value="baixa">Baixa (Arquivo Histórico)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <Select
                    value={status}
                    onValueChange={(val: 'ativo' | 'inativo' | 'em_revisao') => setStatus(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="em_revisao">Em Revisão</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SELEÇÃO DE ATIVOS DO INVENTÁRIO (multi-seleção com busca e contagem) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Server className="w-4 h-4 text-[#0B2545]" />
                      Ativos do Inventário da Serventia
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Selecione os servidores, VMs e bancos que devem ter backup (opcional)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[11px] font-bold bg-white text-[#0B2545] border-slate-300"
                    >
                      {selectedAssetIds.length}{' '}
                      {selectedAssetIds.length === 1 ? 'ativo vinculado' : 'ativos vinculados'} ao
                      escopo
                    </Badge>
                  </div>
                </div>

                {/* Barra de busca e atalhos rápidos */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Buscar ativo por nome, tipo, IP ou localização..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="text-xs h-8 pl-8"
                    />
                    {assetSearch && (
                      <button
                        type="button"
                        onClick={() => setAssetSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {filteredAssets.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllFiltered}
                      className="h-8 text-[11px] px-2 text-slate-700 shrink-0"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" /> Marcar filtrados
                    </Button>
                  )}
                  {selectedAssetIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="h-8 text-[11px] px-2 text-slate-500 hover:text-red-600 shrink-0"
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Lista rolável de ativos */}
                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                  {loadingAssets ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      Carregando ativos do inventário...
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      Nenhum ativo cadastrado nesta serventia em <strong>Ambiente → Ativos</strong>.
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      Nenhum ativo corresponde à busca &ldquo;{assetSearch}&rdquo;.
                    </div>
                  ) : (
                    filteredAssets.map((asset) => {
                      const isSelected = selectedAssetIds.includes(asset.id)
                      return (
                        <div
                          key={asset.id}
                          onClick={() => toggleAssetSelection(asset.id)}
                          className={`p-2.5 px-3 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                            isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="shrink-0 text-slate-400">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-700" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                            <div className="shrink-0">{getAssetTypeIcon(asset.tipo)}</div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 text-xs block truncate">
                                {asset.name}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {formatAssetTypeLabel(asset.tipo)}
                                {asset.ip_address ? ` • IP: ${asset.ip_address}` : ''}
                                {asset.localizacao ? ` • ${asset.localizacao}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase font-bold ${
                                asset.criticidade === 'alta'
                                  ? 'text-red-700 bg-red-50 border-red-200'
                                  : asset.criticidade === 'media'
                                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                                    : 'text-slate-600 bg-slate-50'
                              }`}
                            >
                              {asset.criticidade}
                            </Badge>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-blue-700 flex items-center">
                                <Check className="w-3 h-3 mr-0.5" /> Vinculado
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Chips dos selecionados para conferência imediata */}
                {selectedAssetIds.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Ativos selecionados ({selectedAssetIds.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {selectedAssetIds.map((id) => {
                        const a = assetMap.get(id)
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100/80 text-blue-900 text-[10px] font-medium"
                          >
                            <span className="truncate max-w-[140px]">{a?.name || id}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleAssetSelection(id)
                              }}
                              className="text-blue-700 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Sistemas e Outros Itens Protegidos (Texto descritivo)
                </label>
                <Input
                  placeholder="Ex: PostgreSQL (banco_atos), Storage NAS (PDF/A), VM-APLICACAO"
                  value={sistemasProtegidos}
                  onChange={(e) => setSistemasProtegidos(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Descrição e Abrangência do Escopo
                </label>
                <Textarea
                  rows={2}
                  placeholder="Descreva a finalidade, impactos e particularidades técnicas desta cobertura."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs"
              >
                {submitting ? 'Salvando...' : 'Salvar Escopo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Excluir Escopo de Proteção?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja remover o escopo &ldquo;{deletingItem?.nome}&rdquo;? Esta ação
              será registrada na trilha de auditoria da serventia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={submitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {submitting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default BackupEscopoTab
