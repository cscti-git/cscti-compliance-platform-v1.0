import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Settings, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { formatDateTime } from '@/lib/dateTime'

import {
  listOrganizationTypes,
  listInstitutionalServices,
  listPeople,
  listRoles,
  listAssignments,
  getIntegrations,
  listOrganizationUsers,
  listAuditLogs,
} from '@/services/csctiService'

import type {
  OrganizationTypeItem,
  InstitutionalServiceItem,
  PersonItem,
  RoleItem,
  AssignmentItem,
  IntegrationItem,
  UserItem,
  AuditLogItem,
} from '@/types/cscti'

import { ConfigOverviewTab } from './config/ConfigOverviewTab'
import { ConfigTabStrip } from './config/ConfigTabStrip'
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
  const [lastAuditLog, setLastAuditLog] = useState<AuditLogItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)

  const loadAllData = useCallback(
    async (isSilent = false) => {
      if (!organization?.id) return
      if (!isSilent) setIsLoading(true)
      setIsReloading(true)
      try {
        const [tList, sList, pList, rList, aList, intObj, auditList] = await Promise.all([
          listOrganizationTypes(),
          listInstitutionalServices(),
          listPeople(organization.id),
          listRoles(),
          listAssignments(organization.id),
          getIntegrations(organization.id),
          listAuditLogs(organization.id, 10).catch(() => [] as AuditLogItem[]),
        ])
        setTypes(tList)
        setServices(sList)
        setPeople(pList)
        setRoles(rList)
        setAssignments(aList)
        setIntegrations(intObj)

        // Identificar o evento de auditoria mais recente relevante para configurações/organização
        const relevantAudit =
          auditList.find((log) =>
            Boolean(
              log.action?.includes('CONFIG') ||
              log.action?.includes('ORG') ||
              log.action?.includes('INTEGRATION') ||
              log.entity?.toLowerCase().includes('configur') ||
              log.entity?.toLowerCase().includes('organiz'),
            ),
          ) ||
          auditList[0] ||
          null
        setLastAuditLog(relevantAudit)

        if (isAdmin) {
          const uList = await listOrganizationUsers(organization.id)
          setUsers(uList)
        }
      } catch (err) {
        console.error('Erro ao carregar dados de configurações:', err)
      } finally {
        setIsLoading(false)
        setIsReloading(false)
      }
    },
    [organization?.id, isAdmin],
  )

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val })
  }

  const handleNavigateFromOverview = (tabId: string) => {
    setSearchParams({ tab: tabId })
  }

  // Data/hora da última atualização (do cadastro da serventia ou auditoria real)
  const lastUpdatedDisplay = organization?.updated
    ? formatDateTime(organization.updated)
    : lastAuditLog?.created
      ? formatDateTime(lastAuditLog.created)
      : undefined

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO PADRONIZADO (ModuleHeader do layout alvo aprovado) */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Administração', href: '/configuracoes' },
          { label: 'Configurações' },
        ]}
        icon={Settings}
        title="Configurações da Serventia"
        subtitle="Gerenciamento completo dos dados cadastrais, estrutura de pessoas, papéis e integrações técnicas."
        serventiaNome={organization?.name || 'Serventia Conectada'}
        serventiaAtiva={organization?.status === 'ativa'}
        lastUpdated={lastUpdatedDisplay}
        loading={isReloading}
        onReload={() => loadAllData(true)}
        actions={
          <Button
            onClick={() =>
              handleTabChange(currentTab === 'visao-geral' ? 'organizacao' : 'visao-geral')
            }
            className="bg-[#1A56DB] hover:bg-[#1546AF] text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-2 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>
              {currentTab === 'visao-geral' ? 'Editar Configurações' : 'Voltar à Visão Geral'}
            </span>
          </Button>
        }
      />

      {/* 2. BARRA DE ABAS PADRONIZADA (Mesmo estilo de BackupTabStrip) */}
      <ConfigTabStrip
        activeTab={currentTab}
        onSelectTab={handleTabChange}
        isAdmin={isAdmin}
        counts={{
          people: people.length,
          catalogs: types.length + services.length,
          users: users.length,
        }}
      />

      {/* 3. CONTEÚDO DAS ABAS */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
          <span>Carregando dados estruturais da serventia...</span>
        </div>
      ) : (
        <div>
          {/* ABA 1: VISÃO GERAL (O novo design conforme o esboço aprovado pelo usuário) */}
          {currentTab === 'visao-geral' && organization && (
            <ConfigOverviewTab
              organization={organization}
              types={types}
              services={services}
              people={people}
              roles={roles}
              assignments={assignments}
              users={users}
              integrations={integrations}
              lastAuditLog={lastAuditLog}
              onNavigateTab={handleNavigateFromOverview}
              isAdmin={isAdmin}
            />
          )}

          {/* ABA 2: DADOS DA ORGANIZAÇÃO (Serventia + Localização + Enquadramento) */}
          {currentTab === 'organizacao' && organization && (
            <OrgDataTab
              organization={organization}
              types={types}
              services={services}
              onUpdated={async () => {
                await refreshOrganization()
                await loadAllData(true)
              }}
              readOnly={!isAdmin && !isSuporte}
            />
          )}

          {/* ABA 3: PAPÉIS & RESPONSÁVEIS (Pessoas + Papéis + Atribuições) */}
          {currentTab === 'papeis' && organization && (
            <PeopleRolesTab
              organizationId={organization.id}
              people={people}
              roles={roles}
              assignments={assignments}
              onRefresh={async () => {
                await loadAllData(true)
              }}
              readOnly={!isAdmin && !isSuporte}
            />
          )}

          {/* ABA 4: CATÁLOGOS (Tipos e Serviços) */}
          {currentTab === 'catalogos' && (
            <CatalogsTab
              types={types}
              services={services}
              onRefresh={async () => {
                await loadAllData(true)
              }}
              readOnly={!isAdmin}
            />
          )}

          {/* ABA 5: INTEGRAÇÕES (GLPI e E-mail IMAP de Backup) */}
          {currentTab === 'integracoes' && organization && (
            <IntegrationsTab
              organizationId={organization.id}
              glpi={integrations.glpi}
              email={integrations.email}
              onRefresh={async () => {
                await loadAllData(true)
              }}
              readOnly={!isAdmin && !isSuporte}
            />
          )}

          {/* ABA 6: IDENTIDADE VISUAL */}
          {currentTab === 'identidade' && organization && (
            <VisualIdentityTab
              organization={organization}
              onUpdated={async () => {
                await refreshOrganization()
                await loadAllData(true)
              }}
              readOnly={!isAdmin}
            />
          )}

          {/* ABA 7: USUÁRIOS E ACESSOS (Apenas Administrador) */}
          {currentTab === 'usuarios' && isAdmin && organization && user && (
            <UsersTab
              organizationId={organization.id}
              currentUserId={user.id}
              users={users}
              onRefresh={async () => {
                await loadAllData(true)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default SettingsPage
