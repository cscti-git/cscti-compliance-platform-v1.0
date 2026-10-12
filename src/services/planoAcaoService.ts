import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/csctiService'
import { listConformidadeCatalogo, listConformidadeStatus } from '@/services/conformidadeService'
import type {
  PlanoAcaoItem,
  PlanoAcaoHistoricoItem,
  PlanoAcaoOrigem,
  PlanoAcaoPrioridade,
  PlanoAcaoStatus,
  PlanoSugestaoMatriz,
  PlanosAcaoRaioX,
} from '@/types/cscti'

// 1. Listar Planos de Ação por Organização
export interface ListPlanosAcaoFilters {
  status?: PlanoAcaoStatus | 'todos'
  prioridade?: PlanoAcaoPrioridade | 'todas'
  origem?: PlanoAcaoOrigem | 'todas'
  termoBusca?: string
}

export async function listPlanosAcao(
  orgId: string,
  filters?: ListPlanosAcaoFilters,
): Promise<PlanoAcaoItem[]> {
  if (!orgId) return []

  const conditions = [`organization = "${orgId}"`]

  if (filters?.status && filters.status !== 'todos') {
    conditions.push(`status = "${filters.status}"`)
  }
  if (filters?.prioridade && filters.prioridade !== 'todas') {
    conditions.push(`prioridade = "${filters.prioridade}"`)
  }
  if (filters?.origem && filters.origem !== 'todas') {
    conditions.push(`origem = "${filters.origem}"`)
  }

  const filterStr = conditions.join(' && ')

  try {
    const records = await pb.collection('planos_acao_itens').getFullList<PlanoAcaoItem>({
      filter: filterStr,
      sort: '-created',
      expand: 'responsavel',
    })

    if (filters?.termoBusca && filters.termoBusca.trim()) {
      const q = filters.termoBusca.toLowerCase().trim()
      return records.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          (p.descricao && p.descricao.toLowerCase().includes(q)) ||
          (p.responsavel_nome && p.responsavel_nome.toLowerCase().includes(q)) ||
          (p.referencia_codigo && p.referencia_codigo.toLowerCase().includes(q)),
      )
    }

    return records
  } catch (err) {
    console.warn('[planoAcaoService] Erro ao listar planos:', err)
    return []
  }
}

// 2. Listar Histórico Append-only
export async function listPlanosAcaoHistorico(
  orgId: string,
  planoId?: string,
): Promise<PlanoAcaoHistoricoItem[]> {
  if (!orgId) return []

  const conditions = [`organization = "${orgId}"`]
  if (planoId) {
    conditions.push(`plano = "${planoId}"`)
  }

  try {
    const records = await pb
      .collection('planos_acao_historico')
      .getFullList<PlanoAcaoHistoricoItem>({
        filter: conditions.join(' && '),
        sort: '-created',
        limit: 200,
      })
    return records
  } catch (err) {
    console.warn('[planoAcaoService] Erro ao listar histórico:', err)
    return []
  }
}

// 3. Criar Plano de Ação Manual ou de Origem
export interface CreatePlanoAcaoPayload {
  orgId: string
  titulo: string
  descricao?: string
  origem: PlanoAcaoOrigem
  referenciaOrigem?: string
  referenciaCodigo?: string
  prioridade: PlanoAcaoPrioridade
  status?: PlanoAcaoStatus
  responsavelId?: string
  responsavelNome?: string
  dataAlvo?: string
  observacoes?: string
  autorNome?: string
  autorEmail?: string
}

export async function createPlanoAcao(payload: CreatePlanoAcaoPayload): Promise<PlanoAcaoItem> {
  const data: Record<string, any> = {
    organization: payload.orgId,
    titulo: payload.titulo.trim(),
    descricao: payload.descricao || '',
    origem: payload.origem,
    referencia_origem: payload.referenciaOrigem || '',
    referencia_codigo: payload.referenciaCodigo || '',
    prioridade: payload.prioridade,
    status: payload.status || 'aberto',
    responsavel: payload.responsavelId || null,
    responsavel_nome: payload.responsavelNome || '',
    data_criacao: new Date().toISOString(),
    data_alvo: payload.dataAlvo || null,
    observacoes: payload.observacoes || '',
  }

  const created = await pb.collection('planos_acao_itens').create<PlanoAcaoItem>(data)

  // Gravar no histórico append-only
  try {
    await pb.collection('planos_acao_historico').create({
      organization: payload.orgId,
      plano: created.id,
      plano_titulo: created.titulo,
      tipo_evento: 'criacao',
      campo_alterado: 'status',
      valor_anterior: '',
      valor_novo: created.status,
      motivo: 'Plano de ação formalizado',
      autor_nome: payload.autorNome || 'Usuário do Sistema',
      autor_email: payload.autorEmail || '',
    })
  } catch (err) {
    console.warn('[planoAcaoService] Falha ao registrar histórico de criação:', err)
  }

  // Auditoria
  await logAudit({
    organizationId: payload.orgId,
    action: 'ACAO_PLANO_CRIADO',
    entity: 'planos_acao_itens',
    detail: `Plano de ação "${created.titulo}" criado (${created.origem}, prioridade ${created.prioridade})`,
    metadata: {
      planoId: created.id,
      origem: created.origem,
      prioridade: created.prioridade,
      dataAlvo: created.data_alvo,
    },
  })

  return created
}

// 4. Atualizar Status do Plano de Ação
export async function updatePlanoStatus(params: {
  planoId: string
  orgId: string
  novoStatus: PlanoAcaoStatus
  motivo?: string
  autorNome?: string
  autorEmail?: string
}): Promise<PlanoAcaoItem> {
  const current = await pb.collection('planos_acao_itens').getOne<PlanoAcaoItem>(params.planoId)
  const statusAnterior = current.status

  const updateData: Record<string, any> = {
    status: params.novoStatus,
  }

  if (params.novoStatus === 'concluido') {
    updateData.data_conclusao = new Date().toISOString()
  } else if (statusAnterior === 'concluido') {
    updateData.data_conclusao = null
  }

  const updated = await pb
    .collection('planos_acao_itens')
    .update<PlanoAcaoItem>(params.planoId, updateData)

  // Registrar histórico
  const tipoEvento =
    params.novoStatus === 'concluido'
      ? 'conclusao'
      : params.novoStatus === 'cancelado'
        ? 'cancelamento'
        : 'mudanca_status'

  try {
    await pb.collection('planos_acao_historico').create({
      organization: params.orgId,
      plano: updated.id,
      plano_titulo: updated.titulo,
      tipo_evento: tipoEvento,
      campo_alterado: 'status',
      valor_anterior: statusAnterior,
      valor_novo: params.novoStatus,
      motivo: params.motivo || `Status alterado de ${statusAnterior} para ${params.novoStatus}`,
      autor_nome: params.autorNome || 'Usuário do Sistema',
      autor_email: params.autorEmail || '',
    })
  } catch (err) {
    console.warn('[planoAcaoService] Falha ao registrar histórico de status:', err)
  }

  // Auditoria
  await logAudit({
    organizationId: params.orgId,
    action: 'ACAO_PLANO_STATUS_ALTERADO',
    entity: 'planos_acao_itens',
    detail: `Status do plano "${updated.titulo}" alterado de ${statusAnterior} para ${params.novoStatus}`,
    metadata: {
      planoId: updated.id,
      statusAnterior,
      statusNovo: params.novoStatus,
      motivo: params.motivo,
    },
  })

  return updated
}

// 5. Atualizar Prazo (data_alvo) com Motivo Obrigatório se for adiamento
export async function updatePlanoPrazo(params: {
  planoId: string
  orgId: string
  novoPrazo: string
  motivo: string
  autorNome?: string
  autorEmail?: string
}): Promise<PlanoAcaoItem> {
  const current = await pb.collection('planos_acao_itens').getOne<PlanoAcaoItem>(params.planoId)
  const prazoAnterior = current.data_alvo || 'Sem prazo'

  const updated = await pb
    .collection('planos_acao_itens')
    .update<PlanoAcaoItem>(params.planoId, { data_alvo: params.novoPrazo })

  try {
    await pb.collection('planos_acao_historico').create({
      organization: params.orgId,
      plano: updated.id,
      plano_titulo: updated.titulo,
      tipo_evento: 'alteracao_prazo',
      campo_alterado: 'data_alvo',
      valor_anterior: prazoAnterior,
      valor_novo: params.novoPrazo,
      motivo: params.motivo,
      autor_nome: params.autorNome || 'Usuário do Sistema',
      autor_email: params.autorEmail || '',
    })
  } catch (err) {
    console.warn('[planoAcaoService] Falha ao registrar histórico de prazo:', err)
  }

  await logAudit({
    organizationId: params.orgId,
    action: 'ACAO_PLANO_PRAZO_ALTERADO',
    entity: 'planos_acao_itens',
    detail: `Prazo do plano "${updated.titulo}" alterado de ${prazoAnterior} para ${params.novoPrazo}`,
    metadata: {
      planoId: updated.id,
      prazoAnterior,
      prazoNovo: params.novoPrazo,
      motivo: params.motivo,
    },
  })

  return updated
}

// 6. Reatribuir Responsável
export async function updatePlanoResponsavel(params: {
  planoId: string
  orgId: string
  novoResponsavelId?: string
  novoResponsavelNome?: string
  motivo?: string
  autorNome?: string
  autorEmail?: string
}): Promise<PlanoAcaoItem> {
  const current = await pb.collection('planos_acao_itens').getOne<PlanoAcaoItem>(params.planoId)
  const responsavelAnterior = current.responsavel_nome || 'Não atribuído'

  const updated = await pb.collection('planos_acao_itens').update<PlanoAcaoItem>(params.planoId, {
    responsavel: params.novoResponsavelId || null,
    responsavel_nome: params.novoResponsavelNome || '',
  })

  try {
    await pb.collection('planos_acao_historico').create({
      organization: params.orgId,
      plano: updated.id,
      plano_titulo: updated.titulo,
      tipo_evento: 'reatribuicao',
      campo_alterado: 'responsavel',
      valor_anterior: responsavelAnterior,
      valor_novo: params.novoResponsavelNome || 'Não atribuído',
      motivo: params.motivo || 'Reatribuição de responsabilidade',
      autor_nome: params.autorNome || 'Usuário do Sistema',
      autor_email: params.autorEmail || '',
    })
  } catch (err) {
    console.warn('[planoAcaoService] Falha ao registrar histórico de reatribuição:', err)
  }

  await logAudit({
    organizationId: params.orgId,
    action: 'ACAO_PLANO_RESPONSAVEL_ALTERADO',
    entity: 'planos_acao_itens',
    detail: `Responsável pelo plano "${updated.titulo}" alterado para ${params.novoResponsavelNome || 'Nenhum'}`,
    metadata: {
      planoId: updated.id,
      responsavelAnterior,
      responsavelNovo: params.novoResponsavelNome,
    },
  })

  return updated
}

// 7. Atualizar Edição Geral do Plano
export async function updatePlanoGeral(params: {
  planoId: string
  orgId: string
  titulo: string
  descricao?: string
  prioridade: PlanoAcaoPrioridade
  observacoes?: string
  autorNome?: string
  autorEmail?: string
}): Promise<PlanoAcaoItem> {
  const updated = await pb.collection('planos_acao_itens').update<PlanoAcaoItem>(params.planoId, {
    titulo: params.titulo.trim(),
    descricao: params.descricao || '',
    prioridade: params.prioridade,
    observacoes: params.observacoes || '',
  })

  await logAudit({
    organizationId: params.orgId,
    action: 'ACAO_PLANO_EDITADO',
    entity: 'planos_acao_itens',
    detail: `Plano "${updated.titulo}" editado`,
    metadata: {
      planoId: updated.id,
      prioridade: updated.prioridade,
    },
  })

  return updated
}

// 8. Integração Real com a Matriz de Conformidade
// Itens com status 'pendente' ou 'nao_conforme' geram sugestões de planos de ação
export async function listSugestoesMatrizConformidade(
  orgId: string,
): Promise<PlanoSugestaoMatriz[]> {
  if (!orgId) return []

  const [catalogo, statusList, planosExistentes, historicoList] = await Promise.all([
    listConformidadeCatalogo(),
    listConformidadeStatus(orgId),
    listPlanosAcao(orgId),
    listPlanosAcaoHistorico(orgId),
  ])

  const statusMap = new Map<string, string>()
  statusList.forEach((st) => {
    statusMap.set(st.item_codigo, st.status)
  })

  // Mapear planos existentes com origem 'conformidade'
  const planosPorCodigo = new Map<string, PlanoAcaoItem>()
  planosExistentes.forEach((p) => {
    if (p.origem === 'conformidade' && p.referencia_codigo) {
      planosPorCodigo.set(p.referencia_codigo, p)
    }
  })

  // Mapear dispensas registradas no histórico
  const dispensasPorCodigo = new Set<string>()
  const motivoDispensaPorCodigo = new Map<string, string>()
  historicoList.forEach((h) => {
    if (h.tipo_evento === 'dispensa_matriz' && h.campo_alterado) {
      dispensasPorCodigo.add(h.campo_alterado)
      if (h.motivo) {
        motivoDispensaPorCodigo.set(h.campo_alterado, h.motivo)
      }
    }
  })

  const sugestoes: PlanoSugestaoMatriz[] = []

  for (const cat of catalogo) {
    const st = statusMap.get(cat.codigo) || 'pendente'

    // Regra do prompt: Itens Comprovados/Parciais nunca aparecem como sugestão
    if (st !== 'pendente' && st !== 'nao_conforme') {
      continue
    }

    const planoVinculado = planosPorCodigo.get(cat.codigo)
    const dispensado = dispensasPorCodigo.has(cat.codigo)

    // Prioridade sugerida: Etapas 1 e 2 são prioritárias; itens obrigatórios C1 são críticos
    let prioridade: PlanoAcaoPrioridade = 'media'
    if (st === 'nao_conforme') {
      prioridade = 'critica'
    } else if (cat.etapa <= 2 && cat.obrigatorio_c1) {
      prioridade = 'alta'
    } else if (cat.etapa <= 2) {
      prioridade = 'media'
    } else {
      prioridade = 'baixa'
    }

    sugestoes.push({
      itemCodigo: cat.codigo,
      titulo: cat.titulo,
      descricao: cat.descricao,
      etapa: cat.etapa,
      etapaTitulo: cat.etapa_titulo,
      moduloOrigem: cat.modulo_origem,
      linkModulo: cat.link_modulo,
      statusMatriz: st as 'pendente' | 'nao_conforme',
      prioridadeSugerida: prioridade,
      jaConvertido: !!planoVinculado,
      planoId: planoVinculado?.id,
      dispensado,
      motivoDispensa: motivoDispensaPorCodigo.get(cat.codigo),
    })
  }

  return sugestoes
}

// 9. Transformar Sugestão da Matriz em Plano de Ação
export async function transformarSugestaoEmPlano(params: {
  orgId: string
  itemCodigo: string
  titulo?: string
  descricao?: string
  prioridade?: PlanoAcaoPrioridade
  dataAlvo?: string
  responsavelId?: string
  responsavelNome?: string
  observacoes?: string
  autorNome?: string
  autorEmail?: string
}): Promise<PlanoAcaoItem> {
  const catalogo = await listConformidadeCatalogo()
  const catItem = catalogo.find((c) => c.codigo === params.itemCodigo)

  const titulo =
    params.titulo?.trim() ||
    (catItem ? `Adequação: ${catItem.titulo}` : `Adequação do Item ${params.itemCodigo}`)

  const descricao =
    params.descricao ||
    (catItem
      ? `Plano gerado automaticamente a partir da Matriz de Conformidade. Exigência: ${catItem.descricao}`
      : 'Plano gerado a partir da Matriz de Conformidade.')

  const prioridade = params.prioridade || 'alta'

  const plano = await createPlanoAcao({
    orgId: params.orgId,
    titulo,
    descricao,
    origem: 'conformidade',
    referenciaOrigem: catItem?.id || '',
    referenciaCodigo: params.itemCodigo,
    prioridade,
    status: 'aberto',
    responsavelId: params.responsavelId,
    responsavelNome: params.responsavelNome,
    dataAlvo: params.dataAlvo,
    observacoes: params.observacoes,
    autorNome: params.autorNome,
    autorEmail: params.autorEmail,
  })

  await logAudit({
    organizationId: params.orgId,
    action: 'ACAO_SUGESTAO_MATRIZ_TRANSFORMADA',
    entity: 'planos_acao_itens',
    detail: `Item ${params.itemCodigo} da matriz transformado no plano "${plano.titulo}"`,
    metadata: {
      itemCodigo: params.itemCodigo,
      planoId: plano.id,
    },
  })

  return plano
}

// 10. Dispensar Sugestão da Matriz com Justificativa no Histórico
export async function dispensarSugestaoMatriz(params: {
  orgId: string
  itemCodigo: string
  motivo: string
  autorNome?: string
  autorEmail?: string
}): Promise<void> {
  if (!params.motivo || !params.motivo.trim()) {
    throw new Error('O motivo da dispensa é obrigatório.')
  }

  try {
    await pb.collection('planos_acao_historico').create({
      organization: params.orgId,
      tipo_evento: 'dispensa_matriz',
      campo_alterado: params.itemCodigo,
      valor_anterior: 'sugestao_ativa',
      valor_novo: 'dispensada',
      motivo: params.motivo.trim(),
      autor_nome: params.autorNome || 'Usuário do Sistema',
      autor_email: params.autorEmail || '',
    })
  } catch (err) {
    console.warn('[planoAcaoService] Falha ao registrar dispensa no histórico:', err)
  }

  await logAudit({
    organizationId: params.orgId,
    action: 'ACAO_SUGESTAO_MATRIZ_DISPENSADA',
    entity: 'planos_acao_historico',
    detail: `Sugestão do item ${params.itemCodigo} da Matriz dispensada com justificativa`,
    metadata: {
      itemCodigo: params.itemCodigo,
      motivo: params.motivo,
    },
  })
}

// 11. Reativar Sugestão Dispensada
export async function reativarSugestaoMatriz(params: {
  orgId: string
  itemCodigo: string
  autorNome?: string
  autorEmail?: string
}): Promise<void> {
  try {
    await pb.collection('planos_acao_historico').create({
      organization: params.orgId,
      tipo_evento: 'dispensa_matriz',
      campo_alterado: params.itemCodigo,
      valor_anterior: 'dispensada',
      valor_novo: 'reativada',
      motivo: 'Sugestão reativada para avaliação da serventia',
      autor_nome: params.autorNome || 'Usuário do Sistema',
      autor_email: params.autorEmail || '',
    })
  } catch (err) {
    console.warn('[planoAcaoService] Falha ao registrar reativação:', err)
  }

  await logAudit({
    organizationId: params.orgId,
    action: 'ACAO_SUGESTAO_MATRIZ_REATIVADA',
    entity: 'planos_acao_historico',
    detail: `Sugestão do item ${params.itemCodigo} reativada`,
    metadata: {
      itemCodigo: params.itemCodigo,
    },
  })
}

// 12. Consolidar Raio-X dos Planos de Ação (Apenas Números Reais do Banco)
export function calcularRaioXPlanos(
  planos: PlanoAcaoItem[],
  sugestoesPendentesCount: number = 0,
): PlanosAcaoRaioX {
  const agora = new Date()
  const hojeIso = agora.toISOString().substring(0, 10)

  let abertos = 0
  let emAndamento = 0
  let concluidos = 0
  let cancelados = 0
  let criticosAltaVencidos = 0
  let concluidosNoPrazo = 0
  let concluidosComAtraso = 0

  let somaDiasAberto = 0
  let contagemDiasAberto = 0

  planos.forEach((p) => {
    if (p.status === 'aberto') abertos++
    if (p.status === 'em_andamento') emAndamento++
    if (p.status === 'concluido') concluidos++
    if (p.status === 'cancelado') cancelados++

    const isAtivo = p.status === 'aberto' || p.status === 'em_andamento'
    const isCriticoOuAlta = p.prioridade === 'critica' || p.prioridade === 'alta'

    // Vencidos (data_alvo passada e ainda não concluído)
    if (isAtivo && p.data_alvo && p.data_alvo < hojeIso) {
      if (isCriticoOuAlta) {
        criticosAltaVencidos++
      }
    }

    // Concluídos no prazo vs com atraso
    if (p.status === 'concluido') {
      if (p.data_conclusao && p.data_alvo) {
        const concIso = p.data_conclusao.substring(0, 10)
        if (concIso <= p.data_alvo) {
          concluidosNoPrazo++
        } else {
          concluidosComAtraso++
        }
      } else {
        concluidosNoPrazo++
      }
    }

    // Média de dias em aberto
    if (p.created) {
      const dataInicio = new Date(p.data_criacao || p.created)
      const dataFim = p.data_conclusao ? new Date(p.data_conclusao) : agora
      const diffMs = Math.max(0, dataFim.getTime() - dataInicio.getTime())
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      somaDiasAberto += diffDias
      contagemDiasAberto++
    }
  })

  const mediaDiasEmAberto =
    contagemDiasAberto > 0 ? Math.round(somaDiasAberto / contagemDiasAberto) : 0

  return {
    totalPlanos: planos.length,
    abertos,
    emAndamento,
    concluidos,
    cancelados,
    criticosAltaVencidos,
    concluidosNoPrazo,
    concluidosComAtraso,
    mediaDiasEmAberto,
    sugestoesMatrizPendentes: sugestoesPendentesCount,
  }
}
