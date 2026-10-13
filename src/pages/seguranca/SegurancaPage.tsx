import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  Shield,
  FileCheck,
  Activity,
  ListChecks,
  Printer,
  FolderGit2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { SegurancaTabStrip } from '@/components/seguranca/SegurancaTabStrip'
import { SegurancaSolucoesTab } from '@/components/seguranca/SegurancaSolucoesTab'
import { SegurancaComprovantesTab } from '@/components/seguranca/SegurancaComprovantesTab'
import { SegurancaCoberturaTab } from '@/components/seguranca/SegurancaCoberturaTab'
import { SegurancaChecklistTab } from '@/components/seguranca/SegurancaChecklistTab'
import {
  listSegSolucoes,
  listSegCoberturasExigidas,
  listSegComprovantes,
  listSegItensConformidade,
  calcularCoberturaSeguranca,
} from '@/services/segurancaService'
import { listInventoryAssets } from '@/services/csctiService'
import { listDesignacoes } from '@/services/designacaoService'
import { formatSpDateTime, formatSpDateOnly } from '@/pages/backup/relatorioData'
import { toast } from '@/hooks/use-toast'
import type {
  SegSolucaoItem,
  SegCoberturaExigidaItem,
  SegComprovanteItem,
  SegItemConformidadeItem,
  InventoryAssetItem,
  DesignacaoItem,
  SegurancaCoberturaCalculada,
} from '@/types/cscti'

export const SegurancaPage: React.FC = () => {
  const { organization, user, role } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Conectada'
  const isReadOnly = role === 'usuario'
  const canEdit = !isReadOnly
  const currentUserLabel = user?.name || user?.email || 'Operador CSCTI'

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'solucoes'

  // Dados do banco real
  const [solucoes, setSolucoes] = useState<SegSolucaoItem[]>([])
  const [coberturasExigidas, setCoberturasExigidas] = useState<SegCoberturaExigidaItem[]>([])
  const [comprovantes, setComprovantes] = useState<SegComprovanteItem[]>([])
  const [itensConformidade, setItensConformidade] = useState<SegItemConformidadeItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [designacoes, setDesignacoes] = useState<DesignacaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const handleSelectTab = (tabId: string) => {
    setSearchParams({ tab: tabId })
  }

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [solRes, cobRes, compRes, itensRes, assetsRes, desigRes] = await Promise.all([
        listSegSolucoes(orgId),
        listSegCoberturasExigidas(orgId),
        listSegComprovantes(orgId),
        listSegItensConformidade(orgId),
        listInventoryAssets(orgId),
        listDesignacoes(orgId),
      ])

      setSolucoes(solRes)
      setCoberturasExigidas(cobRes)
      setComprovantes(compRes)
      setItensConformidade(itensRes)
      setAssets(assetsRes)
      setDesignacoes(desigRes)
      setLastUpdated(formatSpDateTime(new Date().toISOString()))
    } catch (err) {
      console.error('[SegurancaPage] Erro ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados de segurança do ambiente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Identificar Responsável pela Segurança da Informação formalmente designado
  const responsavelSeguranca = useMemo(() => {
    const resp = designacoes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'RESPONSAVEL_SEGURANCA' ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança da informação') ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança')) &&
        d.status !== 'revogada',
    )
    return resp || null
  }, [designacoes])

  // Cobertura calculada a partir dos dados reais
  const coberturaCalculada: SegurancaCoberturaCalculada = useMemo(() => {
    return calcularCoberturaSeguranca(
      assets,
      solucoes,
      coberturasExigidas,
      comprovantes,
      itensConformidade,
    )
  }, [assets, solucoes, coberturasExigidas, comprovantes, itensConformidade])

  return (
    <div className="space-y-6 pb-12">
      {/* 1. ModuleHeader oficial CSCTI */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Segurança', href: '/seguranca' },
          { label: 'Segurança do Ambiente' },
        ]}
        icon={ShieldCheck}
        title="Segurança do Ambiente"
        badgeText="Endpoint, Firewall & SOC/NOC"
        subtitle="Comprovação das soluções de proteção, antivírus corporativo, firewall e monitoramento contínuo do ambiente do cliente."
        serventiaNome={orgName}
        serventiaAtiva={organization?.status === 'ativa'}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadData}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/relatorios/seguranca">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>Relatório A4</span>
              </Button>
            </Link>

            <Link to="/evidencias?categoria=Segurança da Informação">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 hidden sm:flex"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Central de Evidências</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Faixa do Responsável pela Segurança da Informação formalmente designado */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 px-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/80">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Responsável pela Segurança da Informação da Serventia
            </span>
            {responsavelSeguranca ? (
              <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{responsavelSeguranca.nome_designado}</span>
                {responsavelSeguranca.email_designado && (
                  <span className="text-xs font-normal text-slate-500">
                    ({responsavelSeguranca.email_designado})
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Designação formal {responsavelSeguranca.status.replace('_', ' ')}
                </span>
              </div>
            ) : (
              <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  Nenhum Responsável pela Segurança formalmente designado ainda nesta serventia.
                </span>
              </div>
            )}
          </div>
        </div>

        <Link
          to="/configuracoes?tab=people"
          className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 shrink-0"
        >
          <span>Gerenciar em Papéis & Responsáveis</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. 4 KPIs Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Soluções Ativas */}
        <KpiCard
          label="Soluções Ativas"
          value={coberturaCalculada.solucoesAtivasCount}
          unit={coberturaCalculada.solucoesAtivasCount === 1 ? 'solução' : 'soluções'}
          icon={Shield}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-700"
          supportText={`${solucoes.length} cadastradas no catálogo`}
        />

        {/* KPI 2: Cobertura de Endpoint (% real máquina por máquina com tooltip) */}
        <KpiCard
          label="Cobertura de Endpoint"
          value={coberturaCalculada.percentualCobertura}
          unit="%"
          icon={ShieldCheck}
          iconBgColor={
            coberturaCalculada.percentualCobertura >= 80 ? 'bg-emerald-100' : 'bg-amber-100'
          }
          iconColor={
            coberturaCalculada.percentualCobertura >= 80 ? 'text-emerald-700' : 'text-amber-700'
          }
          supportText={`${coberturaCalculada.comprovadasEndpoint} de ${coberturaCalculada.exigidasEndpoint} ativos protegidos`}
          infoTooltip="Fórmula: (Ativos com status Protegido comprovado ÷ Total de ativos exigidos no inventário) × 100. Confronta os comprovantes reais contra o Inventário de Ativos (incluindo GLPI)."
        />

        {/* KPI 3: Itens Comprovados */}
        <KpiCard
          label="Itens Comprovados"
          value={coberturaCalculada.itensComprovadosCount}
          secondaryValue={`/ ${coberturaCalculada.itensTotalCount} requisitos`}
          icon={ListChecks}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-700"
          supportText="Checklist neutro do ambiente"
        />

        {/* KPI 4: Última Comprovação */}
        <KpiCard
          label="Última Comprovação"
          value={
            coberturaCalculada.dataUltimoComprovante
              ? formatSpDateOnly(coberturaCalculada.dataUltimoComprovante)
              : 'Sem laudo'
          }
          icon={Activity}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-700"
          supportText={
            coberturaCalculada.dataUltimoComprovante
              ? 'Verdade temporal do documento'
              : 'Nenhum comprovante anexado'
          }
        />
      </div>

      {/* 3. Barra de Abas Estilo BackupTabStrip */}
      <SegurancaTabStrip
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        solucoesCount={solucoes.length}
        comprovantesCount={comprovantes.length}
        coberturaPercent={coberturaCalculada.percentualCobertura}
        checklistComprovados={coberturaCalculada.itensComprovadosCount}
        checklistTotal={coberturaCalculada.itensTotalCount}
      />

      {/* 4. Conteúdo da Aba Ativa */}
      {activeTab === 'solucoes' && (
        <SegurancaSolucoesTab
          orgId={orgId}
          solucoes={solucoes}
          canEdit={canEdit}
          onReload={loadData}
        />
      )}

      {activeTab === 'comprovantes' && (
        <SegurancaComprovantesTab
          orgId={orgId}
          comprovantes={comprovantes}
          solucoes={solucoes}
          canEdit={canEdit}
          currentUserLabel={currentUserLabel}
          onReload={loadData}
        />
      )}

      {activeTab === 'cobertura' && (
        <SegurancaCoberturaTab
          orgId={orgId}
          assets={assets}
          solucoes={solucoes}
          coberturasExigidas={coberturasExigidas}
          comprovantes={comprovantes}
          coberturaCalculada={coberturaCalculada}
          canEdit={canEdit}
          onReload={loadData}
        />
      )}

      {activeTab === 'checklist' && (
        <SegurancaChecklistTab
          orgId={orgId}
          itens={itensConformidade}
          comprovantes={comprovantes}
          canEdit={canEdit}
          onReload={loadData}
        />
      )}
    </div>
  )
}

export default SegurancaPage
