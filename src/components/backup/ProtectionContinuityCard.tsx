import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listInventoryAssets } from '@/services/csctiService'
import {
  listBackupPlanos,
  listBackupRotinas,
  listBackupFontes,
  listBackupEvidencias,
  listBackupOcorrencias,
} from '@/services/backupService'
import type {
  InventoryAssetItem,
  BackupPlanoItem,
  BackupRotinaItem,
  BackupFonteItem,
  BackupEvidenciaItem,
  BackupOcorrenciaItem,
  SystemRole,
} from '@/types/cscti'

export interface ProtectionContinuityCardProps {
  organizationId: string
  userRole?: SystemRole
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Nunca recebida'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Nunca recebida'

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'agora'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 1) return 'agora'
  if (diffMinutes < 60) return `há ${diffMinutes}m`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `há ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `há ${diffDays}d`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `há ${diffWeeks} sem`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
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

export const ProtectionContinuityCard: React.FC<ProtectionContinuityCardProps> = ({
  organizationId,
  userRole,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [planos, setPlanos] = useState<BackupPlanoItem[]>([])
  const [rotinas, setRotinas] = useState<BackupRotinaItem[]>([])
  const [fontes, setFontes] = useState<BackupFonteItem[]>([])
  const [evidencias, setEvidencias] = useState<BackupEvidenciaItem[]>([])
  const [ocorrencias, setOcorrencias] = useState<BackupOcorrenciaItem[]>([])

  const isOperator = userRole === 'admin' || userRole === 'suporte'

  const loadData = async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      const [assetsData, planosData, rotinasData, fontesData, evidenciasData, ocorrenciasData] =
        await Promise.all([
          listInventoryAssets(organizationId),
          listBackupPlanos(organizationId),
          listBackupRotinas(organizationId),
          listBackupFontes(organizationId),
          listBackupEvidencias(organizationId),
          listBackupOcorrencias(organizationId),
        ])

      setAssets(assetsData)
      setPlanos(planosData)
      setRotinas(rotinasData)
      setFontes(fontesData)
      setEvidencias(evidenciasData)
      setOcorrencias(ocorrenciasData)
    } catch (err) {
      console.error('Erro ao carregar métricas de Proteção e Continuidade:', err)
      setError('Não foi possível carregar os dados de proteção e continuidade.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [organizationId])

  // Identificação de rotinas ativas
  const rotinasAtivasIds = useMemo(() => {
    return new Set(rotinas.filter((r) => r.status === 'ativo').map((r) => r.id))
  }, [rotinas])

  // Fontes ativas pertencentes a rotinas ativas
  const fontesValidas = useMemo(() => {
    return fontes.filter((f) => {
      if (!f.ativo) return false
      // Se não tem vínculo de rotina informado, só é válida se tiver pelo menos o flag ativo
      if (f.rotina && !rotinasAtivasIds.has(f.rotina)) return false
      return true
    })
  }, [fontes, rotinasAtivasIds])

  // IDs e nomes de ativos cobertos por fontes ativas
  const { coveredAssetIds, coveredAssetNames } = useMemo(() => {
    const ids = new Set<string>()
    const names = new Set<string>()

    fontesValidas.forEach((f) => {
      if (f.ativo_inventario) {
        ids.add(f.ativo_inventario)
      }
      if (f.caminho_identificacao) {
        names.add(f.caminho_identificacao.trim().toLowerCase())
      }
    })

    return { coveredAssetIds: ids, coveredAssetNames: names }
  }, [fontesValidas])

  // Ativos monitorados: ativos com status 'ativo' ou todos os cadastrados se nenhum estiver explicitamente inativo
  const monitoredAssets = useMemo(() => {
    return assets.filter((a) => a.status !== 'inativo' && a.status !== 'desativado')
  }, [assets])

  // Ativos com cobertura confirmada
  const { coveredAssets, uncoveredAssets } = useMemo(() => {
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

      if (byId || byName) {
        covered.push(asset)
      } else {
        uncovered.push(asset)
      }
    })

    return { coveredAssets: covered, uncoveredAssets: uncovered }
  }, [monitoredAssets, coveredAssetIds, coveredAssetNames])

  const totalMonitorados = monitoredAssets.length
  const totalComBackup = coveredAssets.length

  // Percentual de proteção
  const percentualProtegido =
    totalMonitorados > 0 ? Math.round((totalComBackup / totalMonitorados) * 100) : 0

  // Cor semântica do percentual: verde >= 80%, âmbar 1-79%, vermelho 0%
  const percentualColorClass =
    totalMonitorados === 0
      ? 'text-slate-400'
      : percentualProtegido >= 80
        ? 'text-emerald-600'
        : percentualProtegido > 0
          ? 'text-amber-600'
          : 'text-red-600'

  const percentualBadgeClass =
    totalMonitorados === 0
      ? 'bg-slate-100 text-slate-600 border-slate-200'
      : percentualProtegido >= 80
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : percentualProtegido > 0
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-red-50 text-red-700 border-red-200'

  // Ocorrências não resolvidas
  const ocorrenciasAbertas = useMemo(() => {
    return ocorrencias.filter((o) => o.status !== 'resolvida')
  }, [ocorrencias])

  // Última evidência recebida
  const ultimaEvidencia = useMemo(() => {
    if (evidencias.length === 0) return null
    const sorted = [...evidencias].sort((a, b) => {
      const da = new Date(a.data_recebida || a.created || 0).getTime()
      const db = new Date(b.data_recebida || b.created || 0).getTime()
      return db - da
    })
    return sorted[0]
  }, [evidencias])

  const ultimaEvidenciaData = ultimaEvidencia?.data_recebida || ultimaEvidencia?.created
  const ultimaEvidenciaRelativa = formatRelativeTime(ultimaEvidenciaData)
  const temEvidencia = Boolean(ultimaEvidencia)

  // Estado sem configuração: nenhum plano e nenhuma rotina
  const semConfiguracao = !loading && planos.length === 0 && rotinas.length === 0

  return (
    <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
      <CardHeader className="p-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0B2545]/10 text-[#0B2545] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#0B2545]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                Proteção e Continuidade
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Alinhamento em tempo real entre inventário de ativos e rotinas ativas de backup
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs text-slate-500 h-8 px-2"
            title="Atualizar métricas de proteção"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs font-semibold text-[#0B2545] border-[#0B2545]/20 hover:bg-[#0B2545]/5 h-8 gap-1"
          >
            <Link to="/backup">
              Ver módulo de Backup <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0B2545]" />
            <span className="text-xs font-medium">Calculando cobertura de proteção...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-7">
              Tentar novamente
            </Button>
          </div>
        ) : semConfiguracao ? (
          /* Estado orientado se nenhuma rotina/plano foi configurado */
          <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Nenhuma rotina de backup configurada
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Para monitorar a continuidade da serventia, cadastre planos e rotinas de backup
                vinculando os ativos do inventário.
              </p>
            </div>
            {isOperator ? (
              <Button
                asChild
                size="sm"
                className="bg-[#0B2545] hover:bg-[#124E78] text-xs font-semibold"
              >
                <Link to="/backup?aba=rotinas">
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Configurar agora
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to="/backup">Ver módulo de Backup</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Grade de Métricas Principais (2 colunas no mobile, 4-5 colunas em desktop) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              {/* Métrica 1: Ativos monitorados */}
              <Link
                to="/ativos"
                className="group p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition block"
                title="Ver inventário completo de ativos"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Monitorados
                  </span>
                  <Server className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{totalMonitorados}</div>
                <p className="text-[11px] text-slate-500 mt-0.5 group-hover:text-blue-700 inline-flex items-center">
                  Ativos no inventário{' '}
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>

              {/* Métrica 2: Ativos com backup */}
              <Link
                to="/backup?aba=rotinas"
                className="group p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition block"
                title="Ver rotinas e fontes de backup"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Com Backup
                  </span>
                  <HardDriveDownload className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div className="text-2xl font-bold text-[#0B2545]">{totalComBackup}</div>
                <p className="text-[11px] text-slate-500 mt-0.5 group-hover:text-indigo-700 inline-flex items-center">
                  Fontes ativas ligadas{' '}
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>

              {/* Métrica 3: Percentual Protegidos (destaque visual) */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Protegidos
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-bold ${percentualBadgeClass}`}
                  >
                    {percentualProtegido >= 80
                      ? 'Seguro'
                      : percentualProtegido > 0
                        ? 'Atenção'
                        : 'Crítico'}
                  </Badge>
                </div>
                <div className={`text-3xl font-extrabold tracking-tight ${percentualColorClass}`}>
                  {totalMonitorados > 0 ? `${percentualProtegido}%` : '—'}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {totalComBackup} de {totalMonitorados} ativos cobertos
                </p>
              </div>

              {/* Métrica 4: Última evidência */}
              <Link
                to="/backup?aba=evidencias"
                className="group p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition block"
                title="Ver histórico de evidências comprobatórias"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Última Evidência
                  </span>
                  <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <div
                  className={`text-xl font-bold truncate ${
                    temEvidencia ? 'text-slate-900' : 'text-amber-600'
                  }`}
                >
                  {ultimaEvidenciaRelativa}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate group-hover:text-purple-700">
                  {temEvidencia && ultimaEvidencia?.remetente
                    ? ultimaEvidencia.remetente.split('@')[0]
                    : 'Aguardando e-mail IMAP'}
                </p>
              </Link>

              {/* Métrica 5: Ocorrências abertas */}
              <Link
                to="/backup?aba=ocorrencias"
                className={`group p-3.5 rounded-xl border col-span-2 md:col-span-1 transition block ${
                  ocorrenciasAbertas.length > 0
                    ? 'border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300'
                    : 'border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
                title="Ver lista de ocorrências e pendências"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Ocorrências
                  </span>
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      ocorrenciasAbertas.length > 0 ? 'text-red-600' : 'text-slate-400'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      ocorrenciasAbertas.length > 0 ? 'text-red-700' : 'text-slate-900'
                    }`}
                  >
                    {ocorrenciasAbertas.length}
                  </span>
                  {ocorrenciasAbertas.length > 0 && (
                    <Badge className="bg-red-600 text-white hover:bg-red-700 text-[10px] px-1.5 py-0 font-bold">
                      Abertas
                    </Badge>
                  )}
                </div>
                <p
                  className={`text-[11px] mt-0.5 ${
                    ocorrenciasAbertas.length > 0 ? 'text-red-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  {ocorrenciasAbertas.length > 0
                    ? 'Ação requerida da equipe'
                    : 'Nenhuma pendência ativa'}
                </p>
              </Link>
            </div>

            {/* Mini-lista: Fontes sem cobertura / Status geral de cobertura */}
            <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Auditoria de Cobertura de Ativos
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {uncoveredAssets.length === 0
                      ? '100% Coberto'
                      : `${uncoveredAssets.length} sem backup`}
                  </Badge>
                </div>
                <Link
                  to="/ativos"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  Gerenciar inventário <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-4">
                {uncoveredAssets.length === 0 ? (
                  <div className="flex items-center gap-2.5 text-xs text-emerald-700 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">
                        Todos os ativos cobertos por rotinas de backup.
                      </span>{' '}
                      <span className="text-emerald-800">
                        Os {totalMonitorados} ativos cadastrados possuem fontes de cópia ativas
                        vinculadas a rotinas operacionais.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Atenção de Continuidade:</strong> Foram identificados ativos no
                        inventário sem vínculo a fontes de backup ativas.
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                      {uncoveredAssets.slice(0, 5).map((asset) => (
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
                            {isOperator && (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] text-blue-700 hover:text-blue-900 px-2"
                              >
                                <Link to={`/backup?aba=rotinas&ativo=${asset.id}`}>
                                  Vincular à rotina
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {uncoveredAssets.length > 5 && (
                      <p className="text-[11px] text-slate-500 text-right pt-1">
                        + {uncoveredAssets.length - 5} outros ativos não cobertos.{' '}
                        <Link to="/ativos" className="text-blue-600 hover:underline font-semibold">
                          Ver lista completa
                        </Link>
                      </p>
                    )}
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

export default ProtectionContinuityCard
