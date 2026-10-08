import pb from '@/lib/pocketbase/client'
import { logAudit } from './csctiService'
import type {
  BackupEscopoItem,
  BackupPlanoItem,
  BackupPlanoRequisitoItem,
  BackupRotinaItem,
  BackupFonteItem,
  BackupRegraIdentificacaoItem,
  BackupEvidenciaItem,
  BackupProcessamentoItem,
  BackupExecucaoItem,
  BackupAvaliacaoItem,
  BackupOcorrenciaItem,
  BackupTesteRecuperacaoItem,
  BackupMonitoramentoExternoItem,
} from '@/types/cscti'

// -------------------------------------------------------------
// 1. Escopo de Proteção
// -------------------------------------------------------------
export async function listBackupEscopos(organizationId: string): Promise<BackupEscopoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_escopo').getFullList<BackupEscopoItem>({
    filter: `organization = "${organizationId}"`,
    sort: '-created',
    expand: 'ativos',
  })
}

export async function saveBackupEscopo(
  data: Partial<BackupEscopoItem> & { organization: string },
): Promise<BackupEscopoItem> {
  let result: BackupEscopoItem
  const payload: Record<string, unknown> = { ...data }
  if (Array.isArray(payload.ativos)) {
    // Normalizar lista de IDs (strings válidas e únicas)
    payload.ativos = Array.from(
      new Set(payload.ativos.filter((id) => typeof id === 'string' && id.trim().length > 0)),
    )
  }

  const ativosCount = Array.isArray(payload.ativos) ? payload.ativos.length : 0
  const ativosInfo =
    ativosCount > 0
      ? ` (${ativosCount} ativo(s) do inventário vinculado(s))`
      : ' (sem ativos vinculados)'

  if (data.id) {
    result = await pb.collection('backup_escopo').update<BackupEscopoItem>(data.id, payload, {
      expand: 'ativos',
    })
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ESCOPO_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Escopo de proteção atualizado: ${result.nome}${ativosInfo}`,
      metadata: {
        escopo_id: result.id,
        nome: result.nome,
        ativos_count: ativosCount,
        ativos_ids: payload.ativos || [],
        criticidade: result.criticidade,
        status: result.status,
      },
    })
  } else {
    result = await pb.collection('backup_escopo').create<BackupEscopoItem>(payload, {
      expand: 'ativos',
    })
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ESCOPO_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Novo escopo de proteção cadastrado: ${result.nome}${ativosInfo}`,
      metadata: {
        escopo_id: result.id,
        nome: result.nome,
        ativos_count: ativosCount,
        ativos_ids: payload.ativos || [],
        criticidade: result.criticidade,
        status: result.status,
      },
    })
  }
  return result
}

export async function deleteBackupEscopo(
  id: string,
  organizationId: string,
  nome: string,
): Promise<boolean> {
  await pb.collection('backup_escopo').delete(id)
  await logAudit({
    organizationId,
    action: 'BACKUP_ESCOPO_DELETE',
    entity: 'Backup e Continuidade',
    detail: `Escopo de proteção removido: ${nome}`,
    metadata: { escopo_id: id },
  })
  return true
}

// -------------------------------------------------------------
// 2. Planos de Backup
// -------------------------------------------------------------
export async function listBackupPlanos(organizationId: string): Promise<BackupPlanoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_planos').getFullList<BackupPlanoItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'escopo',
    sort: '-created',
  })
}

export async function saveBackupPlano(
  data: Partial<BackupPlanoItem> & { organization: string },
): Promise<BackupPlanoItem> {
  let result: BackupPlanoItem

  // Sanitização de periodicidade / intervalo / janela / destino
  const payload: Record<string, unknown> = { ...data }
  if (payload.periodicidade === 'intervalo_minutos') {
    payload.janela_horario = ''
    if (!payload.intervalo_minutos || Number(payload.intervalo_minutos) < 5) {
      payload.intervalo_minutos = 30
    } else {
      payload.intervalo_minutos = Number(payload.intervalo_minutos)
    }
  } else if (payload.periodicidade) {
    payload.intervalo_minutos = 0
  }

  if (payload.rto_horas !== undefined && payload.rto_horas !== null && payload.rto_horas !== '') {
    payload.rto_horas = Number(payload.rto_horas)
  } else {
    payload.rto_horas = null
  }

  if (payload.rpo_horas !== undefined && payload.rpo_horas !== null && payload.rpo_horas !== '') {
    payload.rpo_horas = Number(payload.rpo_horas)
  } else {
    payload.rpo_horas = null
  }

  if (
    payload.retencao_dias !== undefined &&
    payload.retencao_dias !== null &&
    payload.retencao_dias !== ''
  ) {
    payload.retencao_dias = Number(payload.retencao_dias)
  } else {
    payload.retencao_dias = null
  }

  if (!Array.isArray(payload.destino)) {
    payload.destino = []
  }

  const requisitosResumoParts: string[] = []
  if (payload.rpo_horas !== null && payload.rpo_horas !== undefined) {
    requisitosResumoParts.push(`RPO: ${payload.rpo_horas}h`)
  }
  if (payload.rto_horas !== null && payload.rto_horas !== undefined) {
    requisitosResumoParts.push(`RTO: ${payload.rto_horas}h`)
  }
  if (payload.retencao_dias !== null && payload.retencao_dias !== undefined) {
    requisitosResumoParts.push(`Retenção: ${payload.retencao_dias}d`)
  }
  if (payload.periodicidade) {
    const perStr =
      payload.periodicidade === 'intervalo_minutos'
        ? `A cada ${payload.intervalo_minutos}m`
        : `${payload.periodicidade}${payload.janela_horario ? ` ${payload.janela_horario}` : ''}`
    requisitosResumoParts.push(`Periodicidade: ${perStr}`)
  }
  if (Array.isArray(payload.destino) && payload.destino.length > 0) {
    const destinosLabel = payload.destino.map((d: string) => {
      if (d === 'local') return 'Local'
      if (d === 'nuvem') return 'Nuvem'
      if (d === 'replicacao' || d === 'externo') return 'Replicação'
      return d
    })
    requisitosResumoParts.push(`Destino: ${destinosLabel.join(', ')}`)
  }
  const requisitosTexto =
    requisitosResumoParts.length > 0 ? ` [${requisitosResumoParts.join(' · ')}]` : ''

  if (data.id) {
    result = await pb.collection('backup_planos').update<BackupPlanoItem>(data.id, payload)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_PLANO_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Plano de backup atualizado: ${result.nome}${requisitosTexto}${payload.escopo ? ` (escopo vinculado: ${payload.escopo})` : ''}`,
      metadata: {
        plano_id: result.id,
        escopo_id: payload.escopo || null,
        rto_horas: result.rto_horas,
        rpo_horas: result.rpo_horas,
        retencao_dias: result.retencao_dias,
        periodicidade: result.periodicidade,
        intervalo_minutos: result.intervalo_minutos,
        janela_horario: result.janela_horario,
        destino: result.destino,
      },
    })
  } else {
    result = await pb.collection('backup_planos').create<BackupPlanoItem>(payload)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_PLANO_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Novo plano de backup cadastrado: ${result.nome}${requisitosTexto}${payload.escopo ? ` (escopo vinculado: ${payload.escopo})` : ''}`,
      metadata: {
        plano_id: result.id,
        escopo_id: payload.escopo || null,
        rto_horas: result.rto_horas,
        rpo_horas: result.rpo_horas,
        retencao_dias: result.retencao_dias,
        periodicidade: result.periodicidade,
        intervalo_minutos: result.intervalo_minutos,
        janela_horario: result.janela_horario,
        destino: result.destino,
      },
    })
  }
  return result
}

export async function deleteBackupPlano(
  id: string,
  organizationId: string,
  nome: string,
): Promise<boolean> {
  await pb.collection('backup_planos').delete(id)
  await logAudit({
    organizationId,
    action: 'BACKUP_PLANO_DELETE',
    entity: 'Backup e Continuidade',
    detail: `Plano de backup removido: ${nome}`,
    metadata: { plano_id: id },
  })
  return true
}

// -------------------------------------------------------------
// 3. Requisitos dos Planos
// -------------------------------------------------------------
export async function listBackupPlanoRequisitos(
  organizationId: string,
  planoId?: string,
): Promise<BackupPlanoRequisitoItem[]> {
  if (!organizationId) return []
  let filter = `organization = "${organizationId}"`
  if (planoId) filter += ` && plano = "${planoId}"`
  return pb.collection('backup_plano_requisitos').getFullList<BackupPlanoRequisitoItem>({
    filter,
    expand: 'plano',
    sort: '+created',
  })
}

export async function saveBackupPlanoRequisito(
  data: Partial<BackupPlanoRequisitoItem> & { organization: string; plano: string },
): Promise<BackupPlanoRequisitoItem> {
  let result: BackupPlanoRequisitoItem
  if (data.id) {
    result = await pb
      .collection('backup_plano_requisitos')
      .update<BackupPlanoRequisitoItem>(data.id, data)
  } else {
    result = await pb.collection('backup_plano_requisitos').create<BackupPlanoRequisitoItem>(data)
  }
  return result
}

export async function deleteBackupPlanoRequisito(id: string): Promise<boolean> {
  await pb.collection('backup_plano_requisitos').delete(id)
  return true
}

// -------------------------------------------------------------
// 4. Rotinas de Backup
// -------------------------------------------------------------
export async function listBackupRotinas(organizationId: string): Promise<BackupRotinaItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_rotinas').getFullList<BackupRotinaItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'plano,plano.escopo,responsavel',
    sort: '-created',
  })
}

export async function saveBackupRotina(
  data: Partial<BackupRotinaItem> & { organization: string; plano: string },
): Promise<BackupRotinaItem> {
  let result: BackupRotinaItem
  const payload = { ...data }
  // Se for intervalo_minutos, limpa horario se necessário e garante intervalo válido
  if (payload.periodicidade === 'intervalo_minutos') {
    payload.horario = ''
    payload.dias_semana = []
    if (!payload.intervalo_minutos || payload.intervalo_minutos < 5) {
      payload.intervalo_minutos = 30
    }
  } else {
    payload.intervalo_minutos = 0
  }

  if (data.id) {
    result = await pb.collection('backup_rotinas').update<BackupRotinaItem>(data.id, payload)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ROTINA_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Rotina de backup atualizada: ${result.nome} (${result.periodicidade === 'intervalo_minutos' ? `A cada ${result.intervalo_minutos} min` : result.periodicidade})`,
      metadata: {
        rotina_id: result.id,
        periodicidade: result.periodicidade,
        intervalo_minutos: result.intervalo_minutos,
        tipo_execucao: result.tipo_execucao,
      },
    })
  } else {
    result = await pb.collection('backup_rotinas').create<BackupRotinaItem>(payload)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ROTINA_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Nova rotina de backup criada: ${result.nome} (${result.periodicidade === 'intervalo_minutos' ? `A cada ${result.intervalo_minutos} min` : result.periodicidade})`,
      metadata: {
        rotina_id: result.id,
        periodicidade: result.periodicidade,
        intervalo_minutos: result.intervalo_minutos,
        tipo_execucao: result.tipo_execucao,
      },
    })
  }
  return result
}

export async function deleteBackupRotina(
  id: string,
  organizationId: string,
  nome: string,
): Promise<boolean> {
  await pb.collection('backup_rotinas').delete(id)
  await logAudit({
    organizationId,
    action: 'BACKUP_ROTINA_DELETE',
    entity: 'Backup e Continuidade',
    detail: `Rotina de backup excluída: ${nome}`,
    metadata: { rotina_id: id },
  })
  return true
}

// -------------------------------------------------------------
// 5. Fontes de Backup
// -------------------------------------------------------------
export async function listBackupFontes(organizationId: string): Promise<BackupFonteItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_fontes').getFullList<BackupFonteItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'rotina,ativo_inventario',
    sort: '-created',
  })
}

export async function saveBackupFonte(
  data: Partial<BackupFonteItem> & { organization: string; rotina: string },
): Promise<BackupFonteItem> {
  let result: BackupFonteItem
  if (data.id) {
    result = await pb.collection('backup_fontes').update<BackupFonteItem>(data.id, data)
  } else {
    result = await pb.collection('backup_fontes').create<BackupFonteItem>(data)
  }
  return result
}

export async function deleteBackupFonte(id: string): Promise<boolean> {
  await pb.collection('backup_fontes').delete(id)
  return true
}

export interface CriarFontesPendentesPayload {
  rotinaId: string
  itens: string[]
  evidenciaId?: string
}

export interface CriarFontesPendentesResponse {
  success: boolean
  message: string
  rotina_id: string
  rotina_nome: string
  evidencia_id?: string | null
  criadas: Array<{ id: string; nome: string }>
  reutilizadas: Array<{ id: string; nome: string; caminho_identificacao?: string }>
  ignoradas: string[]
  avaliacao_atualizada: boolean
  novo_veredito?: string | null
  laudo_tecnico?: import('@/types/cscti').BackupLaudoTecnico | null
}

export async function criarFontesPendentes(
  payload: CriarFontesPendentesPayload,
): Promise<CriarFontesPendentesResponse> {
  return pb.send<CriarFontesPendentesResponse>('/backend/v1/backup/fontes/criar-pendentes', {
    method: 'POST',
    body: payload,
  })
}

// -------------------------------------------------------------
// 6. Regras de Identificação
// -------------------------------------------------------------
export async function listBackupRegras(
  organizationId: string,
): Promise<BackupRegraIdentificacaoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_regras_identificacao').getFullList<BackupRegraIdentificacaoItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'fonte',
    sort: '-created',
  })
}

export async function saveBackupRegra(
  data: Partial<BackupRegraIdentificacaoItem> & { organization: string },
): Promise<BackupRegraIdentificacaoItem> {
  let result: BackupRegraIdentificacaoItem
  if (data.id) {
    result = await pb
      .collection('backup_regras_identificacao')
      .update<BackupRegraIdentificacaoItem>(data.id, data)
  } else {
    result = await pb
      .collection('backup_regras_identificacao')
      .create<BackupRegraIdentificacaoItem>(data)
  }
  return result
}

export async function deleteBackupRegra(id: string): Promise<boolean> {
  await pb.collection('backup_regras_identificacao').delete(id)
  return true
}

// -------------------------------------------------------------
// 7. Evidências de Backup
// -------------------------------------------------------------
export async function listBackupEvidencias(organizationId: string): Promise<BackupEvidenciaItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_evidencias').getFullList<BackupEvidenciaItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'rotina,fonte',
    sort: '-created',
  })
}

export interface ProcessarEvidenciaPayload {
  organizationId: string
  conteudo: string
  remetente?: string
  assunto?: string
  rotinaId?: string
  fonteId?: string
  tipo?: 'upload_manual' | 'e_mail' | 'webhook'
  nome_arquivo?: string
  pdf_texto?: string
  pdf_nome?: string
}

export interface ProcessarEvidenciaResponse {
  ok?: boolean
  success: boolean
  duplicado?: boolean
  idempotent?: boolean
  evidencia_id?: string
  processamento_id?: string
  execucao_id?: string
  avaliacao_id?: string
  status?: string
  conformidade?: string
  adaptador?: string
  confronto_escopo?: import('../types/cscti').BackupConfrontoEscopo
  resultado?: Record<string, unknown>
  laudo_tecnico?: import('../types/cscti').BackupLaudoTecnico
  mensagem?: string
  message?: string
}
export async function processarEvidenciaBackup(
  payload: ProcessarEvidenciaPayload,
): Promise<ProcessarEvidenciaResponse> {
  return pb.send<ProcessarEvidenciaResponse>('/backend/v1/backup/evidencias/processar', {
    method: 'POST',
    body: payload,
  })
}

export async function fetchEvidenciasImap(
  organizationId: string,
): Promise<import('@/types/cscti').BackupImapFetchResponse> {
  return pb.send<import('@/types/cscti').BackupImapFetchResponse>('/backend/v1/backup/imap-fetch', {
    method: 'POST',
    body: { organizationId },
  })
}

export interface ExcluirEvidenciaResponse {
  success: boolean
  message: string
  evidencia_id: string
  removidos: {
    evidencias: number
    execucoes: number
    avaliacoes: number
  }
  audit: {
    action: string
    registrado_em: string
  }
}

export async function excluirBackupEvidencia(payload: {
  evidenciaId: string
  motivo: string
  confirmacao: boolean
}): Promise<ExcluirEvidenciaResponse> {
  return pb.send<ExcluirEvidenciaResponse>('/backend/v1/backup/evidencias/excluir', {
    method: 'POST',
    body: payload,
  })
}

export interface LimparEvidenciasResponse {
  success: boolean
  message: string
  organization_id: string
  removidos: {
    evidencias: number
    execucoes: number
    avaliacoes: number
  }
  audit: {
    action: string
    registrado_em: string
  }
}

export async function limparTodasEvidencias(payload: {
  organizationId: string
  motivo: string
  confirmacaoFrase: string
  confirmacaoCheckbox: boolean
}): Promise<LimparEvidenciasResponse> {
  return pb.send<LimparEvidenciasResponse>('/backend/v1/backup/evidencias/limpar-todas', {
    method: 'POST',
    body: payload,
  })
}

// -------------------------------------------------------------
// 8. Processamentos
// -------------------------------------------------------------
export async function listBackupProcessamentos(
  organizationId: string,
): Promise<BackupProcessamentoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_processamentos').getFullList<BackupProcessamentoItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'evidencia',
    sort: '-created',
  })
}

// -------------------------------------------------------------
// 9. Execuções e Avaliações
// -------------------------------------------------------------
export async function listBackupExecucoes(organizationId: string): Promise<BackupExecucaoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_execucoes').getFullList<BackupExecucaoItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'rotina,evidencia',
    sort: '-created',
  })
}

export async function saveBackupExecucao(
  data: Partial<BackupExecucaoItem> & { organization: string; status: string },
): Promise<BackupExecucaoItem> {
  let result: BackupExecucaoItem
  if (data.id) {
    result = await pb.collection('backup_execucoes').update<BackupExecucaoItem>(data.id, data)
  } else {
    result = await pb.collection('backup_execucoes').create<BackupExecucaoItem>(data)
    // Avaliação automática se criada manualmente
    try {
      let detalheAval = `Avaliação registrada no lançamento manual de execução (${data.status}).`
      let rotinaMeta: Record<string, unknown> = {}

      if (data.rotina) {
        try {
          const rotinaRec = await pb
            .collection('backup_rotinas')
            .getOne<BackupRotinaItem>(data.rotina)
          if (rotinaRec) {
            rotinaMeta = {
              rotina_nome: rotinaRec.nome,
              periodicidade: rotinaRec.periodicidade,
              intervalo_minutos: rotinaRec.intervalo_minutos,
              tipo_execucao: rotinaRec.tipo_execucao,
            }
            if (rotinaRec.periodicidade === 'intervalo_minutos') {
              detalheAval =
                data.status === 'sucesso'
                  ? `Execução manual em conformidade com rotina contínua (a cada ${rotinaRec.intervalo_minutos || 30} min · ${rotinaRec.tipo_execucao || 'incremental'}).`
                  : `Execução manual não conforme (${data.status}) para rotina de ${rotinaRec.intervalo_minutos || 30} min.`
            }
          }
        } catch {
          /* ignore */
        }
      }

      const avalResult =
        data.status === 'sucesso'
          ? 'conforme'
          : data.status === 'parcial'
            ? 'atencao'
            : 'nao_conforme'

      await pb.collection('backup_avaliacoes').create({
        organization: data.organization,
        execucao: result.id,
        resultado_conformidade: avalResult,
        detalhe: detalheAval,
        itens_avaliados: {
          modo: 'manual',
          status: data.status,
          ...rotinaMeta,
          data: new Date().toISOString(),
        },
      })
    } catch {
      /* intentionally ignored */
    }

    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_EXECUCAO_MANUAL',
      entity: 'Backup e Continuidade',
      detail: `Lançamento manual de execução de backup com status "${data.status}".`,
      metadata: { execucao_id: result.id, status: data.status },
    })
  }
  return result
}

export async function listBackupAvaliacoes(organizationId: string): Promise<BackupAvaliacaoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_avaliacoes').getFullList<BackupAvaliacaoItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'execucao,execucao.evidencia',
    sort: '-created',
  })
}

export async function getBackupAvaliacaoByExecucao(
  execucaoId: string,
  organizationId: string,
): Promise<BackupAvaliacaoItem | null> {
  if (!execucaoId || !organizationId) return null
  try {
    const list = await pb.collection('backup_avaliacoes').getList<BackupAvaliacaoItem>(1, 1, {
      filter: `organization = "${organizationId}" && execucao = "${execucaoId}"`,
      sort: '-created',
    })
    return list.items[0] || null
  } catch (_) {
    return null
  }
}

export async function getBackupAvaliacaoByEvidencia(
  evidenciaId: string,
  organizationId: string,
): Promise<BackupAvaliacaoItem | null> {
  if (!evidenciaId || !organizationId) return null
  try {
    // 1. Procurar execução vinculada à evidência
    const execs = await pb.collection('backup_execucoes').getList(1, 1, {
      filter: `organization = "${organizationId}" && evidencia = "${evidenciaId}"`,
      sort: '-created',
    })
    if (execs.items.length === 0) return null
    return await getBackupAvaliacaoByExecucao(execs.items[0].id, organizationId)
  } catch (_) {
    return null
  }
}

// -------------------------------------------------------------
// 10. Ocorrências de Backup
// -------------------------------------------------------------
export async function listBackupOcorrencias(
  organizationId: string,
): Promise<BackupOcorrenciaItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_ocorrencias').getFullList<BackupOcorrenciaItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'execucao,evidencia,resolvida_por',
    sort: '-created',
  })
}

export async function saveBackupOcorrencia(
  data: Partial<BackupOcorrenciaItem> & { organization: string; titulo: string; descricao: string },
): Promise<BackupOcorrenciaItem> {
  let result: BackupOcorrenciaItem
  if (data.id) {
    result = await pb.collection('backup_ocorrencias').update<BackupOcorrenciaItem>(data.id, data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_OCORRENCIA_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Ocorrência atualizada: ${result.titulo} (status: ${result.status})`,
      metadata: { ocorrencia_id: result.id, status: result.status },
    })
  } else {
    result = await pb.collection('backup_ocorrencias').create<BackupOcorrenciaItem>(data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_OCORRENCIA_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Nova ocorrência de backup aberta: ${result.titulo}`,
      metadata: { ocorrencia_id: result.id, severidade: result.severidade },
    })
  }
  return result
}

export async function resolverBackupOcorrencia(
  id: string,
  organizationId: string,
  resolucao: string,
  personId?: string,
): Promise<BackupOcorrenciaItem> {
  const result = await pb.collection('backup_ocorrencias').update<BackupOcorrenciaItem>(id, {
    status: 'resolvida',
    resolucao,
    resolvida_em: new Date().toISOString(),
    resolvida_por: personId || null,
  })
  await logAudit({
    organizationId,
    action: 'BACKUP_OCORRENCIA_RESOLVE',
    entity: 'Backup e Continuidade',
    detail: `Ocorrência #${id} resolvida: "${resolucao.slice(0, 80)}"`,
    metadata: { ocorrencia_id: id },
  })
  return result
}

export async function deleteBackupOcorrencia(id: string, organizationId: string): Promise<boolean> {
  await pb.collection('backup_ocorrencias').delete(id)
  await logAudit({
    organizationId,
    action: 'BACKUP_OCORRENCIA_DELETED',
    entity: 'Backup e Continuidade',
    detail: `Ocorrência #${id} removida do painel de continuidade.`,
    metadata: { ocorrencia_id: id },
  })
  return true
}

// -------------------------------------------------------------
// 11. Testes de Recuperação
// -------------------------------------------------------------
export async function listBackupTestes(
  organizationId: string,
): Promise<BackupTesteRecuperacaoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_testes_recuperacao').getFullList<BackupTesteRecuperacaoItem>({
    filter: `organization = "${organizationId}"`,
    expand: 'ativo,fonte,responsavel',
    sort: '-data_teste',
  })
}

export async function saveBackupTeste(
  data: Partial<BackupTesteRecuperacaoItem> & { organization: string; data_teste: string },
): Promise<BackupTesteRecuperacaoItem> {
  let result: BackupTesteRecuperacaoItem
  if (data.id) {
    result = await pb
      .collection('backup_testes_recuperacao')
      .update<BackupTesteRecuperacaoItem>(data.id, data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_TESTE_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Teste de recuperação atualizado (${result.resultado})`,
      metadata: { teste_id: result.id },
    })
  } else {
    result = await pb
      .collection('backup_testes_recuperacao')
      .create<BackupTesteRecuperacaoItem>(data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_TESTE_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Novo teste de recuperação homologado com resultado "${result.resultado}".`,
      metadata: { teste_id: result.id, resultado: result.resultado },
    })
  }
  return result
}

export async function deleteBackupTeste(id: string, organizationId: string): Promise<boolean> {
  await pb.collection('backup_testes_recuperacao').delete(id)
  await logAudit({
    organizationId,
    action: 'BACKUP_TESTE_DELETE',
    entity: 'Backup e Continuidade',
    detail: `Registro de teste de recuperação excluído (#${id})`,
    metadata: { teste_id: id },
  })
  return true
}

// -------------------------------------------------------------
// 12. Monitoramentos Externos (NOC / Terceirizados)
// -------------------------------------------------------------
export async function listBackupMonitoramentos(
  organizationId: string,
): Promise<BackupMonitoramentoExternoItem[]> {
  if (!organizationId) return []
  return pb
    .collection('backup_monitoramentos_externos')
    .getFullList<BackupMonitoramentoExternoItem>({
      filter: `organization = "${organizationId}"`,
      expand: 'evidencia',
      sort: '-created',
    })
}

export async function deleteBackupMonitoramento(
  id: string,
  organizationId: string,
): Promise<boolean> {
  await pb.collection('backup_monitoramentos_externos').delete(id)
  await logAudit({
    organizationId,
    action: 'BACKUP_MONITORAMENTO_DELETE',
    entity: 'Backup e Continuidade',
    detail: `Registro de monitoramento externo do NOC removido (#${id})`,
    metadata: { monitoramento_id: id },
  })
  return true
}

export async function excluirBackupExecucoes(payload: {
  execucaoId?: string
  execucaoIds?: string[]
  motivo: string
  confirmacao: boolean
}): Promise<{ success: boolean; message: string; removidos: number }> {
  const body = {
    ...payload,
    justificativa: payload.motivo,
  }
  const res = await pb.send<{ ok?: boolean; excluidas?: number; message?: string }>(
    '/backend/v1/backup/execucoes/excluir',
    {
      method: 'POST',
      body,
    },
  )
  const removidos = res?.excluidas ?? (payload.execucaoIds?.length || (payload.execucaoId ? 1 : 0))
  return {
    success: true,
    message: res?.message || `${removidos} execução(ões) excluída(s) com sucesso.`,
    removidos,
  }
}

/**
 * Consulta o motor de confronto por ativo no backend.
 * Avalia exigências (local, nuvem, replicação) vs. fontes cadastradas vs. comprovações reais dentro do RPO.
 */
export async function getBackupConfronto(
  organizationId?: string,
): Promise<import('@/types/cscti').BackupConfrontoResponse> {
  const query = organizationId ? `?organization=${encodeURIComponent(organizationId)}` : ''
  return pb.send<import('@/types/cscti').BackupConfrontoResponse>(
    `/backend/v1/backup/confronto${query}`,
    {
      method: 'GET',
    },
  )
}
