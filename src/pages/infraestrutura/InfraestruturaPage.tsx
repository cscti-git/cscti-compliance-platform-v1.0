import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { InfraTabStrip } from '@/components/infraestrutura/InfraTabStrip'
import { InfraSecaoTab } from '@/components/infraestrutura/InfraSecaoTab'
import { InfraConectividadeTab } from '@/components/infraestrutura/InfraConectividadeTab'
import { InfraCamadaLogicaTab } from '@/components/infraestrutura/InfraCamadaLogicaTab'
import { InfraChecklistGeralTab } from '@/components/infraestrutura/InfraChecklistGeralTab'
import { PlanoAcaoFormModal } from '@/components/planos/PlanoAcaoFormModal'
import {
  listInfraItens,
  listInfraLinks,
  listInfraChecklist,
  consolidarInfraRaioX,
  confrontarConectividade,
  analisarAtivosEol,
} from '@/services/infraestruturaService'
import {
  getCurrentUserOrganization,
  listInventoryAssets,
  listPeople,
} from '@/services/csctiService'
import { createPlanoAcao } from '@/services/planoAcaoService'
import {
  Zap,
  Server,
  Wifi,
  Cpu,
  ListChecks,
  CheckCircle2,
  Clock,
  Printer,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import type {
  InfraItem,
  InfraLinkItem,
  InfraChecklistItem,
  InventoryAssetItem,
  OrganizationItem,
  InfraRaioX,
} from '@/types/cscti'

export const InfraestruturaPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('energia')
  const [org, setOrg] = useState<OrganizationItem | null>(null)

  // Dados das coleções
  const [itens, setItens] = useState<InfraItem[]>([])
  const [links, setLinks] = useState<InfraLinkItem[]>([])
  const [checklist, setChecklist] = useState<InfraChecklistItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])

  // Modal de Plano de Ação vinculado
  const [planoModalOpen, setPlanoModalOpen] = useState(false)
  const [planoTituloInicial, setPlanoTituloInicial] = useState('')
  const [planoDescInicial, setPlanoDescInicial] = useState('')
  const [people, setPeople] = useState<any[]>([])

  const canEdit = user?.system_role === 'admin' || user?.system_role === 'suporte'
  const orgId = user?.organization || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [orgData, itensData, linksData, chkData, assetsData, peopleData] = await Promise.all([
        getCurrentUserOrganization().catch(() => null),
        listInfraItens(orgId),
        listInfraLinks(orgId),
        listInfraChecklist(orgId),
        listInventoryAssets(orgId).catch(() => []),
        listPeople(orgId).catch(() => []),
      ])

      setOrg(orgData)
      setItens(itensData)
      setLinks(linksData)
      setChecklist(chkData)
      setAssets(assetsData)
      setPeople(peopleData)
    } catch (err) {
      console.error('[InfraestruturaPage] Erro ao carregar dados:', err)
      toast({
        title: 'Erro de carregamento',
        description: 'Não foi possível carregar os registros de infraestrutura.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [orgId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Consolidação de KPIs e Raio-X
  const raioX: InfraRaioX = consolidarInfraRaioX(org, itens, links, checklist, assets)

  // Contagens por aba
  const energiaItens = itens.filter((i) => i.categoria === 'energia')
  const ambienteFisicoItens = itens.filter((i) => i.categoria === 'ambiente_fisico')
  const criptografiaItens = itens.filter((i) => i.categoria === 'camada_logica')

  const handleGerarPlanoFromItem = (item: InfraItem) => {
    setPlanoTituloInicial(`Adequação de Infraestrutura: ${item.titulo}`)
    setPlanoDescInicial(
      `Registro de infraestrutura "${item.titulo}" (${item.categoria}) encontra-se com status "${item.status}". Ações corretivas necessárias para atendimento do ambiente técnico da serventia.`,
    )
    setPlanoModalOpen(true)
  }

  const handleGerarPlanoFromChecklist = (chk: InfraChecklistItem) => {
    setPlanoTituloInicial(`Adequação de Requisito: ${chk.codigo} - ${chk.item_nome}`)
    setPlanoDescInicial(
      `O requisito do ambiente "${chk.item_nome}" está atualmente como "${chk.status}". Elaboração de plano para sanar a pendência física/lógica.`,
    )
    setPlanoModalOpen(true)
  }

  const handleGerarPlanoFromText = (texto: string) => {
    setPlanoTituloInicial(`Adequação de Infraestrutura Técnica`)
    setPlanoDescInicial(texto)
    setPlanoModalOpen(true)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho Padronizado CSCTI */}
      <ModuleHeader
        icon={Server}
        title="Infraestrutura Física e Lógica"
        subtitle="Gestão, evidências probatórias e aferição do ambiente elétrico, físico, de conectividade e camada lógica da serventia."
        badgeText="Ambiente Técnico"
        serventiaNome={org?.name}
        serventiaAtiva={Boolean((org as any)?.active ?? true)}
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Ambiente' },
          { label: 'Infraestrutura Física e Lógica' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/relatorios/infraestrutura')}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:text-slate-900 gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Relatório A4</span>
            </Button>
          </div>
        }
      />

      {/* Raio-X Superior com KpiCards Padronizados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Itens Conformes"
          value={`${raioX.itensConformes}/${raioX.totalItens}`}
          supportText="Requisitos físicos e lógicos atendidos"
          icon={CheckCircle2}
          iconColor="text-emerald-700"
          iconBgColor="bg-emerald-100"
        />

        <KpiCard
          label="Conformidade Geral"
          value={`${raioX.percentualConformidade}%`}
          supportText={
            raioX.percentualConformidade >= 80
              ? 'Ambiente em alto nível de prontidão'
              : 'Requer adequações de infraestrutura'
          }
          icon={Server}
          iconColor="text-[#0B2545]"
          iconBgColor="bg-blue-100"
        />

        <KpiCard
          label="Conectividade Real"
          value={`${raioX.conectividadeConfronto.velocidadeTotalAtivaMbps} Mbps`}
          supportText={`Mínimo exigido: ${raioX.conectividadeConfronto.velocidadeExigidaMbps} Mbps (Classe ${raioX.conectividadeConfronto.classeServentia})`}
          icon={Wifi}
          iconColor={
            raioX.conectividadeConfronto.atendeVelocidade ? 'text-emerald-700' : 'text-amber-700'
          }
          iconBgColor={
            raioX.conectividadeConfronto.atendeVelocidade ? 'bg-emerald-100' : 'bg-amber-100'
          }
        />

        <KpiCard
          label="Ativos EOL (Fim de Suporte)"
          value={raioX.ativosEolTotal}
          supportText={
            raioX.ativosEolTotal === 0
              ? 'Todos os SOs com suporte oficial'
              : `${raioX.ativosEolCriticos} ativo(s) com criticidade alta`
          }
          icon={Cpu}
          iconColor={raioX.ativosEolTotal > 0 ? 'text-rose-700' : 'text-emerald-700'}
          iconBgColor={raioX.ativosEolTotal > 0 ? 'bg-rose-100' : 'bg-emerald-100'}
        />
      </div>

      {/* Régua de Navegação de Abas */}
      <InfraTabStrip
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        energiaCount={energiaItens.length}
        ambienteFisicoCount={ambienteFisicoItens.length}
        linksCount={links.length}
        linksAtende={raioX.conectividadeConfronto.statusGeral === 'conforme'}
        eolCount={raioX.ativosEolTotal}
        checklistConformes={raioX.itensConformes}
        checklistTotal={raioX.totalItens}
      />

      {/* Conteúdo Dinâmico da Aba Selecionada */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mx-auto" />
          <p className="text-xs text-slate-500">
            Carregando registros do ambiente de infraestrutura...
          </p>
        </div>
      ) : (
        <div className="transition-all duration-150">
          {activeTab === 'energia' && (
            <InfraSecaoTab
              orgId={orgId}
              categoria="energia"
              titulo="Energia Elétrica e Redundância"
              subtitulo="Nobreaks (autonomia), laudo de aterramento com ART, geradores e plano formal de contingência."
              itens={energiaItens}
              canEdit={canEdit}
              onReload={loadData}
              onGerarPlanoAcao={handleGerarPlanoFromItem}
            />
          )}

          {activeTab === 'ambiente_fisico' && (
            <InfraSecaoTab
              orgId={orgId}
              categoria="ambiente_fisico"
              titulo="Ambiente Físico e Segurança Patrimonial"
              subtitulo="Sala de TI restrita, racks organizados, climatização dedicada e equipamentos de combate a incêndio."
              itens={ambienteFisicoItens}
              canEdit={canEdit}
              onReload={loadData}
              onGerarPlanoAcao={handleGerarPlanoFromItem}
            />
          )}

          {activeTab === 'conectividade' && (
            <InfraConectividadeTab
              orgId={orgId}
              organization={org}
              links={links}
              canEdit={canEdit}
              onReload={loadData}
              onGerarPlanoAcao={handleGerarPlanoFromText}
            />
          )}

          {activeTab === 'camada_logica' && (
            <InfraCamadaLogicaTab
              orgId={orgId}
              assets={assets}
              criptografiaItens={criptografiaItens}
              canEdit={canEdit}
              onReload={loadData}
              onGerarPlanoAcao={handleGerarPlanoFromText}
            />
          )}

          {activeTab === 'checklist' && (
            <InfraChecklistGeralTab
              orgId={orgId}
              checklist={checklist}
              itensInfra={itens}
              links={links}
              canEdit={canEdit}
              onReload={loadData}
              onGerarPlanoAcao={handleGerarPlanoFromChecklist}
            />
          )}
        </div>
      )}

      {/* Modal de Criação de Plano de Ação Vinculado */}
      <PlanoAcaoFormModal
        open={planoModalOpen}
        onClose={() => setPlanoModalOpen(false)}
        people={people}
        onSubmit={async (data) => {
          if (!orgId) return
          await createPlanoAcao({
            orgId,
            titulo: data.titulo,
            descricao: data.descricao,
            origem: 'infraestrutura',
            referenciaCodigo: data.referenciaCodigo,
            prioridade: data.prioridade,
            responsavelId: data.responsavelId,
            responsavelNome: data.responsavelNome,
            dataAlvo: data.dataAlvo,
            observacoes: data.observacoes,
          })
          toast({
            title: 'Plano de Ação Aberto',
            description: 'Item registrado no módulo de Planos de Ação.',
          })
          setPlanoModalOpen(false)
        }}
        plano={
          planoModalOpen
            ? ({
                id: '',
                organization: orgId,
                codigo: '',
                titulo: planoTituloInicial,
                descricao: planoDescInicial,
                origem: 'infraestrutura',
                prioridade: 'alta',
                status: 'aberto',
              } as any)
            : null
        }
      />
    </div>
  )
}

export default InfraestruturaPage
