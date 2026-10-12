import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Lock,
  Plus,
  Printer,
  ShieldCheck,
  Database,
  FileCheck,
  AlertOctagon,
  UserCheck,
  FolderGit2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { LgpdTabStrip } from '@/components/lgpd/LgpdTabStrip'
import { LgpdInventarioTab } from '@/components/lgpd/LgpdInventarioTab'
import { LgpdOperacoesTab } from '@/components/lgpd/LgpdOperacoesTab'
import { LgpdCienciaTab } from '@/components/lgpd/LgpdCienciaTab'
import { LgpdIncidentesTab } from '@/components/lgpd/LgpdIncidentesTab'
import {
  listLgpdDados,
  listLgpdFinalidades,
  listLgpdCiencias,
  listLgpdIncidentes,
} from '@/services/lgpdService'
import { listInventoryAssets, listPeople } from '@/services/csctiService'
import { listDesignacoes } from '@/services/designacaoService'
import { formatSpDateTime } from '@/pages/backup/relatorioData'
import { toast } from '@/hooks/use-toast'
import type {
  LgpdDadoItem,
  LgpdFinalidadeItem,
  LgpdCienciaItem,
  LgpdIncidenteItem,
  InventoryAssetItem,
  PersonItem,
  DesignacaoItem,
} from '@/types/cscti'

export const LgpdPage: React.FC = () => {
  const { organization, user, role } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Conectada'
  const isReadOnly = role === 'usuario'
  const canEdit = !isReadOnly

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'inventario'

  // Dados
  const [dados, setDados] = useState<LgpdDadoItem[]>([])
  const [finalidades, setFinalidades] = useState<LgpdFinalidadeItem[]>([])
  const [ciencias, setCiencias] = useState<LgpdCienciaItem[]>([])
  const [incidentes, setIncidentes] = useState<LgpdIncidenteItem[]>([])
  const [ativos, setAtivos] = useState<InventoryAssetItem[]>([])
  const [colaboradores, setColaboradores] = useState<PersonItem[]>([])
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
      const [dadosRes, finRes, cienRes, incRes, ativosRes, peopleRes, desigRes] = await Promise.all(
        [
          listLgpdDados(orgId),
          listLgpdFinalidades(orgId),
          listLgpdCiencias(orgId),
          listLgpdIncidentes(orgId),
          listInventoryAssets(orgId),
          listPeople(orgId),
          listDesignacoes(orgId),
        ],
      )

      setDados(dadosRes)
      setFinalidades(finRes)
      setCiencias(cienRes)
      setIncidentes(incRes)
      setAtivos(ativosRes)
      setColaboradores(peopleRes)
      setDesignacoes(desigRes)
      setLastUpdated(formatSpDateTime(new Date().toISOString()))
    } catch (err) {
      console.error('[LgpdPage] Erro ao carregar dados LGPD:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações de LGPD da serventia.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Identificar Encarregado de Dados Pessoais (DPO) formalmente designado
  const encarregadoDesignado = useMemo(() => {
    const enc = designacoes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'ENCARREGADO_DADOS' ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('encarregado de dados')) &&
        d.status !== 'revogada',
    )
    return enc || null
  }, [designacoes])

  // KPIs
  const kpis = useMemo(() => {
    const totalDados = dados.length
    const dadosSensiveis = dados.filter(
      (d) => d.categoria_sensibilidade === 'sensivel' && d.status === 'ativo',
    ).length
    const finalidadesAtivas = finalidades.filter((f) => f.status === 'ativo').length
    const incidentesAbertos = incidentes.filter((i) => i.status_fluxo !== 'encerrado').length
    const cienciasConcedidas = ciencias.filter((c) => c.status === 'concedida').length
    const totalCiencias = Math.max(colaboradores.length, ciencias.length)

    return {
      totalDados,
      dadosSensiveis,
      finalidadesAtivas,
      incidentesAbertos,
      cienciasConcedidas,
      totalCiencias,
    }
  }, [dados, finalidades, incidentes, ciencias, colaboradores])

  return (
    <div className="space-y-6 pb-12">
      {/* 1. ModuleHeader oficial CSCTI */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Governança', href: '/lgpd' },
          { label: 'LGPD e Governança de Dados' },
        ]}
        icon={Lock}
        title="LGPD e Governança"
        badgeText="Privacidade & ROPA"
        subtitle="Mapeamento de operações de tratamento, inventário de dados pessoais, adesão à PSI e resposta a incidentes com contagem regressiva de 72h."
        serventiaNome={orgName}
        serventiaAtiva={organization?.status === 'ativa'}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadData}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/relatorios/lgpd">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>Relatório A4</span>
              </Button>
            </Link>

            <Link to="/evidencias?categoria=Documentos e Políticas">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 hidden sm:flex"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Políticas na Central</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Faixa do Encarregado de Dados Pessoais (DPO) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 px-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/80">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Encarregado de Dados Pessoais da Serventia
            </span>
            {encarregadoDesignado ? (
              <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{encarregadoDesignado.nome_designado}</span>
                {encarregadoDesignado.email_designado && (
                  <span className="text-xs font-normal text-slate-500">
                    ({encarregadoDesignado.email_designado})
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Designação formal {encarregadoDesignado.status.replace('_', ' ')}
                </span>
              </div>
            ) : (
              <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Nenhum Encarregado formalmente designado ainda nesta serventia.</span>
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

      {/* 2. KPIs Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Dados Mapeados"
          value={kpis.totalDados}
          unit="itens"
          icon={Database}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-700"
          supportText="Inventário de dados catalogados"
        />

        <KpiCard
          label="Dados Sensíveis"
          value={kpis.dadosSensiveis}
          unit="ativos"
          icon={Lock}
          iconBgColor={kpis.dadosSensiveis > 0 ? 'bg-rose-100' : 'bg-slate-100'}
          iconColor={kpis.dadosSensiveis > 0 ? 'text-rose-700' : 'text-slate-500'}
          supportText="Biometria, menores, saúde e certidões"
        />

        <KpiCard
          label="Operações de Tratamento"
          value={kpis.finalidadesAtivas}
          unit="ativas"
          icon={ShieldCheck}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-700"
          supportText="Finalidades com bases legais vinculadas"
        />

        <KpiCard
          label="Incidentes Abertos"
          value={kpis.incidentesAbertos}
          unit={kpis.incidentesAbertos === 1 ? 'aberto' : 'abertos'}
          icon={AlertOctagon}
          iconBgColor={kpis.incidentesAbertos > 0 ? 'bg-amber-100' : 'bg-slate-100'}
          iconColor={kpis.incidentesAbertos > 0 ? 'text-amber-700' : 'text-slate-500'}
          supportText={
            kpis.incidentesAbertos > 0
              ? 'Acompanhamento do prazo de 72h'
              : 'Nenhum incidente em aberto'
          }
        />
      </div>

      {/* 3. Barra de Abas Estilo BackupTabStrip */}
      <LgpdTabStrip
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        inventarioCount={kpis.totalDados}
        operacoesCount={kpis.finalidadesAtivas}
        cienciasConcedidasCount={kpis.cienciasConcedidas}
        cienciasTotalCount={kpis.totalCiencias}
        incidentesAbertosCount={kpis.incidentesAbertos}
      />

      {/* 4. Conteúdo da Aba Ativa */}
      {activeTab === 'inventario' && (
        <LgpdInventarioTab
          orgId={orgId}
          dados={dados}
          finalidades={finalidades}
          ativos={ativos}
          canEdit={canEdit}
          onReload={loadData}
        />
      )}

      {activeTab === 'operacoes' && (
        <LgpdOperacoesTab
          orgId={orgId}
          finalidades={finalidades}
          dados={dados}
          canEdit={canEdit}
          onReload={loadData}
        />
      )}

      {activeTab === 'ciencia' && (
        <LgpdCienciaTab
          orgId={orgId}
          ciencias={ciencias}
          colaboradores={colaboradores}
          canEdit={canEdit}
          onReload={loadData}
        />
      )}

      {activeTab === 'incidentes' && (
        <LgpdIncidentesTab
          orgId={orgId}
          incidentes={incidentes}
          dados={dados}
          defaultResponsavel={user?.name || user?.email || 'Encarregado de Dados'}
          canEdit={canEdit}
          onReload={loadData}
        />
      )}
    </div>
  )
}

export default LgpdPage
