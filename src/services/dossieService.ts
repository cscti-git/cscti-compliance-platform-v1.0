import pb from '@/lib/pocketbase/client'
import {
  listConformidadeCatalogo,
  listConformidadeStatus,
  avaliarStatusModulosIntegrados,
  consolidarMatrizConformidade,
} from '@/services/conformidadeService'
import { listPlanosAcao, calcularRaioXPlanos } from '@/services/planoAcaoService'
import {
  listInventoryAssets,
  listPeople,
  getCurrentUserOrganization,
} from '@/services/csctiService'
import { listDesignacoes } from '@/services/designacaoService'
import {
  listInfraItens,
  listInfraLinks,
  listInfraChecklist,
  confrontarConectividade,
  analisarAtivosEol,
} from '@/services/infraestruturaService'
import {
  listSegSolucoes,
  listSegCoberturasExigidas,
  listSegComprovantes,
  listSegItensConformidade,
  calcularCoberturaSeguranca,
} from '@/services/segurancaService'
import {
  listLgpdDados,
  listLgpdFinalidades,
  listLgpdCiencias,
  listLgpdIncidentes,
} from '@/services/lgpdService'
import {
  listBackupPlanos,
  listBackupRotinas,
  listBackupExecucoes,
  listBackupTestes,
  listBackupMonitoramentos,
  listBackupOcorrencias,
} from '@/services/backupService'
import { buildDefaultPeriod, loadRelatorioData } from '@/pages/backup/relatorioData'
import type {
  OrganizationItem,
  PersonItem,
  DesignacaoItem,
  InventoryAssetItem,
  MatrizConformidadeConsolidada,
  PlanosAcaoRaioX,
  PlanoAcaoItem,
  InfraItem,
  InfraLinkItem,
  InfraChecklistItem,
  SegSolucaoItem,
  SegComprovanteItem,
  SegItemConformidadeItem,
  SegurancaCoberturaCalculada,
  LgpdDadoItem,
  LgpdFinalidadeItem,
  LgpdCienciaItem,
  LgpdIncidenteItem,
  BackupPlanoItem,
  BackupRotinaItem,
  BackupExecucaoItem,
  BackupTesteRecuperacaoItem,
  BackupMonitoramentoExternoItem,
  BackupOcorrenciaItem,
  ConformidadeItemCatalog,
  ConformidadeStatusItem,
} from '@/types/cscti'

export interface ModuloStatusResumo {
  id: string
  titulo: string
  descricao: string
  moduloOrigem: string
  linkModulo: string
  percentual: number
  totalItens: number
  comprovados: number
  pendentes: number
  parciais: number
  statusGeral: 'conforme' | 'parcial' | 'pendente' | 'atencao'
  detalhesTexto: string
}

export interface DossieConsolidadoBundle {
  dataGeracao: string
  organization: OrganizationItem | null
  titular: DesignacaoItem | PersonItem | null
  rsiDesignado: DesignacaoItem | null
  todasDesignacoes: DesignacaoItem[]
  colaboradores: PersonItem[]

  // 1. Matriz de Conformidade
  catalogoConformidade: ConformidadeItemCatalog[]
  statusConformidade: ConformidadeStatusItem[]
  itensAvaliados: Array<ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }>
  matrizConsolidada: MatrizConformidadeConsolidada

  // 2. Resumo por Módulo
  modulosResumo: ModuloStatusResumo[]

  // 3. Inventário
  ativos: InventoryAssetItem[]
  ativosEol: ReturnType<typeof analisarAtivosEol>

  // 4. Continuidade e Backup
  backupPlanos: BackupPlanoItem[]
  backupRotinas: BackupRotinaItem[]
  backupExecucoesRecentes: BackupExecucaoItem[]
  backupTestes: BackupTesteRecuperacaoItem[]
  backupNoc: BackupMonitoramentoExternoItem[]
  backupOcorrencias: BackupOcorrenciaItem[]
  backupBundle: Awaited<ReturnType<typeof loadRelatorioData>> | null

  // 5. Infraestrutura Física e Lógica
  infraItens: InfraItem[]
  infraLinks: InfraLinkItem[]
  infraChecklist: InfraChecklistItem[]
  infraConfronto: ReturnType<typeof confrontarConectividade>

  // 6. Segurança do Ambiente
  segSolucoes: SegSolucaoItem[]
  segComprovantes: SegComprovanteItem[]
  segItens: SegItemConformidadeItem[]
  segCobertura: SegurancaCoberturaCalculada

  // 7. LGPD e Governança
  lgpdDados: LgpdDadoItem[]
  lgpdFinalidades: LgpdFinalidadeItem[]
  lgpdCiencias: LgpdCienciaItem[]
  lgpdIncidentes: LgpdIncidenteItem[]

  // 8. Planos de Ação
  planosAcao: PlanoAcaoItem[]
  planosRaioX: PlanosAcaoRaioX
}

/**
 * Agrega e consolida dados de todos os módulos para a tela /dossie e para o relatório A4 /relatorios/consolidado.
 * Reutiliza os serviços existentes, sempre filtrados pela organização ativa (multi-tenant).
 */
export async function carregarDossieConsolidado(
  orgId: string,
  currentOrg?: OrganizationItem | null,
): Promise<DossieConsolidadoBundle> {
  const dataGeracao = new Date().toISOString()
  if (!orgId) {
    throw new Error('Identificador da serventia ausente.')
  }

  // 1. Carregar registros fundamentais em paralelo
  const [
    orgRes,
    catRes,
    stRes,
    desigRes,
    peopleRes,
    assetsRes,
    planosRes,
    infraItensRes,
    infraLinksRes,
    infraChkRes,
    segSolRes,
    segCobRes,
    segCompRes,
    segItensRes,
    lgpdDadosRes,
    lgpdFinRes,
    lgpdCienRes,
    lgpdIncRes,
    bkPlanosRes,
    bkRotinasRes,
    bkExecRes,
    bkTestesRes,
    bkNocRes,
    bkOcorrRes,
  ] = await Promise.all([
    currentOrg ? Promise.resolve(currentOrg) : getCurrentUserOrganization().catch(() => null),
    listConformidadeCatalogo().catch(() => []),
    listConformidadeStatus(orgId).catch(() => []),
    listDesignacoes(orgId).catch(() => []),
    listPeople(orgId).catch(() => []),
    listInventoryAssets(orgId).catch(() => []),
    listPlanosAcao(orgId).catch(() => []),
    listInfraItens(orgId).catch(() => []),
    listInfraLinks(orgId).catch(() => []),
    listInfraChecklist(orgId).catch(() => []),
    listSegSolucoes(orgId).catch(() => []),
    listSegCoberturasExigidas(orgId).catch(() => []),
    listSegComprovantes(orgId).catch(() => []),
    listSegItensConformidade(orgId).catch(() => []),
    listLgpdDados(orgId).catch(() => []),
    listLgpdFinalidades(orgId).catch(() => []),
    listLgpdCiencias(orgId).catch(() => []),
    listLgpdIncidentes(orgId).catch(() => []),
    listBackupPlanos(orgId).catch(() => []),
    listBackupRotinas(orgId).catch(() => []),
    listBackupExecucoes(orgId).catch(() => []),
    listBackupTestes(orgId).catch(() => []),
    listBackupMonitoramentos(orgId).catch(() => []),
    listBackupOcorrencias(orgId).catch(() => []),
  ])

  // Avaliação dinâmica da Matriz com os dados reais
  const itensAvaliados = await avaliarStatusModulosIntegrados(orgId, catRes, stRes)
  const matrizConsolidada = consolidarMatrizConformidade(orgRes, itensAvaliados)

  // Subanálise de Backup e Continuidade (usando módulo backup homologado)
  let backupBundle: Awaited<ReturnType<typeof loadRelatorioData>> | null = null
  try {
    backupBundle = await loadRelatorioData(orgId, buildDefaultPeriod())
  } catch (err) {
    console.warn('[dossieService] Falha ao carregar bundle de backup:', err)
  }

  // Identificação do Titular e RSI
  const titular =
    desigRes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'TITULAR_RESPONSAVEL' ||
          d.cargo_designado?.toLowerCase().includes('titular') ||
          d.cargo_designado?.toLowerCase().includes('tabeli') ||
          d.cargo_designado?.toLowerCase().includes('oficial')) &&
        d.status !== 'revogada',
    ) ||
    peopleRes.find(
      (c) =>
        c.role_title?.toLowerCase().includes('titular') ||
        c.role_title?.toLowerCase().includes('tabeli') ||
        c.role_title?.toLowerCase().includes('oficial'),
    ) ||
    null

  const rsiDesignado =
    desigRes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'RESP_SEGURANCA_INFO' ||
          d.expand?.papel_designado?.codigo === 'RSI' ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança') ||
          d.cargo_designado?.toLowerCase().includes('segurança')) &&
        d.status !== 'revogada',
    ) || null

  // Análises especializadas
  const infraConfronto = confrontarConectividade(orgRes, infraLinksRes)
  const ativosEol = analisarAtivosEol(assetsRes)
  const segCobertura = calcularCoberturaSeguranca(
    assetsRes,
    segSolRes,
    segCobRes,
    segCompRes,
    segItensRes,
  )
  const planosRaioX = calcularRaioXPlanos(planosRes)

  // 2. Resumo por Módulo (com percentuais calculados a partir da Matriz de Conformidade)
  // Cada item da matriz pertence a um módulo de origem.
  const modulosChave = [
    {
      id: 'governanca',
      titulo: 'Papéis & Responsáveis',
      descricao: 'Designações do Titular, RSI, Encarregado e termos assinados',
      moduloOrigem: 'Papéis & Responsáveis',
      linkModulo: '/configuracoes?tab=papeis',
      etapas: [1],
      detalhesTexto: `${desigRes.filter((d) => d.status.startsWith('assinada')).length} de ${desigRes.length} termos assinados`,
    },
    {
      id: 'lgpd',
      titulo: 'LGPD e Governança',
      descricao: 'ROPA, inventário de dados, ciência da PSI e gestão de incidentes',
      moduloOrigem: 'LGPD',
      linkModulo: '/lgpd',
      etapas: [1],
      detalhesTexto: `${lgpdFinRes.length} operações ROPA · ${lgpdCienRes.filter((c) => c.status === 'concedida').length} ciências da PSI`,
    },
    {
      id: 'ativos',
      titulo: 'Inventário de Ativos',
      descricao: 'Mapeamento e classificação de hardware, servidores e análise EOL',
      moduloOrigem: 'Inventário',
      linkModulo: '/ativos',
      etapas: [1, 2],
      detalhesTexto: `${assetsRes.length} ativos cadastrados (${ativosEol.filter((a) => a.eolStatus === 'suportado').length} com suporte oficial)`,
    },
    {
      id: 'infraestrutura',
      titulo: 'Infraestrutura Física e Lógica',
      descricao: 'Energia (nobreak/gerador/laudos), ambiente, conectividade e links',
      moduloOrigem: 'Infraestrutura',
      linkModulo: '/infraestrutura',
      etapas: [2, 3],
      detalhesTexto: `Links: ${infraConfronto.velocidadeTotalAtivaMbps} Mbps (${infraConfronto.statusGeral.toUpperCase()}) · ${infraItensRes.length} controles físicos`,
    },
    {
      id: 'seguranca',
      titulo: 'Segurança do Ambiente',
      descricao: 'Soluções antivírus/EDR, firewall perimetral, consoles e checklist',
      moduloOrigem: 'Segurança',
      linkModulo: '/seguranca',
      etapas: [2, 3, 4],
      detalhesTexto: `Cobertura de endpoints: ${segCobertura.percentualCobertura}% (${segCobertura.comprovadasEndpoint} de ${segCobertura.exigidasEndpoint})`,
    },
    {
      id: 'backup',
      titulo: 'Continuidade e Backup',
      descricao: 'Rotinas, cópias em nuvem/local, RTO/RPO, testes e Validação Externa (NOC)',
      moduloOrigem: 'Backup',
      linkModulo: '/backup',
      etapas: [2, 5],
      detalhesTexto: `Proteção efetiva: ${backupBundle?.pct_protegido ?? 0}% · ${bkTestesRes.length} teste(s) de restauração`,
    },
    {
      id: 'evidencias',
      titulo: 'Central de Evidências',
      descricao: 'Repositório comprobatório imutável com hashes SHA-256',
      moduloOrigem: 'Evidências',
      linkModulo: '/evidencias',
      etapas: [6],
      detalhesTexto: `${itensAvaliados.filter((i) => i.hash_sha256).length} itens com hash SHA-256 anexado`,
    },
  ]

  const modulosResumo: ModuloStatusResumo[] = modulosChave.map((mod) => {
    // Filtrar itens da matriz que se relacionam com o módulo
    const itensDoModulo = itensAvaliados.filter(
      (it) =>
        it.catalog?.modulo_origem?.toLowerCase().includes(mod.moduloOrigem.toLowerCase()) ||
        mod.etapas.includes(it.catalog?.etapa || 0),
    )

    const total = itensDoModulo.length || 1
    const comp = itensDoModulo.filter((i) => i.status === 'comprovado').length
    const parc = itensDoModulo.filter((i) => i.status === 'parcial').length
    const pend = itensDoModulo.filter(
      (i) => i.status === 'pendente' || i.status === 'nao_conforme',
    ).length
    const pct = Math.round((comp / total) * 100)

    let statusGeral: ModuloStatusResumo['statusGeral'] = 'pendente'
    if (pct === 100) statusGeral = 'conforme'
    else if (pct > 0 || parc > 0) statusGeral = 'parcial'
    else if (pend === total) statusGeral = 'pendente'

    return {
      id: mod.id,
      titulo: mod.titulo,
      descricao: mod.descricao,
      moduloOrigem: mod.moduloOrigem,
      linkModulo: mod.linkModulo,
      percentual: pct,
      totalItens: total,
      comprovados: comp,
      pendentes: pend,
      parciais: parc,
      statusGeral,
      detalhesTexto: mod.detalhesTexto,
    }
  })

  return {
    dataGeracao,
    organization: orgRes,
    titular,
    rsiDesignado,
    todasDesignacoes: desigRes,
    colaboradores: peopleRes,
    catalogoConformidade: catRes,
    statusConformidade: stRes,
    itensAvaliados,
    matrizConsolidada,
    modulosResumo,
    ativos: assetsRes,
    ativosEol,
    backupPlanos: bkPlanosRes,
    backupRotinas: bkRotinasRes,
    backupExecucoesRecentes: bkExecRes,
    backupTestes: bkTestesRes,
    backupNoc: bkNocRes,
    backupOcorrencias: bkOcorrRes,
    backupBundle,
    infraItens: infraItensRes,
    infraLinks: infraLinksRes,
    infraChecklist: infraChkRes,
    infraConfronto,
    segSolucoes: segSolRes,
    segComprovantes: segCompRes,
    segItens: segItensRes,
    segCobertura,
    lgpdDados: lgpdDadosRes,
    lgpdFinalidades: lgpdFinRes,
    lgpdCiencias: lgpdCienRes,
    lgpdIncidentes: lgpdIncRes,
    planosAcao: planosRes,
    planosRaioX,
  }
}
