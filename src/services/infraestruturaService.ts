import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/csctiService'
import { calculateFileSha256 } from '@/services/designacaoService'
import type {
  InfraItem,
  InfraLinkItem,
  InfraChecklistItem,
  InfraConfrontoConectividade,
  InfraRaioX,
  InventoryAssetItem,
  OrganizationItem,
} from '@/types/cscti'

// ==========================================
// 1. Regras de Domínio Neutras de Conectividade
// ==========================================
// Classe 1: 2 Mbps, Classe 2: 10 Mbps, Classe 3: 50 Mbps (exigência neutra de domínio)
export function getVelocidadeExigidaPorClasse(classe?: string): number {
  if (!classe) return 10
  const c = classe.toUpperCase()
  if (c.includes('1') || c === 'CLASSE 1' || c === 'C1') return 2
  if (c.includes('2') || c === 'CLASSE 2' || c === 'C2') return 10
  if (c.includes('3') || c === 'CLASSE 3' || c === 'C3') return 50
  return 10
}

export function confrontarConectividade(
  org: OrganizationItem | null | undefined,
  links: InfraLinkItem[],
): InfraConfrontoConectividade {
  const classe = org?.provimento_class || '2'
  const exigida = getVelocidadeExigidaPorClasse(classe)

  const linksAtivos = links.filter((l) => l.status === 'ativo')
  const totalAtiva = linksAtivos.reduce((acc, l) => acc + (Number(l.velocidade_mbps) || 0), 0)

  const linkPrincipal = linksAtivos.find((l) => !l.redundancia) || linksAtivos[0] || undefined
  const linkRedundante =
    linksAtivos.find((l) => l.redundancia) || (linksAtivos.length > 1 ? linksAtivos[1] : undefined)

  const possuiRedundancia = Boolean(
    linkRedundante || linksAtivos.some((l) => l.redundancia) || linksAtivos.length >= 2,
  )
  const atendeVelocidade = totalAtiva >= exigida
  const atendeRedundancia = possuiRedundancia

  let statusGeral: 'conforme' | 'parcial' | 'nao_conforme' = 'pendente' as any
  if (atendeVelocidade && atendeRedundancia) {
    statusGeral = 'conforme'
  } else if (atendeVelocidade || atendeRedundancia) {
    statusGeral = 'parcial'
  } else {
    statusGeral = 'nao_conforme'
  }

  return {
    classeServentia: classe,
    velocidadeExigidaMbps: exigida,
    velocidadeTotalAtivaMbps: totalAtiva,
    linkPrincipal,
    linkRedundante,
    totalLinksAtivos: linksAtivos.length,
    possuiRedundancia,
    atendeVelocidade,
    atendeRedundancia,
    statusGeral,
  }
}

// ==========================================
// 2. Mapeamento de Categorias de Evidências
// ==========================================
export const INFRA_EVIDENCIA_CATEGORIAS_MAP: Record<string, string> = {
  nobreak: 'Nobreaks',
  gerador: 'Gerador de energia',
  ar_condicionado: 'Ar-condicionado',
  racks: 'Racks',
  sala_ti: 'Sala de TI',
  combate_incendio: 'Extintores de incêndio',
  controle_acesso_fisico: 'Sala de TI',
  laudo_aterramento: 'Documentos e Políticas',
  plano_contingencia_energia: 'Documentos e Políticas',
  criptografia_dados: 'Documentos e Políticas',
}

// ==========================================
// 3. CRUD: Infra Itens (Energia, Ambiente Físico, Lógica)
// ==========================================

export async function listInfraItens(
  orgId: string,
  categoria?: 'energia' | 'ambiente_fisico' | 'camada_logica',
): Promise<InfraItem[]> {
  try {
    const filters: string[] = [`organization = '${orgId}'`]
    if (categoria) {
      filters.push(`categoria = '${categoria}'`)
    }
    return await pb.collection('infra_itens').getFullList<InfraItem>({
      filter: filters.join(' && '),
      sort: '-created',
      expand: 'evidencia_vinculada,responsavel_designado,organization',
    })
  } catch (err) {
    console.error('[infraestruturaService] Erro ao listar infra_itens:', err)
    return []
  }
}

export interface SaveInfraItemPayload {
  id?: string
  categoria: 'energia' | 'ambiente_fisico' | 'camada_logica'
  tipo_item: string
  titulo: string
  descricao?: string
  status: 'conforme' | 'parcial' | 'pendente' | 'nao_conforme'
  modelo?: string
  autonomia_minutos?: number
  quantidade?: number
  potencia_va?: number
  art_numero?: string
  responsavel_tecnico?: string
  data_inspecao?: string
  data_validade?: string
  redundancia_instalada?: boolean
  data_recarga_extintor?: string
  data_vencimento_extintor?: string
  tipo_controle_acesso?: string
  criptografia_repouso?: boolean
  criptografia_transito?: boolean
  algoritmo_criptografia?: string
  evidencia_vinculada?: string
  categoria_evidencia_sugerida?: string
  responsavel_designado?: string
  observacoes?: string
  arquivosNovos?: File[]
  arquivosExistentes?: string[]
  hash_sha256?: string
}

export async function saveInfraItem(orgId: string, data: SaveInfraItemPayload): Promise<InfraItem> {
  const formData = new FormData()

  formData.append('organization', orgId)
  formData.append('categoria', data.categoria)
  formData.append('tipo_item', data.tipo_item)
  formData.append('titulo', data.titulo.trim())
  if (data.descricao) formData.append('descricao', data.descricao.trim())
  formData.append('status', data.status)

  if (data.modelo) formData.append('modelo', data.modelo.trim())
  if (typeof data.autonomia_minutos === 'number') {
    formData.append('autonomia_minutos', String(data.autonomia_minutos))
  }
  if (typeof data.quantidade === 'number') {
    formData.append('quantidade', String(data.quantidade))
  }
  if (typeof data.potencia_va === 'number') {
    formData.append('potencia_va', String(data.potencia_va))
  }

  if (data.art_numero) formData.append('art_numero', data.art_numero.trim())
  if (data.responsavel_tecnico)
    formData.append('responsavel_tecnico', data.responsavel_tecnico.trim())
  if (data.data_inspecao) formData.append('data_inspecao', data.data_inspecao)
  if (data.data_validade) formData.append('data_validade', data.data_validade)

  formData.append('redundancia_instalada', String(Boolean(data.redundancia_instalada)))
  if (data.data_recarga_extintor)
    formData.append('data_recarga_extintor', data.data_recarga_extintor)
  if (data.data_vencimento_extintor)
    formData.append('data_vencimento_extintor', data.data_vencimento_extintor)
  if (data.tipo_controle_acesso)
    formData.append('tipo_controle_acesso', data.tipo_controle_acesso.trim())

  formData.append('criptografia_repouso', String(Boolean(data.criptografia_repouso)))
  formData.append('criptografia_transito', String(Boolean(data.criptografia_transito)))
  if (data.algoritmo_criptografia)
    formData.append('algoritmo_criptografia', data.algoritmo_criptografia.trim())

  if (data.evidencia_vinculada) {
    formData.append('evidencia_vinculada', data.evidencia_vinculada)
  } else {
    formData.append('evidencia_vinculada', '')
  }

  const catSugerida =
    data.categoria_evidencia_sugerida ||
    INFRA_EVIDENCIA_CATEGORIAS_MAP[data.tipo_item] ||
    'Documentos e Políticas'
  formData.append('categoria_evidencia_sugerida', catSugerida)

  if (data.responsavel_designado) {
    formData.append('responsavel_designado', data.responsavel_designado)
  } else {
    formData.append('responsavel_designado', '')
  }

  if (data.observacoes) formData.append('observacoes', data.observacoes.trim())

  // Upload de arquivos e cálculo de hash SHA-256
  if (data.arquivosNovos && data.arquivosNovos.length > 0) {
    for (const file of data.arquivosNovos) {
      formData.append('arquivos', file)
    }
    const hash = await calculateFileSha256(data.arquivosNovos[0])
    formData.append('hash_sha256', hash)
  } else if (data.hash_sha256) {
    formData.append('hash_sha256', data.hash_sha256)
  }

  let res: InfraItem
  if (data.id) {
    if (data.arquivosExistentes) {
      for (const f of data.arquivosExistentes) {
        formData.append('arquivos', f)
      }
    }
    res = await pb.collection('infra_itens').update<InfraItem>(data.id, formData, {
      expand: 'evidencia_vinculada,responsavel_designado,organization',
    })
    await logAudit({
      action: 'INFRA_ITEM_UPDATE',
      entity: 'Infraestrutura Física e Lógica',
      detail: `Item de infraestrutura atualizado: "${res.titulo}" (${res.categoria} - ${res.status})`,
      organizationId: orgId,
      metadata: { id: res.id, categoria: res.categoria, status: res.status },
    })
  } else {
    res = await pb.collection('infra_itens').create<InfraItem>(formData, {
      expand: 'evidencia_vinculada,responsavel_designado,organization',
    })
    await logAudit({
      action: 'INFRA_ITEM_CREATE',
      entity: 'Infraestrutura Física e Lógica',
      detail: `Novo item de infraestrutura cadastrado: "${res.titulo}" (${res.categoria} - ${res.status})`,
      organizationId: orgId,
      metadata: { id: res.id, categoria: res.categoria, status: res.status },
    })
  }

  return res
}

export async function deleteInfraItem(id: string, orgId: string, titulo?: string): Promise<void> {
  await pb.collection('infra_itens').delete(id)
  await logAudit({
    action: 'INFRA_ITEM_DELETE',
    entity: 'Infraestrutura Física e Lógica',
    detail: `Item de infraestrutura excluído: "${titulo || id}"`,
    organizationId: orgId,
    metadata: { id },
  })
}

// ==========================================
// 4. CRUD: Infra Links (Conectividade)
// ==========================================

export async function listInfraLinks(orgId: string): Promise<InfraLinkItem[]> {
  try {
    return await pb.collection('infra_links').getFullList<InfraLinkItem>({
      filter: `organization = '${orgId}'`,
      sort: '-redundancia,-velocidade_mbps,-created',
      expand: 'organization',
    })
  } catch (err) {
    console.error('[infraestruturaService] Erro ao listar infra_links:', err)
    return []
  }
}

export interface SaveInfraLinkPayload {
  id?: string
  operadora: string
  identificacao?: string
  velocidade_mbps: number
  tipo_link: 'dedicado' | 'compartilhado'
  meio_transmissao?: 'fibra_optica' | 'radio' | 'satelite' | 'cabo_metalico' | '4g_5g' | 'outro'
  status: 'ativo' | 'inativo' | 'em_manutencao'
  redundancia?: boolean
  ip_fixo?: boolean
  circuito_id?: string
  contato_suporte?: string
  observacoes?: string
  arquivoContrato?: File
  hash_sha256?: string
}

export async function saveInfraLink(
  orgId: string,
  data: SaveInfraLinkPayload,
): Promise<InfraLinkItem> {
  const formData = new FormData()

  formData.append('organization', orgId)
  formData.append('operadora', data.operadora.trim())
  if (data.identificacao) formData.append('identificacao', data.identificacao.trim())
  formData.append('velocidade_mbps', String(data.velocidade_mbps))
  formData.append('tipo_link', data.tipo_link)
  if (data.meio_transmissao) formData.append('meio_transmissao', data.meio_transmissao)
  formData.append('status', data.status)
  formData.append('redundancia', String(Boolean(data.redundancia)))
  formData.append('ip_fixo', String(Boolean(data.ip_fixo)))
  if (data.circuito_id) formData.append('circuito_id', data.circuito_id.trim())
  if (data.contato_suporte) formData.append('contato_suporte', data.contato_suporte.trim())
  if (data.observacoes) formData.append('observacoes', data.observacoes.trim())

  if (data.arquivoContrato) {
    formData.append('arquivos', data.arquivoContrato)
    const hash = await calculateFileSha256(data.arquivoContrato)
    formData.append('hash_sha256', hash)
  } else if (data.hash_sha256) {
    formData.append('hash_sha256', data.hash_sha256)
  }

  let res: InfraLinkItem
  if (data.id) {
    res = await pb.collection('infra_links').update<InfraLinkItem>(data.id, formData)
    await logAudit({
      action: 'INFRA_LINK_UPDATE',
      entity: 'Conectividade e Links',
      detail: `Link atualizado: ${res.operadora} (${res.velocidade_mbps} Mbps, ${res.tipo_link}, ${res.status})`,
      organizationId: orgId,
      metadata: { id: res.id, operadora: res.operadora, velocidade: res.velocidade_mbps },
    })
  } else {
    res = await pb.collection('infra_links').create<InfraLinkItem>(formData)
    await logAudit({
      action: 'INFRA_LINK_CREATE',
      entity: 'Conectividade e Links',
      detail: `Novo link cadastrado: ${res.operadora} (${res.velocidade_mbps} Mbps, ${res.tipo_link})`,
      organizationId: orgId,
      metadata: { id: res.id, operadora: res.operadora, velocidade: res.velocidade_mbps },
    })
  }

  return res
}

export async function deleteInfraLink(
  id: string,
  orgId: string,
  operadora?: string,
): Promise<void> {
  await pb.collection('infra_links').delete(id)
  await logAudit({
    action: 'INFRA_LINK_DELETE',
    entity: 'Conectividade e Links',
    detail: `Link excluído: ${operadora || id}`,
    organizationId: orgId,
    metadata: { id },
  })
}

// ==========================================
// 5. CRUD: Infra Checklist Geral
// ==========================================

export async function listInfraChecklist(orgId: string): Promise<InfraChecklistItem[]> {
  try {
    return await pb.collection('infra_checklist_itens').getFullList<InfraChecklistItem>({
      filter: `organization = '${orgId}'`,
      sort: 'ordem,codigo',
      expand: 'registro_vinculado,link_vinculado,evidencia_vinculada',
    })
  } catch (err) {
    console.error('[infraestruturaService] Erro ao listar infra_checklist_itens:', err)
    return []
  }
}

export async function updateInfraChecklistItem(
  id: string,
  orgId: string,
  data: Partial<InfraChecklistItem>,
): Promise<InfraChecklistItem> {
  const updated = await pb
    .collection('infra_checklist_itens')
    .update<InfraChecklistItem>(id, data, {
      expand: 'registro_vinculado,link_vinculado,evidencia_vinculada',
    })

  await logAudit({
    action: 'INFRA_CHECKLIST_UPDATE',
    entity: 'Checklist de Infraestrutura',
    detail: `Item de checklist "${updated.item_nome}" atualizado para status "${updated.status}"`,
    organizationId: orgId,
    metadata: { id, status: updated.status },
  })

  return updated
}

// ==========================================
// 6. Camada Lógica: Ativos EOL do Inventário Real
// ==========================================

export interface AtivoEolInfo {
  ativo: InventoryAssetItem
  sistemaOperacional: string
  versaoSo: string
  eolStatus: 'suportado' | 'proximo_eol' | 'sem_suporte' | 'mitigado' | 'desconhecido'
  dataFimSuporte?: string
  observacoes?: string
  isEol: boolean
}

export function analisarAtivosEol(assets: InventoryAssetItem[]): AtivoEolInfo[] {
  return assets.map((a) => {
    const so = a.sistema_operacional || (a.dados_normalizados as any)?.os_name || ''
    const versao = a.versao_so || (a.dados_normalizados as any)?.os_version || ''
    let eolStatus = a.eol_status || 'desconhecido'

    // Detecção heurística de SO sem suporte conhecido se status não foi definido manualmente
    if (eolStatus === 'desconhecido' || !a.eol_status) {
      const lower = `${so} ${versao} ${a.name} ${a.descricao || ''}`.toLowerCase()
      if (
        lower.includes('windows 7') ||
        lower.includes('windows xp') ||
        lower.includes('windows server 2003') ||
        lower.includes('windows server 2008') ||
        lower.includes('windows server 2012') ||
        lower.includes('centos 7') ||
        lower.includes('ubuntu 14') ||
        lower.includes('ubuntu 16') ||
        lower.includes('ubuntu 18') ||
        lower.includes('debian 8') ||
        lower.includes('debian 9')
      ) {
        eolStatus = 'sem_suporte'
      } else if (
        lower.includes('windows 10') ||
        lower.includes('windows server 2016') ||
        lower.includes('ubuntu 20.04')
      ) {
        eolStatus = 'proximo_eol'
      } else if (
        lower.includes('windows 11') ||
        lower.includes('windows server 2019') ||
        lower.includes('windows server 2022') ||
        lower.includes('ubuntu 22') ||
        lower.includes('ubuntu 24') ||
        lower.includes('debian 11') ||
        lower.includes('debian 12')
      ) {
        eolStatus = 'suportado'
      }
    }

    const isEol = eolStatus === 'sem_suporte' || eolStatus === 'proximo_eol'

    return {
      ativo: a,
      sistemaOperacional: so || 'Não identificado',
      versaoSo: versao || '—',
      eolStatus,
      dataFimSuporte: a.data_fim_suporte,
      observacoes: a.observacoes_suporte,
      isEol,
    }
  })
}

export async function atualizarAtivoEol(
  ativoId: string,
  orgId: string,
  dados: {
    sistema_operacional?: string
    versao_so?: string
    eol_status?: 'suportado' | 'proximo_eol' | 'sem_suporte' | 'mitigado' | 'desconhecido'
    data_fim_suporte?: string
    observacoes_suporte?: string
  },
): Promise<InventoryAssetItem> {
  const updated = await pb.collection('inventory_assets').update<InventoryAssetItem>(ativoId, dados)

  await logAudit({
    action: 'ATIVO_EOL_UPDATE',
    entity: 'Inventário de Ativos - Suporte EOL',
    detail: `Status de suporte EOL do ativo "${updated.name}" atualizado para "${dados.eol_status || 'alterado'}"`,
    organizationId: orgId,
    metadata: { ativoId, eol_status: dados.eol_status },
  })

  return updated
}

// ==========================================
// 7. Consolidação do Raio-X Geral de Infraestrutura
// ==========================================

export function consolidarInfraRaioX(
  org: OrganizationItem | null | undefined,
  itens: InfraItem[],
  links: InfraLinkItem[],
  checklist: InfraChecklistItem[],
  assets: InventoryAssetItem[],
): InfraRaioX {
  const confronto = confrontarConectividade(org, links)
  const eolAnalisados = analisarAtivosEol(assets)

  // Combinar itens de infraestrutura + links + itens do checklist
  const totalItens = checklist.length || 11
  let conformes = 0
  let parciais = 0
  let pendentes = 0
  let naoConformes = 0

  checklist.forEach((c) => {
    if (c.status === 'conforme') conformes++
    else if (c.status === 'parcial') parciais++
    else if (c.status === 'nao_conforme') naoConformes++
    else pendentes++
  })

  // Se checklist estiver vazio, usar status dos registros
  if (checklist.length === 0) {
    itens.forEach((i) => {
      if (i.status === 'conforme') conformes++
      else if (i.status === 'parcial') parciais++
      else if (i.status === 'nao_conforme') naoConformes++
      else pendentes++
    })
    if (confronto.statusGeral === 'conforme') conformes++
    else if (confronto.statusGeral === 'parcial') parciais++
    else naoConformes++
  }

  const pontuacao = conformes * 1.0 + parciais * 0.5
  const percentual = totalItens > 0 ? Math.round((pontuacao / totalItens) * 100) : 0

  const ativosEolTotal = eolAnalisados.filter(
    (e) => e.eolStatus === 'sem_suporte' || e.eolStatus === 'proximo_eol',
  ).length
  const ativosEolCriticos = eolAnalisados.filter(
    (e) => e.eolStatus === 'sem_suporte' && e.ativo.criticidade === 'alta',
  ).length

  return {
    totalItens,
    itensConformes: conformes,
    itensParciais: parciais,
    itensPendentes: pendentes,
    itensNaoConformes: naoConformes,
    percentualConformidade: percentual,
    conectividadeConfronto: confronto,
    ativosEolTotal,
    ativosEolCriticos,
  }
}

export function getInfraItemFileUrl(record: InfraItem | InfraLinkItem, filename: string): string {
  if (!filename) return ''
  return pb.files.getURL(record as any, filename)
}

// ==========================================
// 8. Persistência do Mapa da Infraestrutura (infra_mapas)
// ==========================================

export interface InfraMapaRecord {
  id: string
  organization: string
  status: 'em_branco' | 'gerado' | 'revisado'
  versao?: number
  hash_sha256?: string
  total_nos?: number
  total_conexoes?: number
  nos_reais_count?: number
  autonomia_minutos?: number
  velocidade_mbps?: number
  equipamentos_snapshot?: any
  conexoes_snapshot?: any
  resumo_camadas?: any
  diagrama_referencia_snapshot?: any
  gerado_por_nome?: string
  gerado_por_email?: string
  observacoes?: string
  created: string
  updated: string
}

export async function getInfraMapaServentia(orgId: string): Promise<InfraMapaRecord | null> {
  if (!orgId) return null
  try {
    const records = await pb.collection('infra_mapas').getList<InfraMapaRecord>(1, 1, {
      filter: `organization = '${orgId}'`,
      sort: '-created',
    })
    return records.items[0] || null
  } catch (err) {
    console.error('[infraestruturaService] Erro ao buscar mapa da serventia:', err)
    return null
  }
}

export interface SaveInfraMapaPayload {
  status: 'em_branco' | 'gerado' | 'revisado'
  hash_sha256?: string
  total_nos?: number
  total_conexoes?: number
  nos_reais_count?: number
  autonomia_minutos?: number
  velocidade_mbps?: number
  equipamentos_snapshot?: any[]
  conexoes_snapshot?: any[]
  resumo_camadas?: any
  diagrama_referencia_snapshot?: any
  gerado_por_nome?: string
  gerado_por_email?: string
  observacoes?: string
}

export async function saveInfraMapaServentia(
  orgId: string,
  payload: SaveInfraMapaPayload,
): Promise<InfraMapaRecord> {
  // Busca o mapa mais recente para saber a versão atual
  const atual = await getInfraMapaServentia(orgId)
  const proximaVersao = (atual?.versao || 0) + 1

  const dataToSave = {
    organization: orgId,
    status: payload.status,
    versao: proximaVersao,
    hash_sha256: payload.hash_sha256 || '',
    total_nos: payload.total_nos || 0,
    total_conexoes: payload.total_conexoes || 0,
    nos_reais_count: payload.nos_reais_count || 0,
    autonomia_minutos: payload.autonomia_minutos || 0,
    velocidade_mbps: payload.velocidade_mbps || 0,
    equipamentos_snapshot: payload.equipamentos_snapshot || [],
    conexoes_snapshot: payload.conexoes_snapshot || [],
    resumo_camadas: payload.resumo_camadas || {},
    diagrama_referencia_snapshot: payload.diagrama_referencia_snapshot || null,
    gerado_por_nome: payload.gerado_por_nome || '',
    gerado_por_email: payload.gerado_por_email || '',
    observacoes: payload.observacoes || '',
  }

  let res: InfraMapaRecord
  if (atual?.id) {
    res = await pb.collection('infra_mapas').update<InfraMapaRecord>(atual.id, dataToSave)
  } else {
    res = await pb.collection('infra_mapas').create<InfraMapaRecord>(dataToSave)
  }

  // Trilha de auditoria append-only CSCTI
  await logAudit({
    action: payload.status === 'em_branco' ? 'INFRA_MAPA_RESET' : 'INFRA_MAPA_SAVE',
    entity: 'Mapa da Infraestrutura',
    detail:
      payload.status === 'em_branco'
        ? `Mapa da Infraestrutura redefinido para em branco por ${payload.gerado_por_nome || 'Usuário'}`
        : `Mapa da Infraestrutura v${proximaVersao} salvo com ${payload.nos_reais_count || 0} nós reais identificados e hash SHA-256`,
    organizationId: orgId,
    metadata: {
      versao: proximaVersao,
      status: payload.status,
      total_nos: payload.total_nos,
      nos_reais: payload.nos_reais_count,
      hash_sha256: payload.hash_sha256,
    },
  })

  return res
}
