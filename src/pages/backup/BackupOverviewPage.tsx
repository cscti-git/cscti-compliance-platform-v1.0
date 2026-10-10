import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { BackupTabStrip } from '@/components/backup/BackupTabStrip'
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
      {/* Barra de Abas Redesenhada: Fundo Azul-Escuro (#0B2545), Pílulas e Mini-Badges */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full"
      >
        <div className="mb-5">
          <BackupTabStrip
            activeTab={activeTab}
            onSelectTab={(val) => setSearchParams({ tab: val })}
            ativosExigemBackupCount={ativosExigemBackupCount}
            escoposCount={escopos.length}
            planosCount={planos.length}
            rotinasCount={rotinas.length}
            evidenciasCount={evidencias.length}
            evidenciasPendentesCount={evidenciasPendentes}
            monitoramentosCount={monitoramentos.length}
            execucoesCount={execucoes.length}
            regrasCount={regras.length}
            ocorrenciasCount={ocorrencias.length}
            ocorrenciasAbertasCount={ocorrenciasAbertas}
            testesCount={testes.length}
          />
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
