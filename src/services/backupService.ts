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
} from '@/types/cscti'

// -------------------------------------------------------------
// 1. Escopo de Proteção
// -------------------------------------------------------------
export async function listBackupEscopos(organizationId: string): Promise<BackupEscopoItem[]> {
  if (!organizationId) return []
  return pb.collection('backup_escopo').getFullList<BackupEscopoItem>({
    filter: `organization = "${organizationId}"`,
    sort: '-created',
  })
}

export async function saveBackupEscopo(
  data: Partial<BackupEscopoItem> & { organization: string },
): Promise<BackupEscopoItem> {
  let result: BackupEscopoItem
  if (data.id) {
    result = await pb.collection('backup_escopo').update<BackupEscopoItem>(data.id, data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ESCOPO_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Escopo de proteção atualizado: ${result.nome}`,
      metadata: { escopo_id: result.id },
    })
  } else {
    result = await pb.collection('backup_escopo').create<BackupEscopoItem>(data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ESCOPO_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Novo escopo de proteção cadastrado: ${result.nome}`,
      metadata: { escopo_id: result.id },
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
    sort: '-created',
  })
}

export async function saveBackupPlano(
  data: Partial<BackupPlanoItem> & { organization: string },
): Promise<BackupPlanoItem> {
  let result: BackupPlanoItem
  if (data.id) {
    result = await pb.collection('backup_planos').update<BackupPlanoItem>(data.id, data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_PLANO_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Plano de backup atualizado: ${result.nome}`,
      metadata: { plano_id: result.id },
    })
  } else {
    result = await pb.collection('backup_planos').create<BackupPlanoItem>(data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_PLANO_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Novo plano de backup cadastrado: ${result.nome}`,
      metadata: { plano_id: result.id },
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
    expand: 'plano,responsavel',
    sort: '-created',
  })
}

export async function saveBackupRotina(
  data: Partial<BackupRotinaItem> & { organization: string; plano: string },
): Promise<BackupRotinaItem> {
  let result: BackupRotinaItem
  if (data.id) {
    result = await pb.collection('backup_rotinas').update<BackupRotinaItem>(data.id, data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ROTINA_UPDATE',
      entity: 'Backup e Continuidade',
      detail: `Rotina de backup atualizada: ${result.nome}`,
      metadata: { rotina_id: result.id },
    })
  } else {
    result = await pb.collection('backup_rotinas').create<BackupRotinaItem>(data)
    await logAudit({
      organizationId: data.organization,
      action: 'BACKUP_ROTINA_CREATE',
      entity: 'Backup e Continuidade',
      detail: `Nova rotina de backup criada: ${result.nome}`,
      metadata: { rotina_id: result.id },
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
}

export interface ProcessarEvidenciaResponse {
  success: boolean
  idempotent?: boolean
  evidencia_id: string
  processamento_id?: string
  execucao_id?: string
  status: string
  conformidade?: string
  resultado?: Record<string, unknown>
  message: string
}

export async function processarEvidenciaBackup(
  payload: ProcessarEvidenciaPayload,
): Promise<ProcessarEvidenciaResponse> {
  return pb.send<ProcessarEvidenciaResponse>('/backend/v1/backup/evidencias/processar', {
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
        detalhe: `Avaliação registrada no lançamento manual de execução (${data.status}).`,
        itens_avaliados: { modo: 'manual', status: data.status, data: new Date().toISOString() },
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
    expand: 'execucao',
    sort: '-created',
  })
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
