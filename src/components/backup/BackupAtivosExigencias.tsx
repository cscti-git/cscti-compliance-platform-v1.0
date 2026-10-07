import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Server,
  HardDrive,
  Cloud,
  Copy,
  Save,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { updateBatchBackupExigencias, BackupExigenciaUpdateItem } from '@/services/csctiService'
import { InventoryAssetItem, AssetType } from '@/types/cscti'

export interface BackupAtivosExigenciasProps {
  orgId: string
  assets: InventoryAssetItem[]
  loadingAssets: boolean
  canOperate: boolean
  onReloadAssets: () => Promise<void> | void
}

interface RowState {
  exige_backup_local: boolean
  exige_backup_nuvem: boolean
  exige_backup_replicacao: boolean
}

export function formatAssetTypeLabel(tipo: AssetType): string {
  const map: Record<AssetType, string> = {
    servidor_aplicacao: 'Servidor de Aplicação',
    servidor_virtualizado: 'VM / Servidor Virtualizado',
    banco_dados: 'Banco de Dados',
    storage_backup: 'Storage / Backup',
    servico_nuvem: 'Serviço em Nuvem',
    estacao: 'Estação de Trabalho',
    impressora_multifuncional: 'Impressora / Multifuncional',
    equipamento_rede: 'Equipamento de Rede',
    outro: 'Outro',
  }
  return map[tipo] || tipo
}

export const BackupAtivosExigencias: React.FC<BackupAtivosExigenciasProps> = ({
  orgId,
  assets,
  loadingAssets,
  canOperate,
  onReloadAssets,
}) => {
  const { toast } = useToast()

  // Estado local editável por ativo (id -> RowState)
  const [localRows, setLocalRows] = useState<Record<string, RowState>>({})
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterExigencia, setFilterExigencia] = useState<string>('todos')
  const [saving, setSaving] = useState(false)

  // Sincroniza do props.assets quando estes chegam ou são recarregados
  useEffect(() => {
    const next: Record<string, RowState> = {}
    assets.forEach((a) => {
      next[a.id] = {
        exige_backup_local: !!a.exige_backup_local,
        exige_backup_nuvem: !!a.exige_backup_nuvem,
        exige_backup_replicacao: !!a.exige_backup_replicacao,
      }
    })
    setLocalRows(next)
  }, [assets])

  // Contagem de modificações pendentes em relação ao estado original
  const hasChanges = useMemo(() => {
    return assets.some((a) => {
      const cur = localRows[a.id]
      if (!cur) return false
      return (
        cur.exige_backup_local !== !!a.exige_backup_local ||
        cur.exige_backup_nuvem !== !!a.exige_backup_nuvem ||
        cur.exige_backup_replicacao !== !!a.exige_backup_replicacao
      )
    })
  }, [assets, localRows])

  const pendingDiffCount = useMemo(() => {
    return assets.filter((a) => {
      const cur = localRows[a.id]
      if (!cur) return false
      return (
        cur.exige_backup_local !== !!a.exige_backup_local ||
        cur.exige_backup_nuvem !== !!a.exige_backup_nuvem ||
        cur.exige_backup_replicacao !== !!a.exige_backup_replicacao
      )
    }).length
  }, [assets, localRows])

  // Métricas agregadas (baseadas no estado local visualizado)
  const metrics = useMemo(() => {
    let totalExigem = 0
    let localCount = 0
    let nuvemCount = 0
    let replCount = 0

    assets.forEach((a) => {
      const row = localRows[a.id] || {
        exige_backup_local: !!a.exige_backup_local,
        exige_backup_nuvem: !!a.exige_backup_nuvem,
        exige_backup_replicacao: !!a.exige_backup_replicacao,
      }
      const hasAny = row.exige_backup_local || row.exige_backup_nuvem || row.exige_backup_replicacao
      if (hasAny) totalExigem++
      if (row.exige_backup_local) localCount++
      if (row.exige_backup_nuvem) nuvemCount++
      if (row.exige_backup_replicacao) replCount++
    })

    return { totalExigem, localCount, nuvemCount, replCount }
  }, [assets, localRows])

  // Handlers de toggle
  const handleToggle = (
    assetId: string,
    field: 'exige_backup_local' | 'exige_backup_nuvem' | 'exige_backup_replicacao',
  ) => {
    if (!canOperate) return
    setLocalRows((prev) => {
      const cur = prev[assetId] || {
        exige_backup_local: false,
        exige_backup_nuvem: false,
        exige_backup_replicacao: false,
      }
      return {
        ...prev,
        [assetId]: {
          ...cur,
          [field]: !cur[field],
        },
      }
    })
  }

  // Desfazer alterações locais
  const handleReset = () => {
    const next: Record<string, RowState> = {}
    assets.forEach((a) => {
      next[a.id] = {
        exige_backup_local: !!a.exige_backup_local,
        exige_backup_nuvem: !!a.exige_backup_nuvem,
        exige_backup_replicacao: !!a.exige_backup_replicacao,
      }
    })
    setLocalRows(next)
  }

  // Salvar em lote
  const handleSaveBatch = async () => {
    if (!canOperate) return
    setSaving(true)

    try {
      // Montar lista de updates para todos os alterados (ou todos os ativos)
      const updates: BackupExigenciaUpdateItem[] = assets
        .filter((a) => {
          const cur = localRows[a.id]
          if (!cur) return false
          return (
            cur.exige_backup_local !== !!a.exige_backup_local ||
            cur.exige_backup_nuvem !== !!a.exige_backup_nuvem ||
            cur.exige_backup_replicacao !== !!a.exige_backup_replicacao
          )
        })
        .map((a) => {
          const cur = localRows[a.id]
          return {
            id: a.id,
            name: a.name,
            exige_backup_local: !!cur?.exige_backup_local,
            exige_backup_nuvem: !!cur?.exige_backup_nuvem,
            exige_backup_replicacao: !!cur?.exige_backup_replicacao,
          }
        })

      if (updates.length === 0) {
        toast({
          title: 'Nenhuma alteração pendente',
          description: 'Todos os ativos já estão com as exigências sincronizadas.',
        })
        setSaving(false)
        return
      }

      await updateBatchBackupExigencias(orgId, updates)

      toast({
        title: 'Exigências de backup salvas',
        description: `${updates.length} ativo(s) foram atualizados com sucesso e registrados na auditoria.`,
      })

      await onReloadAssets()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar exigências',
        description: err instanceof Error ? err.message : 'Falha na gravação em lote.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Lista filtrada
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assets.filter((a) => {
      // Texto: nome, ip, localização, tipo
      if (q) {
        const matchName = a.name.toLowerCase().includes(q)
        const matchIp = a.ip_address ? a.ip_address.toLowerCase().includes(q) : false
        const matchLoc = a.localizacao ? a.localizacao.toLowerCase().includes(q) : false
        const matchTipo = formatAssetTypeLabel(a.tipo).toLowerCase().includes(q)
        if (!matchName && !matchIp && !matchLoc && !matchTipo) return false
      }

      // Filtro tipo
      if (filterTipo !== 'todos' && a.tipo !== filterTipo) {
        return false
      }

      // Filtro exigência
      const row = localRows[a.id] || {
        exige_backup_local: !!a.exige_backup_local,
        exige_backup_nuvem: !!a.exige_backup_nuvem,
        exige_backup_replicacao: !!a.exige_backup_replicacao,
      }
      const hasAny = row.exige_backup_local || row.exige_backup_nuvem || row.exige_backup_replicacao

      if (filterExigencia === 'exigem' && !hasAny) return false
      if (filterExigencia === 'nao_exigem' && hasAny) return false
      if (filterExigencia === 'local' && !row.exige_backup_local) return false
      if (filterExigencia === 'nuvem' && !row.exige_backup_nuvem) return false
      if (filterExigencia === 'replicacao' && !row.exige_backup_replicacao) return false

      return true
    })
  }, [assets, search, filterTipo, filterExigencia, localRows])

  // Opções de tipos presentes no inventário para o select
  const availableTipos = useMemo(() => {
    const set = new Set<AssetType>()
    assets.forEach((a) => set.add(a.tipo))
    return Array.from(set)
  }, [assets])

  return (
    <Card className="border-slate-200 shadow-2xs overflow-hidden">
      {/* Topo do Bloco: Título, contadores e ações */}
      <div className="p-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border-b border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-8 h-8 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shrink-0">
                <Server className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Inventário de Ativos &amp; Exigências de Salvaguarda
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold bg-white text-slate-700 border-slate-300"
                  >
                    {assets.length} {assets.length === 1 ? 'ativo' : 'ativos'}
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  Importados automaticamente do GLPI ou cadastrados no inventário. Selecione quais
                  ativos exigem salvaguarda e a modalidade aplicável: <strong>Local</strong>,{' '}
                  <strong>Nuvem</strong> e/ou <strong>Replicação</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
            {hasChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={saving}
                className="text-xs text-slate-600 hover:text-slate-900 gap-1 h-8"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Desfazer
              </Button>
            )}

            {canOperate ? (
              <Button
                onClick={handleSaveBatch}
                disabled={saving || !hasChanges}
                size="sm"
                className={`text-xs font-semibold gap-1.5 shadow-xs transition-all h-8 ${
                  hasChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                    : 'bg-[#0B2545] hover:bg-[#124E78] text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {saving
                  ? 'Salvando exigências...'
                  : hasChanges
                    ? `Salvar exigências (${pendingDiffCount} pendente${pendingDiffCount > 1 ? 's' : ''})`
                    : 'Salvar exigências'}
              </Button>
            ) : (
              <Badge variant="outline" className="text-[11px] text-slate-500 bg-slate-50">
                Modo Somente Leitura (perfil Usuário)
              </Badge>
            )}
          </div>
        </div>

        {/* Barra de Contadores Agregados */}
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200/70">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Exigem Backup
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {metrics.totalExigem}
              </span>
              <span className="text-[11px] text-slate-500">
                de {assets.length} (
                {assets.length > 0 ? Math.round((metrics.totalExigem / assets.length) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-blue-700" />
              Exige Local
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-blue-950 tabular-nums">
                {metrics.localCount}
              </span>
              <span className="text-[11px] text-blue-700">ativos</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-50/50 border border-sky-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-sky-900 tracking-wider flex items-center gap-1">
              <Cloud className="w-3 h-3 text-sky-700" />
              Exige Nuvem
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-sky-950 tabular-nums">
                {metrics.nuvemCount}
              </span>
              <span className="text-[11px] text-sky-700">ativos</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-purple-900 tracking-wider flex items-center gap-1">
              <Copy className="w-3 h-3 text-purple-700" />
              Exige Replicação
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-purple-950 tabular-nums">
                {metrics.replCount}
              </span>
              <span className="text-[11px] text-purple-700">ativos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar ativo por nome, IP, localização ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="text-xs h-8 bg-white min-w-[140px]">
                <SelectValue placeholder="Tipo de ativo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {availableTipos.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {formatAssetTypeLabel(tipo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={filterExigencia} onValueChange={setFilterExigencia}>
            <SelectTrigger className="text-xs h-8 bg-white min-w-[150px]">
              <SelectValue placeholder="Exigência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as exigências</SelectItem>
              <SelectItem value="exigem">Exigem qualquer backup</SelectItem>
              <SelectItem value="nao_exigem">Não exigem backup</SelectItem>
              <SelectItem value="local">Exigem Local</SelectItem>
              <SelectItem value="nuvem">Exigem Nuvem</SelectItem>
              <SelectItem value="replicacao">Exigem Replicação</SelectItem>
            </SelectContent>
          </Select>

          {(search || filterTipo !== 'todos' || filterExigencia !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setFilterTipo('todos')
                setFilterExigencia('todos')
              }}
              className="text-xs h-8 text-slate-500 hover:text-slate-800"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo: Tabela de Ativos e Toggles */}
      <CardContent className="p-0">
        {loadingAssets ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0B2545]" />
            Carregando ativos do inventário da serventia...
          </div>
        ) : assets.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
              <Server className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Nenhum ativo cadastrado nesta serventia
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
              Importe os equipamentos via conector GLPI ou cadastre manualmente no{' '}
              <Link to="/ativos" className="text-blue-700 font-semibold underline">
                Inventário de Ativos
              </Link>{' '}
              para que apareçam aqui automaticamente.
            </p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-8 px-4 text-center text-xs text-slate-500">
            Nenhum ativo corresponde aos filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Ativo do Inventário</th>
                  <th className="py-2.5 px-3">Tipo / Plataforma</th>
                  <th className="py-2.5 px-3">IP / Localização</th>
                  <th className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-blue-900">
                      <HardDrive className="w-3 h-3 text-blue-700" /> Local
                    </span>
                  </th>
                  <th className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sky-900">
                      <Cloud className="w-3 h-3 text-sky-700" /> Nuvem
                    </span>
                  </th>
                  <th className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-purple-900">
                      <Copy className="w-3 h-3 text-purple-700" /> Replicação
                    </span>
                  </th>
                  <th className="py-2.5 px-3 text-right">Status da Exigência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((asset) => {
                  const row = localRows[asset.id] || {
                    exige_backup_local: !!asset.exige_backup_local,
                    exige_backup_nuvem: !!asset.exige_backup_nuvem,
                    exige_backup_replicacao: !!asset.exige_backup_replicacao,
                  }
                  const hasAny =
                    row.exige_backup_local || row.exige_backup_nuvem || row.exige_backup_replicacao
                  const isDirty =
                    row.exige_backup_local !== !!asset.exige_backup_local ||
                    row.exige_backup_nuvem !== !!asset.exige_backup_nuvem ||
                    row.exige_backup_replicacao !== !!asset.exige_backup_replicacao

                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isDirty ? 'bg-amber-50/40' : hasAny ? 'bg-blue-50/15' : 'bg-white'
                      }`}
                    >
                      {/* Nome do ativo */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              hasAny ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            title={hasAny ? 'Exige salvaguarda de backup' : 'Não exige backup'}
                          />
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {asset.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {asset.origem === 'glpi' ? 'GLPI' : 'Manual'}
                              {asset.serial_number ? ` • S/N: ${asset.serial_number}` : ''}
                            </span>
                          </div>
                          {isDirty && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold bg-amber-100 text-amber-900 border-amber-300 px-1 py-0"
                            >
                              modificado
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {formatAssetTypeLabel(asset.tipo)}
                        </span>
                      </td>

                      {/* IP / Localização */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5 leading-tight">
                          {asset.ip_address ? (
                            <span className="font-mono text-[11px] text-slate-700 block">
                              {asset.ip_address}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Sem IP</span>
                          )}
                          {asset.localizacao && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">
                              {asset.localizacao}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Toggle Local */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={row.exige_backup_local}
                            onCheckedChange={() => handleToggle(asset.id, 'exige_backup_local')}
                            disabled={!canOperate || saving}
                            className="data-[state=checked]:bg-blue-600 scale-90"
                            title={
                              canOperate ? 'Exige cópia local em disco/storage' : 'Somente leitura'
                            }
                          />
                        </div>
                      </td>

                      {/* Toggle Nuvem */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={row.exige_backup_nuvem}
                            onCheckedChange={() => handleToggle(asset.id, 'exige_backup_nuvem')}
                            disabled={!canOperate || saving}
                            className="data-[state=checked]:bg-sky-600 scale-90"
                            title={
                              canOperate
                                ? 'Exige cópia externa em nuvem (regra 3-2-1)'
                                : 'Somente leitura'
                            }
                          />
                        </div>
                      </td>

                      {/* Toggle Replicação */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={row.exige_backup_replicacao}
                            onCheckedChange={() =>
                              handleToggle(asset.id, 'exige_backup_replicacao')
                            }
                            disabled={!canOperate || saving}
                            className="data-[state=checked]:bg-purple-600 scale-90"
                            title={
                              canOperate
                                ? 'Exige replicação contínua/quase contínua de VM'
                                : 'Somente leitura'
                            }
                          />
                        </div>
                      </td>

                      {/* Status da Exigência */}
                      <td className="py-2.5 px-3 text-right">
                        {hasAny ? (
                          <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                            {row.exige_backup_local && (
                              <Badge className="text-[9px] bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 font-semibold px-1.5 py-0">
                                Local
                              </Badge>
                            )}
                            {row.exige_backup_nuvem && (
                              <Badge className="text-[9px] bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100 font-semibold px-1.5 py-0">
                                Nuvem
                              </Badge>
                            )}
                            {row.exige_backup_replicacao && (
                              <Badge className="text-[9px] bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 font-semibold px-1.5 py-0">
                                Replicação
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Não exige backup
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé informativo */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Ativos marcados são confrontados nas rotinas, laudos e auditorias de conformidade do
              cartório.
            </span>
          </div>
          <span className="text-slate-400">
            Exibindo {filteredAssets.length} de {assets.length} ativos
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default BackupAtivosExigencias
