export type SystemRole = 'admin' | 'suporte' | 'usuario'

export interface UserItem {
  id: string
  email: string
  name: string
  avatar?: string
  verified: boolean
  system_role: SystemRole
  organization?: string
  is_active?: boolean
  last_access?: string
  expand?: {
    organization?: OrganizationItem
  }
}

export type ProvimentoClass = 'C1' | 'C2' | 'C3'
export type ProvimentoSubclass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'

export interface OrganizationTypeItem {
  id: string
  name: string
  code: string
  description?: string
  status: 'ativo' | 'inativo'
  created?: string
  updated?: string
}

export interface InstitutionalServiceItem {
  id: string
  name: string
  code: string
  description?: string
  status: 'ativo' | 'inativo'
  created?: string
  updated?: string
}

export interface OrganizationItem {
  id: string
  name: string
  corporate_name?: string
  trade_name?: string
  cnpj?: string
  contact_name?: string
  email?: string
  website?: string
  phone?: string
  status: 'ativa' | 'inativa'
  type?: string
  services?: string[]
  provimento_class?: ProvimentoClass
  provimento_subclass?: ProvimentoSubclass
  revenue_range?: string
  deadline_stage_1_days?: number
  deadline_stage_2_days?: number
  address_type?: string
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
  app_product_name?: string
  app_header_title?: string
  app_institutional_text?: string
  created?: string
  updated?: string
  expand?: {
    type?: OrganizationTypeItem
    services?: InstitutionalServiceItem[]
  }
}

export interface PersonItem {
  id: string
  organization: string
  name: string
  role_title?: string
  email: string
  phone?: string
  status: 'ativo' | 'inativo'
  created?: string
  updated?: string
}

export interface RoleItem {
  id: string
  name: string
  code: string
  description?: string
  status: 'ativo' | 'inativo'
  suggested_mode?: string
  created?: string
  updated?: string
}

export interface AssignmentItem {
  id: string
  organization: string
  person: string
  role: string
  start_date?: string
  end_date?: string
  status: 'ativo' | 'inativo' | 'encerrado'
  notes?: string
  created?: string
  updated?: string
  expand?: {
    person?: PersonItem
    role?: RoleItem
  }
}

export interface GlpiIntegrationConfig {
  glpi_url?: string
  glpi_sync_limit?: number
  glpi_ssl_verify?: boolean
  glpi_app_token?: string
  glpi_user_token?: string
  glpi_has_app_token?: boolean
  glpi_has_user_token?: boolean
}

export interface EmailIntegrationConfig {
  email_name?: string
  email_host?: string
  email_port?: number
  email_protocol?: string
  email_security?: string
  email_user?: string
  email_folder?: string
  email_description?: string
  email_password?: string
  email_has_password?: boolean
}

export interface IntegrationItem extends GlpiIntegrationConfig, EmailIntegrationConfig {
  id: string
  organization: string
  type: 'glpi' | 'email_backup'
  enabled: boolean
  status?: 'ativo' | 'inativo' | 'pendente' | 'erro'
  last_sync?: string
  last_sync_status?: string
  last_sync_message?: string
  created?: string
  updated?: string
}

export interface AuditLogItem {
  id: string
  organization?: string
  user?: string
  user_name?: string
  user_email?: string
  action: string
  entity?: string
  detail?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  created?: string
  updated?: string
}

export type AssetType =
  | 'servidor_aplicacao'
  | 'servidor_virtualizado'
  | 'banco_dados'
  | 'storage_backup'
  | 'servico_nuvem'
  | 'estacao'
  | 'impressora_multifuncional'
  | 'equipamento_rede'
  | 'outro'

export type AssetStatus = 'ativo' | 'inativo' | 'desativado'
export type AssetCriticality = 'baixa' | 'media' | 'alta'
export type AssetOrigin = 'manual' | 'glpi'

export interface InventoryAssetItem {
  id: string
  organization: string
  name: string
  tipo: AssetType
  status: AssetStatus
  criticidade: AssetCriticality
  origem: AssetOrigin
  localizacao?: string
  descricao?: string
  ip_address?: string
  serial_number?: string
  external_id?: string
  responsavel?: string
  dados_normalizados?: Record<string, unknown>
  created?: string
  updated?: string
  expand?: {
    responsavel?: PersonItem
    organization?: OrganizationItem
  }
}

export type SyncRunStatus = 'em_andamento' | 'sucesso' | 'erro' | 'parcial'

export interface SyncRunSummary {
  criados: number
  atualizados: number
  inalterados: number
  erros: number
  total_glpi: number
}

export interface InventorySyncRunItem {
  id: string
  organization: string
  connector?: string
  status: SyncRunStatus
  resumo?: SyncRunSummary
  error_message?: string
  started_at?: string
  finished_at?: string
  created?: string
  updated?: string
  expand?: {
    connector?: IntegrationItem
  }
}
