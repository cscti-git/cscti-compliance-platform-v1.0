import pb from '@/lib/pocketbase/client'
import type {
  OrganizationItem,
  OrganizationTypeItem,
  InstitutionalServiceItem,
  PersonItem,
  RoleItem,
  AssignmentItem,
  IntegrationItem,
  AuditLogItem,
  UserItem,
  SystemRole,
  InventoryAssetItem,
  InventorySyncRunItem,
  SyncRunSummary,
} from '@/types/cscti'

// 1. Audit Log Helper
export async function logAudit(params: {
  action: string
  entity?: string
  detail?: string
  organizationId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const authUser = pb.authStore.record
    const orgId = params.organizationId || (authUser?.organization as string) || ''
    await pb.collection('audit_log').create({
      organization: orgId || null,
      user: authUser?.id || null,
      user_name: authUser?.name || authUser?.email || 'Sistema',
      user_email: authUser?.email || '',
      action: params.action,
      entity: params.entity || 'Sistema',
      detail: params.detail || '',
      metadata: params.metadata || {},
    })
  } catch (err) {
    console.warn('Falha ao gravar log de auditoria:', err)
  }
}

export async function listAuditLogs(orgId?: string, limit = 50): Promise<AuditLogItem[]> {
  try {
    const filter = orgId ? `organization = '${orgId}'` : ''
    const records = await pb.collection('audit_log').getList<AuditLogItem>(1, limit, {
      filter,
      sort: '-created',
    })
    return records.items
  } catch (err) {
    console.error('Erro ao listar audit_log:', err)
    return []
  }
}

// 2. Organizations
export async function getOrganizationById(id: string): Promise<OrganizationItem | null> {
  try {
    return await pb.collection('organizations').getOne<OrganizationItem>(id, {
      expand: 'type,services',
    })
  } catch (err) {
    console.error('Erro ao carregar organização:', err)
    return null
  }
}

export async function getCurrentUserOrganization(): Promise<OrganizationItem | null> {
  const authUser = pb.authStore.record
  if (!authUser?.organization) {
    // If admin has no org assigned, fetch the first available org
    try {
      const list = await pb.collection('organizations').getList<OrganizationItem>(1, 1, {
        expand: 'type,services',
      })
      return list.items[0] || null
    } catch {
      return null
    }
  }
  return getOrganizationById(authUser.organization as string)
}

export async function listOrganizations(): Promise<OrganizationItem[]> {
  try {
    const records = await pb.collection('organizations').getFullList<OrganizationItem>({
      sort: 'name',
      expand: 'type,services',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar organizações:', err)
    return []
  }
}

export async function updateOrganization(
  id: string,
  data: Partial<OrganizationItem>,
): Promise<OrganizationItem> {
  const updated = await pb.collection('organizations').update<OrganizationItem>(id, data)
  await logAudit({
    action: 'ORGANIZATION_UPDATE',
    entity: 'Organização',
    detail: `Atualização dos dados da organização ${data.name || id}`,
    organizationId: id,
    metadata: data as Record<string, unknown>,
  })
  return updated
}

// 3. Catalogs: Types and Services
export async function listOrganizationTypes(): Promise<OrganizationTypeItem[]> {
  try {
    return await pb.collection('organization_types').getFullList<OrganizationTypeItem>({
      sort: 'name',
    })
  } catch (err) {
    console.error('Erro ao listar tipos:', err)
    return []
  }
}

export async function saveOrganizationType(
  data: Partial<OrganizationTypeItem> & { name: string },
): Promise<OrganizationTypeItem> {
  const code =
    data.code?.trim() ||
    `TIPO-${data.name
      .substring(0, 8)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')}`
  let res: OrganizationTypeItem
  if (data.id) {
    res = await pb.collection('organization_types').update<OrganizationTypeItem>(data.id, {
      name: data.name,
      code,
      description: data.description || '',
      status: data.status || 'ativo',
    })
    await logAudit({
      action: 'ORG_TYPE_UPDATE',
      entity: 'Catálogo de Tipos',
      detail: `Tipo atualizado: ${res.name} (${res.code})`,
    })
  } else {
    res = await pb.collection('organization_types').create<OrganizationTypeItem>({
      name: data.name,
      code,
      description: data.description || '',
      status: data.status || 'ativo',
    })
    await logAudit({
      action: 'ORG_TYPE_CREATE',
      entity: 'Catálogo de Tipos',
      detail: `Novo tipo cadastrado: ${res.name} (${res.code})`,
    })
  }
  return res
}

export async function deleteOrganizationType(id: string): Promise<void> {
  await pb.collection('organization_types').delete(id)
  await logAudit({
    action: 'ORG_TYPE_DELETE',
    entity: 'Catálogo de Tipos',
    detail: `Tipo excluído (id: ${id})`,
  })
}

export async function listInstitutionalServices(): Promise<InstitutionalServiceItem[]> {
  try {
    return await pb.collection('institutional_services').getFullList<InstitutionalServiceItem>({
      sort: 'name',
    })
  } catch (err) {
    console.error('Erro ao listar serviços:', err)
    return []
  }
}

export async function saveInstitutionalService(
  data: Partial<InstitutionalServiceItem> & { name: string },
): Promise<InstitutionalServiceItem> {
  const code =
    data.code?.trim() ||
    `SERV-${data.name
      .substring(0, 8)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')}`
  let res: InstitutionalServiceItem
  if (data.id) {
    res = await pb.collection('institutional_services').update<InstitutionalServiceItem>(data.id, {
      name: data.name,
      code,
      description: data.description || '',
      status: data.status || 'ativo',
    })
    await logAudit({
      action: 'INST_SERVICE_UPDATE',
      entity: 'Catálogo de Serviços',
      detail: `Serviço atualizado: ${res.name} (${res.code})`,
    })
  } else {
    res = await pb.collection('institutional_services').create<InstitutionalServiceItem>({
      name: data.name,
      code,
      description: data.description || '',
      status: data.status || 'ativo',
    })
    await logAudit({
      action: 'INST_SERVICE_CREATE',
      entity: 'Catálogo de Serviços',
      detail: `Novo serviço cadastrado: ${res.name} (${res.code})`,
    })
  }
  return res
}

export async function deleteInstitutionalService(id: string): Promise<void> {
  await pb.collection('institutional_services').delete(id)
  await logAudit({
    action: 'INST_SERVICE_DELETE',
    entity: 'Catálogo de Serviços',
    detail: `Serviço excluído (id: ${id})`,
  })
}

// 4. People
export async function listPeople(orgId: string): Promise<PersonItem[]> {
  try {
    return await pb.collection('people').getFullList<PersonItem>({
      filter: `organization = '${orgId}'`,
      sort: 'name',
    })
  } catch (err) {
    console.error('Erro ao listar pessoas:', err)
    return []
  }
}

export async function savePerson(
  orgId: string,
  data: Partial<PersonItem> & { name: string; email: string },
): Promise<PersonItem> {
  let res: PersonItem
  if (data.id) {
    res = await pb.collection('people').update<PersonItem>(data.id, {
      name: data.name,
      role_title: data.role_title || '',
      email: data.email,
      phone: data.phone || '',
      status: data.status || 'ativo',
    })
    await logAudit({
      action: 'PERSON_UPDATE',
      entity: 'Pessoas e Responsáveis',
      detail: `Pessoa atualizada: ${res.name} (${res.email})`,
      organizationId: orgId,
    })
  } else {
    res = await pb.collection('people').create<PersonItem>({
      organization: orgId,
      name: data.name,
      role_title: data.role_title || '',
      email: data.email,
      phone: data.phone || '',
      status: data.status || 'ativo',
    })
    await logAudit({
      action: 'PERSON_CREATE',
      entity: 'Pessoas e Responsáveis',
      detail: `Nova pessoa cadastrada: ${res.name} (${res.email})`,
      organizationId: orgId,
    })
  }
  return res
}

export async function deletePerson(id: string, orgId: string): Promise<void> {
  await pb.collection('people').delete(id)
  await logAudit({
    action: 'PERSON_DELETE',
    entity: 'Pessoas e Responsáveis',
    detail: `Pessoa excluída (id: ${id})`,
    organizationId: orgId,
  })
}

// 5. Roles
export async function listRoles(): Promise<RoleItem[]> {
  try {
    return await pb.collection('roles').getFullList<RoleItem>({
      sort: 'name',
    })
  } catch (err) {
    console.error('Erro ao listar papéis:', err)
    return []
  }
}

export async function saveRole(data: Partial<RoleItem> & { name: string }): Promise<RoleItem> {
  const code =
    data.code?.trim() ||
    `RESP-${data.name
      .substring(0, 8)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')}`
  let res: RoleItem
  if (data.id) {
    res = await pb.collection('roles').update<RoleItem>(data.id, {
      name: data.name,
      code,
      description: data.description || '',
      status: data.status || 'ativo',
      suggested_mode: data.suggested_mode || '',
    })
    await logAudit({
      action: 'ROLE_UPDATE',
      entity: 'Papéis de Responsabilidade',
      detail: `Papel atualizado: ${res.name} (${res.code})`,
    })
  } else {
    res = await pb.collection('roles').create<RoleItem>({
      name: data.name,
      code,
      description: data.description || '',
      status: data.status || 'ativo',
      suggested_mode: data.suggested_mode || '',
    })
    await logAudit({
      action: 'ROLE_CREATE',
      entity: 'Papéis de Responsabilidade',
      detail: `Novo papel cadastrado: ${res.name} (${res.code})`,
    })
  }
  return res
}

export async function deleteRole(id: string): Promise<void> {
  await pb.collection('roles').delete(id)
  await logAudit({
    action: 'ROLE_DELETE',
    entity: 'Papéis de Responsabilidade',
    detail: `Papel excluído (id: ${id})`,
  })
}

// 6. Assignments
export async function listAssignments(orgId: string): Promise<AssignmentItem[]> {
  try {
    return await pb.collection('assignments').getFullList<AssignmentItem>({
      filter: `organization = '${orgId}'`,
      expand: 'person,role',
      sort: '-created',
    })
  } catch (err) {
    console.error('Erro ao listar atribuições:', err)
    return []
  }
}

export async function createAssignment(
  orgId: string,
  data: {
    person: string
    role: string
    start_date?: string
    end_date?: string
    notes?: string
  },
): Promise<AssignmentItem> {
  const res = await pb.collection('assignments').create<AssignmentItem>({
    organization: orgId,
    person: data.person,
    role: data.role,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    status: 'ativo',
    notes: data.notes || '',
  })
  await logAudit({
    action: 'ASSIGNMENT_CREATE',
    entity: 'Atribuições de Responsabilidade',
    detail: `Nova atribuição de responsabilidade atribuída`,
    organizationId: orgId,
  })
  return res
}

export async function updateAssignmentStatus(
  id: string,
  status: 'ativo' | 'inativo' | 'encerrado',
  orgId: string,
): Promise<void> {
  await pb.collection('assignments').update(id, { status })
  await logAudit({
    action: 'ASSIGNMENT_STATUS_CHANGE',
    entity: 'Atribuições de Responsabilidade',
    detail: `Status da atribuição ${id} alterado para ${status}`,
    organizationId: orgId,
  })
}

export async function deleteAssignment(id: string, orgId: string): Promise<void> {
  await pb.collection('assignments').delete(id)
  await logAudit({
    action: 'ASSIGNMENT_DELETE',
    entity: 'Atribuições de Responsabilidade',
    detail: `Atribuição excluída (id: ${id})`,
    organizationId: orgId,
  })
}

// 7. Integrations (GLPI e E-mail)
export async function getIntegrations(orgId: string): Promise<{
  glpi: IntegrationItem | null
  email: IntegrationItem | null
}> {
  try {
    const list = await pb.collection('integrations').getFullList<IntegrationItem>({
      filter: `organization = '${orgId}'`,
    })
    const glpi = list.find((i) => i.type === 'glpi') || null
    const email = list.find((i) => i.type === 'email_backup') || null
    return { glpi, email }
  } catch (err) {
    console.error('Erro ao buscar integrações:', err)
    return { glpi: null, email: null }
  }
}

export async function saveGlpiConfig(
  orgId: string,
  params: {
    url: string
    syncLimit: number
    sslVerify: boolean
    appToken?: string // if provided, update
    userToken?: string // if provided, update
    enabled: boolean
  },
): Promise<IntegrationItem> {
  const { glpi } = await getIntegrations(orgId)
  const payload: Record<string, unknown> = {
    organization: orgId,
    type: 'glpi',
    glpi_url: params.url,
    glpi_sync_limit: params.syncLimit,
    glpi_ssl_verify: params.sslVerify,
    enabled: params.enabled,
    status: params.enabled ? 'ativo' : 'inativo',
  }

  if (params.appToken && params.appToken.trim()) {
    payload.glpi_app_token = params.appToken.trim()
    payload.glpi_has_app_token = true
  }
  if (params.userToken && params.userToken.trim()) {
    payload.glpi_user_token = params.userToken.trim()
    payload.glpi_has_user_token = true
  }

  let res: IntegrationItem
  if (glpi?.id) {
    res = await pb.collection('integrations').update<IntegrationItem>(glpi.id, payload)
  } else {
    res = await pb.collection('integrations').create<IntegrationItem>(payload)
  }

  await logAudit({
    action: 'INTEGRATION_GLPI_UPDATE',
    entity: 'Integrações',
    detail: `Configurações da integração GLPI salvas (Servidor: ${params.url})`,
    organizationId: orgId,
  })
  return res
}

export async function saveEmailConfig(
  orgId: string,
  params: {
    name: string
    host: string
    port: number
    protocol: string
    security: string
    user: string
    folder: string
    description: string
    enabled: boolean
    password?: string // if provided, update
  },
): Promise<IntegrationItem> {
  const { email } = await getIntegrations(orgId)
  const payload: Record<string, unknown> = {
    organization: orgId,
    type: 'email_backup',
    email_name: params.name,
    email_host: params.host,
    email_port: params.port,
    email_protocol: params.protocol,
    email_security: params.security,
    email_user: params.user,
    email_folder: params.folder,
    email_description: params.description,
    enabled: params.enabled,
    status: params.enabled ? 'ativo' : 'inativo',
  }

  if (params.password && params.password.trim()) {
    payload.email_password = params.password.trim()
    payload.email_has_password = true
  }

  let res: IntegrationItem
  if (email?.id) {
    res = await pb.collection('integrations').update<IntegrationItem>(email.id, payload)
  } else {
    res = await pb.collection('integrations').create<IntegrationItem>(payload)
  }

  await logAudit({
    action: 'INTEGRATION_EMAIL_UPDATE',
    entity: 'Integrações',
    detail: `Configurações do conector de E-mail de backup salvas (${params.user}@${params.host})`,
    organizationId: orgId,
  })
  return res
}

// 8. Users Management (Admin only)
export async function listOrganizationUsers(orgId: string): Promise<UserItem[]> {
  try {
    return await pb.collection('users').getFullList<UserItem>({
      filter: `organization = '${orgId}'`,
      sort: 'name',
    })
  } catch (err) {
    console.error('Erro ao listar usuários:', err)
    return []
  }
}

export async function createOrganizationUser(
  orgId: string,
  data: {
    name: string
    email: string
    password: string
    passwordConfirm: string
    system_role: SystemRole
    is_active?: boolean
  },
): Promise<UserItem> {
  const res = await pb.collection('users').create<UserItem>({
    organization: orgId,
    name: data.name,
    email: data.email,
    password: data.password,
    passwordConfirm: data.passwordConfirm,
    system_role: data.system_role,
    is_active: data.is_active !== undefined ? data.is_active : true,
    emailVisibility: false,
  })
  await logAudit({
    action: 'USER_CREATE',
    entity: 'Usuários e Acessos',
    detail: `Novo usuário criado: ${res.name} (${res.email}) com perfil ${data.system_role}`,
    organizationId: orgId,
  })
  return res
}

export async function updateOrganizationUser(
  userId: string,
  data: {
    name?: string
    system_role?: SystemRole
    is_active?: boolean
    password?: string
    passwordConfirm?: string
  },
  orgId: string,
): Promise<UserItem> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.system_role !== undefined) payload.system_role = data.system_role
  if (data.is_active !== undefined) payload.is_active = data.is_active
  if (data.password && data.password.trim()) {
    payload.password = data.password
    payload.passwordConfirm = data.passwordConfirm || data.password
  }

  const res = await pb.collection('users').update<UserItem>(userId, payload)
  await logAudit({
    action: 'USER_UPDATE',
    entity: 'Usuários e Acessos',
    detail: `Usuário atualizado: ${res.name} (${res.email})`,
    organizationId: orgId,
  })
  return res
}

export async function deleteOrganizationUser(userId: string, orgId: string): Promise<void> {
  await pb.collection('users').delete(userId)
  await logAudit({
    action: 'USER_DELETE',
    entity: 'Usuários e Acessos',
    detail: `Usuário excluído (id: ${userId})`,
    organizationId: orgId,
  })
}

// 9. Inventory Assets
export async function listInventoryAssets(
  orgId: string,
  params?: {
    tipo?: string
    status?: string
    criticidade?: string
    origem?: string
    search?: string
  },
): Promise<InventoryAssetItem[]> {
  try {
    const filters: string[] = [`organization = '${orgId}'`]

    if (params?.tipo && params.tipo !== 'todos') {
      filters.push(`tipo = '${params.tipo}'`)
    }
    if (params?.status && params.status !== 'todos') {
      filters.push(`status = '${params.status}'`)
    }
    if (params?.criticidade && params.criticidade !== 'todos') {
      filters.push(`criticidade = '${params.criticidade}'`)
    }
    if (params?.origem && params.origem !== 'todos') {
      filters.push(`origem = '${params.origem}'`)
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim().replace(/['"\\]/g, '')
      filters.push(
        `(name ~ '${q}' || localizacao ~ '${q}' || ip_address ~ '${q}' || serial_number ~ '${q}')`,
      )
    }

    const records = await pb.collection('inventory_assets').getFullList<InventoryAssetItem>({
      filter: filters.join(' && '),
      sort: 'name',
      expand: 'responsavel',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar inventory_assets:', err)
    return []
  }
}

export async function getInventoryAssetById(id: string): Promise<InventoryAssetItem | null> {
  try {
    return await pb.collection('inventory_assets').getOne<InventoryAssetItem>(id, {
      expand: 'responsavel,organization',
    })
  } catch (err) {
    console.error('Erro ao buscar ativo:', err)
    return null
  }
}

export async function saveInventoryAsset(
  orgId: string,
  data: Partial<InventoryAssetItem> & {
    name: string
    tipo: string
    status: string
    criticidade: string
  },
): Promise<InventoryAssetItem> {
  const payload: Record<string, unknown> = {
    organization: orgId,
    name: data.name.trim(),
    tipo: data.tipo,
    status: data.status,
    criticidade: data.criticidade,
    origem: data.origem || 'manual',
    localizacao: data.localizacao?.trim() || '',
    descricao: data.descricao?.trim() || '',
    ip_address: data.ip_address?.trim() || '',
    serial_number: data.serial_number?.trim() || '',
    external_id: data.external_id?.trim() || '',
    responsavel: data.responsavel || null,
    dados_normalizados: data.dados_normalizados || {},
  }

  let res: InventoryAssetItem
  if (data.id) {
    res = await pb.collection('inventory_assets').update<InventoryAssetItem>(data.id, payload)
    await logAudit({
      action: 'INVENTORY_ASSET_UPDATE',
      entity: 'Inventário de Ativos',
      detail: `Ativo atualizado: ${res.name} (Tipo: ${res.tipo}, Status: ${res.status})`,
      organizationId: orgId,
      metadata: { asset_id: res.id, name: res.name },
    })
  } else {
    res = await pb.collection('inventory_assets').create<InventoryAssetItem>(payload)
    await logAudit({
      action: 'INVENTORY_ASSET_CREATE',
      entity: 'Inventário de Ativos',
      detail: `Novo ativo cadastrado: ${res.name} (Tipo: ${res.tipo}, Criticidade: ${res.criticidade})`,
      organizationId: orgId,
      metadata: { asset_id: res.id, name: res.name },
    })
  }
  return res
}

export async function deleteInventoryAsset(
  id: string,
  orgId: string,
  assetName?: string,
): Promise<void> {
  await pb.collection('inventory_assets').delete(id)
  await logAudit({
    action: 'INVENTORY_ASSET_DELETE',
    entity: 'Inventário de Ativos',
    detail: `Ativo excluído: ${assetName || id}`,
    organizationId: orgId,
    metadata: { asset_id: id },
  })
}

// 10. Inventory Sync Runs
export async function listInventorySyncRuns(
  orgId: string,
  limit = 30,
): Promise<InventorySyncRunItem[]> {
  try {
    const records = await pb
      .collection('inventory_sync_runs')
      .getList<InventorySyncRunItem>(1, limit, {
        filter: `organization = '${orgId}'`,
        sort: '-created',
        expand: 'connector',
      })
    return records.items
  } catch (err) {
    console.error('Erro ao listar inventory_sync_runs:', err)
    return []
  }
}

export async function triggerGlpiSync(orgId: string): Promise<{
  success: boolean
  status: string
  message: string
  run_id?: string
  resumo?: SyncRunSummary
}> {
  try {
    const response = await fetch(`${pb.baseUrl}/backend/v1/inventory/glpi-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ organizationId: orgId }),
    })

    const data = await response.json()
    return data
  } catch (err: unknown) {
    console.error('Erro ao disparar sincronização GLPI:', err)
    return {
      success: false,
      status: 'erro',
      message: 'Não foi possível comunicar com o serviço de sincronização da plataforma.',
    }
  }
}
