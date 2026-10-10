import React from 'react'
import { Link } from 'react-router-dom'
import {
  Wand2,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Building2,
  FolderTree,
  Briefcase,
  Users,
  Shield,
  MapPin,
  Puzzle,
  Palette,
  UserCheck,
  FileText,
  Clock,
  History,
  AlertTriangle,
  Building,
  LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
} from '@/types/cscti'

export interface ConfigSectionCardItem {
  id: string
  title: string
  description: string
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
  isConfigured: boolean
  statusLabel?: string
  targetTab: string
  targetSubSection?: string
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
  lastAuditLog,
  onNavigateTab,
  isAdmin,
}) => {
  // 1. Verificações reais de configuração
  const isBasicConfigured = Boolean(
    organization?.name && organization?.corporate_name && organization?.cnpj,
  )
  const isTypeConfigured = Boolean(organization?.type)
  const isServicesConfigured = Boolean(organization?.services && organization.services.length > 0)
  const isPeopleConfigured = people.length > 0
  const isRolesConfigured = assignments.some((a) => a.status === 'ativo')
  const isLocationConfigured = Boolean(
    organization?.zip_code && organization?.street && organization?.city,
  )

  // Seções adicionais reais
  const isIntegrationsConfigured = Boolean(
    (integrations?.glpi?.enabled && integrations?.glpi?.glpi_url) ||
    (integrations?.email?.enabled &&
      integrations?.email?.email_host &&
      integrations?.email?.email_user),
  )
  const isCatalogsConfigured = types.length > 0 && services.length > 0
  const isVisualIdentityConfigured = Boolean(
    organization?.app_product_name ||
    organization?.app_header_title ||
    organization?.app_institutional_text,
  )
  const isUsersConfigured = users.length > 0

  // 6 itens centrais do Assistente Institucional (conforme o esboço de validação dos 6 itens)
  const assistantSteps: ConfigSectionCardItem[] = [
    {
      id: 'dados-basicos',
      title: 'Dados Básicos da Serventia',
      description: 'Razão social, CNPJ, endereço, contato institucional e enquadramento.',
      icon: Building2,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      isConfigured: isBasicConfigured,
      targetTab: 'organizacao',
      targetSubSection: 'basicos',
    },
    {
      id: 'tipo-serventia',
      title: 'Tipo de Serventia',
      description: 'Enquadramento, atribuição cartorial e competências.',
      icon: FolderTree,
      iconBgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      isConfigured: isTypeConfigured,
      targetTab: 'organizacao',
      targetSubSection: 'tipo',
    },
    {
      id: 'servicos-institucionais',
      title: 'Serviços Institucionais',
      description: 'Atos e atribuições notariais/registrais prestados.',
      icon: Briefcase,
      iconBgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      isConfigured: isServicesConfigured,
      targetTab: 'organizacao',
      targetSubSection: 'servicos',
    },
    {
      id: 'pessoas-colaboradores',
      title: 'Pessoas e Colaboradores',
      description: 'Equipe, delegatário, substitutos e responsáveis.',
      icon: Users,
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      isConfigured: isPeopleConfigured,
      targetTab: 'papeis',
      targetSubSection: 'pessoas',
    },
    {
      id: 'papeis-responsabilidades',
      title: 'Papéis e Responsabilidades',
      description: 'Designação e vigência das responsabilidades da serventia.',
      icon: Shield,
      iconBgColor: 'bg-rose-100',
      iconColor: 'text-rose-600',
      isConfigured: isRolesConfigured,
      targetTab: 'papeis',
      targetSubSection: 'atribuicoes',
    },
    {
      id: 'localizacao-sede',
      title: 'Localização da Sede',
      description: 'Endereço físico completo e informações de localização.',
      icon: MapPin,
      iconBgColor: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      isConfigured: isLocationConfigured,
      targetTab: 'organizacao',
      targetSubSection: 'localizacao',
    },
  ]

  // Seções complementares existentes no sistema (preserva todas as 11 seções sem perder nada)
  const additionalSections: ConfigSectionCardItem[] = [
    {
      id: 'integracoes-tecnicas',
      title: 'Integrações Técnicas',
      description: 'Conectores GLPI para ativos e caixa IMAP para comprovantes de backup.',
      icon: Puzzle,
      iconBgColor: 'bg-violet-100',
      iconColor: 'text-violet-600',
      isConfigured: isIntegrationsConfigured,
      targetTab: 'integracoes',
    },
    {
      id: 'catalogos-tabelas',
      title: 'Catálogos & Tabelas',
      description: 'Cadastro de naturezas cartoriais e atos notariais/registrais.',
      icon: Building,
      iconBgColor: 'bg-sky-100',
      iconColor: 'text-sky-600',
      isConfigured: isCatalogsConfigured,
      targetTab: 'catalogos',
    },
    {
      id: 'identidade-visual',
      title: 'Identidade Visual & Rótulos',
      description: 'Personalização do nome do produto, logotipo e textos do cabeçalho.',
      icon: Palette,
      iconBgColor: 'bg-fuchsia-100',
      iconColor: 'text-fuchsia-600',
      isConfigured: isVisualIdentityConfigured,
      targetTab: 'identidade',
    },
  ]

  if (isAdmin) {
    additionalSections.push({
      id: 'usuarios-acessos',
      title: 'Usuários e Controle de Acesso',
      description: 'Gestão de operadores, permissões administrativas e auditoria de login.',
      icon: UserCheck,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-700',
      isConfigured: isUsersConfigured,
      targetTab: 'usuarios',
    })
  }

  // Estatísticas do Assistente Central (os 6 passos estruturais do banner e do donut)
  const totalAssistantSteps = assistantSteps.length
  const configuredAssistantCount = assistantSteps.filter((s) => s.isConfigured).length
  const pendingAssistantCount = totalAssistantSteps - configuredAssistantCount
  const notConfiguredAssistantCount = 0 // dentro dos 6 itens, se não configurado é pendente
  const assistantPercent = Math.round((configuredAssistantCount / totalAssistantSteps) * 100)

  // Próximo passo pendente para o botão do banner "Revisar Configuração >"
  const firstPendingStep = assistantSteps.find((s) => !s.isConfigured) || assistantSteps[0]

  // Dados para o Donut
  const donutData: DonutSegment[] = [
    { label: 'Configurados', value: configuredAssistantCount, color: '#10B981' },
    { label: 'Pendentes', value: pendingAssistantCount, color: '#F59E0B' },
  ]
  if (notConfiguredAssistantCount > 0) {
    donutData.push({
      label: 'Não configurados',
      value: notConfiguredAssistantCount,
      color: '#EF4444',
    })
  }

  // Obter tipo de serventia selecionado da lista de tipos
  const selectedTypeItem = types.find((t) => t.id === organization?.type)
  const tipoFormatado = selectedTypeItem
    ? `${selectedTypeItem.name} (${selectedTypeItem.code})`
    : organization?.provimento_class
      ? `Classe ${organization.provimento_class} • Subclasse ${organization.provimento_subclass || 'D'}`
      : 'Não definido'

  // Auditoria real
  const lastAuditDate = lastAuditLog?.created
    ? formatDateTime(lastAuditLog.created)
    : organization?.updated
      ? formatDateTime(organization.updated)
      : 'Não registrada'

  const lastAuditUser = lastAuditLog?.user_name || lastAuditLog?.user_email || 'Configuração manual'
  const lastAuditOrigin = lastAuditLog?.action
    ? lastAuditLog.action.replace(/_/g, ' ')
    : 'Configuração manual'

  return (
    <div className="space-y-6">
      {/* 1. BANNER DESTAQUE: ASSISTENTE DE CONFIGURAÇÃO INSTITUCIONAL (Conforme Esboço) */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-[#F4FBF7] p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Lado Esquerdo: Ícone em círculo + Título e Subtítulo */}
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
              <Wand2 className="w-6 h-6 text-blue-600" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Assistente de Configuração Institucional
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Validador real do cumprimento dos requisitos estruturais da serventia para
                conformidade institucional.
              </p>
            </div>
          </div>

          {/* Lado Direito: Pílula de Progresso + Botão Revisar Configuração */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full border border-emerald-300 text-xs font-bold text-emerald-800 shadow-2xs">
              <span>
                {configuredAssistantCount} de {totalAssistantSteps} itens configurados (
                {assistantPercent}%)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>

            <Button
              onClick={() =>
                onNavigateTab(firstPendingStep.targetTab, firstPendingStep.targetSubSection)
              }
              className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 font-semibold text-xs h-9 px-4 rounded-xl shadow-2xs group cursor-pointer"
            >
              <span>Revisar Configuração</span>
              <ChevronRight className="w-4 h-4 ml-1 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Barra de Progresso Verde Sólida */}
        <div className="mt-4 pt-1">
          <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${assistantPercent}%` }}
              role="progressbar"
              aria-valuenow={assistantPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* 2. GRID 2 COLUNAS DE CARDS DE SEÇÃO (Conforme Esboço: 6 Centrais) */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assistantSteps.map((step) => {
            const Icon = step.icon
            return (
              <Card
                key={step.id}
                onClick={() => onNavigateTab(step.targetTab, step.targetSubSection)}
                className="group relative border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white rounded-2xl cursor-pointer overflow-hidden select-none"
              >
                <CardContent className="p-5 flex items-start gap-4">
                  {/* Ícone em Círculo Colorido Pastel */}
                  <div
                    className={`w-12 h-12 rounded-full ${step.iconBgColor} ${step.iconColor} flex items-center justify-center shrink-0 border border-white shadow-2xs transition-transform group-hover:scale-105`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
                        {step.title}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Rodapé do Card: Badge de Status Real à esquerda + Botão "Revisar ->" à direita */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {step.isConfigured ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Configurado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Pendente
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigateTab(step.targetTab, step.targetSubSection)
                        }}
                        className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 group/btn cursor-pointer"
                      >
                        <span>{step.isConfigured ? 'Revisar' : 'Configurar'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 2.1 SEÇÕES COMPLEMENTARES EXISTENTES (Integrações, Catálogos, Identidade, Usuários) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Módulos Complementares e Integrações
            </h3>
            <p className="text-[11px] text-slate-400">
              Conectores externos, governança de catálogos e controle de acesso institucional.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {additionalSections.map((step) => {
            const Icon = step.icon
            return (
              <Card
                key={step.id}
                onClick={() => onNavigateTab(step.targetTab)}
                className="group relative border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all bg-white rounded-xl cursor-pointer p-4 select-none"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${step.iconBgColor} ${step.iconColor} flex items-center justify-center shrink-0 border border-slate-100 shadow-2xs`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  {step.isConfigured ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Pendente
                    </span>
                  )}
                  <span className="text-xs font-semibold text-blue-600 flex items-center group-hover:underline">
                    Acessar <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 3. RODAPÉ EM 3 PAINÉIS (PanelHeader Padrão CSCTI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Painel 1: Identificação da Serventia */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden flex flex-col">
          <PanelHeader
            title="Identificação da Serventia"
            subtitle="Cadastro ativo no sistema"
            icon={Building2}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-700"
          />
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Nome</span>
                <span
                  className="font-bold text-slate-800 text-right truncate max-w-[200px]"
                  title={organization?.name}
                >
                  {organization?.name || 'Não informado'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">CNPJ</span>
                <span className="font-mono font-semibold text-slate-800 text-right">
                  {organization?.cnpj || 'Não informado'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Tipo</span>
                <span
                  className="font-semibold text-slate-800 text-right truncate max-w-[200px]"
                  title={tipoFormatado}
                >
                  {organization?.provimento_class
                    ? `Classe ${organization.provimento_class} • Subclasse ${organization.provimento_subclass || 'D'}`
                    : tipoFormatado}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Sede / Comarca</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">
                  {organization?.city && organization?.state
                    ? `${organization.city}/${organization.state}`
                    : 'Não informado'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Dados da organização</span>
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

        {/* Painel 2: Status da Configuração com Donut % Central */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden flex flex-col">
          <PanelHeader
            title="Status da Configuração"
            subtitle="Aderência aos requisitos estruturais"
            icon={Wand2}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-700"
          />
          <CardContent className="p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-4">
              {/* Donut com percentual central */}
              <div className="shrink-0">
                <SvgDonutChart
                  data={donutData}
                  totalLabel={`${assistantPercent}%`}
                  subLabel={`${configuredAssistantCount} de ${totalAssistantSteps} itens`}
                  size={120}
                  strokeWidth={14}
                />
              </div>

              {/* Legenda com contagens alinhadas à direita sem corte (padrão Backup homologado) */}
              <div className="flex-1 space-y-2.5 text-xs min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 truncate font-medium">Configurados</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {configuredAssistantCount}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-slate-600 truncate font-medium">Pendentes</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {pendingAssistantCount}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-slate-600 truncate font-medium">Não configurados</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {notConfiguredAssistantCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Critério: 6 itens essenciais</span>
              <span className="font-semibold text-slate-700">
                {configuredAssistantCount === 6
                  ? 'Totalmente em conformidade'
                  : 'Em processo de cadastro'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Painel 3: Última Atualização e Auditoria */}
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden flex flex-col">
          <PanelHeader
            title="Última Atualização"
            subtitle="Auditoria e rastreabilidade"
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
                  <span>Ver histórico</span>
                </Link>
              </Button>
            }
          />
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Data</span>
                <span className="font-mono font-semibold text-slate-800 text-right">
                  {lastAuditDate}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Usuário</span>
                <span
                  className="font-semibold text-slate-800 text-right truncate max-w-[200px]"
                  title={lastAuditUser}
                >
                  {lastAuditUser}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Origem</span>
                <span
                  className="font-semibold text-slate-800 text-right truncate max-w-[200px]"
                  title={lastAuditOrigin}
                >
                  {lastAuditOrigin}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Rastreabilidade</span>
                <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  Trilha ativa
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Trilha de eventos</span>
              <Link
                to="/auditoria"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                Log de auditoria <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConfigOverviewTab
