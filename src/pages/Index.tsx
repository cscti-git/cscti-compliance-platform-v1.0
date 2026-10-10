import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Server,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HardDriveDownload,
  Database,
  Layers,
  ArrowRight,
  Sparkles,
  Building2,
  FolderGit2,
  FileText,
  Clock,
  Activity,
  BarChart3,
  Cpu,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ProtectionContinuityCard } from '@/components/backup/ProtectionContinuityCard'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { DonutWithLegend } from '@/components/dashboard/DonutWithLegend'
import {
  ModuleComplianceList,
  ModuleComplianceItem,
} from '@/components/dashboard/ModuleComplianceList'
import { OpenRisksList, OpenRiskItem } from '@/components/dashboard/OpenRisksList'
import { CriticalAssetsTable, CriticalAssetRow } from '@/components/dashboard/CriticalAssetsTable'
import {
  RecentBackupExecutionsTable,
  RecentBackupExecutionRow,
} from '@/components/dashboard/RecentBackupExecutionsTable'
import { PendingTasksList, PendingTaskItem } from '@/components/dashboard/PendingTasksList'
import {
  CategoryProtectionBars,
  CategoryProtectionBarItem,
} from '@/components/dashboard/CategoryProtectionBars'
import {
  ComplianceEvolutionChart,
  ComplianceTrendPoint,
} from '@/components/dashboard/ComplianceEvolutionChart'
import {
  RecentActivitiesFeed,
  RecentActivityItem,
} from '@/components/dashboard/RecentActivitiesFeed'

import {
  listInventoryAssets,
  listAssignments,
  listPeople,
  getIntegrations,
  listAuditLogs,
} from '@/services/csctiService'
import {
  listBackupPlanos,
  listBackupRotinas,
  listBackupFontes,
  listBackupEvidencias,
  listBackupExecucoes,
  listBackupOcorrencias,
  listBackupEscopos,
  listBackupTestes,
  getBackupConfronto,
} from '@/services/backupService'
import { formatDateTime } from '@/lib/dateTime'
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
  AuditLogItem,
} from '@/types/cscti'

function normalizarNomeAtivo(txt?: string): string {
  if (!txt) return ''
  return txt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
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

function formatTipoAtivoLabel(tipo: string): string {
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

export const Index: React.FC = () => {
  const { organization, role } = useAuth()
  const orgId = organization?.id || ''

  // Estados de dados reais
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [planos, setPlanos] = useState<BackupPlanoItem[]>([])
  const [rotinas, setRotinas] = useState<BackupRotinaItem[]>([])
  const [fontes, setFontes] = useState<BackupFonteItem[]>([])
  const [evidencias, setEvidencias] = useState<BackupEvidenciaItem[]>([])
  const [execucoes, setExecucoes] = useState<BackupExecucaoItem[]>([])
  const [ocorrencias, setOcorrencias] = useState<BackupOcorrenciaItem[]>([])
  const [escopos, setEscopos] = useState<BackupEscopoItem[]>([])
  const [confrontoData, setConfrontoData] = useState<BackupConfrontoResponse | null>(null)
  const [audits, setAudits] = useState<AuditLogItem[]>([])
  const [peopleCount, setPeopleCount] = useState<number>(0)
  const [assignmentsCount, setAssignmentsCount] = useState<number>(0)
  const [glpiActive, setGlpiActive] = useState<boolean>(false)
  const [emailActive, setEmailActive] = useState<boolean>(false)

  // Momento da última atualização funcional
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    const d = new Date()
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  })

  // Carregamento de todos os dados reais
  const loadDashboardData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [
        assetsData,
        planosData,
        rotinasData,
        fontesData,
        evidenciasData,
        execucoesData,
        ocorrenciasData,
        escoposData,
        auditsData,
        peopleData,
        assignmentsData,
        intsData,
        confrontoResp,
      ] = await Promise.all([
        listInventoryAssets(orgId),
        listBackupPlanos(orgId),
        listBackupRotinas(orgId),
        listBackupFontes(orgId),
        listBackupEvidencias(orgId),
        listBackupExecucoes(orgId),
        listBackupOcorrencias(orgId),
        listBackupEscopos(orgId),
        listAuditLogs(orgId, 15),
        listPeople(orgId),
        listAssignments(orgId),
        getIntegrations(orgId),
        getBackupConfronto(orgId).catch(() => null),
      ])

      setAssets(assetsData)
      setPlanos(planosData)
      setRotinas(rotinasData)
      setFontes(fontesData)
      setEvidencias(evidenciasData)
      setExecucoes(execucoesData)
      setOcorrencias(ocorrenciasData)
      setEscopos(escoposData)
      setAudits(auditsData)
      setPeopleCount(peopleData.length)
      setAssignmentsCount(assignmentsData.filter((a) => a.status === 'ativo').length)
      setGlpiActive(Boolean(intsData.glpi?.enabled && intsData.glpi.glpi_url))
      setEmailActive(Boolean(intsData.email?.enabled && intsData.email.email_host))
      setConfrontoData(confrontoResp)

      const d = new Date()
      setLastUpdated(
        `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      )
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Mapas auxiliares
  const rotinasMap = useMemo(() => {
    const map = new Map<string, BackupRotinaItem>()
    rotinas.forEach((r) => map.set(r.id, r))
    return map
  }, [rotinas])

  const assetsMap = useMemo(() => {
    const map = new Map<string, InventoryAssetItem>()
    assets.forEach((a) => map.set(a.id, a))
    return map
  }, [assets])

  // Ativos monitorados / escopo formal
  const escoposAtivosAssetIds = useMemo(() => {
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

  const monitoredAssets = useMemo(() => {
    const ativosValidos = assets.filter((a) => a.status !== 'inativo' && a.status !== 'desativado')
    if (escoposAtivosAssetIds.size > 0) {
      return ativosValidos.filter((a) => escoposAtivosAssetIds.has(a.id))
    }
    return ativosValidos
  }, [assets, escoposAtivosAssetIds])

  const ativosExigemBackup = useMemo(() => {
    const comExigencias = assets.filter(
      (a) => a.exige_backup_local || a.exige_backup_nuvem || a.exige_backup_replicacao,
    )
    if (comExigencias.length > 0) return comExigencias
    return monitoredAssets
  }, [assets, monitoredAssets])

  // CÁLCULO HOMOLOGADO DE PROTEÇÃO EFETIVA E COMPLETA (sincronizado com ProtectionContinuityCard)
  const ativosProtecaoEfetiva = useMemo(() => {
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
        comprovacoesPorMod,
      }
    })
  }, [ativosExigemBackup, execucoes, rotinasMap, confrontoData])

  const totalExigidosConfronto = useMemo(() => {
    if (ativosExigemBackup.length > 0) return ativosExigemBackup.length
    if (confrontoData?.totais?.total_ativos_exigidos !== undefined) {
      return confrontoData.totais.total_ativos_exigidos
    }
    return monitoredAssets.length
  }, [ativosExigemBackup, confrontoData, monitoredAssets])

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

  const percentualProtegidoEfetivo = useMemo(() => {
    if (totalExigidosConfronto > 0) {
      const somaPonderada = ativosProtecaoEfetiva.reduce((acc, curr) => {
        return acc + (curr.exigidasCount > 0 ? curr.atendidasCount / curr.exigidasCount : 0)
      }, 0)
      return Math.round((somaPonderada / totalExigidosConfronto) * 100)
    }
    if (confrontoData?.totais?.percentual_protegido_efetivo !== undefined) {
      return confrontoData.totais.percentual_protegido_efetivo
    }
    return 0
  }, [ativosProtecaoEfetiva, totalExigidosConfronto, confrontoData])

  // Ocorrências em aberto
  const ocorrenciasAbertas = useMemo(() => {
    return ocorrencias.filter((o) => o.status !== 'resolvida')
  }, [ocorrencias])

  // Sistemas Críticos (ativos com criticidade alta)
  const ativosCriticos = useMemo(() => {
    return assets.filter((a) => a.criticidade === 'alta')
  }, [assets])

  const pctCriticos =
    assets.length > 0 ? Math.round((ativosCriticos.length / assets.length) * 100) : 0

  // ---------------------------------------------------------------------------
  // CONFORMIDADE GERAL & CONFORMIDADE POR MÓDULO (cálculos reais baseados no banco)
  // ---------------------------------------------------------------------------
  const completedOrgSteps = [
    Boolean(organization?.corporate_name && organization?.cnpj),
    Boolean(organization?.type),
    Boolean(organization?.services && organization.services.length > 0),
    peopleCount > 0,
    assignmentsCount > 0,
    Boolean(organization?.zip_code && organization?.street && organization?.city),
  ].filter(Boolean).length
  const pctGovernança = Math.round((completedOrgSteps / 6) * 100)

  // Módulo Inventário de Ativos
  const pctInventario = useMemo(() => {
    if (assets.length === 0) return 0
    let pontos = 0
    // Ativos ativos
    const ativosAtivos = assets.filter((a) => a.status === 'ativo').length
    pontos += (ativosAtivos / assets.length) * 50
    // Ativos com criticidade e tipo definidos
    const definidos = assets.filter((a) => a.criticidade && a.tipo).length
    pontos += (definidos / assets.length) * 30
    // Conector GLPI ativo ou sincronização
    if (glpiActive) pontos += 20
    return Math.min(100, Math.round(pontos))
  }, [assets, glpiActive])

  // Módulo Backup e Recuperação
  const pctBackupModulo = useMemo(() => {
    if (planos.length === 0 && rotinas.length === 0) return 0
    let pontos = 0
    if (planos.length > 0) pontos += 20
    if (rotinas.length > 0) pontos += 20
    // Cobertura efetiva de backup
    pontos += Math.round(percentualProtegidoEfetivo * 0.4)
    // Ausência de falhas/alertas não resolvidos
    if (ocorrenciasAbertas.length === 0) pontos += 20
    return Math.min(100, Math.round(pontos))
  }, [planos, rotinas, percentualProtegidoEfetivo, ocorrenciasAbertas])

  // Módulo Auditoria e Evidências
  const pctAuditoria = useMemo(() => {
    let pontos = 0
    if (audits.length > 0) pontos += 50
    if (evidencias.length > 0) pontos += 30
    if (emailActive) pontos += 20
    return Math.min(100, pontos)
  }, [audits, evidencias, emailActive])

  // Módulos da Linha 2
  const complianceModules: ModuleComplianceItem[] = useMemo(() => {
    return [
      {
        id: 'inventario',
        name: 'Inventário de Ativos',
        percent: pctInventario,
      },
      {
        id: 'backup',
        name: 'Backup e Recuperação',
        percent: pctBackupModulo,
      },
      {
        id: 'governanca',
        name: 'Governança e Serventia',
        percent: pctGovernança,
      },
      {
        id: 'evidencias',
        name: 'Auditoria & Evidências',
        percent: pctAuditoria,
      },
    ]
  }, [pctInventario, pctBackupModulo, pctGovernança, pctAuditoria])

  // Média ponderada da Conformidade Geral
  const conformidadeGeral = useMemo(() => {
    const list = [pctInventario, pctBackupModulo, pctGovernança, pctAuditoria]
    const valid = list.filter((p) => p > 0)
    if (valid.length === 0) return 0
    return Math.round(list.reduce((a, b) => a + b, 0) / list.length)
  }, [pctInventario, pctBackupModulo, pctGovernança, pctAuditoria])

  // ---------------------------------------------------------------------------
  // DONUT 1: SITUAÇÃO DOS ATIVOS
  // Conforme (completamente protegido ou com rotina), Pendente (parcial), Não conforme, Não avaliado
  // ---------------------------------------------------------------------------
  const ativosSituacaoDonut = useMemo(() => {
    let conforme = 0
    let pendente = 0
    let naoConforme = 0
    let naoAvaliado = 0

    assets.forEach((ativo) => {
      const efetiva = ativosProtecaoEfetiva.find((ap) => ap.ativo.id === ativo.id)
      if (efetiva) {
        if (efetiva.completamenteProtegido) {
          conforme++
        } else if (efetiva.parcialmenteProtegido) {
          pendente++
        } else {
          naoConforme++
        }
      } else {
        if (ativo.status === 'ativo') {
          naoAvaliado++
        } else {
          naoConforme++
        }
      }
    })

    const total = assets.length

    return {
      total,
      data: [
        {
          label: 'Conforme',
          value: conforme,
          color: '#10B981',
          percent: total > 0 ? Math.round((conforme / total) * 100) : 0,
        },
        {
          label: 'Pendente',
          value: pendente,
          color: '#F59E0B',
          percent: total > 0 ? Math.round((pendente / total) * 100) : 0,
        },
        {
          label: 'Não conforme',
          value: naoConforme,
          color: '#EF4444',
          percent: total > 0 ? Math.round((naoConforme / total) * 100) : 0,
        },
        {
          label: 'Não avaliado',
          value: naoAvaliado,
          color: '#94A3B8',
          percent: total > 0 ? Math.round((naoAvaliado / total) * 100) : 0,
        },
      ],
    }
  }, [assets, ativosProtecaoEfetiva])

  // ---------------------------------------------------------------------------
  // DONUT 2: STATUS DOS BACKUPS (ÚLTIMOS 30 DIAS)
  // Filtrado por data_email real
  // ---------------------------------------------------------------------------
  const statusBackups30DiasDonut = useMemo(() => {
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    const execs30 = execucoes.filter((e) => {
      const dataIso = e.data_email || e.data_inicio || e.created
      if (!dataIso) return true
      const parsed = new Date(dataIso.replace(' ', 'T')).getTime()
      if (isNaN(parsed)) return true
      return parsed >= thirtyDaysAgo
    })

    const total = execs30.length
    const sucesso = execs30.filter((e) => e.status === 'sucesso').length
    const alertas = execs30.filter((e) => e.status === 'parcial').length
    const falhas = execs30.filter((e) => e.status === 'erro').length
    const naoExec = execs30.filter((e) => e.status === 'nao_executada').length

    return {
      total,
      data: [
        {
          label: 'Sucesso',
          value: sucesso,
          color: '#10B981',
          percent: total > 0 ? Math.round((sucesso / total) * 100) : 0,
        },
        {
          label: 'Com alertas',
          value: alertas,
          color: '#F59E0B',
          percent: total > 0 ? Math.round((alertas / total) * 100) : 0,
        },
        {
          label: 'Falhas',
          value: falhas,
          color: '#EF4444',
          percent: total > 0 ? Math.round((falhas / total) * 100) : 0,
        },
        {
          label: 'Não executadas',
          value: naoExec,
          color: '#94A3B8',
          percent: total > 0 ? Math.round((naoExec / total) * 100) : 0,
        },
      ],
    }
  }, [execucoes])

  // ---------------------------------------------------------------------------
  // CARD: PRINCIPAIS RISCOS EM ABERTO
  // Baseado nas ocorrências reais registradas por severidade
  // ---------------------------------------------------------------------------
  const openRisks: OpenRiskItem[] = useMemo(() => {
    const criticos = ocorrenciasAbertas.filter((o) => o.severidade === 'alta').length
    const medios = ocorrenciasAbertas.filter((o) => o.severidade === 'media').length
    const baixos = ocorrenciasAbertas.filter((o) => o.severidade === 'baixa').length

    return [
      {
        id: 'criticos',
        label: 'Riscos críticos',
        count: criticos,
        colorDot: 'bg-rose-500',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-700',
        href: '/backup?tab=ocorrencias',
      },
      {
        id: 'altos',
        label: 'Riscos moderados',
        count: medios,
        colorDot: 'bg-amber-500',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
        href: '/backup?tab=ocorrencias',
      },
      {
        id: 'baixos',
        label: 'Riscos baixos / informativos',
        count: baixos,
        colorDot: 'bg-blue-500',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        href: '/backup?tab=ocorrencias',
      },
    ]
  }, [ocorrenciasAbertas])

  // ---------------------------------------------------------------------------
  // TABELA 1: ATIVOS CRÍTICOS EM ATENÇÃO (Linha 3, Card 1)
  // ---------------------------------------------------------------------------
  const criticalAssetsRows: CriticalAssetRow[] = useMemo(() => {
    return ativosCriticos.slice(0, 5).map((ativo) => {
      const efetiva = ativosProtecaoEfetiva.find((ap) => ap.ativo.id === ativo.id)

      let situacao: CriticalAssetRow['situacao'] = 'nao_avaliado'
      let situacaoLabel = 'Não avaliado'

      if (efetiva) {
        if (efetiva.completamenteProtegido) {
          situacao = 'conforme'
          situacaoLabel = 'Conforme'
        } else if (efetiva.parcialmenteProtegido) {
          situacao = 'pendente'
          situacaoLabel = 'Pendente'
        } else {
          situacao = 'nao_conforme'
          situacaoLabel = 'Não conforme'
        }
      }

      let ultimaRevisao = '—'
      const dataIso = ativo.updated || ativo.created
      if (dataIso) {
        try {
          ultimaRevisao = new Date(dataIso).toLocaleDateString('pt-BR')
        } catch (_) {
          ultimaRevisao = dataIso
        }
      }

      return {
        id: ativo.id,
        name: ativo.name,
        tipo: ativo.tipo,
        tipoFormatado: formatTipoAtivoLabel(ativo.tipo),
        situacao,
        situacaoLabel,
        ultimaRevisao,
        criticidade: 'alta',
      }
    })
  }, [ativosCriticos, ativosProtecaoEfetiva])

  // ---------------------------------------------------------------------------
  // TABELA 2: EXECUÇÕES DE BACKUP RECENTES (Linha 3, Card 2)
  // data_email como verdade operacional
  // ---------------------------------------------------------------------------
  const recentBackupExecutions: RecentBackupExecutionRow[] = useMemo(() => {
    const list = execucoes.map((exec) => {
      const rotina = rotinasMap.get(exec.rotina)
      const rotinaNome = rotina?.nome || 'Rotina de Backup'

      // Nome do ativo comprovado
      let ativoNome = rotinaNome
      if (Array.isArray(exec.detalhes_vms) && exec.detalhes_vms.length > 0) {
        const nomes = exec.detalhes_vms.map((vm: any) => vm.nome).filter(Boolean)
        if (nomes.length > 0) ativoNome = nomes.join(', ')
      } else if (
        exec.confronto_escopo &&
        Array.isArray((exec.confronto_escopo as any).comprovado) &&
        (exec.confronto_escopo as any).comprovado.length > 0
      ) {
        const nomes = (exec.confronto_escopo as any).comprovado
          .map((c: any) => c.ativo_nome || c.item_comprovante)
          .filter(Boolean)
        if (nomes.length > 0) ativoNome = nomes.join(', ')
      }

      const dataIso = exec.data_email || exec.data_inicio || exec.created
      let dataHora = '—'
      let parsedTime = 0
      if (dataIso) {
        try {
          dataHora = formatDateTime(dataIso, { includeSeconds: false })
          const p = new Date(dataIso.replace(' ', 'T')).getTime()
          parsedTime = isNaN(p) ? 0 : p
        } catch (_) {
          dataHora = dataIso
        }
      }

      let duracao = '—'
      if (exec.data_inicio && exec.data_fim) {
        const diffMs = new Date(exec.data_fim).getTime() - new Date(exec.data_inicio).getTime()
        if (diffMs > 0) {
          const totalSec = Math.floor(diffMs / 1000)
          const h = Math.floor(totalSec / 3600)
          const m = Math.floor((totalSec % 3600) / 60)
          if (h > 0) duracao = `${h}h ${m}m`
          else duracao = `${m}m`
        }
      }
      if (duracao === '—' && exec.observacao) {
        const mDur = exec.observacao.match(/Dura[çc][ãa]o:\s*([0-9:]+)/i)
        if (mDur && mDur[1] && mDur[1] !== 'n/d') {
          duracao = mDur[1]
        }
      }

      let resultado: RecentBackupExecutionRow['resultado'] = 'sucesso'
      let resultadoLabel = 'Sucesso'
      if (exec.status === 'parcial') {
        resultado = 'parcial'
        resultadoLabel = 'Com alertas'
      } else if (exec.status === 'erro') {
        resultado = 'erro'
        resultadoLabel = 'Falha'
      } else if (exec.status === 'nao_executada') {
        resultado = 'nao_executada'
        resultadoLabel = 'Não executada'
      }

      return {
        id: exec.id,
        dataHora,
        ativo: ativoNome,
        resultado,
        resultadoLabel,
        duracao,
        parsedTime,
      }
    })

    list.sort((a, b) => b.parsedTime - a.parsedTime)
    return list.slice(0, 5)
  }, [execucoes, rotinasMap])

  // ---------------------------------------------------------------------------
  // LISTA: PENDÊNCIAS E TAREFAS (Linha 3, Card 3)
  // Geradas a partir das ocorrências reais e pendências cadastrais
  // ---------------------------------------------------------------------------
  const pendingTasks: PendingTaskItem[] = useMemo(() => {
    const list: PendingTaskItem[] = []

    // 1. Ocorrências em aberto
    ocorrenciasAbertas.forEach((oc) => {
      const isAlta = oc.severidade === 'alta'
      const isMedia = oc.severidade === 'media'
      list.push({
        id: oc.id,
        descricao: oc.titulo,
        modulo: 'Backup',
        prazo: oc.created ? new Date(oc.created).toLocaleDateString('pt-BR') : 'Imediato',
        isVencido: true,
        prioridade: isAlta ? 'alta' : isMedia ? 'media' : 'baixa',
        href: '/backup?tab=ocorrencias',
      })
    })

    // 2. Conectores pendentes
    if (!glpiActive) {
      list.push({
        id: 'task-glpi',
        descricao: 'Validar credenciais do conector GLPI',
        modulo: 'Inventário',
        prazo: 'Aguardando',
        isVencido: false,
        prioridade: 'media',
        href: '/integracoes',
      })
    }

    if (!emailActive) {
      list.push({
        id: 'task-email',
        descricao: 'Cadastrar caixa postal IMAP para recepção de comprovantes',
        modulo: 'Backup',
        prazo: 'Aguardando',
        isVencido: false,
        prioridade: 'alta',
        href: '/integracoes',
      })
    }

    // 3. Serventia incompleta
    if (completedOrgSteps < 6) {
      list.push({
        id: 'task-org',
        descricao: 'Completar dados cadastrais e atribuições regimentais',
        modulo: 'Governança',
        prazo: 'Em andamento',
        isVencido: false,
        prioridade: 'baixa',
        href: '/configuracoes',
      })
    }

    return list.slice(0, 5)
  }, [ocorrenciasAbertas, glpiActive, emailActive, completedOrgSteps])

  // ---------------------------------------------------------------------------
  // BARRAS VERTICAIS: COBERTURA DE PROTEÇÃO POR CATEGORIA (Linha 4, Card 1)
  // ---------------------------------------------------------------------------
  const categoryProtectionBars: CategoryProtectionBarItem[] = useMemo(() => {
    const baseCategorias = [
      {
        categoria: 'Servidores',
        tipos: ['servidor_virtualizado', 'servidor_aplicacao'],
      },
      {
        categoria: 'Estações',
        tipos: ['estacao'],
      },
      {
        categoria: 'Sistemas',
        tipos: ['servico_nuvem', 'impressora_multifuncional'],
      },
      {
        categoria: 'Bancos',
        tipos: ['banco_dados'],
      },
      {
        categoria: 'Rede',
        tipos: ['equipamento_rede'],
      },
      {
        categoria: 'Outros',
        tipos: ['storage_backup', 'outro'],
      },
    ]

    return baseCategorias
      .map((cat) => {
        const ativosDaCat = assets.filter((a) => cat.tipos.includes(a.tipo))
        const total = ativosDaCat.length
        if (total === 0) return null

        let protegidos = 0
        ativosDaCat.forEach((ativo) => {
          const ef = ativosProtecaoEfetiva.find((ap) => ap.ativo.id === ativo.id)
          if (ef && ef.parcialmenteProtegido) protegidos++
        })

        const percentual = total > 0 ? Math.round((protegidos / total) * 100) : 0

        return {
          categoria: cat.categoria,
          percentual,
          totalAtivos: total,
          protegidos,
        }
      })
      .filter((item): item is CategoryProtectionBarItem => item !== null)
  }, [assets, ativosProtecaoEfetiva])

  // ---------------------------------------------------------------------------
  // SÉRIE TEMPORAL: EVOLUÇÃO DA CONFORMIDADE (Linha 4, Card 2)
  // REGRA INEGOCIÁVEL: ZERO dado fictício. Como o sistema não possui série mensal acumulada,
  // mantemos honestamente array vazio para renderizar o Empty State honesto.
  // ---------------------------------------------------------------------------
  const complianceTrendData: ComplianceTrendPoint[] = useMemo(() => {
    return [] // Estado vazio honesto conforme determinação expressa do usuário
  }, [])

  // ---------------------------------------------------------------------------
  // FEED: ATIVIDADES RECENTES (Linha 4, Card 3)
  // Baseado na collection audit_log real da serventia logada
  // ---------------------------------------------------------------------------
  const recentActivities: RecentActivityItem[] = useMemo(() => {
    return audits.slice(0, 5).map((log) => {
      let dataHora = '—'
      if (log.created) {
        try {
          dataHora = formatDateTime(log.created, { includeSeconds: false })
        } catch (_) {
          dataHora = log.created
        }
      }

      let tipoIcone: RecentActivityItem['tipoIcone'] = 'info'
      const actionUpper = (log.action || '').toUpperCase()

      if (
        actionUpper.includes('SUCESSO') ||
        actionUpper.includes('HOMOLOGADO') ||
        actionUpper.includes('RESOLVIDA')
      ) {
        tipoIcone = 'sucesso'
      } else if (
        actionUpper.includes('FALHA') ||
        actionUpper.includes('ALARME') ||
        actionUpper.includes('ERRO')
      ) {
        tipoIcone = 'alerta'
      } else if (actionUpper.includes('BACKUP') || actionUpper.includes('REPROCESSADA')) {
        tipoIcone = 'backup'
      } else if (actionUpper.includes('ATIVO') || actionUpper.includes('ASSET')) {
        tipoIcone = 'ativo'
      } else if (actionUpper.includes('CONFIG') || actionUpper.includes('INTEGRACAO')) {
        tipoIcone = 'config'
      }

      const descricao = log.detail || log.action || 'Atividade registrada na auditoria'

      return {
        id: log.id,
        action: log.action,
        descricao,
        dataHora,
        tipoIcone,
        userLabel: log.user_name || log.user_email || 'Sistema',
      }
    })
  }, [audits])

  return (
    <div className="space-y-6 pb-12">
      {/* 1. CABEÇALHO PADRÃO DO PRODUTO (ModuleHeader) */}
      <ModuleHeader
        breadcrumbs={[{ label: 'CSCTI - Compliance', href: '/' }, { label: 'Dashboard Principal' }]}
        icon={LayoutDashboard}
        title="Dashboard"
        badgeText="Compliance & Governança"
        subtitle="Visão geral da conformidade, riscos e proteção dos ativos"
        serventiaNome={organization?.name || 'Cliente CSCTI'}
        serventiaAtiva={organization?.status === 'ativa'}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadDashboardData}
      />

      {/* Assistente de Configuração da Serventia se incompleta */}
      {completedOrgSteps < 6 && (
        <Card className="border-blue-200 bg-blue-50/50 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-blue-950">
                  Assistente de Implantação da Serventia ({completedOrgSteps} de 6 etapas
                  concluídas)
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Complete os dados cadastrais, atribuições de papéis e conectores para garantir a
                conformidade institucional e auditoria contínua.
              </p>
              <div className="w-full max-w-md pt-1">
                <Progress value={pctGovernança} className="h-2 bg-blue-200" />
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-xs font-semibold shrink-0"
            >
              <Link to="/configuracoes">
                Continuar Configuração <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 2. TOPO: 5 KPIS EM CARDS HORIZONTAIS COM ÍCONE EM CÍRCULO COLORIDO E SEM TRUNCAMENTO */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Total de Ativos (Ícone Server exatamente igual ao menu Inventário e /ativos) */}
        <KpiCard
          label="Total de Ativos"
          value={assets.length}
          supportText={
            assets.length > 0
              ? `${monitoredAssets.length} ativos monitorados`
              : 'Sem ativos cadastrados'
          }
          icon={Server}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          href="/ativos"
        />

        {/* KPI 2: Cobertura de Backup (% de proteção efetiva homologada - Ícone HardDriveDownload) */}
        <KpiCard
          label="Cobertura de Backup"
          value={percentualProtegidoEfetivo}
          unit="%"
          supportText={`${totalAtivosComProtecao} de ${totalExigidosConfronto} ativos protegidos`}
          icon={HardDriveDownload}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-600"
          href="/backup"
          infoTooltip="Percentual médio ponderado das modalidades exigidas (Local, Nuvem, Replicação) comprovadas dentro da janela válida."
        />

        {/* KPI 3: Pendências (Ocorrências em aberto - Ícone ShieldAlert igual a Riscos/Pendências) */}
        <KpiCard
          label="Pendências"
          value={ocorrenciasAbertas.length}
          supportText={
            ocorrenciasAbertas.length > 0 ? 'Necessitam de atenção' : 'Nenhuma pendência ativa'
          }
          icon={ShieldAlert}
          iconBgColor={ocorrenciasAbertas.length > 0 ? 'bg-amber-100' : 'bg-slate-100'}
          iconColor={ocorrenciasAbertas.length > 0 ? 'text-amber-600' : 'text-slate-600'}
          href="/backup?tab=ocorrencias"
        />

        {/* KPI 4: Conformidade Geral (Ícone ShieldCheck) */}
        <KpiCard
          label="Conformidade Geral"
          value={conformidadeGeral}
          unit="%"
          supportText="Consolidado dos módulos"
          icon={ShieldCheck}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-600"
          href="/conformidade"
        />

        {/* KPI 5: Sistemas Críticos (Ícone AlertTriangle igual ao Ativos Críticos / Riscos Críticos) */}
        <div className="col-span-2 md:col-span-1">
          <KpiCard
            label="Sistemas Críticos"
            value={ativosCriticos.length}
            supportText={`${pctCriticos}% do total de ativos`}
            icon={AlertTriangle}
            iconBgColor={ativosCriticos.length > 0 ? 'bg-red-100' : 'bg-slate-100'}
            iconColor={ativosCriticos.length > 0 ? 'text-red-600' : 'text-slate-600'}
            href="/ativos"
          />
        </div>
      </div>

      {/* 3. PAINEL DE PROTEÇÃO E CONTINUIDADE HOMOLOGADO (Mantido integralmente) */}
      {orgId && <ProtectionContinuityCard organizationId={orgId} userRole={role} />}

      {/* 4. LINHA 2 (4 PAINÉIS): Conformidade por Módulo / Situação dos Ativos / Status Backups / Principais Riscos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Painel 1: Conformidade por Módulo */}
        <DashboardCard
          title="Conformidade por Módulo"
          subtitle="Aderência calculada por controle"
          icon={ShieldCheck}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        >
          <ModuleComplianceList items={complianceModules} />
        </DashboardCard>

        {/* Painel 2: Situação dos Ativos */}
        <DashboardCard
          title="Situação dos Ativos"
          subtitle="Comprovação e conformidade do parque"
          icon={Server}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          viewAllLink={{ href: '/ativos', label: 'Ver ativos' }}
        >
          {assets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              Nenhum ativo cadastrado no inventário.
            </div>
          ) : (
            <DonutWithLegend
              data={ativosSituacaoDonut.data}
              totalLabel={String(ativosSituacaoDonut.total)}
              subLabel="Ativos"
              size={120}
              strokeWidth={16}
            />
          )}
        </DashboardCard>

        {/* Painel 3: Status dos Backups (Últimos 30 dias) */}
        <DashboardCard
          title="Status dos Backups"
          subtitle="Últimos 30 dias"
          icon={HardDriveDownload}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
          viewAllLink={{ href: '/backup', label: 'Ver histórico' }}
        >
          {statusBackups30DiasDonut.total === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              Nenhuma execução registrada nos últimos 30 dias.
            </div>
          ) : (
            <DonutWithLegend
              data={statusBackups30DiasDonut.data}
              totalLabel={String(statusBackups30DiasDonut.total)}
              subLabel="Execuções"
              size={120}
              strokeWidth={16}
            />
          )}
        </DashboardCard>

        {/* Painel 4: Principais Riscos em Aberto */}
        <DashboardCard
          title="Principais Riscos em Aberto"
          subtitle="Ocorrências e lapsos não resolvidos"
          icon={ShieldAlert}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          viewAllLink={{ href: '/backup?tab=ocorrencias', label: 'Gerenciar' }}
        >
          <OpenRisksList items={openRisks} />
        </DashboardCard>
      </div>

      {/* 5. LINHA 3 (3 PAINÉIS): Ativos Críticos / Execuções de Backup Recentes / Pendências e Tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Painel 1: Ativos Críticos em Atenção */}
        <DashboardCard
          title="Ativos Críticos em Atenção"
          subtitle="Máquinas e servidores de alta relevância"
          icon={Server}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          viewAllLink={{ href: '/ativos', label: 'Ver todos' }}
        >
          <CriticalAssetsTable assets={criticalAssetsRows} />
        </DashboardCard>

        {/* Painel 2: Execuções de Backup Recentes */}
        <DashboardCard
          title="Execuções de Backup Recentes"
          subtitle="Comprovantes recebidos e processados"
          icon={HardDriveDownload}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
          viewAllLink={{ href: '/backup', label: 'Ver todas' }}
        >
          <RecentBackupExecutionsTable executions={recentBackupExecutions} />
        </DashboardCard>

        {/* Painel 3: Pendências e Tarefas */}
        <DashboardCard
          title="Pendências e Tarefas"
          subtitle="Ações necessárias para conformidade"
          icon={ShieldAlert}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          viewAllLink={{ href: '/backup?tab=ocorrencias', label: 'Ver todas' }}
        >
          <PendingTasksList tasks={pendingTasks} />
        </DashboardCard>
      </div>

      {/* 6. LINHA 4 (3 PAINÉIS): Cobertura por Categoria / Evolução da Conformidade / Atividades Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Painel 1: Cobertura de Proteção por Categoria */}
        <DashboardCard
          title="Cobertura de Proteção por Categoria"
          subtitle="Percentual de ativos com backup por categoria"
          icon={HardDriveDownload}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          viewAllLink={{ href: '/backup', label: 'Ver módulo de Backup' }}
        >
          <CategoryProtectionBars categories={categoryProtectionBars} />
        </DashboardCard>

        {/* Painel 2: Evolução da Conformidade */}
        <DashboardCard
          title="Evolução da Conformidade"
          subtitle="Histórico mensal consolidado"
          icon={ShieldCheck}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        >
          <ComplianceEvolutionChart data={complianceTrendData} />
        </DashboardCard>

        {/* Painel 3: Atividades Recentes */}
        <DashboardCard
          title="Atividades Recentes"
          subtitle="Últimos eventos registrados na auditoria"
          icon={FileText}
          iconColor="text-slate-600"
          iconBgColor="bg-slate-100"
          viewAllLink={{ href: '/auditoria', label: 'Ver todas' }}
        >
          <RecentActivitiesFeed activities={recentActivities} />
        </DashboardCard>
      </div>
    </div>
  )
}

export default Index
