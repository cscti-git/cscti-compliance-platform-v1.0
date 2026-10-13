import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Server,
  Laptop,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Filter,
  Search,
  CheckSquare,
  Square,
  Link2,
  Unlink,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  ShieldAlert,
  FileCheck,
  Hash,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PanelHeader } from '@/components/common/PanelHeader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { formatSpDateOnly } from '@/pages/backup/relatorioData'
import {
  saveSegCoberturaExigida,
  updateAssetEndpointCoverage,
  batchUpdateAssetsEndpointCoverage,
  toggleAssetExigeEndpoint,
  isAssetRelevantForEndpoint,
} from '@/services/segurancaService'
import type {
  InventoryAssetItem,
  SegSolucaoItem,
  SegCoberturaExigidaItem,
  SegComprovanteItem,
  SegurancaCoberturaCalculada,
} from '@/types/cscti'

export interface SegurancaCoberturaTabProps {
  orgId: string
  assets: InventoryAssetItem[]
  solucoes: SegSolucaoItem[]
  coberturasExigidas: SegCoberturaExigidaItem[]
  comprovantes: SegComprovanteItem[]
  coberturaCalculada: SegurancaCoberturaCalculada
  canEdit: boolean
  onReload: () => void
}

export const SegurancaCoberturaTab: React.FC<SegurancaCoberturaTabProps> = ({
  orgId,
  assets,
  solucoes,
  coberturasExigidas,
  comprovantes,
  coberturaCalculada,
  canEdit,
  onReload,
}) => {
  // Estados de modais
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false)
  const [novaQtdExigida, setNovaQtdExigida] = useState<string>(
    String(coberturaCalculada.exigidasEndpoint),
  )
  const [salvandoAjuste, setSalvandoAjuste] = useState(false)

  // Modal de vínculo/marcação de ativo (individual ou lote)
  const [vinculoModalOpen, setVinculoModalOpen] = useState(false)
  const [targetAsset, setTargetAsset] = useState<InventoryAssetItem | null>(null)
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])

  // Formulário do modal de vínculo
  const [formStatus, setFormStatus] = useState<'protegido' | 'sem_agente' | 'sem_comprovacao'>(
    'protegido',
  )
  const [formComprovanteId, setFormComprovanteId] = useState<string>('none')
  const [formSolucaoId, setFormSolucaoId] = useState<string>('none')
  const [formObservacoes, setFormObservacoes] = useState<string>('')
  const [salvandoVinculo, setSalvandoVinculo] = useState(false)

  // Filtros de visualização
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos')

  // Soluções de endpoint
  const endpointSolucoes = useMemo(
    () => solucoes.filter((s) => s.tipo === 'endpoint_antivirus'),
    [solucoes],
  )

  // Comprovantes de endpoint com data e hash
  const comprovantesDisponiveis = useMemo(() => {
    return comprovantes.filter(
      (c) =>
        c.expand?.solucao?.tipo === 'endpoint_antivirus' ||
        c.maquinas_protegidas !== undefined ||
        c.tipo === 'relatorio_console' ||
        c.tipo === 'laudo_auditoria' ||
        c.tipo === 'pdf',
    )
  }, [comprovantes])

  // Contagens nominais reais
  const comprovadas = coberturaCalculada.comprovadasEndpoint
  const exigidas = coberturaCalculada.exigidasEndpoint
  const percentual = coberturaCalculada.percentualCobertura
  const semAgente = coberturaCalculada.semAgenteEndpoint
  const semComprovacao = coberturaCalculada.semComprovacaoEndpoint

  // Ativos filtrados
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Busca por nome, ip, serial ou external_id
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        const matchName = asset.name?.toLowerCase().includes(termo)
        const matchIp = asset.ip_address?.toLowerCase().includes(termo)
        const matchSerial = asset.serial_number?.toLowerCase().includes(termo)
        const matchExt = asset.external_id?.toLowerCase().includes(termo)
        if (!matchName && !matchIp && !matchSerial && !matchExt) return false
      }

      // Filtro por status de proteção
      if (filtroStatus !== 'todos') {
        const st = asset.endpoint_status || 'sem_comprovacao'
        if (filtroStatus !== st) return false
      }

      // Filtro por tipo de ativo
      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'estacao' && asset.tipo !== 'estacao') return false
        if (
          filtroTipo === 'servidor' &&
          asset.tipo !== 'servidor_aplicacao' &&
          asset.tipo !== 'servidor_virtualizado' &&
          asset.tipo !== 'banco_dados'
        )
          return false
        if (
          filtroTipo === 'outros' &&
          (asset.tipo === 'estacao' ||
            asset.tipo === 'servidor_aplicacao' ||
            asset.tipo === 'servidor_virtualizado' ||
            asset.tipo === 'banco_dados')
        )
          return false
      }

      // Filtro por origem (GLPI vs Manual)
      if (filtroOrigem !== 'todos') {
        if (filtroOrigem === 'glpi' && asset.origem !== 'glpi') return false
        if (filtroOrigem === 'manual' && asset.origem === 'glpi') return false
      }

      return true
    })
  }, [assets, busca, filtroStatus, filtroTipo, filtroOrigem])

  // Controle de seleção em lote
  const allFilteredSelected =
    filteredAssets.length > 0 && filteredAssets.every((a) => selectedAssetIds.includes(a.id))

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedAssetIds([])
    } else {
      setSelectedAssetIds(filteredAssets.map((a) => a.id))
    }
  }

  const handleToggleSelectOne = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId],
    )
  }

  // Abertura do modal de vínculo individual
  const handleOpenIndividualModal = (asset: InventoryAssetItem) => {
    setTargetAsset(asset)
    setIsBatchMode(false)
    setFormStatus(asset.endpoint_status || 'protegido')
    setFormComprovanteId(asset.endpoint_comprovante || 'none')
    setFormSolucaoId(asset.endpoint_solucao || 'none')
    setFormObservacoes(asset.endpoint_observacoes || '')
    setVinculoModalOpen(true)
  }

  // Abertura do modal de vínculo em lote
  const handleOpenBatchModal = () => {
    if (selectedAssetIds.length === 0) return
    setTargetAsset(null)
    setIsBatchMode(true)
    setFormStatus('protegido')
    setFormComprovanteId('none')
    setFormSolucaoId('none')
    setFormObservacoes('')
    setVinculoModalOpen(true)
  }

  // Salvar vínculo / comprovação de proteção
  const handleSalvarVinculo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoVinculo(true)

    try {
      const selectedComp = comprovantes.find((c) => c.id === formComprovanteId)
      const compId = formComprovanteId !== 'none' ? formComprovanteId : undefined
      const solId = formSolucaoId !== 'none' ? formSolucaoId : selectedComp?.solucao || undefined
      const dataComp = selectedComp?.data_comprovante || undefined
      const hashComp = selectedComp?.hash_sha256 || undefined

      if (isBatchMode) {
        const { successCount, errors } = await batchUpdateAssetsEndpointCoverage(orgId, assets, {
          assetIds: selectedAssetIds,
          endpoint_status: formStatus,
          comprovanteId: compId,
          solucaoId: solId,
          data_comprovacao: dataComp,
          hash_sha256: hashComp,
          observacoes: formObservacoes,
        })

        if (errors.length > 0) {
          toast({
            title: 'Atualização parcial em lote',
            description: `${successCount} atualizados com sucesso, ${errors.length} com erro.`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Cobertura em lote atualizada',
            description: `${successCount} ativo(s) marcado(s) como ${
              formStatus === 'protegido'
                ? 'Protegido'
                : formStatus === 'sem_agente'
                  ? 'Sem agente'
                  : 'Sem comprovação'
            }.`,
          })
        }
        setSelectedAssetIds([])
      } else if (targetAsset) {
        await updateAssetEndpointCoverage(orgId, targetAsset, {
          ativoId: targetAsset.id,
          endpoint_status: formStatus,
          comprovanteId: compId,
          solucaoId: solId,
          data_comprovacao: dataComp,
          hash_sha256: hashComp,
          observacoes: formObservacoes,
        })

        toast({
          title: 'Ativo atualizado',
          description: `O ativo "${targetAsset.name}" foi atualizado com sucesso.`,
        })
      }

      setVinculoModalOpen(false)
      onReload()
    } catch (err: any) {
      console.error('Erro ao salvar vínculo de proteção:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao atualizar cobertura do ativo.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoVinculo(false)
    }
  }

  // Toggle rápida de exigência de endpoint
  const handleToggleExigencia = async (asset: InventoryAssetItem) => {
    if (!canEdit) return
    try {
      const atual = isAssetRelevantForEndpoint(asset)
      await toggleAssetExigeEndpoint(orgId, asset, !atual)
      toast({
        title: !atual ? 'Exigência ativada' : 'Exigência dispensada',
        description: `O ativo "${asset.name}" ${
          !atual ? 'agora exige' : 'não exige mais'
        } proteção endpoint.`,
      })
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar exigência',
        description: err?.message || 'Falha na comunicação.',
        variant: 'destructive',
      })
    }
  }

  // Salvar ajuste manual da meta
  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoAjuste(true)
    try {
      const cobAtual = coberturasExigidas.find((c) => c.tipo_solucao === 'endpoint_antivirus')
      await saveSegCoberturaExigida(orgId, {
        id: cobAtual?.id,
        tipo_solucao: 'endpoint_antivirus',
        quantidade_exigida: Number(novaQtdExigida) || 0,
        base_calculo: 'Ajuste manual da serventia',
        ajuste_manual: true,
      })
      toast({
        title: 'Cobertura exigida atualizada',
        description: `Meta de ativos exigidos definida para ${novaQtdExigida}.`,
      })
      setAjusteModalOpen(false)
      onReload()
    } catch (err: any) {
      console.error('Erro ao ajustar cobertura exigida:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao atualizar cobertura exigida.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAjuste(false)
    }
  }

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Confronto de Cobertura por Ativo Real"
        subtitle="Cruzamento máquina por máquina entre o Inventário de Ativos (incluindo estações e servidores sincronizados do GLPI) e as proteções comprovadas por laudo técnico."
        action={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNovaQtdExigida(String(exigidas))
                  setAjusteModalOpen(true)
                }}
                className="text-xs h-9 border-slate-300 hover:bg-slate-50 gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Ajustar Meta</span>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Card Principal de Confronto */}
      <Card className="border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Confronto de Endpoint Security / Antivírus
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-none">
                  {comprovadas}
                </span>
                <span className="text-sm sm:text-base font-semibold text-slate-500">
                  máquinas protegidas de {exigidas} exigidas
                </span>
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    percentual >= 100
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : percentual >= 70
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {percentual}% Cobertura Real
                </Badge>
              </div>
            </div>

            {/* Avisos Rápidos */}
            <div className="flex flex-wrap items-center gap-2">
              {semAgente > 0 && (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-rose-800 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{semAgente} sem agente / desprotegidas</span>
                </div>
              )}
              {semComprovacao > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-amber-800 text-xs font-semibold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{semComprovacao} sem comprovação vinculada</span>
                </div>
              )}
              {semAgente === 0 && semComprovacao === 0 && comprovadas > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% dos ativos cobertos com comprovação</span>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Progresso do Confronto */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Progresso de Cobertura Efetiva por Ativo</span>
              <span className="font-mono">{percentual}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  percentual >= 100
                    ? 'bg-emerald-500'
                    : percentual >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, percentual)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              * Cruzamento nominal: (Ativos com status Protegido ÷ Total de ativos com proteção
              exigida) × 100. Isolamento multi-tenant real da serventia conectada.
            </p>
          </div>

          {/* Comparativo de Indicadores Auxiliares */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Definições de Antivírus
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  {coberturaCalculada.definicoesAtualizadasData
                    ? formatSpDateOnly(coberturaCalculada.definicoesAtualizadasData)
                    : 'Pendente de laudo'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Firewall Perimetral
              </span>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 capitalize">
                  {coberturaCalculada.statusFirewallConsolidado === 'ativo'
                    ? 'Ativo e Operacional'
                    : coberturaCalculada.statusFirewallConsolidado === 'em_manutencao'
                      ? 'Em Manutenção'
                      : 'Aguardando comprovação'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Ameaças Contidas
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Activity className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">
                  {coberturaCalculada.ameacasBloqueadasTotal} eventos bloqueados
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Nominal de Cobertura por Ativo */}
      <div className="space-y-4">
        {/* Barra de Filtros e Ações em Lote */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Campo de Busca */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por hostname, IP, serial..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="text-xs pl-8 h-8"
              />
            </div>

            {/* Filtro Status Proteção */}
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 text-xs w-[170px]">
                <SelectValue placeholder="Status de Proteção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="protegido">Protegido (Verde)</SelectItem>
                <SelectItem value="sem_comprovacao">Sem Comprovação (Âmbar)</SelectItem>
                <SelectItem value="sem_agente">Sem Agente (Vermelho)</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro Tipo */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Tipo de Ativo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="estacao">Estações</SelectItem>
                <SelectItem value="servidor">Servidores</SelectItem>
                <SelectItem value="outros">Outros Ativos</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro Origem (GLPI vs Manual) */}
            <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Origens</SelectItem>
                <SelectItem value="glpi">Origem GLPI</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão Ação em Lote */}
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              {selectedAssetIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleOpenBatchModal}
                  className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-8 gap-1.5 shadow-2xs"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Marcar {selectedAssetIds.length} em Lote</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tabela Nominal */}
        {assets.length === 0 ? (
          <Card className="border border-slate-200 bg-white p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Nenhum ativo encontrado no Inventário desta Serventia
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Para calcular a cobertura real máquina por máquina, importe os equipamentos do GLPI
                ou cadastre as estações e servidores no módulo de Inventário de Ativos.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/ativos?tab=glpi">
                <Button
                  size="sm"
                  className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar Ativos via GLPI</span>
                </Button>
              </Link>
            </div>
          </Card>
        ) : filteredAssets.length === 0 ? (
          <Card className="border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            Nenhum ativo corresponde aos filtros aplicados.
          </Card>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    {canEdit && (
                      <th className="p-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          {allFilteredSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="p-3">Ativo / Identificação</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Exigência</th>
                    <th className="p-3">Status de Proteção</th>
                    <th className="p-3">Comprovante / Integridade</th>
                    <th className="p-3">Data do Documento</th>
                    {canEdit && <th className="p-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id)
                    const isEstacao = asset.tipo === 'estacao'
                    const isServidor =
                      asset.tipo === 'servidor_aplicacao' ||
                      asset.tipo === 'servidor_virtualizado' ||
                      asset.tipo === 'banco_dados'
                    const exige = isAssetRelevantForEndpoint(asset)

                    const statusProtecao = asset.endpoint_status || 'sem_comprovacao'
                    const isProtegido = statusProtecao === 'protegido'
                    const isSemAgente = statusProtecao === 'sem_agente'
                    const isSemComprovacao = statusProtecao === 'sem_comprovacao'

                    // Comprovante vinculado (expand ou buscar na lista)
                    const compVinculado =
                      asset.expand?.endpoint_comprovante ||
                      comprovantes.find((c) => c.id === asset.endpoint_comprovante)

                    return (
                      <tr
                        key={asset.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {canEdit && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(asset.id)}
                              className="text-slate-600 hover:text-slate-900"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-700" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                        )}

                        {/* Nome / Hostname */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                isServidor
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : isEstacao
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isServidor ? (
                                <Server className="w-3.5 h-3.5" />
                              ) : (
                                <Laptop className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {asset.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                {asset.ip_address && <span>IP: {asset.ip_address}</span>}
                                {asset.serial_number && <span>• S/N: {asset.serial_number}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="p-3 capitalize text-slate-600">
                          {asset.tipo.replace('_', ' ')}
                        </td>

                        {/* Origem GLPI / Manual */}
                        <td className="p-3">
                          {asset.origem === 'glpi' ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold"
                            >
                              GLPI #{asset.external_id || 'sync'}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold"
                            >
                              Manual
                            </Badge>
                          )}
                        </td>

                        {/* Exigência */}
                        <td className="p-3">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleToggleExigencia(asset)}
                              className="cursor-pointer"
                              title="Clique para alternar exigência de proteção"
                            >
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  exige
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {exige ? 'Exigida' : 'Dispensada'}
                              </Badge>
                            </button>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                exige
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {exige ? 'Exigida' : 'Dispensada'}
                            </Badge>
                          )}
                        </td>

                        {/* Status de Proteção */}
                        <td className="p-3">
                          {isProtegido && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Protegido
                            </span>
                          )}
                          {isSemAgente && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Sem agente / Não protegido
                            </span>
                          )}
                          {isSemComprovacao && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Sem comprovação
                            </span>
                          )}
                        </td>

                        {/* Comprovante / Integridade */}
                        <td className="p-3 text-[11px]">
                          {compVinculado ? (
                            <div>
                              <span className="font-semibold text-slate-800 block">
                                {compVinculado.expand?.solucao?.nome || 'Comprovante Console'} (
                                {compVinculado.tipo.replace('_', ' ')})
                              </span>
                              {compVinculado.hash_sha256 && (
                                <span className="font-mono text-[9px] text-slate-400 block truncate max-w-[140px]">
                                  SHA: {compVinculado.hash_sha256.substring(0, 16)}...
                                </span>
                              )}
                            </div>
                          ) : asset.endpoint_hash_sha256 ? (
                            <span className="font-mono text-[9px] text-slate-400 block truncate max-w-[140px]">
                              SHA: {asset.endpoint_hash_sha256.substring(0, 16)}...
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pendente de vínculo</span>
                          )}
                        </td>

                        {/* Data do Documento */}
                        <td className="p-3 text-[11px] text-slate-600">
                          {compVinculado?.data_comprovante ? (
                            formatSpDateOnly(compVinculado.data_comprovante)
                          ) : asset.endpoint_data_comprovacao ? (
                            formatSpDateOnly(asset.endpoint_data_comprovacao)
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Ações */}
                        {canEdit && (
                          <td className="p-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenIndividualModal(asset)}
                              className="text-xs h-7 px-2 border-slate-300 hover:bg-slate-50 gap-1"
                            >
                              <Link2 className="w-3 h-3 text-slate-600" />
                              <span>Vincular / Marcar</span>
                            </Button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé da Tabela */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                Exibindo <strong>{filteredAssets.length}</strong> de{' '}
                <strong>{assets.length}</strong> ativos do inventário.
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {comprovadas} protegidos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  {semComprovacao} sem comprovação
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  {semAgente} sem agente
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE VÍNCULO DE COMPROVANTE E STATUS (INDIVIDUAL OU LOTE) */}
      <Dialog open={vinculoModalOpen} onOpenChange={setVinculoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {isBatchMode
                ? `Marcar Cobertura em Lote (${selectedAssetIds.length} ativos)`
                : `Marcar Cobertura: ${targetAsset?.name || 'Ativo'}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Vincule a máquina a um comprovante homologado (com data e hash SHA-256) ou defina seu
              status operacional. Toda alteração é registrada na auditoria append-only.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarVinculo} className="space-y-4 pt-1">
            {/* Status de Proteção */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Status de Proteção do Endpoint *
              </Label>
              <Select
                value={formStatus}
                onValueChange={(val: 'protegido' | 'sem_agente' | 'sem_comprovacao') =>
                  setFormStatus(val)
                }
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="protegido">
                    Protegido (Agente instalado e ativo com comprovação)
                  </SelectItem>
                  <SelectItem value="sem_comprovacao">
                    Sem comprovação (Aguardando relatório/laudo da console)
                  </SelectItem>
                  <SelectItem value="sem_agente">
                    Sem agente / Não protegido (Risco detectado)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comprovante Vinculado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Comprovante Homologado Vinculado
              </Label>
              <Select value={formComprovanteId} onValueChange={setFormComprovanteId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione o comprovante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum comprovante específico</SelectItem>
                  {comprovantesDisponiveis.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatSpDateOnly(c.data_comprovante)} •{' '}
                      {c.expand?.solucao?.nome || 'Console'} ({c.tipo.replace('_', ' ')})
                      {c.hash_sha256 ? ` • SHA:${c.hash_sha256.substring(0, 8)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-slate-400 block">
                O comprovante fornece a verdade temporal e a integridade criptográfica SHA-256.
              </span>
            </div>

            {/* Solução Vinculada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Solução de Proteção / Antivírus
              </Label>
              <Select value={formSolucaoId} onValueChange={setFormSolucaoId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione a solução" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Herdar do comprovante ou geral</SelectItem>
                  {endpointSolucoes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} {s.versao ? `v${s.versao}` : ''} ({s.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações de Auditoria
              </Label>
              <Input
                placeholder="Ex: Agente checado na console administrativa Sophos Central"
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVinculoModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoVinculo}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
              >
                {salvandoVinculo ? 'Gravando...' : 'Salvar Alteração'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE AJUSTE MANUAL DA QUANTIDADE EXIGIDA */}
      <Dialog open={ajusteModalOpen} onOpenChange={setAjusteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Ajustar Meta de Cobertura Exigida (Endpoint)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Permite definir manualmente a meta de ativos a serem cobertos caso haja
              particularidades de escopo não refletidas no inventário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarAjuste} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Quantidade de Ativos Exigidos *
              </Label>
              <Input
                type="number"
                min="1"
                value={novaQtdExigida}
                onChange={(e) => setNovaQtdExigida(e.target.value)}
                required
                className="text-xs h-9"
              />
              <span className="text-[11px] text-slate-400 block">
                Total atual derivado do inventário: {coberturaCalculada.totalAtivosInventario}{' '}
                máquinas com proteção exigida.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAjusteModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoAjuste}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
              >
                {salvandoAjuste ? 'Gravando...' : 'Salvar Ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegurancaCoberturaTab
