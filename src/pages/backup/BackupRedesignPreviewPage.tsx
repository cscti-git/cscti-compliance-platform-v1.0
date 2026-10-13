import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  RefreshCw,
  FileText,
  Printer,
  Sparkles,
  Layers,
  Database,
  Calendar,
  FileSearch,
  PlayCircle,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/common/ModuleHeader'

// Serviços existentes homologados (NENHUM novo endpoint, sem tocar em hooks/pb_hooks)
import {
  listBackupEscopos,
  listBackupPlanos,
  listBackupRotinas,
  listBackupFontes,
  listBackupEvidencias,
  listBackupExecucoes,
  listBackupRegras,
  listBackupOcorrencias,
  listBackupTestes,
  listBackupMonitoramentos,
  getBackupConfronto,
} from '@/services/backupService'
import { listInventoryAssets } from '@/services/csctiService'

// Componentes do Redesign
import { BackupRedesignBanner } from '@/components/backup/redesign/BackupRedesignBanner'
import { BackupRedesignKpis } from '@/components/backup/redesign/BackupRedesignKpis'
import { BackupRedesignContinuityPanel } from '@/components/backup/redesign/BackupRedesignContinuityPanel'
import { BackupRedesignScopeSection } from '@/components/backup/redesign/BackupRedesignScopeSection'
import { BackupRedesignPlansSection } from '@/components/backup/redesign/BackupRedesignPlansSection'
import { BackupRedesignEvidenceExecSection } from '@/components/backup/redesign/BackupRedesignEvidenceExecSection'
import { BackupRedesignIncidentsRecoverySection } from '@/components/backup/redesign/BackupRedesignIncidentsRecoverySection'
import { BackupRedesignNocSection } from '@/components/backup/redesign/BackupRedesignNocSection'

// Abas do Módulo Oficial que podem ser visualizadas inline no preview
import { BackupEscopoTab } from '@/pages/backup/BackupEscopoTab'
import { BackupPlanosTab } from '@/pages/backup/BackupPlanosTab'
import { BackupRotinasTab } from '@/pages/backup/BackupRotinasTab'
import { BackupEvidenciasTab } from '@/pages/backup/BackupEvidenciasTab'
import { BackupExecucoesTab } from '@/pages/backup/BackupExecucoesTab'
import { BackupRegrasTab } from '@/pages/backup/BackupRegrasTab'
import { BackupOcorrenciasTab } from '@/pages/backup/BackupOcorrenciasTab'
import { BackupTestesTab } from '@/pages/backup/BackupTestesTab'

import type {
  InventoryAssetItem,
  BackupEscopoItem,
  BackupPlanoItem,
  BackupRotinaItem,
  BackupFonteItem,
  BackupEvidenciaItem,
  BackupExecucaoItem,
  BackupRegraIdentificacaoItem,
  BackupOcorrenciaItem,
  BackupTesteRecuperacaoItem,
  BackupMonitoramentoExternoItem,
  BackupConfrontoResponse,
} from '@/types/cscti'

export const BackupRedesignPreviewPage: React.FC = () => {
  const { organization, role } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const orgId = organization?.id || ''
  const isReadOnly = role === 'usuario'
  const canOperate = role === 'admin' || role === 'suporte'

  // Aba ativa do redesign: padrão 'visao_geral' (dashboard consolidado do novo design)
  const activeTab = searchParams.get('tab') || 'visao_geral'

  // Estados dos dados reais do banco
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [escopos, setEscopos] = useState<BackupEscopoItem[]>([])
  const [planos, setPlanos] = useState<BackupPlanoItem[]>([])
  const [rotinas, setRotinas] = useState<BackupRotinaItem[]>([])
  const [fontes, setFontes] = useState<BackupFonteItem[]>([])
  const [evidencias, setEvidencias] = useState<BackupEvidenciaItem[]>([])
  const [execucoes, setExecucoes] = useState<BackupExecucaoItem[]>([])
  const [regras, setRegras] = useState<BackupRegraIdentificacaoItem[]>([])
  const [ocorrencias, setOcorrencias] = useState<BackupOcorrenciaItem[]>([])
  const [testes, setTestes] = useState<BackupTesteRecuperacaoItem[]>([])
  const [monitoramentosNoc, setMonitoramentosNoc] = useState<BackupMonitoramentoExternoItem[]>([])
  const [confrontoData, setConfrontoData] = useState<BackupConfrontoResponse | null>(null)

  // Carregamento de dados 100% reais do banco da serventia
  const loadData = useCallback(async () => {
    if (!orgId) return
    try {
      setReloading(true)

      const [
        assetsRes,
        escoposRes,
        planosRes,
        rotinasRes,
        fontesRes,
        evidenciasRes,
        execucoesRes,
        regrasRes,
        ocorrenciasRes,
        testesRes,
        monitoramentosRes,
        confrontoRes,
      ] = await Promise.all([
        listInventoryAssets(orgId).catch(() => []),
        listBackupEscopos(orgId).catch(() => []),
        listBackupPlanos(orgId).catch(() => []),
        listBackupRotinas(orgId).catch(() => []),
        listBackupFontes(orgId).catch(() => []),
        listBackupEvidencias(orgId).catch(() => []),
        listBackupExecucoes(orgId).catch(() => []),
        listBackupRegras(orgId).catch(() => []),
        listBackupOcorrencias(orgId).catch(() => []),
        listBackupTestes(orgId).catch(() => []),
        listBackupMonitoramentos(orgId).catch(() => []),
        getBackupConfronto(orgId).catch(() => null),
      ])

      setAssets(assetsRes)
      setEscopos(escoposRes)
      setPlanos(planosRes)
      setRotinas(rotinasRes)
      setFontes(fontesRes)
      setEvidencias(evidenciasRes)
      setExecucoes(execucoesRes)
      setRegras(regrasRes)
      setOcorrencias(ocorrenciasRes)
      setTestes(testesRes)
      setMonitoramentosNoc(monitoramentosRes)
      setConfrontoData(confrontoRes)
    } catch (err: any) {
      console.error('Erro ao carregar dados reais do módulo Backup:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os registros do banco da serventia.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setReloading(false)
    }
  }, [orgId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Navegação entre abas dentro do preview
  const handleSelectTab = (tabId: string, extraParams?: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tabId)
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => params.set(k, v))
    }
    setSearchParams(params)
  }

  // Cálculos de proteção e confrontos reais
  const ativosExigemBackupCount = useMemo(() => {
    const comExigencias = assets.filter(
      (a) => a.exige_backup_local || a.exige_backup_nuvem || a.exige_backup_replicacao,
    )
    return comExigencias.length > 0 ? comExigencias.length : assets.length
  }, [assets])

  const ocorrenciasAbertasCount = useMemo(() => {
    return ocorrencias.filter((o) => o.status !== 'resolvida').length
  }, [ocorrencias])

  const evidenciasNoc = useMemo(() => {
    return evidencias.filter((e) => Boolean(e.assunto && /noc|analise preventiva/i.test(e.assunto)))
  }, [evidencias])

  // Indicadores consolidados do confronto
  const totalExigidos = confrontoData?.totais?.total_ativos_exigidos ?? ativosExigemBackupCount
  const totalProtegidosCompleto = confrontoData?.totais?.total_protegidos_completo ?? 0
  const totalComProtecao =
    confrontoData?.totais?.total_parcialmente_protegidos ?? totalProtegidosCompleto
  const percentualProtegido = confrontoData?.totais?.percentual_protegido_completo ?? 0

  const ultimoNoc = monitoramentosNoc[0]

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Banner Obrigatório de Prévia de Redesign */}
      <BackupRedesignBanner />

      {/* 2. Header no Novo Padrão (ModuleHeader padronizado) */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Visão Geral', href: '/' },
          { label: 'Backup e Recuperação', href: '/backup' },
          { label: 'Prévia de Redesign (Homologação)' },
        ]}
        icon={ShieldCheck}
        title="Backup"
        badgeText="CSCTI - Compliance"
        subtitle="Salvaguarda de ativos, RPO objetivo, ingestão IMAP e Validação Externa (NOC) do ambiente operacional"
        serventiaNome={
          organization?.trade_name ||
          organization?.corporate_name ||
          organization?.name ||
          'Serventia'
        }
        serventiaAtiva={organization?.status !== 'inativa'}
        loading={reloading}
        onReload={loadData}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={reloading || loading}
              className="text-xs h-9 gap-1.5 text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/backup/relatorio')}
              className="text-xs h-9 gap-1.5 text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Relatório Oficial</span>
            </Button>
          </div>
        }
      />

      {/* 3. Barra de Abas do Módulo na Nova Estética Pastel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/90 no-scrollbar">
        <Button
          variant={activeTab === 'visao_geral' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('visao_geral')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'visao_geral'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Visão Geral (Redesign)</span>
        </Button>

        <Button
          variant={activeTab === 'escopo' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('escopo')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'escopo'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Escopo</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
            {ativosExigemBackupCount}
          </span>
        </Button>

        <Button
          variant={activeTab === 'planos' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('planos')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'planos'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Planos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
            {planos.length}
          </span>
        </Button>

        <Button
          variant={activeTab === 'rotinas' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('rotinas')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'rotinas'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Rotinas & Fontes</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
            {rotinas.length}
          </span>
        </Button>

        <Button
          variant={activeTab === 'evidencias' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('evidencias')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'evidencias'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          <span>Evidências</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
            {evidencias.length}
          </span>
          {monitoramentosNoc.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-bold"
              title="Validação Externa (NOC)"
            >
              NOC {monitoramentosNoc.length}
            </span>
          )}
        </Button>

        <Button
          variant={activeTab === 'execucoes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('execucoes')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'execucoes'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Execuções</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
            {execucoes.length}
          </span>
        </Button>

        <Button
          variant={activeTab === 'regras' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('regras')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'regras'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Regras</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
            {regras.length}
          </span>
        </Button>

        <Button
          variant={activeTab === 'ocorrencias' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('ocorrencias')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'ocorrencias'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Ocorrências</span>
          {ocorrenciasAbertasCount > 0 ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-bold">
              {ocorrenciasAbertasCount}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
              {ocorrencias.length}
            </span>
          )}
        </Button>

        <Button
          variant={activeTab === 'testes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSelectTab('testes')}
          className={`text-xs h-9 rounded-xl gap-2 font-semibold ${
            activeTab === 'testes'
              ? 'bg-[#0B2545] text-white hover:bg-[#124E78]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Testes de Recuperação</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
            {testes.length}
          </span>
        </Button>
      </div>

      {/* 4. CONTEÚDO PRINCIPAL DA PRÉVIA */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-6">
          {/* 4.1 KPIs Reais no Topo (KpiCard oficial) */}
          <BackupRedesignKpis
            totalAtivosProtegidosCompleto={totalProtegidosCompleto}
            totalExigidosConfronto={totalExigidos}
            percentualProtegidoConfronto={percentualProtegido}
            totalAtivosComProtecao={totalComProtecao}
            execucoes={execucoes}
            ocorrenciasAbertasCount={ocorrenciasAbertasCount}
            ultimoMonitoramentoNocDate={ultimoNoc?.data_monitoramento || ultimoNoc?.created}
            ultimoMonitoramentoNocStatus={ultimoNoc?.status_geral}
            loading={loading}
            onNavigateTab={handleSelectTab}
          />

          {/* 4.2 O ÚNICO Painel que permanece do módulo atual: Ciclo de Continuidade Operacional */}
          <BackupRedesignContinuityPanel
            assets={assets}
            planos={planos}
            rotinas={rotinas}
            fontes={fontes}
            evidencias={evidencias}
            execucoes={execucoes}
            ocorrencias={ocorrencias}
            escopos={escopos}
            confrontoData={confrontoData}
            loading={loading}
            canOperate={canOperate}
            onNavigateTab={handleSelectTab}
            onReload={loadData}
          />

          {/* 4.3 Escopo & Ativos de Salvaguarda (Redesenhado) */}
          <BackupRedesignScopeSection
            assets={assets}
            escopos={escopos}
            confrontoData={confrontoData}
            loading={loading}
            onNavigateTab={handleSelectTab}
          />

          {/* 4.4 Validação Externa (NOC) — Terminologia Obrigatória */}
          <BackupRedesignNocSection
            monitoramentosNoc={monitoramentosNoc}
            evidenciasNoc={evidenciasNoc}
            loading={loading}
            onNavigateTab={handleSelectTab}
          />

          {/* 4.5 Planos & Rotinas / Fontes (Redesenhado) */}
          <BackupRedesignPlansSection
            planos={planos}
            rotinas={rotinas}
            fontes={fontes}
            loading={loading}
            onNavigateTab={handleSelectTab}
          />

          {/* 4.6 Evidências Ingeridas & Execuções Processadas (Redesenhado) */}
          <BackupRedesignEvidenceExecSection
            evidencias={evidencias}
            execucoes={execucoes}
            rotinas={rotinas}
            monitoramentosNocCount={monitoramentosNoc.length}
            loading={loading}
            onNavigateTab={handleSelectTab}
          />

          {/* 4.7 Ocorrências & Testes de Recuperação (Redesenhado) */}
          <BackupRedesignIncidentsRecoverySection
            ocorrencias={ocorrencias}
            testes={testes}
            loading={loading}
            onNavigateTab={handleSelectTab}
          />
        </div>
      )}

      {/* ABAS OPERACIONAIS ESPECÍFICAS (Reutilização direta dos componentes para conferência) */}
      {activeTab === 'escopo' && (
        <div className="space-y-4">
          <BackupEscopoTab
            escopos={escopos}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}

      {activeTab === 'planos' && (
        <div className="space-y-4">
          <BackupPlanosTab
            planos={planos}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}

      {activeTab === 'rotinas' && (
        <div className="space-y-4">
          <BackupRotinasTab
            rotinas={rotinas}
            planos={planos}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}

      {activeTab === 'evidencias' && (
        <div className="space-y-4">
          <BackupEvidenciasTab
            evidencias={evidencias}
            rotinas={rotinas}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}

      {activeTab === 'execucoes' && (
        <div className="space-y-4">
          <BackupExecucoesTab
            execucoes={execucoes}
            rotinas={rotinas}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}

      {activeTab === 'regras' && (
        <div className="space-y-4">
          <BackupRegrasTab
            regras={regras}
            fontes={fontes}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}

      {activeTab === 'ocorrencias' && (
        <div className="space-y-4">
          <BackupOcorrenciasTab
            ocorrencias={ocorrencias}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}

      {activeTab === 'testes' && (
        <div className="space-y-4">
          <BackupTestesTab
            testes={testes}
            canOperate={canOperate}
            orgId={orgId}
            onReload={loadData}
          />
        </div>
      )}
    </div>
  )
}

export default BackupRedesignPreviewPage
