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
export function calcularCoberturaSeguranca(
  assets: InventoryAssetItem[],
  solucoes: SegSolucaoItem[],
  coberturasExigidas: SegCoberturaExigidaItem[],
  comprovantes: SegComprovanteItem[],
  itensConformidade: SegItemConformidadeItem[],
): SegurancaCoberturaCalculada {
  const estacoes = assets.filter(
    (a) => a.tipo === 'estacao' && a.status !== 'inativo' && a.status !== 'desativado',
  )
  const servidores = assets.filter(
    (a) =>
      (a.tipo === 'servidor_aplicacao' ||
        a.tipo === 'servidor_virtualizado' ||
        a.tipo === 'banco_dados') &&
      a.status !== 'inativo' &&
      a.status !== 'desativado',
  )
  const totalAtivos = estacoes.length + servidores.length

  // Cobertura exigida de endpoint (ajuste manual ou total derivado)
  const cobEndpointItem = coberturasExigidas.find((c) => c.tipo_solucao === 'endpoint_antivirus')
  const exigidasEndpoint =
    cobEndpointItem && cobEndpointItem.quantidade_exigida > 0
      ? cobEndpointItem.quantidade_exigida
      : Math.max(totalAtivos, 1)

  // Encontrar o comprovante mais recente de endpoint
  const comprovantesEndpoint = comprovantes.filter((c) => {
    const solTipo = c.expand?.solucao?.tipo
    return (
      solTipo === 'endpoint_antivirus' ||
      c.maquinas_protegidas !== undefined ||
      c.tipo === 'relatorio_console'
    )
  })

  // Comprovante mais recente geral
  const comprovanteMaisRecente = comprovantes.length > 0 ? comprovantes[0] : null
  const dataUltimoComprovante = comprovanteMaisRecente
    ? comprovanteMaisRecente.data_comprovante
    : undefined

  // Mais recente de endpoint
  const compEndpointRecente = comprovantesEndpoint.length > 0 ? comprovantesEndpoint[0] : null
  const comprovadasEndpoint = compEndpointRecente?.maquinas_protegidas ?? 0
  const semAgenteEndpoint = compEndpointRecente?.maquinas_sem_agente ?? 0
  const definicoesAtualizadasData = compEndpointRecente?.data_definicoes_atualizadas

  // Percentual real: (comprovadas ÷ exigidas) * 100, limitado a 100%
  const percentualCobertura = Math.min(
    100,
    Math.round((comprovadasEndpoint / Math.max(exigidasEndpoint, 1)) * 100),
  )

  // Firewall status consolidado
  const compFirewall = comprovantes.find(
    (c) => c.status_firewall || c.expand?.solucao?.tipo === 'firewall',
  )
  const statusFirewallConsolidado = compFirewall?.status_firewall || 'pendente_comprovacao'

  // Total de ameaças bloqueadas somadas de comprovantes
  const ameacasBloqueadasTotal = comprovantes.reduce(
    (acc, curr) => acc + (curr.ameacas_bloqueadas || 0),
    0,
  )

  const solucoesAtivasCount = solucoes.filter((s) => s.status === 'ativa').length
  const itensComprovadosCount = itensConformidade.filter((i) => i.status === 'comprovado').length
  const itensTotalCount = itensConformidade.length

  return {
    totalAtivosInventario: totalAtivos,
    estacoesCount: estacoes.length,
    servidoresCount: servidores.length,
    exigidasEndpoint,
    comprovadasEndpoint,
    semAgenteEndpoint,
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
