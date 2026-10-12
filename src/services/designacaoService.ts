import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/csctiService'
import type {
  PapelDesignadoItem,
  DesignacaoItem,
  DesignacaoDocumentoItem,
  DesignacaoStatus,
  OrganizationItem,
} from '@/types/cscti'

/**
 * Calcula o hash SHA-256 de um arquivo no navegador utilizando a SubtleCrypto API nativa
 */
export async function calculateFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Calcula o hash SHA-256 de um texto simples (usado para snapshots de documentos gerados)
 */
export async function calculateTextSha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ==========================================
// 1. Catálogo de Papéis Designados
// ==========================================

export async function listPapeisDesignados(
  orgId: string,
  apenasAtivos = false,
): Promise<PapelDesignadoItem[]> {
  try {
    const filters: string[] = [`organization = '${orgId}'`]
    if (apenasAtivos) {
      filters.push("status = 'ativo'")
    }
    return await pb.collection('papeis_designados').getFullList<PapelDesignadoItem>({
      filter: filters.join(' && '),
      sort: 'ordem,papel',
    })
  } catch (err) {
    console.error('Erro ao listar papeis_designados:', err)
    return []
  }
}

export async function savePapelDesignado(
  orgId: string,
  data: Partial<PapelDesignadoItem> & { papel: string; atribuicoes_detalhadas: string },
): Promise<PapelDesignadoItem> {
  const payload = {
    organization: orgId,
    papel: data.papel.trim(),
    codigo:
      data.codigo?.trim() ||
      `PAPEL_${data.papel
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')}`,
    descricao_curta: data.descricao_curta?.trim() || '',
    atribuicoes_detalhadas: data.atribuicoes_detalhadas.trim(),
    e_obrigatorio: Boolean(data.e_obrigatorio),
    da_ferramenta: Boolean(data.da_ferramenta),
    modulo_vinculado: data.modulo_vinculado?.trim() || '',
    ordem: typeof data.ordem === 'number' ? data.ordem : 100,
    status: data.status || 'ativo',
  }

  let res: PapelDesignadoItem
  if (data.id) {
    res = await pb.collection('papeis_designados').update<PapelDesignadoItem>(data.id, payload)
    await logAudit({
      action: 'PAPEL_DESIGNADO_UPDATE',
      entity: 'Papéis e Atribuições',
      detail: `Papel atualizado: "${res.papel}" (obrigatório: ${res.e_obrigatorio ? 'Sim' : 'Não'})`,
      organizationId: orgId,
      metadata: { papel_id: res.id, papel: res.papel },
    })
  } else {
    res = await pb.collection('papeis_designados').create<PapelDesignadoItem>(payload)
    await logAudit({
      action: 'PAPEL_DESIGNADO_CREATE',
      entity: 'Papéis e Atribuições',
      detail: `Novo papel cadastrado: "${res.papel}"`,
      organizationId: orgId,
      metadata: { papel_id: res.id, papel: res.papel },
    })
  }
  return res
}

export async function deletePapelDesignado(
  id: string,
  orgId: string,
  papelNome?: string,
): Promise<void> {
  await pb.collection('papeis_designados').delete(id)
  await logAudit({
    action: 'PAPEL_DESIGNADO_DELETE',
    entity: 'Papéis e Atribuições',
    detail: `Papel excluído: "${papelNome || id}"`,
    organizationId: orgId,
    metadata: { papel_id: id },
  })
}

// ==========================================
// 2. Designações de Pessoas
// ==========================================

export async function listDesignacoes(orgId: string, papelId?: string): Promise<DesignacaoItem[]> {
  try {
    const filters: string[] = [`organization = '${orgId}'`]
    if (papelId) {
      filters.push(`papel_designado = '${papelId}'`)
    }
    return await pb.collection('designacoes').getFullList<DesignacaoItem>({
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'papel_designado,colaborador,organization',
    })
  } catch (err) {
    console.error('Erro ao listar designacoes:', err)
    return []
  }
}

export async function getDesignacaoById(id: string): Promise<DesignacaoItem | null> {
  try {
    return await pb.collection('designacoes').getOne<DesignacaoItem>(id, {
      expand: 'papel_designado,colaborador,organization',
    })
  } catch (err) {
    console.error('Erro ao buscar designacao:', err)
    return null
  }
}

export interface SaveDesignacaoPayload {
  id?: string
  papel_designado: string
  colaborador?: string
  nome_designado: string
  cpf_designado?: string
  email_designado?: string
  telefone_designado?: string
  cargo_designado?: string
  status?: DesignacaoStatus
  data_designacao: string
  data_assinatura?: string
  plataforma_assinatura?: string
  observacoes?: string
  atribuicoes_customizadas?: string
  metodo_assinatura_detalhes?: string
  arquivoComprovante?: File
  hash_sha256?: string
}

export async function saveDesignacao(
  orgId: string,
  data: SaveDesignacaoPayload,
): Promise<DesignacaoItem> {
  const formData = new FormData()

  formData.append('organization', orgId)
  formData.append('papel_designado', data.papel_designado)
  if (data.colaborador) {
    formData.append('colaborador', data.colaborador)
  }
  formData.append('nome_designado', data.nome_designado.trim())
  formData.append('cpf_designado', (data.cpf_designado || '').trim())
  formData.append('email_designado', (data.email_designado || '').trim())
  formData.append('telefone_designado', (data.telefone_designado || '').trim())
  formData.append('cargo_designado', (data.cargo_designado || '').trim())
  formData.append('status', data.status || 'pendente_assinatura')
  formData.append('data_designacao', data.data_designacao)

  if (data.data_assinatura) {
    formData.append('data_assinatura', data.data_assinatura)
  }
  if (data.plataforma_assinatura) {
    formData.append('plataforma_assinatura', data.plataforma_assinatura.trim())
  }
  if (data.observacoes) {
    formData.append('observacoes', data.observacoes.trim())
  }
  if (data.atribuicoes_customizadas) {
    formData.append('atribuicoes_customizadas', data.atribuicoes_customizadas.trim())
  }
  if (data.metodo_assinatura_detalhes) {
    formData.append('metodo_assinatura_detalhes', data.metodo_assinatura_detalhes.trim())
  }

  // Upload do arquivo comprobatório com hash SHA-256
  if (data.arquivoComprovante) {
    formData.append('anexos_comprovante', data.arquivoComprovante)
    const hash = data.hash_sha256 || (await calculateFileSha256(data.arquivoComprovante))
    formData.append('hash_sha256', hash)
  } else if (data.hash_sha256) {
    formData.append('hash_sha256', data.hash_sha256)
  }

  let res: DesignacaoItem
  if (data.id) {
    res = await pb.collection('designacoes').update<DesignacaoItem>(data.id, formData, {
      expand: 'papel_designado,colaborador,organization',
    })
    await logAudit({
      action: 'DESIGNAÇÃO_UPDATE',
      entity: 'Designações de Pessoas',
      detail: `Designação atualizada para "${res.nome_designado}" - Status: ${res.status}`,
      organizationId: orgId,
      metadata: {
        designacao_id: res.id,
        nome: res.nome_designado,
        status: res.status,
        hash_sha256: res.hash_sha256,
      },
    })
  } else {
    res = await pb.collection('designacoes').create<DesignacaoItem>(formData, {
      expand: 'papel_designado,colaborador,organization',
    })
    await logAudit({
      action: 'DESIGNAÇÃO_CREATE',
      entity: 'Designações de Pessoas',
      detail: `Nova designação criada para "${res.nome_designado}" - Status: ${res.status}`,
      organizationId: orgId,
      metadata: {
        designacao_id: res.id,
        nome: res.nome_designado,
        status: res.status,
      },
    })
  }
  return res
}

/**
 * Anexa o documento assinado (físico digitalizado ou com assinatura eletrônica de plataforma)
 * atualizando o status, a data de assinatura e o hash SHA-256 comprobatório
 */
export async function anexarDocumentoAssinado(
  orgId: string,
  designacaoId: string,
  file: File,
  tipoAssinatura: 'fisica' | 'digital',
  dataAssinaturaIso: string,
  detalhes?: {
    plataforma?: string
    metodoDetalhes?: string
    observacoes?: string
  },
): Promise<DesignacaoItem> {
  const hashSha256 = await calculateFileSha256(file)
  const formData = new FormData()

  formData.append('anexos_comprovante', file)
  formData.append('hash_sha256', hashSha256)
  formData.append('status', tipoAssinatura === 'fisica' ? 'assinada_fisica' : 'assinada_digital')
  formData.append('data_assinatura', dataAssinaturaIso)

  if (detalhes?.plataforma) {
    formData.append('plataforma_assinatura', detalhes.plataforma.trim())
  }
  if (detalhes?.metodoDetalhes) {
    formData.append('metodo_assinatura_detalhes', detalhes.metodoDetalhes.trim())
  }
  if (detalhes?.observacoes) {
    formData.append('observacoes', detalhes.observacoes.trim())
  }

  const updated = await pb
    .collection('designacoes')
    .update<DesignacaoItem>(designacaoId, formData, {
      expand: 'papel_designado,colaborador,organization',
    })

  await logAudit({
    action: 'DESIGNAÇÃO_DOCUMENTO_ANEXADO',
    entity: 'Designações de Pessoas',
    detail: `Documento comprobatório assinado anexado (${tipoAssinatura === 'fisica' ? 'Assinatura Física' : 'Assinatura Eletrônica'}) para "${updated.nome_designado}" - SHA-256: ${hashSha256}`,
    organizationId: orgId,
    metadata: {
      designacao_id: updated.id,
      nome_designado: updated.nome_designado,
      tipo_assinatura: tipoAssinatura,
      hash_sha256: hashSha256,
      arquivo_nome: file.name,
      arquivo_tamanho: file.size,
      plataforma: detalhes?.plataforma,
    },
  })

  return updated
}

/**
 * Revoga uma designação com registro de data, motivo e auditoria append-only
 */
export async function revogarDesignacao(
  orgId: string,
  designacaoId: string,
  motivo: string,
  revogadoPorNome: string,
): Promise<DesignacaoItem> {
  const dataRevogacao = new Date().toISOString()
  const updated = await pb.collection('designacoes').update<DesignacaoItem>(
    designacaoId,
    {
      status: 'revogada',
      data_revogacao: dataRevogacao,
      motivo_revogacao: motivo.trim(),
      revogado_por: revogadoPorNome.trim(),
    },
    { expand: 'papel_designado,colaborador,organization' },
  )

  await logAudit({
    action: 'DESIGNAÇÃO_REVOGADA',
    entity: 'Designações de Pessoas',
    detail: `Designação de "${updated.nome_designado}" revogada por ${revogadoPorNome}. Motivo: ${motivo}`,
    organizationId: orgId,
    metadata: {
      designacao_id: updated.id,
      nome_designado: updated.nome_designado,
      motivo,
      revogado_por: revogadoPorNome,
      data_revogacao: dataRevogacao,
    },
  })

  return updated
}

export async function deleteDesignacao(id: string, orgId: string, nome?: string): Promise<void> {
  await pb.collection('designacoes').delete(id)
  await logAudit({
    action: 'DESIGNAÇÃO_DELETE',
    entity: 'Designações de Pessoas',
    detail: `Registro de designação excluído: "${nome || id}"`,
    organizationId: orgId,
    metadata: { designacao_id: id },
  })
}

/**
 * Retorna a URL absoluta de um anexo comprobatório da designação
 */
export function getDesignacaoAnexoUrl(record: DesignacaoItem, filename: string): string {
  if (!filename) return ''
  return pb.files.getURL(record as any, filename)
}

// ==========================================
// 3. Documentos Gerados (Termos de Designação)
// ==========================================

export async function listDesignacaoDocumentos(
  orgId: string,
  designacaoId: string,
): Promise<DesignacaoDocumentoItem[]> {
  try {
    return await pb.collection('designacao_documentos').getFullList<DesignacaoDocumentoItem>({
      filter: `organization = '${orgId}' && designacao = '${designacaoId}'`,
      sort: '-created',
    })
  } catch (err) {
    console.error('Erro ao listar documentos da designacao:', err)
    return []
  }
}

export async function registrarGeracaoTermo(
  orgId: string,
  designacao: DesignacaoItem,
  org: OrganizationItem,
  conteudoTexto: string,
  conteudoHtml: string,
  geradoPorNome: string,
): Promise<DesignacaoDocumentoItem> {
  const hashConteudo = await calculateTextSha256(conteudoTexto)
  const agora = new Date().toISOString()

  const payload = {
    organization: orgId,
    designacao: designacao.id,
    titulo: `Termo de Designação - ${designacao.nome_designado} (${designacao.expand?.papel_designado?.papel || 'Responsável'})`,
    tipo_documento: 'termo_designacao',
    versao: '1.0',
    conteudo_html: conteudoHtml,
    conteudo_texto: conteudoTexto,
    dados_serventia_snapshot: {
      name: org.name,
      corporate_name: org.corporate_name,
      cnpj: org.cnpj,
      city: org.city,
      state: org.state,
      address: `${org.street || ''}, ${org.number || ''} ${org.complement || ''} - ${org.neighborhood || ''}`,
    },
    dados_designado_snapshot: {
      nome: designacao.nome_designado,
      cpf: designacao.cpf_designado,
      cargo: designacao.cargo_designado,
      email: designacao.email_designado,
      telefone: designacao.telefone_designado,
      papel: designacao.expand?.papel_designado?.papel,
    },
    hash_conteudo: hashConteudo,
    gerado_em: agora,
    gerado_por: geradoPorNome,
  }

  const res = await pb.collection('designacao_documentos').create<DesignacaoDocumentoItem>(payload)

  await logAudit({
    action: 'TERMO_DESIGNAÇÃO_GERADO',
    entity: 'Termos de Designação',
    detail: `Termo institucional de designação gerado para "${designacao.nome_designado}" - Hash SHA-256 do texto: ${hashConteudo}`,
    organizationId: orgId,
    metadata: {
      documento_id: res.id,
      designacao_id: designacao.id,
      nome_designado: designacao.nome_designado,
      hash_conteudo: hashConteudo,
    },
  })

  return res
}
