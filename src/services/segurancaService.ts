import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/csctiService'
import { calculateFileSha256 } from '@/services/designacaoService'
import type {
  SegSolucaoItem,
  SegSolucaoTipo,
  SegCoberturaExigidaItem,
  SegComprovanteItem,
  SegItemConformidadeItem,
  SegurancaCoberturaCalculada,
  InventoryAssetItem,
} from '@/types/cscti'

// ==========================================
// 1. SOLUÇÕES DE SEGURANÇA (seg_solucoes)
// ==========================================

export async function listSegSolucoes(
  orgId: string,
  apenasAtivas = false,
): Promise<SegSolucaoItem[]> {
  try {
    const filters = [`organization = '${orgId}'`]
    if (apenasAtivas) {
      filters.push("status = 'ativa'")
    }
    return await pb.collection('seg_solucoes').getFullList<SegSolucaoItem>({
      filter: filters.join(' && '),
      sort: '-created',
    })
  } catch (err) {
    console.error('Erro ao listar seg_solucoes:', err)
    return []
  }
}

export interface SaveSegSolucaoPayload {
  id?: string
  nome: string
  tipo: SegSolucaoTipo
  fornecedor?: string
  versao?: string
  status: 'ativa' | 'inativa' | 'em_avaliacao'
  escopo?: 'todas_estacoes_servidores' | 'somente_servidores' | 'somente_estacoes' | 'especifico'
  observacoes?: string
}

export async function saveSegSolucao(
  orgId: string,
  data: SaveSegSolucaoPayload,
): Promise<SegSolucaoItem> {
  const payload = {
    organization: orgId,
    nome: data.nome.trim(),
    tipo: data.tipo,
    fornecedor: data.fornecedor?.trim() || '',
    versao: data.versao?.trim() || '',
    status: data.status,
    escopo: data.escopo || 'todas_estacoes_servidores',
    observacoes: data.observacoes?.trim() || '',
  }

  let res: SegSolucaoItem
  if (data.id) {
    res = await pb.collection('seg_solucoes').update<SegSolucaoItem>(data.id, payload)
    await logAudit({
      action: 'SEG_SOLUCAO_UPDATE',
      entity: 'Segurança do Ambiente',
      detail: `Solução de segurança atualizada: "${res.nome}" (${res.tipo}) - Status: ${res.status}`,
      organizationId: orgId,
      metadata: { solucao_id: res.id, nome: res.nome, tipo: res.tipo },
    })
  } else {
    res = await pb.collection('seg_solucoes').create<SegSolucaoItem>(payload)
    await logAudit({
      action: 'SEG_SOLUCAO_CREATE',
      entity: 'Segurança do Ambiente',
      detail: `Nova solução de segurança cadastrada: "${res.nome}" (${res.tipo})`,
      organizationId: orgId,
      metadata: { solucao_id: res.id, nome: res.nome, tipo: res.tipo },
    })
  }
  return res
}

export async function deleteSegSolucao(id: string, orgId: string, nome?: string): Promise<void> {
  await pb.collection('seg_solucoes').delete(id)
  await logAudit({
    action: 'SEG_SOLUCAO_DELETE',
    entity: 'Segurança do Ambiente',
    detail: `Solução de segurança excluída: "${nome || id}"`,
    organizationId: orgId,
    metadata: { solucao_id: id },
  })
}

// ==========================================
// 2. COBERTURA EXIGIDA (seg_cobertura_exigida)
// ==========================================

export async function listSegCoberturasExigidas(orgId: string): Promise<SegCoberturaExigidaItem[]> {
  try {
    return await pb.collection('seg_cobertura_exigida').getFullList<SegCoberturaExigidaItem>({
      filter: `organization = '${orgId}'`,
      sort: 'tipo_solucao',
    })
  } catch (err) {
    console.error('Erro ao listar seg_cobertura_exigida:', err)
    return []
  }
}

export interface SaveSegCoberturaExigidaPayload {
  id?: string
  tipo_solucao: SegSolucaoTipo
  quantidade_exigida: number
  base_calculo?: string
  ajuste_manual?: boolean
  observacoes?: string
}

export async function saveSegCoberturaExigida(
  orgId: string,
  data: SaveSegCoberturaExigidaPayload,
): Promise<SegCoberturaExigidaItem> {
  const payload = {
    organization: orgId,
    tipo_solucao: data.tipo_solucao,
    quantidade_exigida: Math.max(0, Number(data.quantidade_exigida) || 0),
    base_calculo: data.base_calculo || 'Derivado do inventário',
    ajuste_manual: Boolean(data.ajuste_manual),
    observacoes: data.observacoes?.trim() || '',
  }

  let res: SegCoberturaExigidaItem
  if (data.id) {
    res = await pb
      .collection('seg_cobertura_exigida')
      .update<SegCoberturaExigidaItem>(data.id, payload)
    await logAudit({
      action: 'SEG_COBERTURA_UPDATE',
      entity: 'Segurança do Ambiente',
      detail: `Cobertura exigida atualizada para "${res.tipo_solucao}": ${res.quantidade_exigida} ativos`,
      organizationId: orgId,
      metadata: { cobertura_id: res.id, tipo: res.tipo_solucao, qtd: res.quantidade_exigida },
    })
  } else {
    res = await pb.collection('seg_cobertura_exigida').create<SegCoberturaExigidaItem>(payload)
    await logAudit({
      action: 'SEG_COBERTURA_CREATE',
      entity: 'Segurança do Ambiente',
      detail: `Cobertura exigida definida para "${res.tipo_solucao}": ${res.quantidade_exigida} ativos`,
      organizationId: orgId,
      metadata: { cobertura_id: res.id, tipo: res.tipo_solucao, qtd: res.quantidade_exigida },
    })
  }
  return res
}

// ==========================================
// 3. COMPROVANTES DE SEGURANÇA (seg_comprovantes)
// ==========================================

export async function listSegComprovantes(
  orgId: string,
  solucaoId?: string,
): Promise<SegComprovanteItem[]> {
  try {
    const filters = [`organization = '${orgId}'`]
    if (solucaoId) {
      filters.push(`solucao = '${solucaoId}'`)
    }
    return await pb.collection('seg_comprovantes').getFullList<SegComprovanteItem>({
      filter: filters.join(' && '),
      sort: '-data_comprovante',
      expand: 'solucao',
    })
  } catch (err) {
    console.error('Erro ao listar seg_comprovantes:', err)
    return []
  }
}

export async function getSegComprovanteById(id: string): Promise<SegComprovanteItem | null> {
  try {
    return await pb.collection('seg_comprovantes').getOne<SegComprovanteItem>(id, {
      expand: 'solucao',
    })
  } catch (err) {
    console.error('Erro ao buscar seg_comprovante por id:', err)
    return null
  }
}

export interface SaveSegComprovantePayload {
  id?: string
  solucao?: string
  data_comprovante: string
  tipo: 'relatorio_console' | 'print' | 'pdf' | 'email' | 'laudo_auditoria' | 'outro'
  arquivosNovos?: File[]
  hash_sha256?: string
  maquinas_protegidas?: number
  maquinas_sem_agente?: number
  data_definicoes_atualizadas?: string
  ameacas_bloqueadas?: number
  eventos_relevantes?: string
  status_firewall?: 'ativo' | 'inativo' | 'em_manutencao'
  data_revisao_regras_firewall?: string
  resumo_texto?: string
  registrado_por?: string
}

export async function saveSegComprovante(
  orgId: string,
  data: SaveSegComprovantePayload,
): Promise<SegComprovanteItem> {
  const formData = new FormData()
  formData.append('organization', orgId)
  if (data.solucao) formData.append('solucao', data.solucao)
  formData.append('data_comprovante', data.data_comprovante)
  formData.append('tipo', data.tipo)

  if (typeof data.maquinas_protegidas === 'number') {
    formData.append('maquinas_protegidas', String(data.maquinas_protegidas))
  }
  if (typeof data.maquinas_sem_agente === 'number') {
    formData.append('maquinas_sem_agente', String(data.maquinas_sem_agente))
  }
  if (data.data_definicoes_atualizadas) {
    formData.append('data_definicoes_atualizadas', data.data_definicoes_atualizadas)
  }
  if (typeof data.ameacas_bloqueadas === 'number') {
    formData.append('ameacas_bloqueadas', String(data.ameacas_bloqueadas))
  }
  if (data.eventos_relevantes) {
    formData.append('eventos_relevantes', data.eventos_relevantes.trim())
  }
  if (data.status_firewall) {
    formData.append('status_firewall', data.status_firewall)
  }
  if (data.data_revisao_regras_firewall) {
    formData.append('data_revisao_regras_firewall', data.data_revisao_regras_firewall)
  }
  if (data.resumo_texto) {
    formData.append('resumo_texto', data.resumo_texto.trim())
  }
  if (data.registrado_por) {
    formData.append('registrado_por', data.registrado_por.trim())
  }

  // Anexos e Hash SHA-256
  if (data.arquivosNovos && data.arquivosNovos.length > 0) {
    for (const f of data.arquivosNovos) {
      formData.append('arquivos', f)
    }
    if (!data.hash_sha256) {
      const firstHash = await calculateFileSha256(data.arquivosNovos[0])
      formData.append('hash_sha256', firstHash)
    } else {
      formData.append('hash_sha256', data.hash_sha256)
    }
  } else if (data.hash_sha256) {
    formData.append('hash_sha256', data.hash_sha256)
  }

  let res: SegComprovanteItem
  if (data.id) {
    res = await pb.collection('seg_comprovantes').update<SegComprovanteItem>(data.id, formData, {
      expand: 'solucao',
    })
    await logAudit({
      action: 'SEG_COMPROVANTE_UPDATE',
      entity: 'Segurança do Ambiente',
      detail: `Comprovante de segurança atualizado: data ${res.data_comprovante} (${res.tipo}) - SHA-256: ${res.hash_sha256 || 'n/a'}`,
      organizationId: orgId,
      metadata: { comprovante_id: res.id, data: res.data_comprovante, hash: res.hash_sha256 },
    })
  } else {
    res = await pb.collection('seg_comprovantes').create<SegComprovanteItem>(formData, {
      expand: 'solucao',
    })
    await logAudit({
      action: 'SEG_COMPROVANTE_CREATE',
      entity: 'Segurança do Ambiente',
      detail: `Novo comprovante de segurança inserido: data ${res.data_comprovante} (${res.tipo}) - SHA-256: ${res.hash_sha256 || 'n/a'}`,
      organizationId: orgId,
      metadata: { comprovante_id: res.id, data: res.data_comprovante, hash: res.hash_sha256 },
    })
  }
  return res
}

export async function deleteSegComprovante(id: string, orgId: string): Promise<void> {
  await pb.collection('seg_comprovantes').delete(id)
  await logAudit({
    action: 'SEG_COMPROVANTE_DELETE',
    entity: 'Segurança do Ambiente',
    detail: `Comprovante de segurança excluído: ID ${id}`,
    organizationId: orgId,
    metadata: { comprovante_id: id },
  })
}

export function getSegComprovanteFileUrl(record: SegComprovanteItem, filename: string): string {
  if (!filename) return ''
  return pb.files.getURL(record as any, filename)
}

// ==========================================
// 4. ITENS DE CONFORMIDADE (seg_itens_conformidade)
// ==========================================

export async function listSegItensConformidade(orgId: string): Promise<SegItemConformidadeItem[]> {
  try {
    return await pb.collection('seg_itens_conformidade').getFullList<SegItemConformidadeItem>({
      filter: `organization = '${orgId}'`,
      sort: 'ordem,created',
      expand: 'comprovante_vinculado',
    })
  } catch (err) {
    console.error('Erro ao listar seg_itens_conformidade:', err)
    return []
  }
}

export interface SaveSegItemConformidadePayload {
  id?: string
  item_nome: string
  descricao?: string
  categoria: 'endpoint' | 'firewall' | 'monitoramento' | 'acessos_senhas' | 'ativos_sistemas'
  status: 'comprovado' | 'pendente' | 'nao_conforme'
  comprovante_vinculado?: string
  prazo?: string
  observacoes?: string
  ordem?: number
}

export async function saveSegItemConformidade(
  orgId: string,
  data: SaveSegItemConformidadePayload,
): Promise<SegItemConformidadeItem> {
  const payload: Record<string, any> = {
    organization: orgId,
    item_nome: data.item_nome.trim(),
    descricao: data.descricao?.trim() || '',
    categoria: data.categoria,
    status: data.status,
    comprovante_vinculado: data.comprovante_vinculado || null,
    prazo: data.prazo || null,
    observacoes: data.observacoes?.trim() || '',
    ordem: typeof data.ordem === 'number' ? data.ordem : 10,
  }

  let res: SegItemConformidadeItem
  if (data.id) {
    res = await pb
      .collection('seg_itens_conformidade')
      .update<SegItemConformidadeItem>(data.id, payload, {
        expand: 'comprovante_vinculado',
      })
    await logAudit({
      action: 'SEG_ITEM_UPDATE',
      entity: 'Segurança do Ambiente',
      detail: `Item de conformidade de segurança atualizado: "${res.item_nome}" -> ${res.status}`,
      organizationId: orgId,
      metadata: { item_id: res.id, status: res.status, comprovante: res.comprovante_vinculado },
    })
  } else {
    res = await pb.collection('seg_itens_conformidade').create<SegItemConformidadeItem>(payload, {
      expand: 'comprovante_vinculado',
    })
    await logAudit({
      action: 'SEG_ITEM_CREATE',
      entity: 'Segurança do Ambiente',
      detail: `Novo item de conformidade de segurança cadastrado: "${res.item_nome}"`,
      organizationId: orgId,
      metadata: { item_id: res.id, status: res.status },
    })
  }
  return res
}

export async function deleteSegItemConformidade(
  id: string,
  orgId: string,
  nome?: string,
): Promise<void> {
  await pb.collection('seg_itens_conformidade').delete(id)
  await logAudit({
    action: 'SEG_ITEM_DELETE',
    entity: 'Segurança do Ambiente',
    detail: `Item de conformidade excluído: "${nome || id}"`,
    organizationId: orgId,
    metadata: { item_id: id },
  })
}

// ==========================================
// 5. CÁLCULO DE COBERTURA REAL
// ==========================================

/**
 * Confronta os ativos do inventário que devem possuir proteção com os comprovantes
 * mais recentes da serventia ativa.
 */
export function isAssetRelevantForEndpoint(asset: InventoryAssetItem): boolean {
  if (asset.status === 'inativo' || asset.status === 'desativado') return false
  if (asset.exige_endpoint_protection !== undefined && asset.exige_endpoint_protection !== null) {
    return Boolean(asset.exige_endpoint_protection)
  }
  return (
    asset.tipo === 'estacao' ||
    asset.tipo === 'servidor_aplicacao' ||
    asset.tipo === 'servidor_virtualizado' ||
    asset.tipo === 'banco_dados'
  )
}

/**
 * Confronta os ativos do inventário real que devem possuir proteção endpoint
 * contra os comprovantes vinculados e status individual máquina por máquina.
 */
export function calcularCoberturaSeguranca(
  assets: InventoryAssetItem[],
  solucoes: SegSolucaoItem[],
  coberturasExigidas: SegCoberturaExigidaItem[],
  comprovantes: SegComprovanteItem[],
  itensConformidade: SegItemConformidadeItem[],
): SegurancaCoberturaCalculada {
  const ativosValidos = assets.filter((a) => a.status !== 'inativo' && a.status !== 'desativado')

  const estacoes = ativosValidos.filter((a) => a.tipo === 'estacao')
  const servidores = ativosValidos.filter(
    (a) =>
      a.tipo === 'servidor_aplicacao' ||
      a.tipo === 'servidor_virtualizado' ||
      a.tipo === 'banco_dados',
  )
  const outros = ativosValidos.filter((a) => !estacoes.includes(a) && !servidores.includes(a))

  // Ativos que exigem proteção endpoint no inventário
  const ativosExigidos = ativosValidos.filter(isAssetRelevantForEndpoint)
  const totalExigidosInventario = ativosExigidos.length

  // Cobertura exigida de endpoint (ajuste manual da serventia ou total do inventário)
  const cobEndpointItem = coberturasExigidas.find((c) => c.tipo_solucao === 'endpoint_antivirus')
  const exigidasEndpoint =
    cobEndpointItem && cobEndpointItem.quantidade_exigida > 0
      ? cobEndpointItem.quantidade_exigida
      : totalExigidosInventario

  // Contagem nominal máquina por máquina nos ativos do inventário
  const protegidosNominais = ativosExigidos.filter((a) => a.endpoint_status === 'protegido').length
  const semAgenteNominais = ativosExigidos.filter((a) => a.endpoint_status === 'sem_agente').length
  const semComprovacaoNominais = ativosExigidos.filter(
    (a) => !a.endpoint_status || a.endpoint_status === 'sem_comprovacao',
  ).length

  // Comprovante mais recente de endpoint para dados temporais/laudo
  const comprovantesEndpoint = comprovantes.filter((c) => {
    const solTipo = c.expand?.solucao?.tipo
    return (
      solTipo === 'endpoint_antivirus' ||
      c.maquinas_protegidas !== undefined ||
      c.tipo === 'relatorio_console'
    )
  })

  const comprovanteMaisRecente = comprovantes.length > 0 ? comprovantes[0] : null
  const dataUltimoComprovante = comprovanteMaisRecente
    ? comprovanteMaisRecente.data_comprovante
    : undefined

  const compEndpointRecente = comprovantesEndpoint.length > 0 ? comprovantesEndpoint[0] : null
  const definicoesAtualizadasData = compEndpointRecente?.data_definicoes_atualizadas

  // Se houver ativos exigidos no inventário, a verdade nominal prevalece
  // Se não houver ativos no inventário cadastrados, o cálculo fica honesto (0%)
  const comprovadasEndpoint =
    totalExigidosInventario > 0
      ? protegidosNominais
      : (compEndpointRecente?.maquinas_protegidas ?? 0)

  const semAgenteEndpoint =
    totalExigidosInventario > 0
      ? semAgenteNominais
      : (compEndpointRecente?.maquinas_sem_agente ?? 0)

  const semComprovacaoEndpoint = totalExigidosInventario > 0 ? semComprovacaoNominais : 0

  // Percentual real: (comprovadas ÷ exigidas) * 100
  const divisor = Math.max(exigidasEndpoint, 1)
  const percentualCobertura =
    totalExigidosInventario === 0 &&
    (!compEndpointRecente || !compEndpointRecente.maquinas_protegidas)
      ? 0
      : Math.min(100, Math.round((comprovadasEndpoint / divisor) * 100))

  // Firewall status consolidado
  const compFirewall = comprovantes.find(
    (c) => c.status_firewall || c.expand?.solucao?.tipo === 'firewall',
  )
  const statusFirewallConsolidado = compFirewall?.status_firewall || 'pendente_comprovacao'

  const ameacasBloqueadasTotal = comprovantes.reduce(
    (acc, curr) => acc + (curr.ameacas_bloqueadas || 0),
    0,
  )

  const solucoesAtivasCount = solucoes.filter((s) => s.status === 'ativa').length
  const itensComprovadosCount = itensConformidade.filter((i) => i.status === 'comprovado').length
  const itensTotalCount = itensConformidade.length

  return {
    totalAtivosInventario: totalExigidosInventario,
    estacoesCount: estacoes.length,
    servidoresCount: servidores.length,
    outrosAtivosCount: outros.length,
    exigidasEndpoint,
    comprovadasEndpoint,
    semAgenteEndpoint,
    semComprovacaoEndpoint,
    percentualCobertura,
    definicoesAtualizadasData,
    statusFirewallConsolidado,
    ameacasBloqueadasTotal,
    solucoesAtivasCount,
    itensComprovadosCount,
    itensTotalCount,
    dataUltimoComprovante,
  }
}

// ==========================================
// 6. GESTÃO DE COBERTURA NOMINAL DE ATIVOS
// ==========================================

export interface VincularEndpointAtivoPayload {
  ativoId: string
  endpoint_status: 'protegido' | 'sem_agente' | 'sem_comprovacao'
  comprovanteId?: string
  solucaoId?: string
  data_comprovacao?: string
  hash_sha256?: string
  observacoes?: string
}

/**
 * Atualiza o status de cobertura de um único ativo com registro na auditoria append-only
 */
export async function updateAssetEndpointCoverage(
  orgId: string,
  asset: InventoryAssetItem,
  payload: VincularEndpointAtivoPayload,
): Promise<InventoryAssetItem> {
  const updateData: Record<string, any> = {
    endpoint_status: payload.endpoint_status,
    endpoint_comprovante: payload.comprovanteId || null,
    endpoint_solucao: payload.solucaoId || null,
    endpoint_data_comprovacao: payload.data_comprovacao || null,
    endpoint_hash_sha256: payload.hash_sha256 || '',
    endpoint_observacoes: payload.observacoes || '',
  }

  const updatedAsset = await pb
    .collection('inventory_assets')
    .update<InventoryAssetItem>(asset.id, updateData, {
      expand: 'endpoint_comprovante,endpoint_solucao,responsavel',
    })

  const statusLabel =
    payload.endpoint_status === 'protegido'
      ? 'Protegido (Comprovado)'
      : payload.endpoint_status === 'sem_agente'
        ? 'Sem agente / Não protegido'
        : 'Sem comprovação'

  await logAudit({
    action: 'SEG_ATIVO_COVERAGE_UPDATE',
    entity: 'Segurança do Ambiente',
    detail: `Status de proteção do ativo "${asset.name}" (${asset.tipo}) alterado para: ${statusLabel}${
      payload.comprovanteId ? ` via comprovante [${payload.comprovanteId}]` : ''
    }`,
    organizationId: orgId,
    metadata: {
      ativo_id: asset.id,
      ativo_nome: asset.name,
      ativo_tipo: asset.tipo,
      origem: asset.origem,
      status_anterior: asset.endpoint_status || 'sem_comprovacao',
      status_novo: payload.endpoint_status,
      comprovante_id: payload.comprovanteId || null,
      hash_sha256: payload.hash_sha256 || null,
    },
  })

  return updatedAsset
}

export interface BatchVincularEndpointPayload {
  assetIds: string[]
  endpoint_status: 'protegido' | 'sem_agente' | 'sem_comprovacao'
  comprovanteId?: string
  solucaoId?: string
  data_comprovacao?: string
  hash_sha256?: string
  observacoes?: string
}

/**
 * Atualiza o status de cobertura de múltiplos ativos em lote com auditoria append-only
 */
export async function batchUpdateAssetsEndpointCoverage(
  orgId: string,
  assets: InventoryAssetItem[],
  payload: BatchVincularEndpointPayload,
): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0
  const errors: string[] = []
  const targetAssets = assets.filter((a) => payload.assetIds.includes(a.id))

  for (const asset of targetAssets) {
    try {
      const updateData: Record<string, any> = {
        endpoint_status: payload.endpoint_status,
        endpoint_comprovante: payload.comprovanteId || null,
        endpoint_solucao: payload.solucaoId || null,
        endpoint_data_comprovacao: payload.data_comprovacao || null,
        endpoint_hash_sha256: payload.hash_sha256 || '',
        endpoint_observacoes: payload.observacoes || '',
      }

      await pb.collection('inventory_assets').update(asset.id, updateData)
      successCount++
    } catch (err: any) {
      console.error(`Erro ao atualizar ativo ${asset.id}:`, err)
      errors.push(`${asset.name}: ${err?.message || 'Falha ao atualizar'}`)
    }
  }

  const statusLabel =
    payload.endpoint_status === 'protegido'
      ? 'Protegido'
      : payload.endpoint_status === 'sem_agente'
        ? 'Sem agente / Não protegido'
        : 'Sem comprovação'

  await logAudit({
    action: 'SEG_ATIVOS_COVERAGE_BATCH',
    entity: 'Segurança do Ambiente',
    detail: `Atualização em lote de cobertura: ${successCount} ativo(s) marcados como "${statusLabel}"${
      payload.comprovanteId ? ` vinculados ao comprovante [${payload.comprovanteId}]` : ''
    }`,
    organizationId: orgId,
    metadata: {
      total_solicitado: payload.assetIds.length,
      sucessos: successCount,
      falhas: errors.length,
      status_definido: payload.endpoint_status,
      comprovante_id: payload.comprovanteId || null,
      hash_sha256: payload.hash_sha256 || null,
      ativos: targetAssets.map((a) => ({ id: a.id, name: a.name, tipo: a.tipo })),
    },
  })

  return { successCount, errors }
}

/**
 * Altera a flag se o ativo exige endpoint protection no inventário
 */
export async function toggleAssetExigeEndpoint(
  orgId: string,
  asset: InventoryAssetItem,
  exige: boolean,
): Promise<InventoryAssetItem> {
  const updated = await pb.collection('inventory_assets').update<InventoryAssetItem>(
    asset.id,
    {
      exige_endpoint_protection: exige,
    },
    {
      expand: 'endpoint_comprovante,endpoint_solucao,responsavel',
    },
  )

  await logAudit({
    action: 'SEG_ATIVO_EXIGENCIA_TOGGLE',
    entity: 'Segurança do Ambiente',
    detail: `Exigência de endpoint protection para "${asset.name}" alterada para: ${
      exige ? 'Exigida' : 'Dispensada'
    }`,
    organizationId: orgId,
    metadata: {
      ativo_id: asset.id,
      ativo_nome: asset.name,
      exige_anterior: Boolean(asset.exige_endpoint_protection),
      exige_novo: exige,
    },
  })

  return updated
}
