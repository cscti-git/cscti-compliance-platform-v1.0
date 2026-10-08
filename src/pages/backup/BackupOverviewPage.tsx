import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/dateTime'
import {
  HardDriveDownload,
  ShieldCheck,
  Calendar,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Plus,
  PlayCircle,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Database,
  Sliders,
  Sparkles,
  Server,
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
  getBackupConfronto,
} from '@/services/backupService'
import { BackupConfrontoTable } from '@/components/backup/BackupConfrontoTable'
import type { BackupConfrontoResponse } from '@/types/cscti'
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
} from '@/types/cscti'

// Sub-abas
import { BackupCicloStepper } from '@/components/backup/BackupCicloStepper'
import { BackupEscopoTab } from './BackupEscopoTab'
import { BackupPlanosTab } from './BackupPlanosTab'
import { BackupRotinasTab } from './BackupRotinasTab'
import { BackupEvidenciasTab } from './BackupEvidenciasTab'
import { BackupExecucoesTab } from './BackupExecucoesTab'
import { BackupRegrasTab } from './BackupRegrasTab'
import { BackupOcorrenciasTab } from './BackupOcorrenciasTab'
import { BackupTestesTab } from './BackupTestesTab'

export const BackupOverviewPage: React.FC = () => {
  const { organization, role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const orgId = organization?.id || ''
  const canOperate = role === 'admin' || role === 'suporte'

  const activeTab = searchParams.get('aba') || searchParams.get('tab') || 'visao_geral'

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
  const [confrontoData, setConfrontoData] = useState<BackupConfrontoResponse | null>(null)
  const [loadingConfronto, setLoadingConfronto] = useState<boolean>(false)

  const loadConfronto = async () => {
    if (!orgId) return
    setLoadingConfronto(true)
    try {
      const conf = await getBackupConfronto(orgId)
      setConfrontoData(conf)
    } catch (err) {
      console.error('Erro ao carregar confronto por ativo:', err)
    } finally {
      setLoadingConfronto(false)
    }
  }

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
      // Carregar confronto em conjunto
      loadConfronto()
    } catch (err) {
      console.error('Erro ao carregar dados de backup:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [orgId])

  // Métricas
  const totalPlanosAtivos = planos.filter((p) => p.status === 'ativo').length
  const totalRotinasAtivas = rotinas.filter((r) => r.status === 'ativo').length
  const execucoesSucesso = execucoes.filter((e) => e.status === 'sucesso').length
  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status !== 'resolvida').length
  const evidenciasPendentes = evidencias.filter((e) => e.status_processamento === 'pendente').length
  const ultimoTeste = testes.length > 0 ? testes[0] : null

  // Métricas de ativos com exigências de backup
  const ativosExigemBackupCount = useMemo(() => {
    return assets.filter(
      (a) => a.exige_backup_local || a.exige_backup_nuvem || a.exige_backup_replicacao,
    ).length
  }, [assets])

  // Taxa de sucesso das execuções (Regra D: somente execuções sucesso / total execuções; total 0 -> null)
  const taxaSucesso =
    execucoes.length > 0 ? Math.round((execucoesSucesso / execucoes.length) * 100) : null

  // Métricas do confronto centrado no ativo (número honesto e proteção efetiva/parcial)
  const confrontoTotais = confrontoData?.totais
  const totalExigidosConfronto = confrontoTotais?.total_ativos_exigidos ?? ativosExigemBackupCount
  const totalProtegidosConfronto = confrontoTotais?.total_protegidos ?? 0
  const totalParcialConfronto = confrontoTotais?.total_parcial ?? 0
  const totalProtegidosCompleto =
    confrontoTotais?.total_protegidos_completo ??
    (confrontoData?.confronto
      ? confrontoData.confronto.filter((a) => a.status_consolidado === 'PROTEGIDO').length
      : 0)
  const totalComProtecao =
    confrontoTotais?.total_parcialmente_protegidos ??
    (confrontoData?.confronto
      ? confrontoData.confronto.filter((a) => (a.total_atendidas || 0) > 0).length
      : totalProtegidosConfronto + totalParcialConfronto)

  // Percentual geral de proteção efetiva perante as rotinas
  const percentualProtegidoConfronto = useMemo(() => {
    if (typeof confrontoTotais?.percentual_protegido_efetivo === 'number') {
      return confrontoTotais.percentual_protegido_efetivo
    }
    if (confrontoData?.confronto && confrontoData.confronto.length > 0) {
      const comExigencia = confrontoData.confronto.filter(
        (a) => (a.exigencias?.total_exigidas || 0) > 0,
      )
      if (comExigencia.length > 0) {
        const soma = comExigencia.reduce((acc, a) => {
          const exig = a.exigencias.total_exigidas
          const atend = a.total_atendidas || 0
          return acc + atend / exig
        }, 0)
        return Math.round((soma / comExigencia.length) * 100)
      }
    }
    return confrontoTotais?.percentual_protegido ?? 0
  }, [confrontoTotais, confrontoData])

  return (
    <div className="space-y-6">
      {/* Top Banner do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <HardDriveDownload className="w-6 h-6 text-[#0B2545]" />
              Backup e Recuperação de Desastres
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              Fase 3 • Continuidade
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão do ciclo de continuidade: Escopo de Proteção → Planos → Rotinas → Fontes →
            Evidências → Execuções → Avaliações de Conformidade → Testes de Restauração.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/backup/guia">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-[#0B2545] border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 gap-1.5 shadow-2xs"
              title="Abrir o Manual de Uso passo a passo do Backup"
            >
              <HelpCircle className="w-4 h-4 text-blue-700" /> Guia / Ajuda (?)
            </Button>
          </Link>
          <Link to="/relatorios/backup" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1.5 shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Relatório Comprobatório
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAllData}
            disabled={loading}
            className="text-xs h-8 text-slate-600"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stepper do Ciclo de Continuidade com contagens reais e destaque de etapas vazias */}
      <div className="mb-4">
        <BackupCicloStepper
          activeTab={activeTab}
          onSelectTab={(tab) => setSearchParams({ tab })}
          counts={{
            escopos: escopos.length,
            planos: planos.length,
            rotinas: rotinas.length,
            fontes: regras.length,
            evidencias: evidencias.length,
            execucoes: execucoes.length,
            ocorrencias: ocorrenciasAbertas,
            testes: testes.length,
            ativosExigemBackup: ativosExigemBackupCount,
          }}
        />
      </div>

      {/* Tabs Principais de Navegação do Módulo */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full"
      >
        <TabsList className="bg-slate-100 p-1 border border-slate-200/80 mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger
            value="visao_geral"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="escopo"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" /> Escopo (
            {ativosExigemBackupCount > 0 ? `${ativosExigemBackupCount} ativos` : escopos.length})
          </TabsTrigger>
          <TabsTrigger
            value="planos"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5" /> Planos ({planos.length})
          </TabsTrigger>
          <TabsTrigger
            value="rotinas"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Rotinas & Fontes ({rotinas.length})
          </TabsTrigger>
          <TabsTrigger
            value="evidencias"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> Evidências ({evidencias.length})
            {evidenciasPendentes > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {evidenciasPendentes}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="execucoes"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Execuções ({execucoes.length})
          </TabsTrigger>
          <TabsTrigger
            value="regras"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5" /> Regras & Adaptadores ({regras.length})
          </TabsTrigger>
          <TabsTrigger
            value="ocorrencias"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Ocorrências ({ocorrencias.length})
            {ocorrenciasAbertas > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                {ocorrenciasAbertas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="testes"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0B2545] data-[state=active]:shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Testes de Recuperação ({testes.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. VISÃO GERAL */}
        <TabsContent value="visao_geral" className="space-y-6">
          {/* Banner de Alerta Crítico & Bloco Factual de Últimas Falhas */}
          {(() => {
            const ativosComFalha = (confrontoData?.confronto || []).filter(
              (item) =>
                item.tem_falha_recente ||
                item.modalidades?.local?.status_modalidade === 'FALHA_ULTIMA_EXECUCAO' ||
                item.modalidades?.nuvem?.status_modalidade === 'FALHA_ULTIMA_EXECUCAO' ||
                item.modalidades?.replicacao?.status_modalidade === 'FALHA_ULTIMA_EXECUCAO' ||
                item.modalidades?.local?.ultima_execucao_falha ||
                item.modalidades?.nuvem?.ultima_execucao_falha ||
                item.modalidades?.replicacao?.ultima_execucao_falha,
            )

            const alertaGlobal = confrontoData?.alerta_falha_recente?.tem_falha
            const temFalha = ativosComFalha.length > 0 || Boolean(alertaGlobal)
            const countFalhas = Math.max(ativosComFalha.length, alertaGlobal ? 1 : 0)

            if (!temFalha) return null

            // Agrupar falhas factuais por rotina/modalidade para o bloco "Últimas falhas"
            interface FalhaAgrupada {
              rotina: string
              jobNome?: string
              modalidade: string
              dataHoraSp: string
              vmsFalhadas: string[]
              vmsSucesso: string[]
            }
            const falhasAgrupadasMap = new Map<string, FalhaAgrupada>()

            ativosComFalha.forEach((ativo) => {
              const mods = [
                { mod: 'Local', info: ativo.modalidades?.local },
                { mod: 'Nuvem', info: ativo.modalidades?.nuvem },
                { mod: 'Replicação', info: ativo.modalidades?.replicacao },
              ]

              mods.forEach(({ mod, info }) => {
                if (
                  info &&
                  (info.status_modalidade === 'FALHA_ULTIMA_EXECUCAO' || info.ultima_execucao_falha)
                ) {
                  const rotinaNome = info.rotina_nome || info.job_nome || 'Rotina de Backup'
                  const jobNome = info.job_nome || ''
                  const chave = `${rotinaNome}__${mod}`
                  const dataIso = info.ultima_execucao_data || info.ultima_comprovacao || ''
                  let dataHoraSp = ''
                  if (dataIso) {
                    try {
                      dataHoraSp = formatDateTime(dataIso, { includeSeconds: false })
                    } catch (_) {
                      dataHoraSp = dataIso
                    }
                  }

                  const vmsFalhasLista =
                    info.vms_falhas && info.vms_falhas.length > 0 ? info.vms_falhas : [ativo.nome]
                  const vmsSucessoLista = info.vms_sucesso || []

                  if (!falhasAgrupadasMap.has(chave)) {
                    falhasAgrupadasMap.set(chave, {
                      rotina: rotinaNome,
                      jobNome,
                      modalidade: mod,
                      dataHoraSp,
                      vmsFalhadas: [...vmsFalhasLista],
                      vmsSucesso: [...vmsSucessoLista],
                    })
                  } else {
                    const existente = falhasAgrupadasMap.get(chave)!
                    vmsFalhasLista.forEach((vm) => {
                      if (!existente.vmsFalhadas.includes(vm)) {
                        existente.vmsFalhadas.push(vm)
                      }
                    })
                    vmsSucessoLista.forEach((vm) => {
                      if (!existente.vmsSucesso.includes(vm)) {
                        existente.vmsSucesso.push(vm)
                      }
                    })
                  }
                }
              })
            })

            const listaFalhasAgrupadas = Array.from(falhasAgrupadasMap.values())

            return (
              <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50/95 text-red-950 flex flex-col gap-3.5 shadow-sm animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-red-600 text-white shrink-0 mt-0.5">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-red-950 uppercase tracking-wide">
                          Backup com falha detectado
                        </h3>
                        <Badge className="bg-red-700 text-white font-bold text-[10px]">
                          NÃO 100% PROTEGIDO
                        </Badge>
                      </div>
                      <p className="text-xs text-red-900 mt-1 leading-relaxed">
                        <strong>Atenção:</strong> {countFalhas} ativo(s) com falha registrada na
                        última execução de backup. A proteção desses itens fica suspensa até nova
                        execução bem-sucedida comprovada.
                      </p>
                      <p className="text-[11px] text-red-800/80 mt-0.5">
                        Conformidade e cobertura RPO recalculadas para baixo de forma honesta
                        (fail-closed).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setSearchParams({ tab: 'ocorrencias' })}
                      size="sm"
                      className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Ver Ocorrências Abertas ({ocorrenciasAbertas})
                    </Button>
                  </div>
                </div>

                {/* Bloco Factual: Últimas falhas nominais */}
                {listaFalhasAgrupadas.length > 0 && (
                  <div className="mt-1 pt-3 border-t border-red-200/80">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-900">
                        Últimas falhas registradas (horário de Brasília — America/Sao_Paulo):
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {listaFalhasAgrupadas.map((falha, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-white/80 border border-red-300 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="font-bold text-slate-900 truncate"
                              title={falha.rotina}
                            >
                              {falha.rotina}
                            </span>
                            <Badge
                              variant="outline"
                              className="border-red-400 bg-red-100 text-red-800 text-[10px] font-bold shrink-0"
                            >
                              {falha.modalidade}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1">
                            Executou em:{' '}
                            <strong className="text-slate-800">
                              {falha.dataHoraSp || 'Recente'}
                            </strong>
                          </div>
                          <div className="mt-1.5 text-[11px] text-red-900 bg-red-50/80 p-1.5 rounded border border-red-200/60">
                            <span className="font-semibold block text-[10px] uppercase text-red-700 mb-1">
                              VM(s) com falha ({falha.vmsFalhadas.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {falha.vmsFalhadas.map((vm, vIdx) => (
                                <Badge
                                  key={vIdx}
                                  className="bg-red-700 text-white font-mono text-[10px] px-1.5 py-0"
                                >
                                  {vm}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {falha.vmsSucesso && falha.vmsSucesso.length > 0 && (
                            <div className="mt-1.5 text-[11px] text-emerald-900 bg-emerald-50/80 p-1.5 rounded border border-emerald-200/60">
                              <span className="font-semibold block text-[10px] uppercase text-emerald-700 mb-1">
                                VM(s) com sucesso ({falha.vmsSucesso.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {falha.vmsSucesso.map((vm, sIdx) => (
                                  <Badge
                                    key={sIdx}
                                    className="bg-emerald-700 text-white font-mono text-[10px] px-1.5 py-0"
                                  >
                                    {vm}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Métricas Principais em Cards com métrica honesta do confronto */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Card Proteção Efetiva / Ativos Protegidos */}
            <Card className="border-slate-200 shadow-2xs bg-gradient-to-br from-white to-blue-50/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Proteção Efetiva
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded">
                      RPO
                    </span>
                  </p>
                  <p className="text-2xl font-bold mt-0.5 text-slate-900">
                    <span
                      className={
                        percentualProtegidoConfronto === 100
                          ? 'text-emerald-700'
                          : percentualProtegidoConfronto > 0
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }
                    >
                      {percentualProtegidoConfronto}%
                    </span>
                    <span className="text-xs font-semibold text-slate-600 ml-1.5">protegido</span>
                  </p>
                  <p className="text-[11px] text-slate-700 font-medium mt-0.5">
  {totalExigidosConfronto > 0 ? (
    totalProtegidosCompleto === totalExigidosConfronto ? (
      <span>
        {totalProtegidosCompleto} de {totalExigidosConfronto} ativos protegidos (100%)
      </span>
    ) : (
      <span>
        {totalComProtecao} de {totalExigidosConfronto} ativos parcialmente protegidos · {totalProtegidosCompleto} com proteção completa
      </span>
    )
  ) : (
    'Sem exigências marcadas'
  )}
</p>
{totalExigidosConfronto > 0 && totalProtegidosCompleto < totalExigidosConfronto && (
  <p className="text-[10px] text-slate-500">
    Rotina perante as exigências: Local ✓ e Nuvem ✓ comprovadas, falta a replicação
  </p>
)}
                </div>
                <div
                  className={`p-2.5 rounded-lg ${
                    percentualProtegidoConfronto === 100
                      ? 'bg-emerald-50 text-emerald-700'
                      : percentualProtegidoConfronto > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Planos / Rotinas
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {totalPlanosAtivos}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      / {totalRotinasAtivas} ativas
                    </span>
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                  <Sliders className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Execuções com Sucesso
                  </p>
                  <p
                    className={`text-2xl font-bold mt-0.5 ${
                      taxaSucesso === null
                        ? 'text-slate-400'
                        : taxaSucesso >= 90
                          ? 'text-emerald-700'
                          : taxaSucesso >= 70
                            ? 'text-amber-600'
                            : 'text-red-600'
                    }`}
                  >
                    {execucoes.length > 0 ? (
                      <>
                        {execucoesSucesso}
                        <span className="text-sm font-normal text-slate-500">
                          {' '}
                          / {execucoes.length}
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {execucoes.length > 0
                      ? 'Refere-se a execuções de job — não mede a proteção dos ativos'
                      : 'Nenhuma execução registrada'}
                  </p>
                </div>
                <div
                  className={`p-2.5 rounded-lg ${
                    taxaSucesso !== null && taxaSucesso >= 90
                      ? 'bg-emerald-50 text-emerald-700'
                      : taxaSucesso !== null
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Evidências Processadas
                  </p>
                  <p className="text-2xl font-bold text-[#0B2545] mt-0.5">{evidencias.length}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <FileCheck2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ocorrências Abertas
                  </p>
                  <p
                    className={`text-2xl font-bold mt-0.5 ${ocorrenciasAbertas > 0 ? 'text-red-700' : 'text-slate-900'}`}
                  >
                    {ocorrenciasAbertas}
                  </p>
                </div>
                <div
                  className={`p-2.5 rounded-lg ${ocorrenciasAbertas > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NOVA SEÇÃO: CONFRONTO POR ATIVO (ESTILO VEEAM ONE) */}
          <BackupConfrontoTable
            confrontoData={confrontoData}
            loading={loadingConfronto}
            onRefresh={loadConfronto}
            onNavigateToEscopo={() => setSearchParams({ tab: 'escopo' })}
            onNavigateToRotinas={(ativoId) => {
              setSearchParams({ tab: 'rotinas', ...(ativoId ? { ativo: ativoId } : {}) })
            }}
          />

          {/* Banner de Status do Último Teste de Recuperação */}
          <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-850 to-[#0B2545] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-white/10 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Último Teste de Recuperação Homologado
                </p>
                {ultimoTeste ? (
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {ultimoTeste.tipo === 'restauracao_total'
                      ? 'Restauração Total'
                      : ultimoTeste.tipo === 'restauracao_parcial'
                        ? 'Restauração Parcial'
                        : 'Simulação de Desastre'}{' '}
                    • Concluído com {ultimoTeste.resultado.toUpperCase()} em{' '}
                    {new Date(ultimoTeste.data_teste).toLocaleDateString('pt-BR')} (
                    {ultimoTeste.tempo_decorrido_minutos || 0} min)
                  </p>
                ) : (
                  <p className="text-sm text-slate-300 mt-0.5">
                    Nenhum teste de recuperação homologado registrado até o momento.
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => setSearchParams({ tab: 'testes' })}
              variant="secondary"
              size="sm"
              className="text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100"
            >
              Registrar Teste de Recuperação <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* Ciclo Funcional de Continuidade em Cards Informativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Atalhos do Ciclo */}
            <Card className="border-slate-200 shadow-2xs md:col-span-2">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>Ciclo Funcional de Continuidade e Proteção</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Etapas do ciclo auditável
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Navegue rapidamente entre os elos do processo de backup da serventia.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'escopo' })}
                  className="p-3 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                >
                  <Layers className="w-4 h-4 text-blue-600 mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                    1. Escopo
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ativosExigemBackupCount > 0
                      ? `${ativosExigemBackupCount} ativos c/ backup (${escopos.length} escopos)`
                      : `${escopos.length} escopos mapeados`}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'planos' })}
                  className="p-3 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                >
                  <Sliders className="w-4 h-4 text-indigo-600 mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                    2. Planos & Requisitos
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">RTO, RPO, retenção 3-2-1</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'rotinas' })}
                  className="p-3 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                >
                  <Calendar className="w-4 h-4 text-emerald-600 mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                    3. Rotinas & Fontes
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Vínculo com ativos inventariados
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'evidencias' })}
                  className="p-3 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                >
                  <FileCheck2 className="w-4 h-4 text-purple-600 mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                    4. Evidências
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Comprovantes com hash SHA-256</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'execucoes' })}
                  className="p-3 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                >
                  <PlayCircle className="w-4 h-4 text-amber-600 mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700">
                    5. Execuções & Avaliação
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {execucoes.length} execuções registradas
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: 'testes' })}
                  className="p-3 text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                    6. Testes Periódicos
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Laudo técnico de restauração</p>
                </button>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Ações Operacionais
                </CardTitle>
                <CardDescription className="text-xs">Entradas imediatas no ciclo</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {canOperate ? (
                  <>
                    <Button
                      onClick={() => setSearchParams({ tab: 'evidencias', action: 'nova' })}
                      className="w-full justify-start text-xs font-semibold bg-[#0B2545] hover:bg-[#124E78] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Registrar Comprovante / Evidência
                    </Button>
                    <Button
                      onClick={() => setSearchParams({ tab: 'execucoes', action: 'nova' })}
                      variant="outline"
                      className="w-full justify-start text-xs font-semibold text-slate-700"
                    >
                      <PlayCircle className="w-4 h-4 mr-2 text-blue-600" /> Lançar Execução Manual
                    </Button>
                    <Button
                      onClick={() => setSearchParams({ tab: 'testes', action: 'novo' })}
                      variant="outline"
                      className="w-full justify-start text-xs font-semibold text-slate-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Registrar Teste de
                      Restauração
                    </Button>
                  </>
                ) : (
                  <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    Perfil <strong>Usuário (Consulta)</strong>: acesso apenas para visualização e
                    geração de relatórios comprobatórios.
                  </div>
                )}
                <Link to="/relatorios/backup" target="_blank" className="block pt-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-start text-xs font-semibold text-slate-800"
                  >
                    <Printer className="w-4 h-4 mr-2 text-slate-600" /> Emitir Relatório A4
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Últimas Execuções e Ocorrências Recentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Execuções Recentes */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Execuções Recentes
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Últimas cópias processadas ou lançadas
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchParams({ tab: 'execucoes' })}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Ver todas <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100">
                {execucoes.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500 italic">
                    Nenhuma execução registrada até o momento.
                  </p>
                ) : (
                  execucoes.slice(0, 5).map((exec) => (
                    <div
                      key={exec.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/60"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              exec.status === 'sucesso'
                                ? 'bg-emerald-500'
                                : exec.status === 'parcial'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900">
                            {exec.expand?.rotina?.nome || 'Rotina Geral'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              exec.status === 'sucesso'
                                ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                                : exec.status === 'parcial'
                                  ? 'text-amber-700 border-amber-200 bg-amber-50'
                                  : 'text-red-700 border-red-200 bg-red-50'
                            }`}
                          >
                            {exec.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {exec.data_inicio
                            ? new Date(exec.data_inicio).toLocaleString('pt-BR')
                            : 'Data não informada'}{' '}
                          • {exec.tamanho_formatado || 'Tamanho n/d'} •{' '}
                          {exec.destino || 'Destino n/d'}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-mono text-slate-400">
                        {exec.origem_registro}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Ocorrências Recentes */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Ocorrências de Continuidade
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Alertas, falhas e pendências registradas
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchParams({ tab: 'ocorrencias' })}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Ver todas <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100">
                {ocorrencias.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500 italic">
                    Nenhuma ocorrência em aberto. O ambiente de backup está em conformidade.
                  </p>
                ) : (
                  ocorrencias.slice(0, 5).map((oco) => (
                    <div
                      key={oco.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/60"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              oco.status === 'resolvida'
                                ? 'bg-slate-400'
                                : oco.severidade === 'alta'
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900">{oco.titulo}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              oco.status === 'resolvida'
                                ? 'text-slate-600 bg-slate-100'
                                : 'text-red-700 bg-red-50 border-red-200'
                            }`}
                          >
                            {oco.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {oco.descricao}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {oco.severidade}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. ESCOPO */}
        <TabsContent value="escopo">
          <BackupEscopoTab
            escopos={escopos}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>

        {/* 3. PLANOS & REQUISITOS */}
        <TabsContent value="planos">
          <BackupPlanosTab
            planos={planos}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>

        {/* 4. ROTINAS & FONTES */}
        <TabsContent value="rotinas">
          <BackupRotinasTab
            rotinas={rotinas}
            planos={planos}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>

        {/* 5. EVIDÊNCIAS & PROCESSAMENTO */}
        <TabsContent value="evidencias">
          <BackupEvidenciasTab
            evidencias={evidencias}
            rotinas={rotinas}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>

        {/* 6. EXECUÇÕES & AVALIAÇÕES */}
        <TabsContent value="execucoes">
          <BackupExecucoesTab
            execucoes={execucoes}
            rotinas={rotinas}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>

        {/* 6.1 REGRAS DE IDENTIFICAÇÃO E ADAPTADORES */}
        <TabsContent value="regras">
          <BackupRegrasTab
            regras={regras}
            fontes={fontes}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>

        {/* 7. OCORRÊNCIAS */}
        <TabsContent value="ocorrencias">
          <BackupOcorrenciasTab
            ocorrencias={ocorrencias}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>

        {/* 8. TESTES DE RECUPERAÇÃO */}
        <TabsContent value="testes">
          <BackupTestesTab
            testes={testes}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadAllData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BackupOverviewPage
