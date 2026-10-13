import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/csctiService'
import type {
  ConformidadeItemCatalog,
  ConformidadeStatusItem,
  ConformidadeEventoItem,
  ConformidadeStatusType,
  EtapaConformidadeResumo,
  MatrizConformidadeConsolidada,
  OrganizationItem,
} from '@/types/cscti'

// 1. Listar Catálogo Geral de Itens de Conformidade
export async function listConformidadeCatalogo(): Promise<ConformidadeItemCatalog[]> {
  const records = await pb.collection('conformidade_itens').getFullList<ConformidadeItemCatalog>({
    filter: "status = 'ativo'",
    sort: 'etapa,ordem',
  })
  return records
}

// 2. Listar Status da Serventia
export async function listConformidadeStatus(orgId: string): Promise<ConformidadeStatusItem[]> {
  if (!orgId) return []
  const records = await pb.collection('conformidade_status').getFullList<ConformidadeStatusItem>({
    filter: `organization = "${orgId}"`,
    sort: 'item_codigo',
    expand: 'item',
  })
  return records
}

// 3. Listar Histórico de Eventos
export async function listConformidadeEventos(
  orgId: string,
  itemCodigo?: string,
): Promise<ConformidadeEventoItem[]> {
  if (!orgId) return []
  let filter = `organization = "${orgId}"`
  if (itemCodigo) {
    filter += ` && item_codigo = "${itemCodigo}"`
  }
  const records = await pb.collection('conformidade_eventos').getFullList<ConformidadeEventoItem>({
    filter,
    sort: '-created',
    limit: 100,
  })
  return records
}

// 4. Salvar / Atualizar Manualmente um Item de Conformidade
export interface UpdateConformidadeStatusPayload {
  statusId?: string
  orgId: string
  itemId: string
  itemCodigo: string
  status: ConformidadeStatusType
  fonteModulo?: string
  referenciaComprovante?: string
  linkComprovante?: string
  hashSha256?: string
  dataComprovacao?: string
  observacoes?: string
  motivo?: string
  userName?: string
}

export async function updateConformidadeItemStatus(
  payload: UpdateConformidadeStatusPayload,
): Promise<ConformidadeStatusItem> {
  const data: Record<string, any> = {
    organization: payload.orgId,
    item: payload.itemId,
    item_codigo: payload.itemCodigo,
    status: payload.status,
    fonte_modulo: payload.fonteModulo || 'manual',
    referencia_comprovante: payload.referenciaComprovante || '',
    link_comprovante: payload.linkComprovante || '',
    hash_sha256: payload.hashSha256 || '',
    data_comprovacao: payload.dataComprovacao || new Date().toISOString(),
    avaliado_automaticamente: false,
    avaliado_por: payload.userName || 'Usuário do Sistema',
    observacoes: payload.observacoes || '',
  }

  let result: ConformidadeStatusItem
  let statusAnterior = 'pendente'

  if (payload.statusId) {
    try {
      const current = await pb.collection('conformidade_status').getOne(payload.statusId)
      statusAnterior = current.status
    } catch {
      /* intentionally ignored */
    }
    result = await pb
      .collection('conformidade_status')
      .update<ConformidadeStatusItem>(payload.statusId, data)
  } else {
    // Buscar se já existe por org e código
    try {
      const existing = await pb
        .collection('conformidade_status')
        .getFirstListItem(
          `organization = "${payload.orgId}" && item_codigo = "${payload.itemCodigo}"`,
        )
      statusAnterior = existing.status
      result = await pb
        .collection('conformidade_status')
        .update<ConformidadeStatusItem>(existing.id, data)
    } catch (_) {
      result = await pb.collection('conformidade_status').create<ConformidadeStatusItem>(data)
    }
  }

  // Gravar evento na trilha append-only
  try {
    await pb.collection('conformidade_eventos').create({
      organization: payload.orgId,
      item_codigo: payload.itemCodigo,
      status_anterior: statusAnterior,
      status_novo: payload.status,
      origem_avaliacao: 'manual_declarado',
      usuario_nome: payload.userName || 'Usuário do Sistema',
      motivo: payload.motivo || payload.observacoes || 'Atualização declaratória do item',
      evidencia_referencia: payload.referenciaComprovante || '',
      hash_sha256: payload.hashSha256 || '',
    })
  } catch (err) {
    console.warn('[conformidadeService] Falha ao registrar evento:', err)
  }

  // Auditoria
  await logAudit({
    organizationId: payload.orgId,
    action: 'update_conformidade_status',
    entity: 'conformidade_status',
    detail: `Item ${payload.itemCodigo} alterado para status ${payload.status}`,
    metadata: {
      itemCodigo: payload.itemCodigo,
      statusAnterior,
      statusNovo: payload.status,
      referencia: payload.referenciaComprovante,
    },
  })

  return result
}

// 5. Avaliação Dinâmica Multi-Módulo (Frontend Service)
// Consulta o status REAL de cada módulo homologado existente sem quebrar nenhuma rotina
export async function avaliarStatusModulosIntegrados(
  orgId: string,
  catalogItens: ConformidadeItemCatalog[],
  statusExistentes: ConformidadeStatusItem[],
): Promise<Array<ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }>> {
  if (!orgId || catalogItens.length === 0) return []

  // Carregar dados reais dos outros módulos em paralelo
  let designacoes: any[] = []
  let cienciasLgpd: any[] = []
  let operacoesLgpd: any[] = []
  let incidentesLgpd: any[] = []
  let inventoryAssets: any[] = []
  let evidenciasArquivadas: any[] = []
  let backupPlanos: any[] = []
  let backupRotinas: any[] = []
  let backupExecucoes: any[] = []
  let backupTestes: any[] = []
  let segSolucoes: any[] = []
  let segComprovantes: any[] = []
  let segItens: any[] = []
  let infraMapa: any = null

  try {
    const [
      desigRes,
      cienRes,
      operRes,
      incRes,
      invRes,
      evidRes,
      bkPlanoRes,
      bkRotinaRes,
      bkExecRes,
      bkTesteRes,
      segSolRes,
      segCompRes,
      segItensRes,
      infraMapaRes,
    ] = await Promise.allSettled([
      pb
        .collection('designacoes')
        .getFullList({ filter: `organization = "${orgId}"`, expand: 'papel_designado' }),
      pb.collection('lgpd_ciencias').getFullList({ filter: `organization = "${orgId}"` }),
      pb.collection('lgpd_dados').getFullList({ filter: `organization = "${orgId}"` }),
      pb.collection('lgpd_incidentes').getFullList({ filter: `organization = "${orgId}"` }),
      pb
        .collection('inventory_assets')
        .getFullList({ filter: `organization = "${orgId}" && status = "ativo"` }),
      pb
        .collection('evidencias')
        .getFullList({ filter: `organization = "${orgId}" && status = "conforme"` }),
      pb
        .collection('backup_planos')
        .getFullList({ filter: `organization = "${orgId}" && status = "ativo"` }),
      pb
        .collection('backup_rotinas')
        .getFullList({ filter: `organization = "${orgId}" && status = "ativo"` }),
      pb.collection('backup_execucoes').getFullList({
        filter: `organization = "${orgId}" && status = "sucesso"`,
        sort: '-data_inicio',
        limit: 50,
      }),
      pb.collection('backup_testes_recuperacao').getFullList({
        filter: `organization = "${orgId}" && resultado = "sucesso"`,
        sort: '-data_teste',
        limit: 10,
      }),
      pb
        .collection('seg_solucoes')
        .getFullList({ filter: `organization = "${orgId}" && status = "ativa"` }),
      pb.collection('seg_comprovantes').getFullList({
        filter: `organization = "${orgId}"`,
        sort: '-data_comprovante',
        limit: 20,
      }),
      pb.collection('seg_itens_conformidade').getFullList({ filter: `organization = "${orgId}"` }),
      pb.collection('infra_mapas').getList(1, 1, {
        filter: `organization = "${orgId}"`,
        sort: '-created',
      }),
    ])

    if (desigRes.status === 'fulfilled') designacoes = desigRes.value
    if (cienRes.status === 'fulfilled') cienciasLgpd = cienRes.value
    if (operRes.status === 'fulfilled') operacoesLgpd = operRes.value
    if (incRes.status === 'fulfilled') incidentesLgpd = incRes.value
    if (invRes.status === 'fulfilled') inventoryAssets = invRes.value
    if (evidRes.status === 'fulfilled') evidenciasArquivadas = evidRes.value
    if (bkPlanoRes.status === 'fulfilled') backupPlanos = bkPlanoRes.value
    if (bkRotinaRes.status === 'fulfilled') backupRotinas = bkRotinaRes.value
    if (bkExecRes.status === 'fulfilled') backupExecucoes = bkExecRes.value
    if (bkTesteRes.status === 'fulfilled') backupTestes = bkTesteRes.value
    if (segSolRes.status === 'fulfilled') segSolucoes = segSolRes.value
    if (segCompRes.status === 'fulfilled') segComprovantes = segCompRes.value
    if (segItensRes.status === 'fulfilled') segItens = segItensRes.value
    if (infraMapaRes.status === 'fulfilled') infraMapa = infraMapaRes.value.items[0] || null
  } catch (err) {
    console.warn('[conformidadeService] Erro ao carregar fontes dos módulos:', err)
  }

  const statusMap = new Map<string, ConformidadeStatusItem>()
  statusExistentes.forEach((st) => statusMap.set(st.item_codigo, st))

  const resultado: Array<ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }> = []

  for (const catItem of catalogItens) {
    const existing = statusMap.get(catItem.codigo)

    // Se já foi avaliado MANUALMENTE com observações e não-automático, respeita a declaração do titular/suporte
    if (existing && !existing.avaliado_automaticamente && existing.status !== 'pendente') {
      resultado.push({
        ...existing,
        catalog: catItem,
      })
      continue
    }

    // Avaliação automática com base no ambiente REAL do cliente
    let computedStatus: ConformidadeStatusType = 'pendente'
    let referencia = ''
    let link = catItem.link_modulo
    let dataComp: string | undefined = undefined
    let hash: string | undefined = undefined
    let obs = ''

    // 1.1 Designações formais
    if (catItem.codigo === '1.1') {
      const designacoesAssinadas = designacoes.filter(
        (d) => d.status === 'assinada_fisica' || d.status === 'assinada_digital',
      )
      if (designacoesAssinadas.length >= 2) {
        computedStatus = 'comprovado'
        const d = designacoesAssinadas[0]
        referencia = `${designacoesAssinadas.length} designações formalmente assinadas (${d.nome_designado || 'Titular/Equipe'})`
        link = `/configuracoes?tab=papeis`
        dataComp = d.data_assinatura || d.updated
        hash = d.hash_sha256 || ''
        obs = 'Comprovado via módulo Papéis & Responsáveis com termos assinados.'
      } else if (designacoes.length > 0) {
        computedStatus = 'parcial'
        referencia = `${designacoes.length} papéis atribuídos, aguardando assinatura formal`
        obs = 'Termos gerados, porém ainda pendentes de assinatura física ou digital.'
      } else {
        computedStatus = 'pendente'
        obs = 'Nenhum termo de designação assinado cadastrado.'
      }
    }

    // 1.2 Ciência da PSI
    else if (catItem.codigo === '1.2') {
      const cienciasConcedidas = cienciasLgpd.filter((c) => c.status === 'concedida')
      if (cienciasConcedidas.length > 0) {
        computedStatus = 'comprovado'
        const c = cienciasConcedidas[0]
        referencia = `${cienciasConcedidas.length} colaboradores com ciência da PSI registrada`
        link = `/lgpd?tab=ciencia`
        dataComp = c.data_ciencia || c.updated
        hash = c.hash_sha256 || ''
        obs = 'Termos de ciência de política de segurança registrados no módulo LGPD.'
      } else if (cienciasLgpd.length > 0) {
        computedStatus = 'parcial'
        referencia = 'Termos de ciência pendentes de assinatura'
      } else {
        computedStatus = 'pendente'
      }
    }

    // 1.4 ROPA / Operações de Tratamento
    else if (catItem.codigo === '1.4') {
      if (operacoesLgpd.length >= 3) {
        computedStatus = 'comprovado'
        referencia = `${operacoesLgpd.length} operações de dados catalogadas no ROPA`
        link = `/lgpd?tab=operacoes`
        dataComp = operacoesLgpd[0].updated
        obs = 'Inventário de dados e bases legais preenchidos.'
      } else if (operacoesLgpd.length > 0) {
        computedStatus = 'parcial'
        referencia = `${operacoesLgpd.length} operação(ões) cadastradas (inventário em andamento)`
      } else {
        computedStatus = 'pendente'
      }
    }

    // 1.5 e 1.6 Incidentes / Fluxo 72h
    else if (catItem.codigo === '1.5' || catItem.codigo === '1.6') {
      if (incidentesLgpd.length > 0) {
        const cumpridos = incidentesLgpd.filter(
          (i) => i.prazo_72h_cumprido || i.status_fluxo === 'encerrado',
        )
        computedStatus = 'comprovado'
        referencia = `Fluxo de incidentes ativo com ${incidentesLgpd.length} registro(s)`
        link = `/lgpd?tab=incidentes`
        dataComp = incidentesLgpd[0].updated
        hash = incidentesLgpd[0].hash_sha256 || ''
        obs = 'Fluxo de incidentes e canal 72h homologados no módulo LGPD.'
      } else {
        // Se a serventia tem o módulo LGPD ativo com encarregado designado
        const temEncarregado = designacoes.some(
          (d) =>
            d.expand?.papel_designado?.codigo === 'ENCARREGADO_DADOS' &&
            (d.status === 'assinada_fisica' || d.status === 'assinada_digital'),
        )
        if (temEncarregado) {
          computedStatus = 'parcial'
          referencia = 'Canal de incidentes sob governança do Encarregado (sem ocorrências abertas)'
          link = `/lgpd?tab=incidentes`
        } else {
          computedStatus = 'pendente'
        }
      }
    }

    // 1.7 Inventário de Ativos
    else if (catItem.codigo === '1.7') {
      if (inventoryAssets.length >= 2) {
        computedStatus = 'comprovado'
        referencia = `${inventoryAssets.length} ativos inventariados e classificados`
        link = `/ativos`
        dataComp = inventoryAssets[0].updated
        obs = 'Catálogo de ativos atualizado com criticidade e localização.'
      } else if (inventoryAssets.length === 1) {
        computedStatus = 'parcial'
        referencia = '1 ativo inventariado'
      } else {
        computedStatus = 'pendente'
      }
    }

    // 2.1 / 2.3 Evidências Físicas (Gerador, nobreak, sala de TI, ar condicionado)
    else if (catItem.codigo === '2.1' || catItem.codigo === '2.3') {
      const evidenciasComp = evidenciasArquivadas.filter((e) => {
        const cat = (e.categoria_nome || '').toLowerCase()
        const tit = (e.titulo || '').toLowerCase()
        if (catItem.codigo === '2.1') {
          return (
            cat.includes('energia') ||
            cat.includes('nobreak') ||
            tit.includes('laudo') ||
            tit.includes('aterramento')
          )
        }
        return (
          cat.includes('sala') ||
          cat.includes('ti') ||
          cat.includes('servidor') ||
          cat.includes('rack')
        )
      })

      if (evidenciasComp.length > 0) {
        computedStatus = 'comprovado'
        const e = evidenciasComp[0]
        referencia = `Evidência fotográfica/laudo: "${e.titulo}"`
        link = `/evidencias`
        dataComp = e.data_evidencia || e.updated
        obs = 'Evidência física homologada na Central de Evidências.'
      } else {
        computedStatus = 'pendente'
        obs = 'Pendente de upload fotográfico ou laudo técnico comprobatório.'
      }
    }

    // 2.5 Continuidade e Planos de Backup
    else if (catItem.codigo === '2.5') {
      const planosComRto = backupPlanos.filter((p) => p.rto_horas && p.rpo_horas)
      if (planosComRto.length > 0 && backupRotinas.length > 0) {
        computedStatus = 'comprovado'
        const p = planosComRto[0]
        referencia = `Plano "${p.nome}" (RTO ${p.rto_horas}h / RPO ${p.rpo_horas}h) com rotinas ativas`
        link = `/backup`
        dataComp = p.updated
        obs = 'Planos e rotinas de backup homologados no Ciclo de Continuidade.'
      } else if (backupPlanos.length > 0) {
        computedStatus = 'parcial'
        referencia = 'Planos de backup cadastrados sem parâmetros RTO/RPO completos'
      } else {
        computedStatus = 'pendente'
      }
    }

    // 2.6 Backup Nuvem ou Geograficamente Distinto
    else if (catItem.codigo === '2.6') {
      const planosNuvem = backupPlanos.filter(
        (p) => p.destino === 'nuvem' || p.destino === 'replicacao',
      )
      const execucoesNuvem = backupExecucoes.filter((e) =>
        (e.destino || '').toLowerCase().includes('nuvem'),
      )
      if (execucoesNuvem.length > 0 || planosNuvem.length > 0) {
        computedStatus = 'comprovado'
        referencia = `Cópia externa/nuvem comprovada com retenção ativa`
        link = `/backup`
        dataComp = execucoesNuvem[0]?.data_inicio || backupPlanos[0]?.updated
        obs = 'Execuções de destino nuvem validadas no módulo Backup.'
      } else {
        computedStatus = 'pendente'
      }
    }

    // 2.7 Endpoint / Antivírus em todas as estações
    else if (catItem.codigo === '2.7') {
      const endpointSol = segSolucoes.filter(
        (s) => s.tipo === 'endpoint_antivirus' && s.status === 'ativa',
      )
      const compRecente = segComprovantes.find(
        (c) => c.maquinas_protegidas && c.maquinas_protegidas > 0,
      )
      if (endpointSol.length > 0 && compRecente) {
        computedStatus = 'comprovado'
        referencia = `${endpointSol[0].nome} ativo com ${compRecente.maquinas_protegidas} máquinas protegidas`
        link = `/seguranca?tab=cobertura`
        dataComp = compRecente.data_comprovante || compRecente.updated
        hash = compRecente.hash_sha256 || ''
        obs = 'Relatório de console de endpoint anexado no módulo Segurança.'
      } else if (endpointSol.length > 0) {
        computedStatus = 'parcial'
        referencia = `${endpointSol[0].nome} cadastrado, aguardando relatório de console`
      } else {
        computedStatus = 'pendente'
      }
    }

    // 2.8 Documento formal de arquitetura tecnológica e topologia de rede
    else if (catItem.codigo === '2.8') {
      if (infraMapa && (infraMapa.status === 'gerado' || infraMapa.status === 'revisado')) {
        computedStatus = 'comprovado'
        referencia = `Mapa da Infraestrutura v${infraMapa.versao || 1} ativo (${infraMapa.nos_reais_count || 0} nós reais mapeados)`
        link = '/infraestrutura?tab=mapa'
        dataComp = infraMapa.updated
        hash = infraMapa.hash_sha256 || ''
        obs = 'Topologia física e lógica documentada e homologada na aba Mapa da Infraestrutura.'
      } else {
        computedStatus = 'pendente'
        link = '/infraestrutura?tab=mapa'
        obs =
          'Pendente de geração do Mapa da Infraestrutura no módulo Infraestrutura Física e Lógica.'
      }
    }

    // 2.9 Firewall de borda
    else if (catItem.codigo === '2.9') {
      const fwSol = segSolucoes.filter((s) => s.tipo === 'firewall' && s.status === 'ativa')
      const fwItemCheck = segItens.find(
        (i) => i.categoria === 'firewall' && i.status === 'comprovado',
      )
      if (fwSol.length > 0 && fwItemCheck) {
        computedStatus = 'comprovado'
        referencia = `${fwSol[0].nome} perimetral ativo com regras revisadas`
        link = `/seguranca?tab=solucoes`
        dataComp = fwSol[0].updated
        obs = 'Firewall perimetral comprovado no módulo Segurança.'
      } else if (fwSol.length > 0) {
        computedStatus = 'parcial'
        referencia = `${fwSol[0].nome} perimetral registrado`
      } else {
        computedStatus = 'pendente'
      }
    }

    // 4.2 Monitoramento SOC/NOC
    else if (catItem.codigo === '4.2') {
      const socSol = segSolucoes.filter(
        (s) => s.tipo === 'monitoramento_soc_noc' && s.status === 'ativa',
      )
      if (socSol.length > 0) {
        computedStatus = 'comprovado'
        referencia = `Central de Monitoramento ativa: ${socSol[0].nome}`
        link = `/seguranca?tab=solucoes`
        dataComp = socSol[0].updated
        obs = 'Atestado de monitoramento contínuo registrado no módulo Segurança.'
      } else {
        computedStatus = 'pendente'
      }
    }

    // 5.1 Teste de Restauração de Backup
    else if (catItem.codigo === '5.1') {
      if (backupTestes.length > 0) {
        computedStatus = 'comprovado'
        const t = backupTestes[0]
        referencia = `Teste de restauração com sucesso (${t.tempo_decorrido_minutos || 0} min)`
        link = `/backup`
        dataComp = t.data_teste || t.updated
        obs = 'Laudo técnico de teste de restauração registrado no Ciclo de Continuidade.'
      } else {
        computedStatus = 'pendente'
        obs = 'Pendente de simulação periódica de restauração documentada.'
      }
    }

    // Checar itens de checklist do módulo Segurança que batem com códigos
    else {
      const matchingSegItem = segItens.find(
        (si) =>
          si.item_nome?.toLowerCase().includes(catItem.titulo.toLowerCase().substring(0, 15)) ||
          si.descricao?.toLowerCase().includes(catItem.titulo.toLowerCase().substring(0, 15)),
      )
      if (matchingSegItem && matchingSegItem.status === 'comprovado') {
        computedStatus = 'comprovado'
        referencia = `Comprovado no Checklist de Segurança: ${matchingSegItem.item_nome}`
        link = `/seguranca?tab=checklist`
        dataComp = matchingSegItem.updated
      } else if (existing && existing.status !== 'pendente') {
        computedStatus = existing.status
        referencia = existing.referencia_comprovante || ''
        link = existing.link_comprovante || catItem.link_modulo
        dataComp = existing.data_comprovacao
        hash = existing.hash_sha256
        obs = existing.observacoes || ''
      }
    }

    resultado.push({
      id: existing?.id || `virtual-${catItem.id}`,
      organization: orgId,
      item: catItem.id,
      item_codigo: catItem.codigo,
      status: computedStatus,
      fonte_modulo: catItem.modulo_origem,
      referencia_comprovante: referencia || existing?.referencia_comprovante || '',
      link_comprovante: link || catItem.link_modulo,
      hash_sha256: hash || existing?.hash_sha256 || '',
      data_comprovacao: dataComp || existing?.data_comprovacao,
      avaliado_automaticamente: true,
      observacoes:
        obs || existing?.observacoes || 'Pendente de comprovação no ambiente do cliente.',
      catalog: catItem,
    })
  }

  return resultado
}

// 6. Consolidação da Matriz de Conformidade com Prazos e Bloqueio Sequencial
export function consolidarMatrizConformidade(
  org: OrganizationItem | null,
  itensAvaliados: Array<ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }>,
): MatrizConformidadeConsolidada {
  const classe = (org?.provimento_class || 'C2') as 'C1' | 'C2' | 'C3'
  const orgName = org?.name || 'Serventia Conectada'

  // Regra de prazos por classe:
  // Etapas 1-2: C1: 300 dias, C2: 240 dias, C3: 180 dias
  const prazoEtapas1e2Dias = classe === 'C1' ? 300 : classe === 'C3' ? 180 : 240
  // Etapas 1-5 completas: C1: 36 meses, C2: 30 meses, C3: 24 meses
  const prazoEtapas1a5Meses = classe === 'C1' ? 36 : classe === 'C3' ? 24 : 30

  // Cálculo de dias restantes (a partir da data de criação da serventia ou data atual estimada)
  const dataCriacaoOrg = org?.created ? new Date(org.created) : new Date('2026-01-01')
  const agora = new Date()
  const diffTime = agora.getTime() - dataCriacaoOrg.getTime()
  const diasCorridos = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  const diasRestantesEtapas1e2 = Math.max(0, prazoEtapas1e2Dias - diasCorridos)
  const mesesRestantesEtapas1a5 = Math.max(0, prazoEtapas1a5Meses - Math.floor(diasCorridos / 30))

  let urgenciaPrazo: 'normal' | 'atencao' | 'critica' = 'normal'
  if (diasRestantesEtapas1e2 < 30) {
    urgenciaPrazo = 'critica'
  } else if (diasRestantesEtapas1e2 < 90) {
    urgenciaPrazo = 'atencao'
  }

  // Definição das 6 etapas
  const etapasMeta = [
    {
      numero: 1,
      titulo: 'Etapa 1 — Governança e Conformidade Legal',
      descricao:
        'Designações de responsáveis, Política de Segurança, ciência dos prepostos, ROPA e incidentes.',
    },
    {
      numero: 2,
      titulo: 'Etapa 2 — Infraestrutura e Continuidade',
      descricao:
        'Nobreaks, contingência de energia, sala de servidores segura, links, backups e firewall.',
    },
    {
      numero: 3,
      titulo: 'Etapa 3 — Proteção e Criptografia',
      descricao:
        'Criptografia em repouso e trânsito, MFA, senhas seguras, isolamento de redes e integridade.',
    },
    {
      numero: 4,
      titulo: 'Etapa 4 — Detecção e Resposta',
      descricao:
        'Gestão de vulnerabilidades em 30 dias, monitoramento SOC/NOC, servidor de logs e telemetria.',
    },
    {
      numero: 5,
      titulo: 'Etapa 5 — Continuidade Avançada e Testes',
      descricao:
        'Testes periódicos de restauração documentados, simulação de extração do acervo e imutabilidade.',
    },
    {
      numero: 6,
      titulo: 'Etapa 6 — Dossiê Final Comprobatório',
      descricao:
        'Consolidação de evidências com hashes SHA-256, dossiê assinado e protocolo de declaração.',
    },
  ]

  let etapaBloqueanteAtual: number | null = null
  const etapasResumo: EtapaConformidadeResumo[] = []

  let etapaAnteriorConcluida = true

  for (const meta of etapasMeta) {
    const itensDaEtapa = itensAvaliados.filter((it) => it.catalog?.etapa === meta.numero)

    const itensTotal = itensDaEtapa.length
    const itensComprovados = itensDaEtapa.filter((it) => it.status === 'comprovado').length
    const itensParciais = itensDaEtapa.filter((it) => it.status === 'parcial').length
    const itensPendentes = itensDaEtapa.filter((it) => it.status === 'pendente').length
    const itensNaoConforme = itensDaEtapa.filter((it) => it.status === 'nao_conforme').length

    const percentual = itensTotal > 0 ? Math.round((itensComprovados / itensTotal) * 100) : 0
    const concluida = itensTotal > 0 && itensComprovados === itensTotal

    // Sequencial/cumulativo: uma etapa só é desbloqueada se a anterior estiver 100% comprovada
    const bloqueada = !etapaAnteriorConcluida

    if (bloqueada && etapaBloqueanteAtual === null) {
      etapaBloqueanteAtual = meta.numero - 1
    }

    etapasResumo.push({
      numero: meta.numero,
      titulo: meta.titulo,
      descricao: meta.descricao,
      itensTotal,
      itensComprovados,
      itensParciais,
      itensPendentes,
      itensNaoConforme,
      percentual,
      concluida,
      bloqueada,
      itens: itensDaEtapa,
    })

    // Atualiza para a próxima etapa
    etapaAnteriorConcluida = concluida
  }

  const totalItens = itensAvaliados.length
  const totalComprovados = itensAvaliados.filter((it) => it.status === 'comprovado').length
  const totalParciais = itensAvaliados.filter((it) => it.status === 'parcial').length
  const totalPendentes = itensAvaliados.filter((it) => it.status === 'pendente').length
  const totalNaoConforme = itensAvaliados.filter((it) => it.status === 'nao_conforme').length
  const percentualGeral = totalItens > 0 ? Math.round((totalComprovados / totalItens) * 100) : 0

  return {
    serventiaClasse: classe,
    serventiaNome: orgName,
    prazoEtapas1e2Dias,
    diasRestantesEtapas1e2,
    prazoEtapas1a5Meses,
    mesesRestantesEtapas1a5,
    urgenciaPrazo,
    totalItens,
    totalComprovados,
    totalParciais,
    totalPendentes,
    totalNaoConforme,
    percentualGeral,
    etapas: etapasResumo,
    etapaBloqueanteAtual,
  }
}
