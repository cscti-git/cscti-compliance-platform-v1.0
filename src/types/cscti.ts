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
  exige_backup_local?: boolean
  exige_backup_nuvem?: boolean
  exige_backup_replicacao?: boolean
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

// -------------------------------------------------------------
// FASE 3: MÓDULO BACKUP E CONTINUIDADE
// -------------------------------------------------------------

export interface BackupEscopoItem {
  id: string
  organization: string
  nome: string
  descricao?: string
  sistemas_protegidos?: string
  criticidade: 'baixa' | 'media' | 'alta'
  status: 'ativo' | 'inativo' | 'em_revisao'
  ativos?: string[]
  created?: string
  updated?: string
  expand?: {
    ativos?: InventoryAssetItem[]
  }
}

export type BackupPlanoPeriodicidade = 'intervalo_minutos' | 'diaria' | 'semanal' | 'mensal'
export type BackupPlanoDestino = 'local' | 'nuvem' | 'replicacao' | 'externo'

export interface BackupPlanoItem {
  id: string
  organization: string
  escopo?: string
  nome: string
  descricao?: string
  status: 'ativo' | 'inativo'
  rto_horas?: number
  rpo_horas?: number
  retencao_dias?: number
  periodicidade?: BackupPlanoPeriodicidade
  intervalo_minutos?: number
  janela_horario?: string
  destino?: BackupPlanoDestino[]
  created?: string
  updated?: string
  expand?: {
    escopo?: BackupEscopoItem
  }
}

export interface BackupPlanoRequisitoItem {
  id: string
  organization: string
  plano: string
  requisito: string
  parametro: string
  tipo_requisito?: 'rpo' | 'rto' | 'retencao' | 'periodicidade' | 'armazenamento' | 'outro'
  created?: string
  updated?: string
  expand?: {
    plano?: BackupPlanoItem
  }
}

export type BackupPeriodicidade =
  | 'diaria'
  | 'semanal'
  | 'mensal'
  | 'personalizada'
  | 'intervalo_minutos'

export type BackupTipoExecucao = 'incremental' | 'diferencial' | 'completo'

export type BackupFonteTipoExecucao = 'padrao_rotina' | 'incremental' | 'diferencial' | 'completo'

export interface BackupRotinaItem {
  id: string
  organization: string
  plano: string
  nome: string
  periodicidade: BackupPeriodicidade
  intervalo_minutos?: number
  tipo_execucao?: BackupTipoExecucao
  horario?: string
  dias_semana?: string[]
  responsavel?: string
  status: 'ativo' | 'inativo'
  created?: string
  updated?: string
  expand?: {
    plano?: BackupPlanoItem
    responsavel?: PersonItem
  }
}

export interface BackupFonteItem {
  id: string
  organization: string
  rotina: string
  ativo_inventario?: string
  tipo_fonte: 'banco_de_dados' | 'arquivos' | 'sistema' | 'e_mail' | 'maquina_virtual' | 'outro'
  tipo_execucao?: BackupFonteTipoExecucao
  caminho_identificacao: string
  ativo: boolean
  created?: string
  updated?: string
  expand?: {
    rotina?: BackupRotinaItem
    ativo_inventario?: InventoryAssetItem
  }
}

export type BackupAdaptador =
  | 'EMAIL_HTML_GENERICO'
  | 'VEEAM_HTML'
  | 'ACRONIS_PDF'
  | 'NOC_DIARIO'
  | 'LOG_BRUTO_TEXTO'
  | 'JSON_WEBHOOK'

export interface BackupVmDetailItem {
  nome: string
  status: string
  start_time?: string
  end_time?: string
  size?: string
  read?: string
  transferred?: string
  duration?: string
  details?: string
}

export interface BackupRegraIdentificacaoItem {
  id: string
  organization: string
  fonte?: string
  nome: string
  remetente_filtro?: string
  assunto_contem?: string
  padrao_conteudo?: string
  adaptador: BackupAdaptador
  ativo: boolean
  created?: string
  updated?: string
  expand?: {
    fonte?: BackupFonteItem
  }
}

export type EvidenciaStatus = 'pendente' | 'processada' | 'erro' | 'nao_reconhecida'

export interface BackupEvidenciaItem {
  id: string
  organization: string
  rotina?: string
  fonte?: string
  tipo: 'e_mail' | 'upload_manual' | 'webhook'
  remetente?: string
  assunto?: string
  data_recebida?: string
  hash_conteudo: string
  conteudo?: string
  status_processamento: EvidenciaStatus
  created?: string
  updated?: string
  expand?: {
    rotina?: BackupRotinaItem
    fonte?: BackupFonteItem
  }
}

export interface BackupProcessamentoResultado {
  status_detectado: 'sucesso' | 'erro' | 'parcial'
  job_name?: string
  job_tipo?: 'backup' | 'backup_copy' | 'replication'
  tamanho_bytes?: number
  tamanho_formatado?: string
  destino?: string
  remetente?: string
  assunto?: string
  processado_em?: string
  regra_id?: string | null
  adaptador?: string
  versao?: string
  veeam_version?: string | null
  acronis_version?: string | null
  acronis_info?: {
    data_geracao?: string
    intervalo?: string
    nome_arquivo?: string
  } | null
  nome_arquivo_anexo?: string | null
  origem_anexo_pdf?: boolean
  contadores?: {
    total_vms?: number
    processadas?: number
    success?: number
    warning?: number
    error?: number
  }
  metricas?: {
    total_size?: string
    backup_size?: string
    data_read?: string
    transferred?: string
    dedupe?: string
    compression?: string
  }
  duracao?: string | null
  horarios?: {
    inicio?: string | null
    fim?: string | null
  }
  vms_count?: number
  vms?: BackupVmDetailItem[]
  avisos?: string[]
}

export interface BackupProcessamentoItem {
  id: string
  organization: string
  evidencia: string
  adaptador_usado: string
  versao_adaptador?: string
  resultado?: BackupProcessamentoResultado
  created?: string
  updated?: string
  expand?: {
    evidencia?: BackupEvidenciaItem
  }
}

export type BackupExecucaoStatus = 'sucesso' | 'erro' | 'parcial' | 'nao_executada'

export interface BackupConfrontoEscopoExigencia {
  ativo_id: string
  ativo_nome: string
  ativo_tipo?: string
  local: boolean
  nuvem: boolean
  replicacao: boolean
  modalidades: string[]
}

export interface BackupConfrontoEscopoComprovado {
  ativo_id: string
  ativo_nome: string
  ativo_tipo?: string
  modalidade: string
  item_comprovante: string
  fonte_casada?: string | null
  rotina_nome?: string | null
  plano_nome?: string | null
  status: string
  comprovado_em?: string
}

export interface BackupConfrontoEscopoPendencia {
  ativo_id: string
  ativo_nome: string
  ativo_tipo?: string
  modalidade_pendente: string
  ativo_presente_no_comprovante: boolean
  item_comprovante?: string | null
  motivo: string
  atendivel_por_outra_rotina: boolean
}

export interface BackupConfrontoEscopo {
  escopo_id?: string | null
  escopo_nome?: string | null
  rotina_id?: string | null
  rotina_nome?: string | null
  plano_id?: string | null
  plano_nome?: string | null
  modalidades_plano?: string[]
  exigencias: BackupConfrontoEscopoExigencia[]
  comprovado: BackupConfrontoEscopoComprovado[]
  pendencias: BackupConfrontoEscopoPendencia[]
  total_ativos_escopo: number
  total_exigencias_modalidade: number
  total_comprovadas: number
  total_pendencias: number
}

export interface BackupExecucaoItem {
  id: string
  organization: string
  rotina?: string
  evidencia?: string
  data_inicio?: string
  data_fim?: string
  status: BackupExecucaoStatus
  origem_registro: 'manual' | 'evidencia'
  tamanho_bytes?: number
  tamanho_formatado?: string
  destino?: string
  observacao?: string
  detalhes_vms?: BackupVmDetailItem[]
  confronto_escopo?: BackupConfrontoEscopo
  created?: string
  updated?: string
  expand?: {
    rotina?: BackupRotinaItem
    evidencia?: BackupEvidenciaItem
  }
}

export interface BackupVerificacaoItem {
  item:
    | 'identificacao'
    | 'extracao'
    | 'vinculo'
    | 'status_job'
    | 'periodicidade'
    | 'cobertura_fontes'
    | 'destino'
    | 'volume_dados'
    | 'rpo'
    | string
  titulo: string
  status: 'conforme' | 'nao_conforme' | 'atencao'
  passou: boolean
  detalhes: string
  cobertas_count?: number
  nao_cobertas_count?: number
  rpo_esperado_horas?: number
}

export interface BackupLaudoTecnico {
  gerado_em?: string
  resultado: 'conforme' | 'nao_conforme' | 'atencao'
  veredito: string
  fonte_comprovante?: {
    origem?: string
    remetente?: string
    assunto?: string
    hash_sha256?: string
    nome_arquivo?: string | null
  }
  regra_identificacao?: {
    id?: string | null
    nome?: string
    padrao?: string
    tipo_regra?: string
  }
  adaptador?: {
    codigo?: string
    versao?: string
    formato_detectado?: string
  }
  vinculos?: {
    rotina_id?: string | null
    rotina_nome?: string
    rotina_motivo?: string
    plano_nome?: string
    periodicidade?: string
    intervalo_minutos?: number
  }
  cobertura?: {
    itens_detectados?: string[]
    fontes_cobertas?: Array<{ item: string; fonte_cadastrada?: string }>
    fontes_nao_cobertas?: Array<{ item: string; motivo?: string }>
    total_itens?: number
    total_cobertos?: number
    total_nao_cobertos?: number
  }
  verificacoes?: BackupVerificacaoItem[]
  metricas?: {
    tamanho_bytes?: number
    tamanho_formatado?: string
    destino?: string
    duracao?: string | null
    vms_sucesso?: number
    vms_falha?: number
    vms_alerta?: number
  }
}

export interface BackupAvaliacaoItem {
  id: string
  organization: string
  execucao: string
  resultado_conformidade: 'conforme' | 'nao_conforme' | 'atencao'
  detalhe?: string
  itens_avaliados?: Record<string, unknown>
  laudo_tecnico?: BackupLaudoTecnico
  confronto_escopo?: BackupConfrontoEscopo
  created?: string
  updated?: string
  expand?: {
    execucao?: BackupExecucaoItem
  }
}

export interface BackupNocClienteStatusItem {
  cliente: string
  status: string
  acoes?: string
}

export interface BackupMonitoramentoExternoItem {
  id: string
  organization: string
  data_monitoramento?: string
  origem_remetente?: string
  assunto?: string
  status_geral: 'ok' | 'falha' | 'atencao'
  clientes_status?: BackupNocClienteStatusItem[]
  acoes_realizadas?: string
  observacoes?: string
  evidencias_mencionadas?: string
  comprovante_tem_imagem?: boolean
  hash_conteudo: string
  evidencia?: string
  conteudo_bruto?: string
  created?: string
  updated?: string
  expand?: {
    evidencia?: BackupEvidenciaItem
  }
}

export interface BackupOcorrenciaFatoReal {
  rotina_id?: string
  rotina_nome?: string
  modalidade?: string
  data_hora_sp?: string
  data_iso?: string
  vms_falhas?: string[]
  vms_sucesso?: string[]
  total_vms?: number
  execucao_id?: string
  evidencia_id?: string
  job_nome?: string
  erro_detalhe?: string
  adaptador?: string
}

export interface BackupOcorrenciaItem {
  id: string
  organization: string
  tipo:
    | 'falha_de_backup'
    | 'falta_de_evidencia'
    | 'atraso_de_rotina'
    | 'erro_de_processamento'
    | 'teste_sem_sucesso'
    | 'outro'
  severidade: 'baixa' | 'media' | 'alta'
  status: 'aberta' | 'em_analise' | 'resolvida'
  titulo: string
  descricao: string
  execucao?: string
  evidencia?: string
  resolucao?: string
  resolvida_em?: string
  resolvida_por?: string
  resolvida_automaticamente?: boolean
  resolvida_por_execucao?: string
  resolvida_por_evidencia?: string
  fato_real?: BackupOcorrenciaFatoReal | null
  created?: string
  updated?: string
  expand?: {
    execucao?: BackupExecucaoItem
    evidencia?: BackupEvidenciaItem
    resolvida_por?: PersonItem
    resolvida_por_execucao?: BackupExecucaoItem
    resolvida_por_evidencia?: BackupEvidenciaItem
  }
}

export interface BackupImapFetchResponse {
  success: boolean
  configured: boolean
  enabled: boolean
  mensagens_verificadas: number
  evidencias_criadas: number
  evidencias_duplicadas: number
  erros: number
  status: 'sucesso' | 'erro' | 'aviso' | 'ingestao_manual'
  message: string
  last_check: string
}

export type ConfrontoStatusModalidade =
  | 'ATENDIDA'
  | 'FORA_RPO'
  | 'NUNCA_COMPROVADA'
  | 'SEM_FONTE'
  | 'FALHA_ULTIMA_EXECUCAO'

export type ConfrontoStatusConsolidado =
  | 'PROTEGIDO'
  | 'PARCIAL'
  | 'NAO_PROTEGIDO'
  | 'NAO_CADASTRADO'

export interface ConfrontoModalidadeInfo {
  cadastrada: boolean
  ultima_comprovacao: string | null
  dentro_do_rpo: boolean
  horas_desde_ultima: number | null
  rpo_horas_configurado: number | null
  fonte_id: string | null
  fonte_nome: string | null
  rotina_id: string | null
  rotina_nome: string | null
  job_nome?: string | null
  plano_id: string | null
  plano_nome: string | null
  execucao_id: string | null
  status_modalidade: ConfrontoStatusModalidade
  ultima_execucao_falha?: boolean
  ultima_execucao_data?: string | null
  ultima_execucao_status?: string | null
  ultima_execucao_obs?: string | null
  ocorrencias_abertas?: number
}

export interface ConfrontoAtivoItem {
  id: string
  nome: string
  tipo: string
  criticidade: string
  exigencias: {
    local: boolean
    nuvem: boolean
    replicacao: boolean
    total_exigidas: number
  }
  modalidades: {
    local?: ConfrontoModalidadeInfo
    nuvem?: ConfrontoModalidadeInfo
    replicacao?: ConfrontoModalidadeInfo
  }
  status_consolidado: ConfrontoStatusConsolidado
  total_atendidas: number
  tem_falha_recente?: boolean
  falha_detalhe?: string | null
  ocorrencias_abertas_count?: number
}

export interface BackupConfrontoResponse {
  ok: boolean
  data_analise: string
  organization: string
  totais: {
    total_ativos_inventario: number
    total_ativos_exigidos: number
    total_protegidos: number
    total_parcial: number
    total_nao_protegido: number
    total_nao_cadastrado: number
    percentual_protegido: number
  }
  confronto: ConfrontoAtivoItem[]
  alerta_falha_recente?: {
    tem_falha: boolean
    job_nome?: string
    rotina_nome?: string
    data?: string
    mensagem?: string
    ocorrencias_abertas?: number
  } | null
  message?: string
}

export interface BackupTesteRecuperacaoItem {
  id: string
  organization: string
  ativo?: string
  fonte?: string
  data_teste: string
  tipo: 'restauracao_total' | 'restauracao_parcial' | 'simulacao'
  resultado: 'sucesso' | 'parcial' | 'falha'
  tempo_decorrido_minutos?: number
  responsavel?: string
  escopo_testado?: string
  observacoes?: string
  evidencia_comprobatoria?: string
  created?: string
  updated?: string
  expand?: {
    ativo?: InventoryAssetItem
    fonte?: BackupFonteItem
    responsavel?: PersonItem
  }
}
