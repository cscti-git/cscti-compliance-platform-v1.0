import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Building2,
  Users,
  Shield,
  FolderTree,
  UserCheck,
  Palette,
  Puzzle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import {
  listOrganizationTypes,
  listInstitutionalServices,
  listPeople,
  listRoles,
  listAssignments,
  getIntegrations,
  listOrganizationUsers,
} from '@/services/csctiService'

import type {
  OrganizationTypeItem,
  InstitutionalServiceItem,
  PersonItem,
  RoleItem,
  AssignmentItem,
  IntegrationItem,
  UserItem,
} from '@/types/cscti'

import { OrgDataTab } from './config/OrgDataTab'
import { PeopleRolesTab } from './config/PeopleRolesTab'
import { CatalogsTab } from './config/CatalogsTab'
import { UsersTab } from './config/UsersTab'
import { VisualIdentityTab } from './config/VisualIdentityTab'
import { IntegrationsTab } from './config/IntegrationsTab'

export const SettingsPage: React.FC = () => {
  const { organization, user, refreshOrganization, isAdmin, isSuporte } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentTab = searchParams.get('tab') || 'visao-geral'

  // Data states
  const [types, setTypes] = useState<OrganizationTypeItem[]>([])
  const [services, setServices] = useState<InstitutionalServiceItem[]>([])
  const [people, setPeople] = useState<PersonItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [integrations, setIntegrations] = useState<{
    glpi: IntegrationItem | null
    email: IntegrationItem | null
  }>({ glpi: null, email: null })
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAllData = async () => {
    if (!organization?.id) return
    setIsLoading(true)
    try {
      const [tList, sList, pList, rList, aList, intObj] = await Promise.all([
        listOrganizationTypes(),
        listInstitutionalServices(),
        listPeople(organization.id),
        listRoles(),
        listAssignments(organization.id),
        getIntegrations(organization.id),
      ])
      setTypes(tList)
      setServices(sList)
      setPeople(pList)
      setRoles(rList)
      setAssignments(aList)
      setIntegrations(intObj)

      if (isAdmin) {
        const uList = await listOrganizationUsers(organization.id)
        setUsers(uList)
      }
    } catch (err) {
      console.error('Erro ao carregar dados de configurações:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [organization?.id, isAdmin])

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val })
  }

  // 6 Checklist Items for the Real Assistant Validator
  const step1Basic = Boolean(
    organization?.name && organization?.corporate_name && organization?.cnpj,
  )
  const step2Type = Boolean(organization?.type)
  const step3Services = Boolean(organization?.services && organization.services.length > 0)
  const step4People = people.length > 0
  const step5Assignments = assignments.some((a) => a.status === 'ativo')
  const step6Location = Boolean(
    organization?.zip_code && organization?.street && organization?.city,
  )

  const wizardSteps = [
    {
      id: 'dados-basicos',
      title: 'Dados Básicos da Serventia',
      desc: 'Razão Social, CNPJ e contato institucional',
      isComplete: step1Basic,
      targetTab: 'organizacao',
      pendingMsg: 'Falta preencher Razão Social e CNPJ nos dados da empresa.',
    },
    {
      id: 'tipo',
      title: 'Tipo de Serventia',
      desc: 'Enquadramento e atribuição cartorial',
      isComplete: step2Type,
      targetTab: 'organizacao',
      pendingMsg: 'Selecione a natureza/tipo da serventia nos dados da empresa.',
    },
    {
      id: 'servicos',
      title: 'Serviços Institucionais',
      desc: 'Atos e atribuições notariais/registrais prestados',
      isComplete: step3Services,
      targetTab: 'organizacao',
      pendingMsg: 'Vincule ao menos um serviço institucional praticado pelo cartório.',
    },
    {
      id: 'pessoas',
      title: 'Pessoas e Colaboradores',
      desc: 'Equipe, delegatário e substitutos',
      isComplete: step4People,
      targetTab: 'papeis',
      pendingMsg: 'Cadastre ao menos um colaborador responsável na equipe.',
    },
    {
      id: 'papeis-resp',
      title: 'Papéis e Responsabilidades',
      desc: 'Vigência e designação regimental perante o CNJ',
      isComplete: step5Assignments,
      targetTab: 'papeis',
      pendingMsg: 'Falta atribuir ao menos uma responsabilidade institucional ativa.',
    },
    {
      id: 'localizacao',
      title: 'Localização da Sede',
      desc: 'Endereço físico completo da serventia',
      isComplete: step6Location,
      targetTab: 'organizacao',
      pendingMsg: 'Complete o CEP, logradouro e cidade nos dados de localização.',
    },
  ]

  const completedCount = wizardSteps.filter((s) => s.isComplete).length
  const progressPercent = Math.round((completedCount / 6) * 100)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Administração</span>
          <span>/</span>
          <span className="text-slate-800 font-medium">Configurações</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Configurações da Serventia
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerenciamento completo dos dados cadastrais, estrutura de pessoas, papéis e integrações
          técnicas.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-slate-200/80 p-1 rounded-xl flex flex-wrap gap-1 h-auto">
          <TabsTrigger
            value="visao-geral"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="organizacao"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            Dados da Organização
          </TabsTrigger>
          <TabsTrigger
            value="papeis"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            Papéis & Responsáveis
          </TabsTrigger>
          <TabsTrigger
            value="catalogos"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            Catálogos
          </TabsTrigger>
          <TabsTrigger
            value="integracoes"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            Integrações
          </TabsTrigger>
          <TabsTrigger
            value="identidade"
            className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            Identidade Visual
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="usuarios"
              className="text-xs py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              Usuários e Acessos
            </TabsTrigger>
          )}
        </TabsList>

        {/* ABA 1: VISÃO GERAL COM ASSISTENTE EM 6 PASSOS */}
        <TabsContent value="visao-geral" className="space-y-6">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Assistente de Configuração Institucional
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Validador real do cumprimento dos requisitos estruturais da serventia para
                    conformidade com o CNJ.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                    {completedCount} de 6 itens configurados ({progressPercent}%)
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-1">
                <Progress value={progressPercent} className="h-2.5 bg-slate-100" />
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wizardSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-xl border transition-all ${
                      step.isComplete
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            step.isComplete
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          {step.isComplete ? '✓' : idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                          {!step.isComplete && (
                            <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {step.pendingMsg}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTabChange(step.targetTab)}
                        className="text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 shrink-0"
                      >
                        {step.isComplete ? 'Revisar' : 'Configurar'}{' '}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Informações da Serventia Ativa */}
              {organization && (
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Serventia
                    </span>
                    <span className="font-bold text-slate-800">{organization.name}</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      CNPJ
                    </span>
                    <span className="font-mono text-slate-800">
                      {organization.cnpj || 'Não informado'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Enquadramento CNJ
                    </span>
                    <span className="font-bold text-blue-700">
                      Classe {organization.provimento_class || 'C2'} • Subclasse{' '}
                      {organization.provimento_subclass || 'D'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: DADOS DA ORGANIZAÇÃO (Serventia + Localização + Provimento) */}
        <TabsContent value="organizacao">
          {organization && (
            <OrgDataTab
              organization={organization}
              types={types}
              services={services}
              onUpdated={async () => {
                await refreshOrganization()
                await loadAllData()
              }}
              readOnly={!isAdmin && !isSuporte}
            />
          )}
        </TabsContent>

        {/* ABA 3: PAPÉIS & RESPONSÁVEIS (Pessoas + Papéis + Atribuições) */}
        <TabsContent value="papeis">
          {organization && (
            <PeopleRolesTab
              organizationId={organization.id}
              people={people}
              roles={roles}
              assignments={assignments}
              onRefresh={loadAllData}
              readOnly={!isAdmin && !isSuporte}
            />
          )}
        </TabsContent>

        {/* ABA 4: CATÁLOGOS (Tipos e Serviços) */}
        <TabsContent value="catalogos">
          <CatalogsTab
            types={types}
            services={services}
            onRefresh={loadAllData}
            readOnly={!isAdmin}
          />
        </TabsContent>

        {/* ABA 5: INTEGRAÇÕES (GLPI e E-mail de Backup - Fiel aos prints) */}
        <TabsContent value="integracoes">
          {organization && (
            <IntegrationsTab
              organizationId={organization.id}
              glpi={integrations.glpi}
              email={integrations.email}
              onRefresh={loadAllData}
              readOnly={!isAdmin && !isSuporte}
            />
          )}
        </TabsContent>

        {/* ABA 6: IDENTIDADE VISUAL */}
        <TabsContent value="identidade">
          {organization && (
            <VisualIdentityTab
              organization={organization}
              onUpdated={async () => {
                await refreshOrganization()
                await loadAllData()
              }}
              readOnly={!isAdmin}
            />
          )}
        </TabsContent>

        {/* ABA 7: USUÁRIOS E ACESSOS (Admin Only) */}
        {isAdmin && (
          <TabsContent value="usuarios">
            {organization && user && (
              <UsersTab
                organizationId={organization.id}
                currentUserId={user.id}
                users={users}
                onRefresh={loadAllData}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
export default SettingsPage
