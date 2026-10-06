import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  ShieldCheck,
  CheckCircle2,
  FolderGit2,
  Server,
  HardDriveDownload,
  AlertTriangle,
  Clock,
  ArrowRight,
  Building2,
  FileCheck2,
  Users,
  Settings,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ProtectionContinuityCard } from '@/components/backup/ProtectionContinuityCard'
import {
  listAssignments,
  listPeople,
  getIntegrations,
  listAuditLogs,
} from '@/services/csctiService'
import type { AuditLogItem } from '@/types/cscti'

export const Index: React.FC = () => {
  const { organization, user, role } = useAuth()
  const [peopleCount, setPeopleCount] = useState<number>(0)
  const [assignmentsCount, setAssignmentsCount] = useState<number>(0)
  const [glpiActive, setGlpiActive] = useState<boolean>(false)
  const [emailActive, setEmailActive] = useState<boolean>(false)
  const [recentAudits, setRecentAudits] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      if (!organization?.id) return
      try {
        const [people, assignments, ints, audits] = await Promise.all([
          listPeople(organization.id),
          listAssignments(organization.id),
          getIntegrations(organization.id),
          listAuditLogs(organization.id, 5),
        ])
        setPeopleCount(people.length)
        setAssignmentsCount(assignments.filter((a) => a.status === 'ativo').length)
        setGlpiActive(Boolean(ints.glpi?.enabled && ints.glpi.glpi_url))
        setEmailActive(Boolean(ints.email?.enabled && ints.email.email_host))
        setRecentAudits(audits)
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [organization?.id])

  // Calculation of Configuration completeness for the banner
  const hasBasicData = Boolean(organization?.corporate_name && organization?.cnpj)
  const hasType = Boolean(organization?.type)
  const hasServices = Boolean(organization?.services && organization.services.length > 0)
  const hasPeople = peopleCount > 0
  const hasAssignments = assignmentsCount > 0
  const hasAddress = Boolean(organization?.zip_code && organization?.street && organization?.city)

  const completedSteps = [
    hasBasicData,
    hasType,
    hasServices,
    hasPeople,
    hasAssignments,
    hasAddress,
  ].filter(Boolean).length

  const configProgress = Math.round((completedSteps / 6) * 100)

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas com Dados Reais do Cliente Cadastrado */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3C969] text-xs px-2.5 py-0.5 font-semibold">
              CSCTI - Compliance
            </Badge>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Cliente Ativo
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {organization?.name || 'Cliente CSCTI'}
            </h1>
            {organization?.corporate_name && organization.corporate_name !== organization.name && (
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Razão Social: {organization.corporate_name}
              </p>
            )}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Painel consolidado de governança, evidências comprobatórias e controles de tecnologia em
            conformidade com as normas do juízo competente.
          </p>

          {/* Dados Adicionais do Cliente Cadastrado */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
            {organization?.cnpj && (
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                <span className="text-slate-400">CNPJ:</span>
                <span className="font-mono font-semibold text-white">{organization.cnpj}</span>
              </span>
            )}
            {organization?.city && (
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                <span className="text-slate-400">Localidade:</span>
                <span className="font-semibold text-white">
                  {organization.city}
                  {organization.state ? `/${organization.state}` : ''}
                </span>
              </span>
            )}
            {organization?.contact_name && (
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                <span className="text-slate-400">Titular:</span>
                <span className="font-semibold text-white">{organization.contact_name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Card Resumo do Enquadramento */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 w-full sm:w-auto shrink-0 min-w-[240px]">
          <div className="flex items-center justify-between gap-4 text-xs text-slate-300 mb-2">
            <span>Enquadramento:</span>
            <span className="font-bold text-white uppercase">
              Classe {organization?.provimento_class || 'C2'} • Subclasse{' '}
              {organization?.provimento_subclass || 'D'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs text-slate-300 mb-2">
            <span>Prazo Etapa 1:</span>
            <span className="font-bold text-blue-300">
              {organization?.deadline_stage_1_days || 240} dias
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs text-slate-300">
            <span>Prazo Etapa 2:</span>
            <span className="font-bold text-blue-300">
              {organization?.deadline_stage_2_days || 240} dias
            </span>
          </div>
        </div>
      </div>

      {/* Assistente de Configuração — Progresso */}
      {completedSteps < 6 && (
        <Card className="border-blue-200 bg-blue-50/50 shadow-xs">
          <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-blue-950">
                  Assistente de Implantação da Serventia ({completedSteps} de 6 etapas concluídas)
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Complete os dados cadastrais, atribuições de papéis e conectores para garantir a
                conformidade institucional.
              </p>
              <div className="w-full max-w-md pt-1">
                <Progress value={configProgress} className="h-2 bg-blue-200" />
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-xs font-semibold shrink-0"
            >
              <Link to="/configuracoes">
                Continuar Configuração <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 4 Cards de Status Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Conformidade Normativa */}
        <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Conformidade
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            <div className="text-2xl font-bold text-slate-900">Em preparação</div>
            <p className="text-xs text-slate-500">
              Mapeamento de requisitos técnicos e controles em fase de parametrização.
            </p>
            <div className="pt-2">
              <Link
                to="/conformidade"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center"
              >
                Abrir módulo <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Central de Evidências */}
        <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Evidências & Auditoria
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            <div className="text-2xl font-bold text-slate-900">
              {recentAudits.length > 0 ? `${recentAudits.length} Registros` : 'Ativa'}
            </div>
            <p className="text-xs text-slate-500">
              Trilha de auditoria das operações e registros comprobatórios das configurações.
            </p>
            <div className="pt-2">
              <Link
                to="/auditoria"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center"
              >
                Ver auditoria <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Inventário de Ativos (GLPI) */}
        <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inventário de Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{glpiActive ? 'Conectado' : 'Pendente'}</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  glpiActive ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
            </div>
            <p className="text-xs text-slate-500">
              {glpiActive
                ? 'Conector GLPI ativo e preparado para sincronização.'
                : 'Conector GLPI requer validação das credenciais no painel.'}
            </p>
            <div className="pt-2">
              <Link
                to="/integracoes"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 inline-flex items-center"
              >
                Configurar conector <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Continuidade & Backup (IMAP) */}
        <Card className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Backup & Continuidade
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <HardDriveDownload className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{emailActive ? 'Configurado' : 'Pendente'}</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  emailActive ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
            </div>
            <p className="text-xs text-slate-500">
              {emailActive
                ? 'Recepção de e-mails de comprovação de backup configurada.'
                : 'Requer cadastro da caixa postal IMAP de backup.'}
            </p>
            <div className="pt-2">
              <Link
                to="/backup"
                className="text-xs font-semibold text-amber-600 hover:text-amber-800 inline-flex items-center"
              >
                Abrir módulo <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel de Proteção e Continuidade (Passo 2) */}
      {organization?.id && (
        <ProtectionContinuityCard organizationId={organization.id} userRole={role} />
      )}

      {/* Grid Duplo: Resumo Institucional e Trilha Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Estrutura Institucional da Serventia */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Estrutura Institucional e Atribuições
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pessoas responsáveis e papéis regimentais designados para a serventia.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to="/configuracoes?tab=papeis">
                  Gerenciar Pessoas <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Pessoas Cadastradas</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{peopleCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Colaboradores da serventia</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Atribuições Ativas</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{assignmentsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Papéis com vigência válida</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Serviços Institucionais</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {organization?.services?.length || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Atos notariais/registrais</p>
              </div>
            </div>

            {/* Informações de Localização */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Endereço da Serventia: </span>
                  <span>
                    {organization?.street
                      ? `${organization.street}, ${organization.number || 'S/N'} — ${organization.neighborhood || ''}, ${organization.city || ''}/${organization.state || ''}`
                      : 'Endereço ainda não preenchido nas configurações.'}
                  </span>
                </div>
              </div>
              <Button asChild variant="link" size="sm" className="text-xs text-blue-600 p-0 h-auto">
                <Link to="/configuracoes?tab=organizacao">Editar dados</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Coluna 3: Trilha de Auditoria Recente */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Auditoria Recente
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Últimas ações registradas
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-blue-600">
                <Link to="/auditoria">Ver tudo</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {recentAudits.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Nenhum evento registrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {recentAudits.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-slate-800 font-semibold truncate max-w-[170px]">
                        {item.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.created ? new Date(item.created).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2 text-[11px]">{item.detail}</p>
                    <p className="text-[10px] text-slate-400">
                      Por: {item.user_name || item.user_email || 'Sistema'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default Index
