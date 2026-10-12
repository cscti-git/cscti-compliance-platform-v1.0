import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/csctiService'
import { calculateFileSha256 } from '@/services/designacaoService'
import type {
  LgpdFinalidadeItem,
  LgpdDadoItem,
  LgpdCienciaItem,
  LgpdIncidenteItem,
  LgpdBaseLegal,
  LgpdCategoriaTitular,
  LgpdSensibilidade,
  LgpdFormaDescarte,
  LgpdCienciaStatus,
  LgpdIncidenteGravidade,
  LgpdIncidenteStatusFluxo,
} from '@/types/cscti'

// ==========================================
// 1. Operações de Tratamento (Finalidades)
// ==========================================

export async function listLgpdFinalidades(
  orgId: string,
  apenasAtivas = false,
): Promise<LgpdFinalidadeItem[]> {
  try {
    const filters: string[] = [`organization = '${orgId}'`]
    if (apenasAtivas) {
      filters.push("status = 'ativo'")
    }
    return await pb.collection('lgpd_finalidades').getFullList<LgpdFinalidadeItem>({
      filter: filters.join(' && '),
      sort: 'nome',
    })
  } catch (err) {
    console.error('[lgpdService] Erro ao listar finalidades:', err)
    return []
  }
}

export interface SaveLgpdFinalidadePayload {
  id?: string
  nome: string
  descricao?: string
  base_legal: LgpdBaseLegal
  categorias_titulares?: LgpdCategoriaTitular[]
  status: 'ativo' | 'inativo'
}

export async function saveLgpdFinalidade(
  orgId: string,
  data: SaveLgpdFinalidadePayload,
): Promise<LgpdFinalidadeItem> {
  const payload = {
    organization: orgId,
    nome: data.nome.trim(),
    descricao: data.descricao?.trim() || '',
    base_legal: data.base_legal,
    categorias_titulares: data.categorias_titulares || [],
    status: data.status,
  }

  let res: LgpdFinalidadeItem
  if (data.id) {
    res = await pb.collection('lgpd_finalidades').update<LgpdFinalidadeItem>(data.id, payload)
    await logAudit({
      action: 'LGPD_FINALIDADE_UPDATE',
      entity: 'LGPD e Governança',
      detail: `Operação de tratamento atualizada: "${res.nome}" (${res.base_legal})`,
      organizationId: orgId,
      metadata: { finalidade_id: res.id, nome: res.nome, status: res.status },
    })
  } else {
    res = await pb.collection('lgpd_finalidades').create<LgpdFinalidadeItem>(payload)
    await logAudit({
      action: 'LGPD_FINALIDADE_CREATE',
      entity: 'LGPD e Governança',
      detail: `Nova operação de tratamento cadastrada: "${res.nome}" (${res.base_legal})`,
      organizationId: orgId,
      metadata: { finalidade_id: res.id, nome: res.nome },
    })
  }
  return res
}

export async function deleteLgpdFinalidade(
  id: string,
  orgId: string,
  nome?: string,
): Promise<void> {
  await pb.collection('lgpd_finalidades').delete(id)
  await logAudit({
    action: 'LGPD_FINALIDADE_DELETE',
    entity: 'LGPD e Governança',
    detail: `Operação de tratamento excluída: "${nome || id}"`,
    organizationId: orgId,
    metadata: { finalidade_id: id },
  })
}

// ==========================================
// 2. Inventário de Dados Pessoais
// ==========================================

export async function listLgpdDados(
  orgId: string,
  filtros?: {
    sensibilidade?: LgpdSensibilidade | 'todas'
    finalidadeId?: string | 'todas'
    status?: 'ativo' | 'inativo' | 'todos'
    search?: string
  },
): Promise<LgpdDadoItem[]> {
  try {
    const f: string[] = [`organization = '${orgId}'`]

    if (filtros?.sensibilidade && filtros.sensibilidade !== 'todas') {
      f.push(`categoria_sensibilidade = '${filtros.sensibilidade}'`)
    }
    if (filtros?.finalidadeId && filtros.finalidadeId !== 'todas') {
      f.push(`finalidade = '${filtros.finalidadeId}'`)
    }
    if (filtros?.status && filtros.status !== 'todos') {
      f.push(`status = '${filtros.status}'`)
    }
    if (filtros?.search && filtros.search.trim()) {
      const q = filtros.search.trim().replace(/['"]/g, '')
      f.push(`(nome ~ '${q}' || sistema_origem ~ '${q}' || tempo_retencao ~ '${q}')`)
    }

    return await pb.collection('lgpd_dados').getFullList<LgpdDadoItem>({
      filter: f.join(' && '),
      sort: 'nome',
      expand: 'finalidade,ativo_vinculado',
    })
  } catch (err) {
    console.error('[lgpdService] Erro ao listar dados pessoais:', err)
    return []
  }
}

export interface SaveLgpdDadoPayload {
  id?: string
  nome: string
  categoria_sensibilidade: LgpdSensibilidade
  finalidade?: string
  sistema_origem?: string
  ativo_vinculado?: string
  tempo_retencao?: string
  justificativa_retencao?: string
  forma_descarte: LgpdFormaDescarte
  status: 'ativo' | 'inativo'
  observacoes?: string
}

export async function saveLgpdDado(
  orgId: string,
  data: SaveLgpdDadoPayload,
): Promise<LgpdDadoItem> {
  const payload: Record<string, unknown> = {
    organization: orgId,
    nome: data.nome.trim(),
    categoria_sensibilidade: data.categoria_sensibilidade,
    forma_descarte: data.forma_descarte,
    status: data.status,
    sistema_origem: data.sistema_origem?.trim() || '',
    tempo_retencao: data.tempo_retencao?.trim() || '',
    justificativa_retencao: data.justificativa_retencao?.trim() || '',
    observacoes: data.observacoes?.trim() || '',
  }

  if (data.finalidade) {
    payload.finalidade = data.finalidade
  } else {
    payload.finalidade = null
  }

  if (data.ativo_vinculado) {
    payload.ativo_vinculado = data.ativo_vinculado
  } else {
    payload.ativo_vinculado = null
  }

  let res: LgpdDadoItem
  if (data.id) {
    res = await pb.collection('lgpd_dados').update<LgpdDadoItem>(data.id, payload, {
      expand: 'finalidade,ativo_vinculado',
    })
    await logAudit({
      action: 'LGPD_DADO_UPDATE',
      entity: 'LGPD e Governança',
      detail: `Dado pessoal atualizado no inventário: "${res.nome}" (${res.categoria_sensibilidade})`,
      organizationId: orgId,
      metadata: { dado_id: res.id, nome: res.nome, sensibilidade: res.categoria_sensibilidade },
    })
  } else {
    res = await pb.collection('lgpd_dados').create<LgpdDadoItem>(payload, {
      expand: 'finalidade,ativo_vinculado',
    })
    await logAudit({
      action: 'LGPD_DADO_CREATE',
      entity: 'LGPD e Governança',
      detail: `Novo dado pessoal inventariado: "${res.nome}" (${res.categoria_sensibilidade})`,
      organizationId: orgId,
      metadata: { dado_id: res.id, nome: res.nome, sensibilidade: res.categoria_sensibilidade },
    })
  }
  return res
}

export async function deleteLgpdDado(id: string, orgId: string, nome?: string): Promise<void> {
  await pb.collection('lgpd_dados').delete(id)
  await logAudit({
    action: 'LGPD_DADO_DELETE',
    entity: 'LGPD e Governança',
    detail: `Dado pessoal excluído do inventário: "${nome || id}"`,
    organizationId: orgId,
    metadata: { dado_id: id },
  })
}

// ==========================================
// 3. Ciência da Política de Segurança (PSI)
// ==========================================

export async function listLgpdCiencias(orgId: string): Promise<LgpdCienciaItem[]> {
  try {
    return await pb.collection('lgpd_ciencias').getFullList<LgpdCienciaItem>({
      filter: `organization = '${orgId}'`,
      sort: 'nome_colaborador',
      expand: 'colaborador',
    })
  } catch (err) {
    console.error('[lgpdService] Erro ao listar ciencias da PSI:', err)
    return []
  }
}

export interface SaveLgpdCienciaPayload {
  id?: string
  colaborador?: string
  nome_colaborador: string
  email_colaborador?: string
  cargo_colaborador?: string
  politica_versao?: string
  data_ciencia?: string
  tipo_assinatura?: 'fisica' | 'digital'
  status: LgpdCienciaStatus
  plataforma_digital?: string
  protocolo_digital?: string
  observacoes?: string
  documentoAssinadoFile?: File
  hash_sha256?: string
  politicaArquivoFile?: File
}

export async function saveLgpdCiencia(
  orgId: string,
  data: SaveLgpdCienciaPayload,
): Promise<LgpdCienciaItem> {
  const formData = new FormData()

  formData.append('organization', orgId)
  if (data.colaborador) {
    formData.append('colaborador', data.colaborador)
  }
  formData.append('nome_colaborador', data.nome_colaborador.trim())
  if (data.email_colaborador) {
    formData.append('email_colaborador', data.email_colaborador.trim())
  }
  if (data.cargo_colaborador) {
    formData.append('cargo_colaborador', data.cargo_colaborador.trim())
  }
  if (data.politica_versao) {
    formData.append('politica_versao', data.politica_versao.trim())
  }
  if (data.data_ciencia) {
    formData.append('data_ciencia', data.data_ciencia)
  }
  if (data.tipo_assinatura) {
    formData.append('tipo_assinatura', data.tipo_assinatura)
  }
  formData.append('status', data.status)
  if (data.plataforma_digital) {
    formData.append('plataforma_digital', data.plataforma_digital.trim())
  }
  if (data.protocolo_digital) {
    formData.append('protocolo_digital', data.protocolo_digital.trim())
  }
  if (data.observacoes) {
    formData.append('observacoes', data.observacoes.trim())
  }

  // Anexo do documento assinado com hash SHA-256
  if (data.documentoAssinadoFile) {
    formData.append('documento_assinado', data.documentoAssinadoFile)
    const hash = data.hash_sha256 || (await calculateFileSha256(data.documentoAssinadoFile))
    formData.append('hash_sha256', hash)
  } else if (data.hash_sha256) {
    formData.append('hash_sha256', data.hash_sha256)
  }

  // Arquivo da PSI (se enviado)
  if (data.politicaArquivoFile) {
    formData.append('politica_arquivo', data.politicaArquivoFile)
  }

  let res: LgpdCienciaItem
  if (data.id) {
    res = await pb.collection('lgpd_ciencias').update<LgpdCienciaItem>(data.id, formData, {
      expand: 'colaborador',
    })
    await logAudit({
      action: 'LGPD_CIENCIA_UPDATE',
      entity: 'LGPD e Governança',
      detail: `Ciência da PSI atualizada para "${res.nome_colaborador}" - Status: ${res.status}`,
      organizationId: orgId,
      metadata: { ciencia_id: res.id, colaborador: res.nome_colaborador, status: res.status },
    })
  } else {
    res = await pb.collection('lgpd_ciencias').create<LgpdCienciaItem>(formData, {
      expand: 'colaborador',
    })
    await logAudit({
      action: 'LGPD_CIENCIA_CREATE',
      entity: 'LGPD e Governança',
      detail: `Ciência da PSI registrada para "${res.nome_colaborador}" - Status: ${res.status}`,
      organizationId: orgId,
      metadata: { ciencia_id: res.id, colaborador: res.nome_colaborador, status: res.status },
    })
  }
  return res
}

export async function deleteLgpdCiencia(id: string, orgId: string, nome?: string): Promise<void> {
  await pb.collection('lgpd_ciencias').delete(id)
  await logAudit({
    action: 'LGPD_CIENCIA_DELETE',
    entity: 'LGPD e Governança',
    detail: `Registro de ciência da PSI excluído: "${nome || id}"`,
    organizationId: orgId,
    metadata: { ciencia_id: id },
  })
}

export function getLgpdCienciaFileUrl(record: LgpdCienciaItem, filename: string): string {
  if (!filename) return ''
  return pb.files.getURL(record as any, filename)
}

// ==========================================
// 4. Incidentes de Segurança com Dados
// ==========================================

export async function listLgpdIncidentes(orgId: string): Promise<LgpdIncidenteItem[]> {
  try {
    return await pb.collection('lgpd_incidentes').getFullList<LgpdIncidenteItem>({
      filter: `organization = '${orgId}'`,
      sort: '-data_deteccao',
      expand: 'dados_afetados_rel',
    })
  } catch (err) {
    console.error('[lgpdService] Erro ao listar incidentes:', err)
    return []
  }
}

export async function getLgpdIncidenteById(id: string): Promise<LgpdIncidenteItem | null> {
  try {
    return await pb.collection('lgpd_incidentes').getOne<LgpdIncidenteItem>(id, {
      expand: 'dados_afetados_rel',
    })
  } catch (err) {
    console.error('[lgpdService] Erro ao buscar incidente:', err)
    return null
  }
}

export interface SaveLgpdIncidentePayload {
  id?: string
  titulo: string
  descricao: string
  data_deteccao: string
  data_ocorrencia?: string
  gravidade: LgpdIncidenteGravidade
  dados_afetados_texto?: string
  dados_afetados_rel?: string[]
  titulares_afetados_estimativa?: number
  status_fluxo: LgpdIncidenteStatusFluxo
  data_comunicacao_titular?: string
  protocolo_comunicacao_titular?: string
  data_comunicacao_orgao?: string
  protocolo_comunicacao_orgao?: string
  prazo_72h_cumprido?: boolean
  responsavel_registro: string
  medidas_tomadas?: string
  licoes_aprendidas?: string
  data_encerramento?: string
  anexosFiles?: File[]
  hash_sha256?: string
}

export async function saveLgpdIncidente(
  orgId: string,
  data: SaveLgpdIncidentePayload,
): Promise<LgpdIncidenteItem> {
  const formData = new FormData()

  formData.append('organization', orgId)
  formData.append('titulo', data.titulo.trim())
  formData.append('descricao', data.descricao.trim())
  formData.append('data_deteccao', data.data_deteccao)
  if (data.data_ocorrencia) {
    formData.append('data_ocorrencia', data.data_ocorrencia)
  }
  formData.append('gravidade', data.gravidade)
  if (data.dados_afetados_texto) {
    formData.append('dados_afetados_texto', data.dados_afetados_texto.trim())
  }
  if (data.dados_afetados_rel && data.dados_afetados_rel.length > 0) {
    data.dados_afetados_rel.forEach((idDado) => {
      formData.append('dados_afetados_rel', idDado)
    })
  }
  if (typeof data.titulares_afetados_estimativa === 'number') {
    formData.append('titulares_afetados_estimativa', String(data.titulares_afetados_estimativa))
  }
  formData.append('status_fluxo', data.status_fluxo)

  if (data.data_comunicacao_titular) {
    formData.append('data_comunicacao_titular', data.data_comunicacao_titular)
  }
  if (data.protocolo_comunicacao_titular) {
    formData.append('protocolo_comunicacao_titular', data.protocolo_comunicacao_titular.trim())
  }
  if (data.data_comunicacao_orgao) {
    formData.append('data_comunicacao_orgao', data.data_comunicacao_orgao)
  }
  if (data.protocolo_comunicacao_orgao) {
    formData.append('protocolo_comunicacao_orgao', data.protocolo_comunicacao_orgao.trim())
  }

  // Cálculo automático do cumprimento de 72h se houver comunicação ao órgão
  let cumpriuPrazo = data.prazo_72h_cumprido
  if (data.data_comunicacao_orgao && data.data_deteccao) {
    const msDiff =
      new Date(data.data_comunicacao_orgao).getTime() - new Date(data.data_deteccao).getTime()
    const horasDecorridas = msDiff / (1000 * 60 * 60)
    cumpriuPrazo = horasDecorridas <= 72
  }
  if (typeof cumpriuPrazo === 'boolean') {
    formData.append('prazo_72h_cumprido', String(cumpriuPrazo))
  }

  formData.append('responsavel_registro', data.responsavel_registro.trim())
  if (data.medidas_tomadas) {
    formData.append('medidas_tomadas', data.medidas_tomadas.trim())
  }
  if (data.licoes_aprendidas) {
    formData.append('licoes_aprendidas', data.licoes_aprendidas.trim())
  }
  if (data.data_encerramento) {
    formData.append('data_encerramento', data.data_encerramento)
  }

  // Anexos múltiplos
  if (data.anexosFiles && data.anexosFiles.length > 0) {
    let combinedHash = ''
    for (const f of data.anexosFiles) {
      formData.append('anexos', f)
      if (!combinedHash) {
        combinedHash = await calculateFileSha256(f)
      }
    }
    if (combinedHash) {
      formData.append('hash_sha256', combinedHash)
    }
  } else if (data.hash_sha256) {
    formData.append('hash_sha256', data.hash_sha256)
  }

  let res: LgpdIncidenteItem
  if (data.id) {
    res = await pb.collection('lgpd_incidentes').update<LgpdIncidenteItem>(data.id, formData, {
      expand: 'dados_afetados_rel',
    })
    await logAudit({
      action: 'LGPD_INCIDENTE_UPDATE',
      entity: 'LGPD e Governança',
      detail: `Incidente de segurança com dados atualizado: "${res.titulo}" (${res.status_fluxo})`,
      organizationId: orgId,
      metadata: { incidente_id: res.id, titulo: res.titulo, status: res.status_fluxo },
    })
  } else {
    res = await pb.collection('lgpd_incidentes').create<LgpdIncidenteItem>(formData, {
      expand: 'dados_afetados_rel',
    })
    await logAudit({
      action: 'LGPD_INCIDENTE_CREATE',
      entity: 'LGPD e Governança',
      detail: `Novo incidente de segurança com dados registrado: "${res.titulo}" (gravidade: ${res.gravidade})`,
      organizationId: orgId,
      metadata: { incidente_id: res.id, titulo: res.titulo, gravidade: res.gravidade },
    })
  }
  return res
}

export async function deleteLgpdIncidente(
  id: string,
  orgId: string,
  titulo?: string,
): Promise<void> {
  await pb.collection('lgpd_incidentes').delete(id)
  await logAudit({
    action: 'LGPD_INCIDENTE_DELETE',
    entity: 'LGPD e Governança',
    detail: `Registro de incidente de segurança excluído: "${titulo || id}"`,
    organizationId: orgId,
    metadata: { incidente_id: id },
  })
}

export function getLgpdIncidenteFileUrl(record: LgpdIncidenteItem, filename: string): string {
  if (!filename) return ''
  return pb.files.getURL(record as any, filename)
}

/**
 * Utilitário de contagem regressiva / decorrida das 72 horas regulatórias a partir da detecção
 */
export function getLgpdPrazo72hInfo(
  dataDeteccaoIso: string,
  dataComunicacaoOrgaoIso?: string,
): {
  horasDecorridas: number
  horasRestantes: number
  statusPrazo: 'no_prazo' | 'atencao' | 'vencido' | 'cumprido_no_prazo' | 'cumprido_fora_prazo'
  label: string
} {
  const agora = new Date()
  const deteccao = new Date(dataDeteccaoIso)
  const msDeteccao = deteccao.getTime()

  // Se já houve comunicação ao órgão
  if (dataComunicacaoOrgaoIso) {
    const comunicacao = new Date(dataComunicacaoOrgaoIso)
    const horasTomadas = Math.max(0, (comunicacao.getTime() - msDeteccao) / (1000 * 60 * 60))
    const cumpriu = horasTomadas <= 72
    return {
      horasDecorridas: Math.round(horasTomadas * 10) / 10,
      horasRestantes: Math.max(0, Math.round((72 - horasTomadas) * 10) / 10),
      statusPrazo: cumpriu ? 'cumprido_no_prazo' : 'cumprido_fora_prazo',
      label: cumpriu
        ? `Comunicado em ${Math.round(horasTomadas)}h (dentro do prazo de 72h)`
        : `Comunicado em ${Math.round(horasTomadas)}h (fora do prazo de 72h)`,
    }
  }

  // Ainda não comunicado
  const horasDecorridas = Math.max(0, (agora.getTime() - msDeteccao) / (1000 * 60 * 60))
  const horasRestantes = 72 - horasDecorridas

  if (horasRestantes <= 0) {
    return {
      horasDecorridas: Math.round(horasDecorridas * 10) / 10,
      horasRestantes: 0,
      statusPrazo: 'vencido',
      label: `Prazo de 72h vencido há ${Math.round(Math.abs(horasRestantes))}h`,
    }
  }

  if (horasRestantes < 24) {
    return {
      horasDecorridas: Math.round(horasDecorridas * 10) / 10,
      horasRestantes: Math.round(horasRestantes * 10) / 10,
      statusPrazo: 'atencao',
      label: `Atenção: restam ${Math.round(horasRestantes)}h para o prazo de 72h`,
    }
  }

  return {
    horasDecorridas: Math.round(horasDecorridas * 10) / 10,
    horasRestantes: Math.round(horasRestantes * 10) / 10,
    statusPrazo: 'no_prazo',
    label: `No prazo: restam ${Math.round(horasRestantes)}h de 72h`,
  }
}
