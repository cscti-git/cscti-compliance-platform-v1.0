import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  Printer,
  FileCheck2,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { SvgDonutChart } from '@/components/backup/BackupPreviewCharts'
import {
  ConformidadeTabStrip,
  ConformidadeTabKey,
} from '@/components/conformidade/ConformidadeTabStrip'
import { ConformidadeEtapasTab } from '@/components/conformidade/ConformidadeEtapasTab'
import { ConformidadeItensTab } from '@/components/conformidade/ConformidadeItensTab'
import { ConformidadePrazosTab } from '@/components/conformidade/ConformidadePrazosTab'
import { ConformidadeDossieTab } from '@/components/conformidade/ConformidadeDossieTab'
import { ConformidadeHistoricoTab } from '@/components/conformidade/ConformidadeHistoricoTab'
import { ConformidadeEditModal } from '@/components/conformidade/ConformidadeEditModal'
import {
  listConformidadeCatalogo,
  listConformidadeStatus,
  listConformidadeEventos,
  avaliarStatusModulosIntegrados,
  consolidarMatrizConformidade,
  updateConformidadeItemStatus,
} from '@/services/conformidadeService'
import { formatSpDateTime } from '@/pages/backup/relatorioData'
import { toast } from '@/hooks/use-toast'
import type {
  ConformidadeItemCatalog,
  ConformidadeStatusItem,
  ConformidadeEventoItem,
  ConformidadeStatusType,
  MatrizConformidadeConsolidada,
} from '@/types/cscti'

export const ConformidadePage: React.FC = () => {
  const { organization, user, role } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Conectada'
  const isReadOnly = role === 'usuario'
  const canEdit = !isReadOnly
  const currentUserLabel = user?.name || user?.email || 'Operador CSCTI'

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as ConformidadeTabKey) || 'etapas'

  // Estados dos dados
  const [catalogo, setCatalogo] = useState<ConformidadeItemCatalog[]>([])
  const [statusList, setStatusList] = useState<ConformidadeStatusItem[]>([])
  const [eventos, setEventos] = useState<ConformidadeEventoItem[]>([])
  const [itensAvaliados, setItensAvaliados] = useState<
    Array<ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }>
  >([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Modal de edição / declaração
  const [editingItem, setEditingItem] = useState<
    (ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }) | null
  >(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleSelectTab = (tabId: ConformidadeTabKey) => {
    setSearchParams({ tab: tabId })
  }

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [catRes, stRes, evRes] = await Promise.all([
        listConformidadeCatalogo(),
        listConformidadeStatus(orgId),
        listConformidadeEventos(orgId),
      ])

      setCatalogo(catRes)
      setStatusList(stRes)
      setEventos(evRes)

      // Avaliação dinâmica com base nos módulos existentes
      const avaliados = await avaliarStatusModulosIntegrados(orgId, catRes, stRes)
      setItensAvaliados(avaliados)
      setLastUpdated(formatSpDateTime(new Date().toISOString()))
    } catch (err) {
      console.error('[ConformidadePage] Erro ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar matriz',
        description: 'Não foi possível carregar os dados da Matriz de Conformidade.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Matriz consolidada com prazos e bloqueio sequencial
  const consolidada: MatrizConformidadeConsolidada = useMemo(() => {
    return consolidarMatrizConformidade(organization, itensAvaliados)
  }, [organization, itensAvaliados])

  // Tratamento de salvar declaração manual
  const handleSaveItem = async (payload: {
    status: ConformidadeStatusType
    referenciaComprovante: string
    linkComprovante: string
    hashSha256: string
    observacoes: string
    motivo: string
  }) => {
    if (!editingItem || !orgId) return
    try {
      await updateConformidadeItemStatus({
        statusId: editingItem.id.startsWith('virtual-') ? undefined : editingItem.id,
        orgId,
        itemId: editingItem.item,
        itemCodigo: editingItem.item_codigo,
        status: payload.status,
        referenciaComprovante: payload.referenciaComprovante,
        linkComprovante: payload.linkComprovante,
        hashSha256: payload.hashSha256,
        observacoes: payload.observacoes,
        motivo: payload.motivo,
        userName: currentUserLabel,
      })

      toast({
        title: 'Item atualizado com sucesso',
        description: `O item ${editingItem.item_codigo} foi declarado como ${payload.status}.`,
      })

      await loadData()
    } catch (err) {
      console.error('[ConformidadePage] Falha ao atualizar item:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar a declaração de conformidade.',
        variant: 'destructive',
      })
    }
  }

  const handleEditClick = (
    item: ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog },
  ) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  // Segmentos para o donut padrão
  const donutSegments = useMemo(() => {
    return [
      {
        label: 'Comprovados',
        value: consolidada.totalComprovados,
        color: '#059669', // emerald-600
      },
      {
        label: 'Parciais',
        value: consolidada.totalParciais,
        color: '#D97706', // amber-600
      },
      {
        label: 'Pendentes',
        value: consolidada.totalPendentes,
        color: '#94A3B8', // slate-400
      },
      {
        label: 'Não Conforme',
        value: consolidada.totalNaoConforme,
        color: '#E11D48', // rose-600
      },
    ]
  }, [consolidada])

  return (
    <div className="space-y-6 pb-12">
      {/* 1. ModuleHeader Oficial */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Governança', href: '/conformidade' },
          { label: 'Matriz de Conformidade' },
        ]}
        icon={ShieldCheck}
        title="Matriz de Conformidade"
        badgeText={`Classe ${consolidada.serventiaClasse}`}
        subtitle="Consolidação do status de conformidade do ambiente da serventia, requisitos declaráveis e dossiê comprobatório por etapa."
        serventiaNome={orgName}
        serventiaAtiva={organization?.status === 'ativa'}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadData}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/relatorios/conformidade">
              <Button
                size="sm"
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Dossiê A4</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* 2. KPIs de Conformidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Percentual Geral */}
        <KpiCard
          label="Aderência Global"
          value={consolidada.percentualGeral}
          unit="%"
          icon={ShieldCheck}
          iconBgColor={consolidada.percentualGeral >= 80 ? 'bg-emerald-100' : 'bg-blue-100'}
          iconColor={consolidada.percentualGeral >= 80 ? 'text-emerald-700' : 'text-blue-700'}
          supportText={`${consolidada.totalComprovados} de ${consolidada.totalItens} itens comprovados`}
          infoTooltip="Média de comprovação em todas as 6 etapas cumulativas da matriz."
        />

        {/* KPI 2: Prazo Etapas 1 e 2 */}
        <KpiCard
          label="Prazo-Alvo (Etapas 1 e 2)"
          value={consolidada.diasRestantesEtapas1e2}
          unit="dias"
          icon={Clock}
          iconBgColor={
            consolidada.urgenciaPrazo === 'critica'
              ? 'bg-rose-100'
              : consolidada.urgenciaPrazo === 'atencao'
                ? 'bg-amber-100'
                : 'bg-emerald-100'
          }
          iconColor={
            consolidada.urgenciaPrazo === 'critica'
              ? 'text-rose-700'
              : consolidada.urgenciaPrazo === 'atencao'
                ? 'text-amber-700'
                : 'text-emerald-700'
          }
          supportText={`Regimental: ${consolidada.prazoEtapas1e2Dias} dias (Classe ${consolidada.serventiaClasse})`}
          infoTooltip="Prazo regimental atribuído à classe da serventia para comprovação formal das Etapas 1 e 2."
        />

        {/* KPI 3: Etapas Desbloqueadas */}
        <KpiCard
          label="Etapas Concluídas"
          value={consolidada.etapas.filter((e) => e.concluida).length}
          secondaryValue="/ 6 etapas"
          icon={Layers}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-700"
          supportText={
            consolidada.etapaBloqueanteAtual
              ? `Bloqueada na Etapa ${consolidada.etapaBloqueanteAtual + 1}`
              : 'Todas etapas liberadas'
          }
        />

        {/* KPI 4: Formato de Dossiê */}
        <KpiCard
          label="Dossiê Comprobatório"
          value={consolidada.serventiaClasse === 'C1' ? 'Simplificado' : 'Integral SHA-256'}
          icon={FileCheck2}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-800"
          supportText={
            consolidada.serventiaClasse === 'C1'
              ? 'Relatório síntese de conformidade'
              : 'Dossiê com hashes de integridade'
          }
        />
      </div>

      {/* 3. Painel de Visão Geral com Donut e Barra de Progresso por Etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Donut de Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Distribuição de Status dos 56 Requisitos
            </h3>
            <p className="text-[11px] text-slate-500">Confronto das evidências do ambiente real</p>
          </div>

          <div className="flex items-center justify-center py-2">
            <SvgDonutChart
              data={donutSegments}
              size={180}
              strokeWidth={22}
              totalLabel={`${consolidada.percentualGeral}%`}
              subLabel="Aderência"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            {donutSegments.map((seg) => (
              <div
                key={seg.label}
                className="flex items-center justify-between p-1.5 rounded bg-slate-50"
              >
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span>{seg.label}</span>
                </span>
                <span className="font-bold text-slate-800">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Rápido das 6 Etapas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Progresso das 6 Etapas Sequenciais
              </h3>
              <p className="text-[11px] text-slate-500">
                Cada etapa exige 100% de comprovação da anterior para conclusão
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Classe {consolidada.serventiaClasse}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {consolidada.etapas.map((et) => (
              <div key={et.numero} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 flex items-center gap-1.5">
                    {et.concluida ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : et.bloqueada ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    <span className="font-semibold">{et.titulo}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-800">
                    {et.percentual}% ({et.itensComprovados}/{et.itensTotal})
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      et.concluida
                        ? 'bg-emerald-500'
                        : et.bloqueada
                          ? 'bg-slate-300'
                          : 'bg-blue-600'
                    }`}
                    style={{ width: `${et.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Barra de Abas do Módulo */}
      <ConformidadeTabStrip
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        etapaBloqueante={consolidada.etapaBloqueanteAtual}
        totalItens={consolidada.totalItens}
        totalComprovados={consolidada.totalComprovados}
        diasRestantes={consolidada.diasRestantesEtapas1e2}
        dossieHabilitado={true}
      />

      {/* 5. Conteúdo da Aba Ativa */}
      {activeTab === 'etapas' && (
        <ConformidadeEtapasTab
          etapas={consolidada.etapas}
          onSelectEtapaItens={(etapaNum) => {
            setSearchParams({ tab: 'itens' })
          }}
          serventiaClasse={consolidada.serventiaClasse}
        />
      )}

      {activeTab === 'itens' && (
        <ConformidadeItensTab
          itens={itensAvaliados}
          canEdit={canEdit}
          onEditItem={handleEditClick}
        />
      )}

      {activeTab === 'prazos' && <ConformidadePrazosTab consolidada={consolidada} />}

      {activeTab === 'dossie' && <ConformidadeDossieTab consolidada={consolidada} />}

      {activeTab === 'historico' && (
        <ConformidadeHistoricoTab eventos={eventos} loading={loading} />
      )}

      {/* 6. Modal de Edição / Declaração */}
      <ConformidadeEditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={editingItem}
        onSave={handleSaveItem}
      />
    </div>
  )
}

export default ConformidadePage
