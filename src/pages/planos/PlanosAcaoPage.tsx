import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Printer,
  History,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatSpDateTime } from '@/pages/backup/relatorioData'
import {
  listPlanosAcao,
  listPlanosAcaoHistorico,
  createPlanoAcao,
  updatePlanoGeral,
  updatePlanoStatus,
  updatePlanoPrazo,
  updatePlanoResponsavel,
  listSugestoesMatrizConformidade,
  transformarSugestaoEmPlano,
  dispensarSugestaoMatriz,
  reativarSugestaoMatriz,
  calcularRaioXPlanos,
} from '@/services/planoAcaoService'
import { listPeople } from '@/services/csctiService'
import { PlanoAcaoTabStrip, PlanoAcaoTabKey } from '@/components/planos/PlanoAcaoTabStrip'
import { PlanosListaTab } from '@/components/planos/PlanosListaTab'
import { SugestoesMatrizTab } from '@/components/planos/SugestoesMatrizTab'
import { PlanosHistoricoTab } from '@/components/planos/PlanosHistoricoTab'
import { PlanoAcaoFormModal } from '@/components/planos/PlanoAcaoFormModal'
import type {
  PlanoAcaoItem,
  PlanoAcaoHistoricoItem,
  PlanoSugestaoMatriz,
  PlanosAcaoRaioX,
  PersonItem,
  PlanoAcaoStatus,
} from '@/types/cscti'

export const PlanosAcaoPage: React.FC = () => {
  const { user, organization, role } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Selecionada'
  const canEdit = role === 'admin' || role === 'suporte'
  const currentUserLabel = user?.name || user?.email || 'Usuário CSCTI'
  const currentUserEmail = user?.email || ''

  // Aba ativa via URL
  const tabParam = searchParams.get('tab') as PlanoAcaoTabKey | null
  const activeTab: PlanoAcaoTabKey =
    tabParam === 'sugestoes' || tabParam === 'historico' ? tabParam : 'planos'

  const handleSelectTab = (tab: PlanoAcaoTabKey) => {
    setSearchParams(tab === 'planos' ? {} : { tab })
  }

  // Estados principais
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('—')
  const [planos, setPlanos] = useState<PlanoAcaoItem[]>([])
  const [historico, setHistorico] = useState<PlanoAcaoHistoricoItem[]>([])
  const [sugestoes, setSugestoes] = useState<PlanoSugestaoMatriz[]>([])
  const [people, setPeople] = useState<PersonItem[]>([])

  // Modal de formulário (criação / edição)
  const [modalFormOpen, setModalFormOpen] = useState(false)
  const [planoEmEdicao, setPlanoEmEdicao] = useState<PlanoAcaoItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar todos os dados reais
  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [planosRes, histRes, sugRes, peopleRes] = await Promise.all([
        listPlanosAcao(orgId),
        listPlanosAcaoHistorico(orgId),
        listSugestoesMatrizConformidade(orgId),
        listPeople(orgId),
      ])

      setPlanos(planosRes)
      setHistorico(histRes)
      setSugestoes(sugRes)
      setPeople(peopleRes)
      setLastUpdated(formatSpDateTime(new Date().toISOString()))
    } catch (err) {
      console.error('[PlanosAcaoPage] Erro ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar planos de ação',
        description: 'Não foi possível carregar os dados reais do banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [orgId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Consolidar Raio-X dos números reais do banco
  const raioX: PlanosAcaoRaioX = useMemo(() => {
    const pendentesCount = sugestoes.filter((s) => !s.jaConvertido && !s.dispensado).length
    return calcularRaioXPlanos(planos, pendentesCount)
  }, [planos, sugestoes])

  // Ação de Criar ou Editar Plano
  const handleSavePlano = async (data: {
    titulo: string
    descricao?: string
    origem: any
    referenciaCodigo?: string
    prioridade: any
    status?: any
    responsavelId?: string
    responsavelNome?: string
    dataAlvo?: string
    observacoes?: string
    motivoMudancaPrazo?: string
  }) => {
    if (!orgId) return
    setIsSubmitting(true)
    try {
      if (planoEmEdicao) {
        // Atualizações no plano existente
        // 1. Dados gerais
        await updatePlanoGeral({
          planoId: planoEmEdicao.id,
          orgId,
          titulo: data.titulo,
          descricao: data.descricao,
          prioridade: data.prioridade,
          observacoes: data.observacoes,
          autorNome: currentUserLabel,
          autorEmail: currentUserEmail,
        })

        // 2. Status se mudou
        if (data.status && data.status !== planoEmEdicao.status) {
          await updatePlanoStatus({
            planoId: planoEmEdicao.id,
            orgId,
            novoStatus: data.status,
            motivo: 'Atualização via edição de plano',
            autorNome: currentUserLabel,
            autorEmail: currentUserEmail,
          })
        }

        // 3. Responsável se mudou
        if (data.responsavelId !== planoEmEdicao.responsavel) {
          await updatePlanoResponsavel({
            planoId: planoEmEdicao.id,
            orgId,
            novoResponsavelId: data.responsavelId,
            novoResponsavelNome: data.responsavelNome,
            motivo: 'Reatribuição via edição de plano',
            autorNome: currentUserLabel,
            autorEmail: currentUserEmail,
          })
        }

        // 4. Prazo se mudou
        const prazoAnterior = planoEmEdicao.data_alvo
          ? planoEmEdicao.data_alvo.substring(0, 10)
          : ''
        const novoPrazo = data.dataAlvo || ''
        if (novoPrazo !== prazoAnterior) {
          await updatePlanoPrazo({
            planoId: planoEmEdicao.id,
            orgId,
            novoPrazo,
            motivo: data.motivoMudancaPrazo || 'Ajuste de cronograma',
            autorNome: currentUserLabel,
            autorEmail: currentUserEmail,
          })
        }

        toast({
          title: 'Plano atualizado',
          description: `O plano "${data.titulo}" foi atualizado com sucesso.`,
        })
      } else {
        // Criação de novo plano
        await createPlanoAcao({
          orgId,
          titulo: data.titulo,
          descricao: data.descricao,
          origem: data.origem,
          referenciaCodigo: data.referenciaCodigo,
          prioridade: data.prioridade,
          status: data.status || 'aberto',
          responsavelId: data.responsavelId,
          responsavelNome: data.responsavelNome,
          dataAlvo: data.dataAlvo,
          observacoes: data.observacoes,
          autorNome: currentUserLabel,
          autorEmail: currentUserEmail,
        })

        toast({
          title: 'Plano de ação criado',
          description: `O plano "${data.titulo}" foi cadastrado com sucesso.`,
        })
      }

      await loadData()
      setModalFormOpen(false)
      setPlanoEmEdicao(null)
    } catch (err: any) {
      console.error('[PlanosAcaoPage] Erro ao salvar plano:', err)
      toast({
        title: 'Erro ao salvar plano',
        description: err?.message || 'Falha ao persistir alterações.',
        variant: 'destructive',
      })
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  // Atualização rápida de status na lista
  const handleQuickStatusChange = async (planoId: string, novoStatus: PlanoAcaoStatus) => {
    if (!orgId) return
    try {
      await updatePlanoStatus({
        planoId,
        orgId,
        novoStatus,
        autorNome: currentUserLabel,
        autorEmail: currentUserEmail,
      })

      toast({
        title: 'Status atualizado',
        description: `O status do plano foi alterado para ${novoStatus}.`,
      })

      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err?.message || 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    }
  }

  // Transformar sugestão da matriz em plano
  const handleTransformarSugestao = async (sug: PlanoSugestaoMatriz) => {
    if (!orgId) return
    try {
      const plano = await transformarSugestaoEmPlano({
        orgId,
        itemCodigo: sug.itemCodigo,
        titulo: `Adequação: ${sug.titulo}`,
        descricao: `Plano gerado a partir do item ${sug.itemCodigo} da Matriz de Conformidade: ${sug.descricao}`,
        prioridade: sug.prioridadeSugerida,
        autorNome: currentUserLabel,
        autorEmail: currentUserEmail,
      })

      toast({
        title: 'Plano de ação criado da matriz',
        description: `O item ${sug.itemCodigo} agora é um plano de ação ativo.`,
      })

      await loadData()
      handleSelectTab('planos')
    } catch (err: any) {
      toast({
        title: 'Erro ao transformar sugestão',
        description: err?.message || 'Falha na conversão da pendência da matriz.',
        variant: 'destructive',
      })
    }
  }

  // Dispensar sugestão da matriz
  const handleDispensarSugestao = async (itemCodigo: string, motivo: string) => {
    if (!orgId) return
    await dispensarSugestaoMatriz({
      orgId,
      itemCodigo,
      motivo,
      autorNome: currentUserLabel,
      autorEmail: currentUserEmail,
    })

    toast({
      title: 'Sugestão dispensada',
      description: `A decisão sobre o item ${itemCodigo} foi registrada na auditoria.`,
    })

    await loadData()
  }

  // Reativar sugestão
  const handleReativarSugestao = async (itemCodigo: string) => {
    if (!orgId) return
    await reativarSugestaoMatriz({
      orgId,
      itemCodigo,
      autorNome: currentUserLabel,
      autorEmail: currentUserEmail,
    })

    toast({
      title: 'Sugestão reativada',
      description: `O item ${itemCodigo} voltou para a lista de sugestões ativas.`,
    })

    await loadData()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Cabeçalho ModuleHeader Oficial do Produto */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Governança', href: '/conformidade' },
          { label: 'Planos de Ação' },
        ]}
        icon={ShieldAlert}
        title="Planos de Ação"
        badgeText="Melhoria Contínua"
        subtitle="Gestão de pendências, prazos e medidas corretivas decorrentes da verificação da serventia e da matriz de conformidade."
        serventiaNome={orgName}
        serventiaAtiva={organization?.status === 'ativa'}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadData}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/relatorios/planos-acao">
              <Button
                size="sm"
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Relatório A4</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* 2. Raio-X no Topo (Números Reais do Banco) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Planos em Aberto */}
        <KpiCard
          label="Planos em Aberto"
          value={raioX.abertos + raioX.emAndamento}
          icon={ShieldAlert}
          iconBgColor={raioX.abertos + raioX.emAndamento > 0 ? 'bg-amber-100' : 'bg-slate-100'}
          iconColor={raioX.abertos + raioX.emAndamento > 0 ? 'text-amber-700' : 'text-slate-700'}
          supportText={`${raioX.abertos} abertos • ${raioX.emAndamento} em andamento`}
          infoTooltip="Total de planos que exigem execução ativa ou monitoramento de prazos."
        />

        {/* KPI 2: Críticos / Alta Vencidos */}
        <KpiCard
          label="Críticos / Alta Vencidos"
          value={raioX.criticosAltaVencidos}
          icon={AlertTriangle}
          iconBgColor={raioX.criticosAltaVencidos > 0 ? 'bg-rose-100' : 'bg-emerald-100'}
          iconColor={raioX.criticosAltaVencidos > 0 ? 'text-rose-700' : 'text-emerald-700'}
          supportText={
            raioX.criticosAltaVencidos > 0
              ? 'Exigem intervenção imediata'
              : 'Nenhum plano crítico vencido'
          }
          infoTooltip="Planos de prioridade crítica ou alta com data-alvo anterior à data atual."
        />

        {/* KPI 3: Concluídos no Prazo vs Vencidos */}
        <KpiCard
          label="Concluídos no Prazo"
          value={raioX.concluidosNoPrazo}
          secondaryValue={`/ ${raioX.concluidos} concl.`}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-700"
          supportText={
            raioX.concluidosComAtraso > 0
              ? `${raioX.concluidosComAtraso} concluído(s) com atraso`
              : '100% no prazo acordado'
          }
          infoTooltip="Eficácia temporal de encerramento das medidas corretivas."
        />

        {/* KPI 4: Média de Dias em Aberto */}
        <KpiCard
          label="Média de Dias em Aberto"
          value={raioX.mediaDiasEmAberto}
          unit="dias"
          icon={Clock}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-700"
          supportText={`Sugestões pendentes: ${raioX.sugestoesMatrizPendentes}`}
          infoTooltip="Tempo médio decorrido desde a abertura até a resolução ou data atual."
        />
      </div>

      {/* 3. Barra de Abas Estilo Container Branco Arredondado */}
      <PlanoAcaoTabStrip
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        totalPlanos={planos.length}
        totalSugestoes={raioX.sugestoesMatrizPendentes}
        totalHistorico={historico.length}
      />

      {/* 4. Conteúdo da Aba Ativa */}
      {activeTab === 'planos' && (
        <PlanosListaTab
          planos={planos}
          canEdit={canEdit}
          onEditPlano={(p) => {
            setPlanoEmEdicao(p)
            setModalFormOpen(true)
          }}
          onUpdateStatus={handleQuickStatusChange}
          onOpenNovoPlano={() => {
            setPlanoEmEdicao(null)
            setModalFormOpen(true)
          }}
        />
      )}

      {activeTab === 'sugestoes' && (
        <SugestoesMatrizTab
          sugestoes={sugestoes}
          people={people}
          canEdit={canEdit}
          onTransformar={handleTransformarSugestao}
          onDispensar={handleDispensarSugestao}
          onReativar={handleReativarSugestao}
        />
      )}

      {activeTab === 'historico' && <PlanosHistoricoTab historico={historico} />}

      {/* 5. Modal de Criação / Edição */}
      <PlanoAcaoFormModal
        open={modalFormOpen}
        onClose={() => {
          setModalFormOpen(false)
          setPlanoEmEdicao(null)
        }}
        plano={planoEmEdicao}
        people={people}
        onSubmit={handleSavePlano}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

export default PlanosAcaoPage
