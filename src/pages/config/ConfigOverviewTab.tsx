import React from 'react'
import { Link } from 'react-router-dom'
import {
  Wand2,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Building2,
  Users,
  Shield,
  Palette,
  UserCheck,
  Clock,
  History,
  AlertTriangle,
  Building,
  LucideIcon,
  FileCheck2,
  Puzzle,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PanelHeader } from '@/components/common/PanelHeader'
import { SvgDonutChart, DonutSegment } from '@/components/backup/BackupPreviewCharts'
import { formatDateTime } from '@/lib/dateTime'
import type {
  OrganizationItem,
  AuditLogItem,
  OrganizationTypeItem,
  InstitutionalServiceItem,
  PersonItem,
  RoleItem,
  AssignmentItem,
  UserItem,
  IntegrationItem,
  PapelDesignadoItem,
  DesignacaoItem,
} from '@/types/cscti'

export interface WizardStepItem {
  number: number
  id: string
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
  isCompleted: boolean
  statusBadge: string
  targetTab: string
  targetSubSection?: string
  statDetail?: string
}

export interface ConfigOverviewTabProps {
  organization: OrganizationItem
  types: OrganizationTypeItem[]
  services: InstitutionalServiceItem[]
  people: PersonItem[]
  roles: RoleItem[]
  assignments: AssignmentItem[]
  users: UserItem[]
  integrations: {
    glpi: IntegrationItem | null
    email: IntegrationItem | null
  }
  papeisDesignados?: PapelDesignadoItem[]
  designacoes?: DesignacaoItem[]
  lastAuditLog: AuditLogItem | null
  onNavigateTab: (tabId: string, subSection?: string) => void
  isAdmin: boolean
}

export const ConfigOverviewTab: React.FC<ConfigOverviewTabProps> = ({
  organization,
  types,
  services,
  people,
  roles,
  assignments,
  users,
  integrations,
  papeisDesignados = [],
  designacoes = [],
  lastAuditLog,
  onNavigateTab,
  isAdmin,
}) => {
  // 1. DADOS REAIS DE CONCLUSAO PARA AS 7 ETAPAS DO GUIA PASSO A PASSO
  // Etapa 1: Dados da Serventia (Nome, CNPJ, Razão Social e Endereço)
  const isStep1Done = Boolean(
    organization?.name &&
    organization?.corporate_name &&
    organization?.cnpj &&
    (organization?.city || organization?.street),
  )

  // Etapa 2: Pessoas / Colaboradores (Ao menos uma pessoa física cadastrada)
  const isStep2Done = people.length > 0

  // Etapa 3: Designações e Termos (Todos os papéis obrigatórios cadastrados e assinados)
  const papeisObrigatorios = papeisDesignados.filter((p) => p.e_obrigatorio)
  const assinadasObrigatoriasCount = papeisObrigatorios.filter((p) => {
    return designacoes.some(
      (d) =>
        d.papel_designado === p.id &&
        (d.status === 'assinada_fisica' || d.status === 'assinada_digital'),
    )
  }).length
  const isStep3Done =
    papeisObrigatorios.length > 0 && assinadasObrigatoriasCount >= papeisObrigatorios.length

  // Etapa 4: Catálogos e Serviços (Tipos e Serviços cadastrados e vinculados)
  const isStep4Done = Boolean(
    types.length > 0 &&
    services.length > 0 &&
    organization?.type &&
    organization?.services &&
    organization.services.length > 0,
  )

  // Etapa 5: Integrações Técnicas (Ao menos GLPI ou IMAP configurado e ativo)
  const isStep5Done = Boolean(
    (integrations?.glpi?.enabled && integrations?.glpi?.glpi_url) ||
    (integrations?.email?.enabled &&
      integrations?.email?.email_host &&
      integrations?.email?.email_user),
  )

  // Etapa 6: Identidade Visual (Nome do produto / título institucional definidos)
  const isStep6Done = Boolean(
    organization?.app_product_name ||
    organization?.app_header_title ||
    organization?.app_institutional_text,
  )

  // Etapa 7: Usuários e Acessos (Usuários cadastrados no sistema além do padrão)
  const isStep7Done = users.length > 0

  // LISTA DAS 7 ETAPAS NUMERADAS REAIS DO ASSISTENTE
  const wizardSteps: WizardStepItem[] = [
    {
      number: 1,
      id: 'step-1-org',
      title: 'Dados da Serventia',
      subtitle: 'Cadastro institucional e enquadramento',
      description: 'Razão social, CNPJ, comarca, endereço da sede e telefones oficiais.',
      icon: Building2,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-700',
      isCompleted: isStep1Done,
      statusBadge: isStep1Done ? 'Identificação completa' : 'Pendente de dados básicos',
      targetTab: 'organizacao',
      statDetail: organization?.cnpj ? `CNPJ: ${organization.cnpj}` : 'CNPJ pendente',
    },
    {
      number: 2,
      id: 'step-2-pessoas',
      title: 'Pessoas e Colaboradores',
      subtitle: 'Quadro funcional da serventia',
      description: 'Cadastre os membros da equipe e colaboradores que assumirão papéis formais.',
      icon: Users,
      iconBgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-700',
      isCompleted: isStep2Done,
      statusBadge: isStep2Done
        ? `${people.length} colaborador(es) ativo(s)`
        : 'Nenhum colaborador cadastrado',
      targetTab: 'papeis',
      targetSubSection: 'colaboradores',
      statDetail: `${people.length} pessoa(s)`,
    },
    {
      number: 3,
      id: 'step-3-termos',
      title: 'Designações e Termos Jurídicos',
      subtitle: 'Atribuições com validade formal',
      description:
        'Vincule as pessoas aos papéis obrigatórios, gere os termos institucionalizados e anexe os comprovantes assinados.',
      icon: FileCheck2,
      iconBgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-700',
      isCompleted: isStep3Done,
      statusBadge: isStep3Done
        ? `${assinadasObrigatoriasCount}/${papeisObrigatorios.length} obrigatórias assinadas`
        : `${assinadasObrigatoriasCount}/${papeisObrigatorios.length} obrigatórias assinadas`,
      targetTab: 'papeis',
      targetSubSection: 'cards',
      statDetail:
        papeisObrigatorios.length > 0
          ? `${Math.round((assinadasObrigatoriasCount / papeisObrigatorios.length) * 100)}% de conformidade`
          : '0%',
    },
    {
      number: 4,
      id: 'step-4-catalogos',
      title: 'Catálogos & Atos Notariais/Registrais',
      subtitle: 'Natureza da serventia e competências',
      description:
        'Defina a classe, tipos de atos praticados e serviços oferecidos pela serventia.',
      icon: Building,
      iconBgColor: 'bg-sky-100',
      iconColor: 'text-sky-700',
      isCompleted: isStep4Done,
      statusBadge: isStep4Done ? 'Enquadramento completo' : 'Vínculos pendentes',
      targetTab: 'catalogos',
      statDetail: `${types.length} tipos · ${services.length} serviços`,
    },
    {
      number: 5,
      id: 'step-5-integracoes',
      title: 'Integrações GLPI e IMAP',
      subtitle: 'Conectores automáticos de inventário e backup',
      description:
        'Conecte a caixa postal de recebimento de comprovantes e o sistema de inventário técnico.',
      icon: Puzzle,
      iconBgColor: 'bg-violet-100',
      iconColor: 'text-violet-700',
      isCompleted: isStep5Done,
      statusBadge: isStep5Done ? 'Conector configurado' : 'Nenhum conector ativo',
      targetTab: 'integracoes',
      statDetail: integrations?.email?.enabled ? 'IMAP Ativo' : 'Pendente',
    },
    {
      number: 6,
      id: 'step-6-identidade',
      title: 'Identidade Visual Institucional',
      subtitle: 'Customização de telas e cabeçalhos',
      description:
        'Personalize o nome da serventia nos relatórios, logomarca oficial e textos institucionais.',
      icon: Palette,
      iconBgColor: 'bg-fuchsia-100',
      iconColor: 'text-fuchsia-700',
      isCompleted: isStep6Done,
      statusBadge: isStep6Done ? 'Identidade definida' : 'Padrão do sistema',
      targetTab: 'identidade',
      statDetail: organization?.app_header_title || 'Padrão CSCTI',
    },
    {
      number: 7,
      id: 'step-7-usuarios',
      title: 'Usuários e Controle de Acessos',
      subtitle: 'Perfis de Administrador, Suporte e Usuário',
      description:
        'Cadastre operadores, defina privilégios de escrita ou apenas visualização e audite logins.',
      icon: UserCheck,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-800',
      isCompleted: isStep7Done,
      statusBadge: isStep7Done ? `${users.length} usuário(s)` : 'Apenas master ativo',
      targetTab: 'usuarios',
      statDetail: `${users.length} usuário(s)`,
    },
  ]

  // Contadores e métricas reais
  const totalSteps = wizardSteps.length
  const completedStepsCount = wizardSteps.filter((s) => s.isCompleted).length
  const pendingStepsCount = totalSteps - completedStepsCount
  const completionPercent = Math.round((completedStepsCount / totalSteps) * 100)

  // Identificar a primeira etapa pendente para "Continuar de onde parei"
  const nextPendingStep = wizardSteps.find((s) => !s.isCompleted) || wizardSteps[0]

  // Dados do gráfico Donut
  const donutData: DonutSegment[] = [
    { label: 'Concluídas', value: completedStepsCount, color: '#10B981' },
    { label: 'Pendentes', value: pendingStepsCount, color: '#F59E0B' },
  ]

  // Enquadramento e tipo da serventia
  const selectedTypeItem = types.find((t) => t.id === organization?.type)
  const tipoFormatado = selectedTypeItem
    ? `${selectedTypeItem.name} (${selectedTypeItem.code})`
    : organization?.provimento_class
      ? `Classe ${organization.provimento_class} • Subclasse ${organization.provimento_subclass || 'D'}`
      : 'Não definido'

  // Auditoria
  const lastAuditDate = lastAuditLog?.created
    ? formatDateTime(lastAuditLog.created)
    : organization?.updated
      ? formatDateTime(organization.updated)
      : 'Não registrada'
  const lastAuditUser =
    lastAuditLog?.user_name || lastAuditLog?.user_email || 'Configuração institucional'

  return (
    <div className="space-y-6">
      {/* 1. BANNER PRINCIPAL DO ASSISTENTE: GUIA PASSO A PASSO (7 ETAPAS REAIS) */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#124E78] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Wand2 className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Assistente de Implantação da Serventia
                </h2>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]"
                >
                  {completedStepsCount === totalSteps
                    ? '100% PRONTO PARA AUDITORIA'
                    : 'EM ANDAMENTO'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                Guia progressivo para deixar a serventia totalmente pronta e em conformidade
                técnica. Siga as 7 etapas numeradas para registrar pessoas, gerar os termos formais
                e vincular evidências comprobatórias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 bg-white/95 px-3.5 py-2 rounded-xl border border-blue-200 text-xs font-bold text-slate-800 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {completedStepsCount} de {totalSteps} etapas concluídas ({completionPercent}%)
              </span>
            </div>

            <Button
              onClick={() =>
                onNavigateTab(nextPendingStep.targetTab, nextPendingStep.targetSubSection)
              }
              className="bg-[#0B2545] hover:bg-[#124E78] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs gap-2 group cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {completedStepsCount === totalSteps
                  ? 'Revisar Todas as Etapas'
                  : `Continuar: Etapa ${nextPendingStep.number}`}
              </span>
              <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Barra de Progresso Real */}
        <div className="mt-4 pt-1">
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercent}%` }}
              role="progressbar"
              aria-valuenow={completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* 2. GRID DAS 7 ETAPAS NUMERADAS REAIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Etapas Estruturais da Serventia (1 a 7)
            </h3>
            <p className="text-[11px] text-slate-500">
              Clique em qualquer etapa para acessar diretamente sua área de configuração ou
              continuar o cadastro.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wizardSteps.map((step) => {
            const Icon = step.icon
            return (
              <Card
                key={step.id}
                onClick={() => onNavigateTab(step.targetTab, step.targetSubSection)}
                className={`group relative border transition-all duration-200 bg-white rounded-xl cursor-pointer overflow-hidden select-none flex flex-col justify-between ${
                  step.isCompleted
                    ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-xs'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Número da Etapa em Destaque */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm border shadow-2xs ${
                        step.isCompleted
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {step.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.number}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Etapa {step.number}
                        </span>
                        {step.isCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Concluída
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Pendente
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight mt-0.5">
                        {step.title}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 line-clamp-1 mt-0.5">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {step.description}
                  </p>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-mono text-slate-500 truncate max-w-[170px]">
                      {step.statDetail}
                    </span>

                    <span className="text-xs font-semibold text-blue-600 inline-flex items-center group-hover:translate-x-0.5 transition-transform">
                      {step.isCompleted ? 'Revisar' : 'Configurar'}
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 3. PAINÉIS DE APOIO: IDENTIFICAÇÃO + STATUS COM DONUT + AUDITORIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Painel 1: Identificação da Serventia */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden flex flex-col">
          <PanelHeader
            title="Identificação da Serventia"
            subtitle="Cadastro institucional ativo"
            icon={Building2}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-700"
          />
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Nome</span>
                <span
                  className="font-bold text-slate-900 text-right truncate max-w-[190px]"
                  title={organization?.name}
                >
                  {organization?.name || 'Não informado'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">CNPJ</span>
                <span className="font-mono font-semibold text-slate-900 text-right">
                  {organization?.cnpj || 'Não informado'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Enquadramento</span>
                <span
                  className="font-semibold text-slate-800 text-right truncate max-w-[190px]"
                  title={tipoFormatado}
                >
                  {tipoFormatado}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Sede / Comarca</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[190px]">
                  {organization?.city && organization?.state
                    ? `${organization.city}/${organization.state}`
                    : 'Não informado'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Etapa 1 do Assistente</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('organizacao')}
                className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 cursor-pointer"
              >
                Editar dados <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Painel 2: Status Geral com Donut */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden flex flex-col">
          <PanelHeader
            title="Aderência da Serventia"
            subtitle="7 etapas de conformidade"
            icon={Wand2}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-700"
          />
          <CardContent className="p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-4">
              <div className="shrink-0">
                <SvgDonutChart
                  data={donutData}
                  totalLabel={`${completionPercent}%`}
                  subLabel={`${completedStepsCount} de ${totalSteps}`}
                  size={120}
                  strokeWidth={14}
                />
              </div>

              <div className="flex-1 space-y-2.5 text-xs min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 truncate font-medium">Etapas Prontas</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {completedStepsCount}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-slate-600 truncate font-medium">Pendentes</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {pendingStepsCount}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-slate-500 text-[11px]">Papéis Assinados:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {assinadasObrigatoriasCount}/{papeisObrigatorios.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Critério: 7 etapas no banco</span>
              <span className="font-semibold text-slate-700">
                {completedStepsCount === totalSteps ? 'Pronta para auditoria' : 'Em configuração'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Painel 3: Trilha de Auditoria Append-Only */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden flex flex-col">
          <PanelHeader
            title="Última Atualização"
            subtitle="Rastreabilidade e auditoria"
            icon={Clock}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-700"
            action={
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 text-xs font-semibold text-blue-700 hover:text-blue-800 border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-lg"
              >
                <Link to="/auditoria" className="inline-flex items-center gap-1">
                  <History className="w-3.5 h-3.5" />
                  <span>Histórico</span>
                </Link>
              </Button>
            }
          />
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Data/Hora</span>
                <span className="font-mono font-semibold text-slate-900 text-right">
                  {lastAuditDate}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Operador</span>
                <span
                  className="font-semibold text-slate-900 text-right truncate max-w-[190px]"
                  title={lastAuditUser}
                >
                  {lastAuditUser}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Evento</span>
                <span
                  className="font-semibold text-slate-800 text-right truncate max-w-[190px]"
                  title={lastAuditLog?.action || 'Atualização'}
                >
                  {lastAuditLog?.action ? lastAuditLog.action.replace(/_/g, ' ') : 'Atualização'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Integridade</span>
                <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  SHA-256 / Append-only
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Trilha de eventos</span>
              <Link
                to="/auditoria"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                Log completo <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConfigOverviewTab
