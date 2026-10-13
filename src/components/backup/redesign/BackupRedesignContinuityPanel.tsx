import React from 'react'
import {
  ShieldCheck,
  HardDriveDownload,
  Server,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PanelHeader } from '@/components/common/PanelHeader'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  InventoryAssetItem,
  BackupPlanoItem,
  BackupRotinaItem,
  BackupFonteItem,
  BackupEvidenciaItem,
  BackupExecucaoItem,
  BackupOcorrenciaItem,
  BackupEscopoItem,
  BackupConfrontoResponse,
  SystemRole,
} from '@/types/cscti'
import { formatRelativeTimeSp } from '@/lib/dateTime'

export interface BackupRedesignContinuityPanelProps {
  assets: InventoryAssetItem[]
  planos: BackupPlanoItem[]
  rotinas: BackupRotinaItem[]
  fontes: BackupFonteItem[]
  evidencias: BackupEvidenciaItem[]
  execucoes: BackupExecucaoItem[]
  ocorrencias: BackupOcorrenciaItem[]
  escopos: BackupEscopoItem[]
  confrontoData: BackupConfrontoResponse | null
  loading?: boolean
  canOperate?: boolean
  onNavigateTab: (tab: string, extraParams?: Record<string, string>) => void
  onReload: () => void
}

function formatTipoAtivo(tipo: string): string {
  const map: Record<string, string> = {
    servidor_virtualizado: 'Servidor Virtualizado',
    servidor_aplicacao: 'Servidor de Aplicação',
    banco_dados: 'Banco de Dados',
    storage_backup: 'Storage / Backup',
    servico_nuvem: 'Serviço em Nuvem',
    estacao: 'Estação de Trabalho',
    impressora_multifuncional: 'Impressora / Multifuncional',
    equipamento_rede: 'Equipamento de Rede',
    outro: 'Outro',
  }
  return map[tipo] || tipo.replace(/_/g, ' ')
}

type ModalidadeKey = 'local' | 'nuvem' | 'replicacao'

function inferirModalidadeInfo(
  obsStr: string,
  rotinaNome: string,
  destinoStr: string,
): { key: ModalidadeKey; label: 'Local' | 'Nuvem' | 'Replicação' } {
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

function normalizarNomeAtivo(txt?: string): string {
  if (!txt) return ''
  return txt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Painel fiel ao Ciclo de Continuidade Operacional que permanece do módulo atual
 * conforme regra dura do Leandro:
 * "só o Ciclo de Continuidade Operacional permanece do atual; estado 0.0.95 é referência de reversão; proibido dado fictício."
 */
export const BackupRedesignContinuityPanel: React.FC<BackupRedesignContinuityPanelProps> = ({
  assets,
  planos,
  rotinas,
  fontes,
  evidencias,
  execucoes,
  ocorrencias,
  escopos,
  confrontoData,
  loading = false,
  canOperate = false,
  onNavigateTab,
  onReload,
}) => {
  // Rotinas ativas
  const rotinasAtivasIds = React.useMemo(() => {
    return new Set(rotinas.filter((r) => r.status === 'ativo').map((r) => r.id))
  }, [rotinas])

  // Fontes ativas
  const fontesValidas = React.useMemo(() => {
    return fontes.filter((f) => {
      if (!f.ativo) return false
      if (f.rotina && !rotinasAtivasIds.has(f.rotina)) return false
      return true
    })
  }, [fontes, rotinasAtivasIds])

  // Ativos cobertos por fontes ativas
  const { coveredAssetIds, coveredAssetNames } = React.useMemo(() => {
    const ids = new Set<string>()
    const names = new Set<string>()

    fontesValidas.forEach((f) => {
      if (f.ativo_inventario) ids.add(f.ativo_inventario)
      if (f.caminho_identificacao) names.add(f.caminho_identificacao.trim().toLowerCase())
    })

    return { coveredAssetIds: ids, coveredAssetNames: names }
  }, [fontesValidas])

  // Ativos vinculados a escopos formais
  const escoposAtivosAssetIds = React.useMemo(() => {
    const ids = new Set<string>()
    escopos
      .filter((e) => e.status !== 'inativo')
      .forEach((e) => {
        if (Array.isArray(e.ativos)) {
          e.ativos.forEach((id) => ids.add(id))
        }
      })
    return ids
  }, [escopos])

  // Universo de ativos monitorados
  const monitoredAssets = React.useMemo(() => {
    const ativosValidos = assets.filter((a) => a.status !== 'inativo' && a.status !== 'desativado')
    if (escoposAtivosAssetIds.size > 0) {
      return ativosValidos.filter((a) => escoposAtivosAssetIds.has(a.id))
    }
    return ativosValidos
  }, [assets, escoposAtivosAssetIds])

  // Cobertos vs Não cobertos
  const { uncoveredAssets } = React.useMemo(() => {
    const covered: InventoryAssetItem[] = []
    const uncovered: InventoryAssetItem[] = []

    monitoredAssets.forEach((asset) => {
      const byId = coveredAssetIds.has(asset.id)
      const assetNameLower = asset.name.trim().toLowerCase()
      const byName =
        coveredAssetNames.has(assetNameLower) ||
        Array.from(coveredAssetNames).some(
          (cName) => cName.includes(assetNameLower) || assetNameLower.includes(cName),
        )

      if (byId || byName) covered.push(asset)
      else uncovered.push(asset)
    })

    return { coveredAssets: covered, uncoveredAssets: uncovered }
  }, [monitoredAssets, coveredAssetIds, coveredAssetNames])

  const rotinasMap = React.useMemo(() => {
    const map = new Map<string, BackupRotinaItem>()
    rotinas.forEach((r) => map.set(r.id, r))
    return map
  }, [rotinas])

  const ativosExigemBackup = React.useMemo(() => {
    const comExigencias = assets.filter(
      (a) => a.exige_backup_local || a.exige_backup_nuvem || a.exige_backup_replicacao,
    )
    if (comExigencias.length > 0) return comExigencias
    return monitoredAssets
  }, [assets, monitoredAssets])

  // Proteção Efetiva real
  const ativosProtecaoEfetiva = React.useMemo(() => {
    return ativosExigemBackup.map((ativo) => {
      const normId = ativo.id
      const normNome = normalizarNomeAtivo(ativo.name)

      const comprovacoesPorMod = {
        local: false,
        nuvem: false,
        replicacao: false,
      }

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
      }
    })
  }, [ativosExigemBackup, execucoes, rotinasMap, confrontoData])

  const totalExigidosConfronto =
    ativosExigemBackup.length > 0
      ? ativosExigemBackup.length
      : (confrontoData?.totais?.total_ativos_exigidos ?? monitoredAssets.length)

  const totalAtivosProtegidosCompleto =
    ativosProtecaoEfetiva.length > 0
      ? ativosProtecaoEfetiva.filter((a) => a.completamenteProtegido).length
      : (confrontoData?.totais?.total_protegidos_completo ?? 0)

  const totalAtivosComProtecao =
    ativosProtecaoEfetiva.length > 0
      ? ativosProtecaoEfetiva.filter((a) => a.parcialmenteProtegido).length
      : (confrontoData?.totais?.total_parcialmente_protegidos ?? totalAtivosProtegidosCompleto)

  const percentualProtegidoEfetivo = React.useMemo(() => {
    if (totalExigidosConfronto > 0) {
      const somaPonderada = ativosProtecaoEfetiva.reduce((acc, curr) => {
        return acc + (curr.exigidasCount > 0 ? curr.atendidasCount / curr.exigidasCount : 0)
      }, 0)
      return Math.round((somaPonderada / totalExigidosConfronto) * 100)
    }
    return confrontoData?.totais?.percentual_protegido_efetivo ?? 0
  }, [ativosProtecaoEfetiva, totalExigidosConfronto, confrontoData])

  const percentualProtegidoCompleto =
    totalExigidosConfronto > 0
      ? Math.round((totalAtivosProtegidosCompleto / totalExigidosConfronto) * 100)
      : (confrontoData?.totais?.percentual_protegido_completo ?? 0)

  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status !== 'resolvida')

  const ultimaEvidencia = React.useMemo(() => {
    if (evidencias.length === 0) return null
    const sorted = [...evidencias].sort((a, b) => {
      const da = new Date(a.data_recebida || a.created || 0).getTime()
      const db = new Date(b.data_recebida || b.created || 0).getTime()
      return db - da
    })
    return sorted[0]
  }, [evidencias])

  const ultimaEvidenciaData = ultimaEvidencia?.data_recebida || ultimaEvidencia?.created
  const ultimaEvidenciaRelativa = ultimaEvidenciaData
    ? formatRelativeTimeSp(ultimaEvidenciaData)
    : 'Nunca recebida'

  const semConfiguracao = !loading && planos.length === 0 && rotinas.length === 0

  return (
    <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden">
      <PanelHeader
        title="Ciclo de Continuidade Operacional"
        subtitle="Alinhamento em tempo real entre inventário de ativos e rotinas ativas de salvaguarda"
        icon={ShieldCheck}
        iconBgColor="bg-blue-100"
        iconColor="text-[#0B2545]"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReload}
              disabled={loading}
              className="text-xs text-slate-500 h-8 px-2.5"
              title="Atualizar métricas de proteção"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      <CardContent className="p-4 sm:p-5 space-y-5">
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0B2545]" />
            <span className="text-xs font-medium">Calculando cobertura de proteção...</span>
          </div>
        ) : semConfiguracao ? (
          <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Nenhuma rotina de backup configurada
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Para monitorar a continuidade da serventia, cadastre planos e rotinas vinculando os
                ativos do inventário.
              </p>
            </div>
            {canOperate && (
              <Button
                size="sm"
                onClick={() => onNavigateTab('rotinas')}
                className="bg-[#0B2545] hover:bg-[#124E78] text-xs font-semibold"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Configurar agora
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Grade de 5 métricas em badges pastel */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Métrica 1: Monitorados */}
              <div
                onClick={() => onNavigateTab('escopo')}
                role="button"
                tabIndex={0}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition cursor-pointer select-none"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Monitorados
                  </span>
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none">
                  {monitoredAssets.length}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {escoposAtivosAssetIds.size > 0 ? 'No escopo formal' : 'No inventário'}
                </p>
              </div>

              {/* Métrica 2: Proteção Efetiva */}
              <div
                onClick={() => onNavigateTab('escopo')}
                role="button"
                tabIndex={0}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition cursor-pointer select-none"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-700">
                    Proteção Efetiva
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 font-bold bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {percentualProtegidoEfetivo}%
                  </Badge>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none">
                  {totalAtivosComProtecao}{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    / {totalExigidosConfronto}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">com proteção ativa</p>
              </div>

              {/* Métrica 3: Proteção Completa */}
              <div
                onClick={() => onNavigateTab('escopo')}
                role="button"
                tabIndex={0}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition cursor-pointer select-none"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-700">
                    Proteção Integral
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-bold ${
                      percentualProtegidoCompleto === 100
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {percentualProtegidoCompleto}%
                  </Badge>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none">
                  {totalAtivosProtegidosCompleto}{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    / {totalExigidosConfronto}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">todas as modalidades</p>
              </div>

              {/* Métrica 4: Última Evidência */}
              <div
                onClick={() => onNavigateTab('evidencias')}
                role="button"
                tabIndex={0}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition cursor-pointer select-none"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Última Evidência
                  </span>
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 truncate leading-tight">
                  {ultimaEvidenciaRelativa}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {ultimaEvidencia?.remetente ? ultimaEvidencia.remetente.split('@')[0] : 'IMAP'}
                </p>
              </div>

              {/* Métrica 5: Ocorrências */}
              <div
                onClick={() => onNavigateTab('ocorrencias')}
                role="button"
                tabIndex={0}
                className={`p-3.5 rounded-xl border transition cursor-pointer select-none col-span-2 md:col-span-1 ${
                  ocorrenciasAbertas.length > 0
                    ? 'border-rose-200 bg-rose-50/50 hover:bg-rose-50'
                    : 'border-slate-200/90 bg-slate-50/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Ocorrências
                  </span>
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      ocorrenciasAbertas.length > 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-extrabold leading-none ${
                      ocorrenciasAbertas.length > 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {ocorrenciasAbertas.length}
                  </span>
                  {ocorrenciasAbertas.length > 0 && (
                    <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0 font-bold">
                      Abertas
                    </Badge>
                  )}
                </div>
                <p
                  className={`text-[11px] mt-1 truncate ${
                    ocorrenciasAbertas.length > 0 ? 'text-rose-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  {ocorrenciasAbertas.length > 0 ? 'Ação requerida' : 'Sem pendências ativas'}
                </p>
              </div>
            </div>

            {/* Auditoria de Cobertura de Ativos */}
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
              <div className="p-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Auditoria de Cobertura de Ativos
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      uncoveredAssets.length === 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {uncoveredAssets.length === 0
                      ? '100% Coberto'
                      : `${uncoveredAssets.length} sem rotina`}
                  </Badge>
                </div>
              </div>

              <div className="p-3.5">
                {uncoveredAssets.length === 0 ? (
                  <div className="flex items-center gap-2.5 text-xs text-emerald-800 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Todos os ativos cobertos por rotinas.</span>{' '}
                      <span>
                        Os {monitoredAssets.length} ativos cadastrados possuem fontes de cópia
                        ativas vinculadas a rotinas operacionais.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Atenção de Continuidade:</strong> Ativos do inventário sem vínculo a
                        fontes de backup ativas.
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                      {uncoveredAssets.slice(0, 4).map((asset) => (
                        <div
                          key={asset.id}
                          className="p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-800">{asset.name}</span>
                              <span className="text-[11px] text-slate-500 ml-2">
                                ({formatTipoAtivo(asset.tipo)})
                              </span>
                              {asset.ip_address && (
                                <span className="text-[11px] font-mono text-slate-400 ml-2">
                                  IP: {asset.ip_address}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-700 bg-amber-50 border-amber-200 font-semibold"
                            >
                              Sem backup cadastrado
                            </Badge>
                            {canOperate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  onNavigateTab('rotinas', { action: 'nova', ativo: asset.id })
                                }
                                className="h-6 text-[11px] text-blue-700 hover:text-blue-900 px-2"
                              >
                                Vincular à rotina
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default BackupRedesignContinuityPanel
