import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShieldCheck,
  Calendar,
  FileCheck2,
  AlertTriangle,
  PlayCircle,
  Layers,
  CheckCircle2,
  Sliders,
  UserCheck,
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
  listBackupMonitoramentos,
} from '@/services/backupService'
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
  BackupMonitoramentoExternoItem,
} from '@/types/cscti'
// Sub-abas
import { BackupOverviewContent } from '@/components/backup/BackupOverviewContent'
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
  const [monitoramentos, setMonitoramentos] = useState<BackupMonitoramentoExternoItem[]>([])
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
        nocData,
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
        listBackupMonitoramentos(orgId),
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
      setMonitoramentos(nocData)
    } catch (err) {
      console.error('Erro ao carregar dados de backup:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [orgId])

  // Contadores para as badges das abas
  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status !== 'resolvida').length
  const evidenciasPendentes = evidencias.filter((e) => e.status_processamento === 'pendente').length

  // Métricas de ativos com exigências de backup
  const ativosExigemBackupCount = useMemo(() => {
    return assets.filter(
      (a) => a.exige_backup_local || a.exige_backup_nuvem || a.exige_backup_replicacao,
    ).length
  }, [assets])

  return (
    <div className="space-y-6">
      {/* Tabs Principais de Navegação do Módulo */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full"
      >
        <div className="border-b border-slate-200 pb-2 mb-4">
          <TabsList className="bg-slate-100 p-1 border border-slate-200/80 flex-wrap h-auto gap-1">
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
              {monitoramentos.length > 0 && (
                <span
                  className="ml-1 inline-flex items-center px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold"
                  title="Atestados humanos do NOC registrados (Monitoramento Externo)"
                >
                  <UserCheck className="w-2.5 h-2.5 mr-0.5" />
                  {monitoramentos.length}
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
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Testes de Recuperação ({testes.length}
              )
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. VISÃO GERAL (LAYOUT HOMOLOGADO COMPLETO) */}
        <TabsContent value="visao_geral" className="space-y-6">
          <BackupOverviewContent
            showPreviewBanner={false}
            onSelectTab={(tab, extraParams) => {
              setSearchParams({ tab, ...(extraParams || {}) })
            }}
          />
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
            subAbaInicial={
              searchParams.get('sub') === 'monitoramento_externo'
                ? 'monitoramento_externo'
                : undefined
            }
            onConsumirSubAbaInicial={() => setSearchParams({ tab: 'evidencias' })}
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
