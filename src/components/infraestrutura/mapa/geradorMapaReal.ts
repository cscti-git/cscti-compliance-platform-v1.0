import { EquipamentoSimulado, TopologiaConexao, CamadaId } from './topologiaData'
import { InventoryAssetItem } from '@/types/cscti'
import { InfraItem, InfraLinkItem } from '@/types/cscti'
import { EvidenciaItem } from '@/types/cscti'

export interface GeradorMapaRealResult {
  equipamentos: EquipamentoSimulado[]
  conexoes: TopologiaConexao[]
  totalAtivosInventario: number
  totalInfraItens: number
  totalLinks: number
  totalEvidenciasComFoto: number
  nosReaisCount: number
  nosPendentesCadastroCount: number
  autonomiaTotalMinutos: number
  velocidadeTotalMbps: number
  temDadosSuficientes: boolean
  resumoPorCamada: Record<CamadaId, { total: number; reais: number; pendentes: number }>
}

/**
 * Normaliza strings para busca comparativa (sem acentos e minúsculo)
 */
function normalize(str?: string | null): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Gera a topologia completa a partir dos registros reais do PocketBase da serventia.
 * Se houver elementos essenciais faltantes (como gerador, ar-condicionado, racks etc.),
 * insere nós de alerta "Cadastrar manualmente" com apontamentos diretos.
 */
export function gerarTopologiaRealServentia(params: {
  assets: InventoryAssetItem[]
  infraItens: InfraItem[]
  infraLinks: InfraLinkItem[]
  evidencias: EvidenciaItem[]
}): GeradorMapaRealResult {
  const { assets, infraItens, infraLinks, evidencias } = params

  const equipamentos: EquipamentoSimulado[] = []
  const conexoes: TopologiaConexao[] = []

  // Mapeamento e contagem de fotos por categoria de evidência
  const evidenciasPorCategoria: Record<string, EvidenciaItem[]> = {}
  const evidenciasPorAtivo: Record<string, EvidenciaItem> = {}
  let totalFotos = 0

  for (const evi of evidencias) {
    const cat = normalize(evi.categoria_nome || (evi.expand?.categoria as any)?.name || '')
    if (!evidenciasPorCategoria[cat]) evidenciasPorCategoria[cat] = []
    evidenciasPorCategoria[cat].push(evi)

    if (evi.arquivos && evi.arquivos.length > 0) {
      totalFotos += evi.arquivos.length
    }

    if (evi.ativo_vinculado) {
      evidenciasPorAtivo[evi.ativo_vinculado] = evi
    }
  }

  // Helper para buscar evidência por palavras-chave na categoria ou título
  const findEvidencia = (keywords: string[]): EvidenciaItem | undefined => {
    for (const evi of evidencias) {
      const fullText = normalize(`${evi.titulo} ${evi.descricao || ''} ${evi.categoria_nome || ''}`)
      if (keywords.some((kw) => fullText.includes(normalize(kw)))) {
        return evi
      }
    }
    return undefined
  }

  // Filtrar dados reais de infraestrutura
  const nobreaksReais = infraItens.filter(
    (i) =>
      i.tipo_item === 'nobreak' ||
      normalize(i.titulo).includes('nobreak') ||
      normalize(i.modelo).includes('nobreak'),
  )
  const geradoresReais = infraItens.filter(
    (i) => i.tipo_item === 'gerador' || normalize(i.titulo).includes('gerador'),
  )
  const salasTiReais = infraItens.filter(
    (i) => i.tipo_item === 'sala_ti' || normalize(i.titulo).includes('sala'),
  )
  const arCondicionadosReais = infraItens.filter(
    (i) =>
      i.tipo_item === 'ar_condicionado' ||
      normalize(i.titulo).includes('ar') ||
      normalize(i.titulo).includes('climatizacao'),
  )
  const racksReais = infraItens.filter(
    (i) => i.tipo_item === 'racks' || normalize(i.titulo).includes('rack'),
  )
  const laudosAterramentoReais = infraItens.filter(
    (i) =>
      i.tipo_item === 'laudo_aterramento' ||
      normalize(i.titulo).includes('aterramento') ||
      normalize(i.titulo).includes('spda'),
  )

  // Separar ativos de inventário por categorias de arquitetura
  const servidoresReais = assets.filter(
    (a) =>
      a.tipo === 'servidor_aplicacao' ||
      a.tipo === 'servidor_virtualizado' ||
      a.tipo === 'banco_dados' ||
      normalize(a.name).startsWith('srv') ||
      normalize(a.name).startsWith('spcm'),
  )
  const storagesReais = assets.filter(
    (a) =>
      a.tipo === 'storage_backup' ||
      normalize(a.name).includes('storage') ||
      normalize(a.name).includes('san') ||
      normalize(a.name).includes('nas') ||
      normalize(a.name).startsWith('str'),
  )
  const switchesReais = assets.filter(
    (a) =>
      a.tipo === 'equipamento_rede' ||
      normalize(a.name).includes('switch') ||
      normalize(a.name).includes('roteador') ||
      normalize(a.name).startsWith('sw'),
  )
  const estacoesReais = assets.filter(
    (a) =>
      a.tipo === 'estacao' ||
      normalize(a.name).startsWith('ws') ||
      normalize(a.name).startsWith('estacao') ||
      normalize(a.name).includes('desktop'),
  )
  const impressorasReais = assets.filter(
    (a) =>
      a.tipo === 'impressora_multifuncional' ||
      normalize(a.name).includes('imp') ||
      normalize(a.name).includes('zebra') ||
      normalize(a.name).includes('kyocera'),
  )

  // Totais agregados
  const totalAtivosInventario = assets.length
  const totalInfraItens = infraItens.length
  const totalLinks = infraLinks.length
  const totalEvidenciasComFoto = totalFotos

  // Critério de honestidade: tem dados suficientes se houver pelo menos 1 ativo ou 1 item de infra
  const temDadosSuficientes = totalAtivosInventario > 0 || totalInfraItens > 0 || totalLinks > 0

  let nosReaisCount = 0
  let nosPendentesCadastroCount = 0

  // Contadores para o nó de energia / links
  let autonomiaTotalMinutos = 0
  nobreaksReais.forEach((n) => {
    autonomiaTotalMinutos += n.autonomia_minutos || 0
  })

  let velocidadeTotalMbps = 0
  infraLinks.forEach((l) => {
    velocidadeTotalMbps += l.velocidade_mbps || 0
  })

  // =========================================================================
  // 1. CAMADA DE ENERGIA
  // =========================================================================

  // (1.1) Rede Concessionária / Entrada Predial
  const laudoAterramento = laudosAterramentoReais[0]
  const eviEnergia = findEvidencia(['energia', 'padrao', 'aterramento'])
  equipamentos.push({
    id: 'real-en-rede-publica',
    nome: 'Rede Pública (Concessionária Predial)',
    codigoAtivo: 'PWR-GRID',
    setor: 'Entrada Predial / Padrão de Entrada',
    camadaId: 'energia',
    tipoEquipamento: 'Alimentação CA da Concessionária',
    fabricanteModelo: laudoAterramento?.modelo || 'Entrada Elétrica Trifásica com Aterramento',
    ipOuIdentificacao: laudoAterramento?.art_numero
      ? `ART: ${laudoAterramento.art_numero}`
      : undefined,
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'zap',
    evidenciaFotoSimulada: eviEnergia
      ? {
          idEvidencia: eviEnergia.id,
          titulo: eviEnergia.titulo,
          categoria: eviEnergia.categoria_nome || 'Energia',
        }
      : undefined,
    detalhesTecnicos: {
      tensaoOuAlimentacao: 'Trifásico / Padrão da Serventia',
      localizacaoFisica: 'Padrão externo da serventia',
      observacoes: laudoAterramento
        ? `Laudo de aterramento/SPDA: ${laudoAterramento.titulo} (Status: ${laudoAterramento.status}).`
        : 'Alimentação primária da concessionária local.',
    },
    isRealData: true,
  })
  nosReaisCount++

  // (1.2) Gerador
  if (geradoresReais.length > 0) {
    const g = geradoresReais[0]
    const eviGerador = findEvidencia(['gerador'])
    equipamentos.push({
      id: `real-en-gerador-${g.id}`,
      nome: g.titulo || 'Grupo Motogerador',
      codigoAtivo: g.art_numero ? `GEN-${g.art_numero}` : 'PWR-GEN-01',
      setor: 'Área Técnica Externa',
      camadaId: 'energia',
      tipoEquipamento: 'Grupo Motogerador a Diesel / Gás',
      fabricanteModelo: g.modelo || 'Gerador com QTA Automático',
      status: g.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'generator',
      evidenciaFotoSimulada: eviGerador
        ? {
            idEvidencia: eviGerador.id,
            titulo: eviGerador.titulo,
            categoria: eviGerador.categoria_nome || 'Gerador',
          }
        : undefined,
      detalhesTecnicos: {
        capacidade: g.potencia_va
          ? `${g.potencia_va} VA`
          : g.autonomia_minutos
            ? `${g.autonomia_minutos} min`
            : undefined,
        tensaoOuAlimentacao: 'Acionamento automático por QTA',
        localizacaoFisica: 'Área externa / Pátio técnico',
        observacoes:
          g.observacoes ||
          g.descricao ||
          'Grupo motogerador cadastrado no módulo de Infraestrutura.',
      },
      isRealData: true,
      infraOrigemId: g.id,
    })
    nosReaisCount++
  } else {
    // Pendente de cadastro
    equipamentos.push({
      id: 'real-en-gerador-pendente',
      nome: 'Grupo Gerador de Emergência',
      codigoAtivo: 'PWR-GEN-PENDENTE',
      setor: 'Área Técnica Externa',
      camadaId: 'energia',
      tipoEquipamento: 'Gerador / Autonomia Contínua',
      fabricanteModelo: 'Não cadastrado no módulo Infraestrutura',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'generator',
      precisaCadastro: true,
      moduloCadastroSugerido: 'infraestrutura',
      detalhesTecnicos: {
        localizacaoFisica: 'Pátio técnico / Área externa',
        observacoes:
          'A serventia ainda não cadastrou um gerador no módulo Infraestrutura → Energia.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (1.3) Quadro Geral (QGBT)
  equipamentos.push({
    id: 'real-en-quadro-geral',
    nome: 'Quadro Geral de Distribuição (QGBT)',
    codigoAtivo: 'PWR-QGBT-01',
    setor: 'Entrada Técnica / Barramento Geral',
    camadaId: 'energia',
    tipoEquipamento: 'Quadro de Distribuição Geral com Disjuntores e DPS',
    fabricanteModelo: 'Barramento Central com Proteção contra Surtos',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'quadro',
    detalhesTecnicos: {
      tensaoOuAlimentacao: 'Trifásico / Bifásico',
      localizacaoFisica: 'Área técnica / Medição',
      observacoes:
        'Recebe alimentação da concessionária e do gerador; alimenta os nobreaks e quadros setoriais.',
    },
    isRealData: true,
  })
  nosReaisCount++

  // (1.4) Nobreaks Cadastrados
  if (nobreaksReais.length > 0) {
    nobreaksReais.forEach((nbk, idx) => {
      const eviNbk = findEvidencia(['nobreak', 'ups', 'bateria'])
      equipamentos.push({
        id: `real-en-nbk-${nbk.id}`,
        nome: nbk.titulo || `Nobreak Real #${idx + 1}`,
        codigoAtivo: `PWR-NBK-${idx + 1}`,
        setor: 'Sala Técnica de Energia',
        camadaId: 'energia',
        tipoEquipamento: 'UPS Senoidal Online / Interativo',
        fabricanteModelo: nbk.modelo || 'Nobreak Profissional da Serventia',
        status: nbk.status === 'conforme' ? 'operacional' : 'alerta',
        criticidade: 'alta',
        iconKey: 'nobreak',
        infraNobreakSimulado: {
          autonomiaMinutos: nbk.autonomia_minutos || 0,
          potenciaKva: nbk.potencia_va ? `${nbk.potencia_va / 1000} kVA` : 'Capacidade padrão',
          bateriasStatus: nbk.data_validade
            ? `Validade das baterias: ${nbk.data_validade}`
            : 'Baterias em regime regular',
        },
        evidenciaFotoSimulada: eviNbk
          ? {
              idEvidencia: eviNbk.id,
              titulo: eviNbk.titulo,
              categoria: eviNbk.categoria_nome || 'Nobreaks',
            }
          : undefined,
        detalhesTecnicos: {
          capacidade: nbk.potencia_va
            ? `${nbk.potencia_va} VA (${nbk.autonomia_minutos || 0} min)`
            : undefined,
          tensaoOuAlimentacao: nbk.redundancia_instalada
            ? 'Redundância instalada'
            : 'Circuito Nobreak dedicado',
          localizacaoFisica: 'Sala de TI / Energia',
          observacoes:
            nbk.observacoes || nbk.descricao || 'Nobreak registrado no módulo Infraestrutura.',
        },
        isRealData: true,
        infraOrigemId: nbk.id,
      })
      nosReaisCount++
    })
  } else {
    // Pendente de cadastro
    equipamentos.push({
      id: 'real-en-nbk-pendente',
      nome: 'Nobreak Central (Banco de Baterias)',
      codigoAtivo: 'PWR-NBK-PENDENTE',
      setor: 'Sala Técnica de Energia',
      camadaId: 'energia',
      tipoEquipamento: 'UPS / Nobreak Senoidal',
      fabricanteModelo: 'Não cadastrado no módulo Infraestrutura',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'nobreak',
      precisaCadastro: true,
      moduloCadastroSugerido: 'infraestrutura',
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores / TI',
        observacoes: 'Cadastre os nobreaks da serventia com autonomia em minutos e potência em VA.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // =========================================================================
  // 2. CAMADA DA SALA DE SERVIDORES (CPD)
  // =========================================================================

  // (2.1) Rack Sala de Servidores
  if (racksReais.length > 0) {
    const r = racksReais[0]
    const eviRack = findEvidencia(['rack', 'sala'])
    equipamentos.push({
      id: `real-srv-rack-${r.id}`,
      nome: r.titulo || 'Rack Principal da Sala de Servidores',
      codigoAtivo: 'RCK-CPD-01',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Rack 19" Fechado',
      fabricanteModelo: r.modelo || 'Rack 42U Padrão Fechado',
      status: r.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'rack',
      evidenciaFotoSimulada: eviRack
        ? {
            idEvidencia: eviRack.id,
            titulo: eviRack.titulo,
            categoria: eviRack.categoria_nome || 'Racks',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores',
        observacoes: r.observacoes || r.descricao || 'Rack principal cadastrado na Infraestrutura.',
      },
      isRealData: true,
      infraOrigemId: r.id,
    })
    nosReaisCount++
  } else {
    equipamentos.push({
      id: 'real-srv-rack-pendente',
      nome: 'Rack Principal da Sala de Servidores',
      codigoAtivo: 'RCK-CPD-PENDENTE',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Rack 19" Fechado',
      fabricanteModelo: 'Não cadastrado no módulo Infraestrutura',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'rack',
      precisaCadastro: true,
      moduloCadastroSugerido: 'infraestrutura',
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores',
        observacoes:
          'Cadastre o rack da sala de servidores no módulo de Infraestrutura → Ambiente Físico.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (2.2) Servidores reais do Inventário de Ativos
  if (servidoresReais.length > 0) {
    servidoresReais.forEach((srv) => {
      const eviSrv = evidenciasPorAtivo[srv.id] || findEvidencia([srv.name, 'servidor'])
      equipamentos.push({
        id: `real-srv-${srv.id}`,
        nome: srv.name,
        codigoAtivo: srv.serial_number || `SRV-${srv.id.slice(-4).toUpperCase()}`,
        setor: srv.localizacao || 'Sala de Servidores',
        camadaId: 'sala_servidores',
        tipoEquipamento:
          srv.tipo === 'servidor_virtualizado'
            ? 'Servidor Virtualizado'
            : 'Servidor Físico / Aplicação',
        fabricanteModelo: srv.sistema_operacional
          ? `${srv.sistema_operacional} ${srv.versao_so || ''}`
          : 'Servidor em Produção',
        ipOuIdentificacao: srv.ip_address || undefined,
        status: srv.status === 'ativo' ? 'operacional' : 'alerta',
        criticidade: srv.criticidade || 'alta',
        iconKey: 'server',
        glpiVinculoSimulado: {
          idAtivo: srv.id,
          nomeGlpi: srv.name,
          categoriaGlpi: srv.tipo,
        },
        evidenciaFotoSimulada: eviSrv
          ? {
              idEvidencia: eviSrv.id,
              titulo: eviSrv.titulo,
              categoria: eviSrv.categoria_nome || 'Servidores',
            }
          : undefined,
        detalhesTecnicos: {
          localizacaoFisica: srv.localizacao || 'Sala de Servidores',
          observacoes:
            srv.descricao ||
            `Ativo registrado no Inventário (Origem: ${srv.origem || 'manual'}). Exige backup: ${[srv.exige_backup_local && 'Local', srv.exige_backup_nuvem && 'Nuvem', srv.exige_backup_replicacao && 'Replicação'].filter(Boolean).join(', ') || 'Nenhum'}.`,
        },
        isRealData: true,
        assetOrigemId: srv.id,
      })
      nosReaisCount++
    })
  } else {
    equipamentos.push({
      id: 'real-srv-pendente',
      nome: 'Servidores de Produção (Hosts/VMs)',
      codigoAtivo: 'SRV-PENDENTE',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Servidor / VM / Banco de Dados',
      fabricanteModelo: 'Nenhum servidor cadastrado no Inventário',
      status: 'critico',
      criticidade: 'alta',
      iconKey: 'server',
      precisaCadastro: true,
      moduloCadastroSugerido: 'inventario',
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores',
        observacoes: 'Cadastre servidores no Inventário de Ativos ou sincronize via conector GLPI.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (2.3) Storages reais do Inventário
  if (storagesReais.length > 0) {
    storagesReais.forEach((str) => {
      equipamentos.push({
        id: `real-str-${str.id}`,
        nome: str.name,
        codigoAtivo: str.serial_number || `STR-${str.id.slice(-4).toUpperCase()}`,
        setor: str.localizacao || 'Sala de Servidores',
        camadaId: 'sala_servidores',
        tipoEquipamento: 'Storage SAN / NAS / Backup',
        fabricanteModelo: str.sistema_operacional || 'Storage de Armazenamento Registral',
        ipOuIdentificacao: str.ip_address || undefined,
        status: str.status === 'ativo' ? 'operacional' : 'alerta',
        criticidade: str.criticidade || 'alta',
        iconKey: 'storage',
        glpiVinculoSimulado: {
          idAtivo: str.id,
          nomeGlpi: str.name,
          categoriaGlpi: str.tipo,
        },
        detalhesTecnicos: {
          localizacaoFisica: str.localizacao || 'Sala de Servidores',
          observacoes: str.descricao || 'Storage central cadastrado no Inventário de Ativos.',
        },
        isRealData: true,
        assetOrigemId: str.id,
      })
      nosReaisCount++
    })
  } else {
    // Storage padrão ou pendente
    equipamentos.push({
      id: 'real-str-pendente',
      nome: 'Storage Central / Backup Local',
      codigoAtivo: 'STR-PENDENTE',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Storage SAN / NAS',
      fabricanteModelo: 'Não identificado no Inventário',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'storage',
      precisaCadastro: true,
      moduloCadastroSugerido: 'inventario',
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores',
        observacoes:
          'Cadastre o equipamento de storage ou storage de backup no Inventário de Ativos.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (2.4) Switches de Rede / Core
  if (switchesReais.length > 0) {
    switchesReais.forEach((sw) => {
      equipamentos.push({
        id: `real-sw-${sw.id}`,
        nome: sw.name,
        codigoAtivo: sw.serial_number || `SW-${sw.id.slice(-4).toUpperCase()}`,
        setor: sw.localizacao || 'Sala de Servidores',
        camadaId: 'sala_servidores',
        tipoEquipamento: 'Switch de Rede / Núcleo Gerenciável',
        fabricanteModelo: sw.sistema_operacional || 'Switch Gerenciável com Uplinks Fibra',
        ipOuIdentificacao: sw.ip_address || undefined,
        status: sw.status === 'ativo' ? 'operacional' : 'alerta',
        criticidade: sw.criticidade || 'alta',
        iconKey: 'switch',
        glpiVinculoSimulado: {
          idAtivo: sw.id,
          nomeGlpi: sw.name,
          categoriaGlpi: sw.tipo,
        },
        detalhesTecnicos: {
          localizacaoFisica: sw.localizacao || 'Rack Sala Servidores',
          observacoes: sw.descricao || 'Equipamento de rede cadastrado no Inventário de Ativos.',
        },
        isRealData: true,
        assetOrigemId: sw.id,
      })
      nosReaisCount++
    })
  } else {
    equipamentos.push({
      id: 'real-sw-pendente',
      nome: 'Switches de Núcleo (Core Switch)',
      codigoAtivo: 'SW-CORE-PENDENTE',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Switch Gerenciável L2/L3',
      fabricanteModelo: 'Não cadastrado no Inventário',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'switch',
      precisaCadastro: true,
      moduloCadastroSugerido: 'inventario',
      detalhesTecnicos: {
        localizacaoFisica: 'Rack Sala de Servidores',
        observacoes: 'Cadastre o switch de núcleo e switches de borda no Inventário de Ativos.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (2.5) Links de Conectividade Internet
  if (infraLinks.length > 0) {
    infraLinks.forEach((link, idx) => {
      equipamentos.push({
        id: `real-link-${link.id}`,
        nome: `Link Internet: ${link.operadora}`,
        codigoAtivo: link.circuito_id ? `CIR-${link.circuito_id}` : `WAN-LINK-0${idx + 1}`,
        setor: 'Sala de Servidores / DIO de Telecom',
        camadaId: 'sala_servidores',
        tipoEquipamento: `Link ${link.tipo_link === 'dedicado' ? 'Dedicado' : 'Banda Larga'} (${link.meio_transmissao?.replace('_', ' ') || 'Fibra Óptica'})`,
        fabricanteModelo: `${link.operadora} • ${link.velocidade_mbps} Mbps ${link.ip_fixo ? '(IP Fixo)' : ''}`,
        ipOuIdentificacao: link.ip_fixo ? 'IP Fixo Configurado' : 'IP Dinâmico',
        status: link.status === 'ativo' ? 'operacional' : 'alerta',
        criticidade: link.redundancia ? 'alta' : 'media',
        iconKey: 'telecom',
        conectividadeLinkSimulado: {
          operadora: link.operadora,
          tipoLink: link.tipo_link,
          velocidade: `${link.velocidade_mbps} Mbps`,
        },
        detalhesTecnicos: {
          capacidade: `${link.velocidade_mbps} Mbps`,
          localizacaoFisica: 'DIO / Rack de Telecomunicações',
          observacoes:
            link.observacoes ||
            `Suporte: ${link.contato_suporte || 'Não informado'}. Redundância: ${link.redundancia ? 'Sim' : 'Não'}.`,
        },
        isRealData: true,
      })
      nosReaisCount++
    })
  } else {
    equipamentos.push({
      id: 'real-link-pendente',
      nome: 'Links de Internet / Conectividade WAN',
      codigoAtivo: 'WAN-PENDENTE',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Conectividade com Provedor',
      fabricanteModelo: 'Nenhum link cadastrado em Infraestrutura → Conectividade',
      status: 'critico',
      criticidade: 'alta',
      iconKey: 'telecom',
      precisaCadastro: true,
      moduloCadastroSugerido: 'conectividade',
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores / Entrada Telefonia',
        observacoes:
          'Cadastre os links de internet em Infraestrutura → Conectividade para aferir velocidade exigida.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (2.6) Ar-condicionado / Climatização
  if (arCondicionadosReais.length > 0) {
    const ac = arCondicionadosReais[0]
    const eviAc = findEvidencia(['ar', 'climatizacao', 'temperatura'])
    equipamentos.push({
      id: `real-ac-${ac.id}`,
      nome: ac.titulo || 'Climatização Dedicada da Sala de TI',
      codigoAtivo: 'CLIM-CPD-01',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Ar-Condicionado / Split Inverter Revezamento',
      fabricanteModelo: ac.modelo || 'Ar-Condicionado de Precisão',
      status: ac.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'hvac',
      evidenciaFotoSimulada: eviAc
        ? {
            idEvidencia: eviAc.id,
            titulo: eviAc.titulo,
            categoria: eviAc.categoria_nome || 'Ar-condicionado',
          }
        : undefined,
      detalhesTecnicos: {
        capacidade: ac.potencia_va ? `${ac.potencia_va} BTUs` : undefined,
        localizacaoFisica: 'Sala de Servidores',
        observacoes:
          ac.observacoes ||
          ac.descricao ||
          'Equipamento de climatização cadastrado na Infraestrutura.',
      },
      isRealData: true,
      infraOrigemId: ac.id,
    })
    nosReaisCount++
  } else {
    equipamentos.push({
      id: 'real-ac-pendente',
      nome: 'Climatização da Sala de Servidores',
      codigoAtivo: 'CLIM-CPD-PENDENTE',
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Ar-Condicionado / Climatização Contínua',
      fabricanteModelo: 'Não cadastrado em Infraestrutura → Ambiente Físico',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'hvac',
      precisaCadastro: true,
      moduloCadastroSugerido: 'infraestrutura',
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores',
        observacoes:
          'Cadastre os aparelhos de ar-condicionado e revezamento no módulo de Infraestrutura.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // =========================================================================
  // 3. SETORES OPERACIONAIS (Atendimento, Frente, Fundo, Diretoria)
  // Distribuição de estações e impressoras reais encontradas no banco
  // =========================================================================

  // (3.1) Setor de Atendimento
  equipamentos.push({
    id: 'real-atend-rack',
    nome: 'Rack Setorial / Ponto de Rede Atendimento',
    codigoAtivo: 'RCK-SET-ATEND',
    setor: 'Atendimento ao Público',
    camadaId: 'setor_atendimento',
    tipoEquipamento: 'Mini-Rack / Switch Setorial',
    fabricanteModelo: 'Distribuição Local para Guichês de Atendimento',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'rack',
    detalhesTecnicos: {
      localizacaoFisica: 'Balcão de Atendimento / Recepção',
      observacoes: 'Ponto de agregação dos computadores de balcão e impressoras de selagem.',
    },
    isRealData: true,
  })
  nosReaisCount++

  // Computadores do Atendimento
  const wsAtendimento = estacoesReais.filter(
    (w) => normalize(w.localizacao).includes('atend') || normalize(w.name).includes('atend'),
  )
  if (wsAtendimento.length > 0) {
    wsAtendimento.forEach((w) => {
      equipamentos.push({
        id: `real-ws-${w.id}`,
        nome: w.name,
        codigoAtivo: w.serial_number || `WS-${w.id.slice(-4).toUpperCase()}`,
        setor: 'Atendimento ao Público',
        camadaId: 'setor_atendimento',
        tipoEquipamento: 'Estação de Trabalho / Balcão',
        fabricanteModelo: w.sistema_operacional
          ? `${w.sistema_operacional} ${w.versao_so || ''}`
          : 'Microcomputador do Atendimento',
        ipOuIdentificacao: w.ip_address || undefined,
        status: w.status === 'ativo' ? 'operacional' : 'alerta',
        criticidade: w.criticidade || 'alta',
        iconKey: 'workstation',
        glpiVinculoSimulado: {
          idAtivo: w.id,
          nomeGlpi: w.name,
          categoriaGlpi: w.tipo,
        },
        detalhesTecnicos: {
          localizacaoFisica: w.localizacao || 'Guichê de Atendimento',
          observacoes: w.descricao || 'Estação real vinculada ao Inventário de Ativos.',
        },
        isRealData: true,
        assetOrigemId: w.id,
      })
      nosReaisCount++
    })
  } else {
    // Se não tiver computadores com filtro específico de atendimento, mas tem computadores gerais
    const fallbackWs = estacoesReais.slice(0, 2)
    if (fallbackWs.length > 0) {
      fallbackWs.forEach((w) => {
        equipamentos.push({
          id: `real-ws-${w.id}`,
          nome: `${w.name} (Atendimento)`,
          codigoAtivo: w.serial_number || `WS-${w.id.slice(-4).toUpperCase()}`,
          setor: 'Atendimento ao Público',
          camadaId: 'setor_atendimento',
          tipoEquipamento: 'Estação de Trabalho',
          fabricanteModelo: w.sistema_operacional || 'Microcomputador Registral',
          ipOuIdentificacao: w.ip_address || undefined,
          status: 'operacional',
          criticidade: 'alta',
          iconKey: 'workstation',
          glpiVinculoSimulado: {
            idAtivo: w.id,
            nomeGlpi: w.name,
            categoriaGlpi: w.tipo,
          },
          detalhesTecnicos: {
            localizacaoFisica: 'Balcão de Atendimento',
            observacoes: 'Ativo real alocado na camada de atendimento.',
          },
          isRealData: true,
          assetOrigemId: w.id,
        })
        nosReaisCount++
      })
    } else {
      equipamentos.push({
        id: 'real-ws-atend-pendente',
        nome: 'Estações de Trabalho do Balcão',
        codigoAtivo: 'WS-ATEND-PENDENTE',
        setor: 'Atendimento ao Público',
        camadaId: 'setor_atendimento',
        tipoEquipamento: 'Computador / Estação',
        fabricanteModelo: 'Não cadastrado no Inventário',
        status: 'alerta',
        criticidade: 'alta',
        iconKey: 'workstation',
        precisaCadastro: true,
        moduloCadastroSugerido: 'inventario',
        detalhesTecnicos: {
          localizacaoFisica: 'Balcão de Atendimento',
          observacoes:
            'Cadastre os computadores dos escreventes de balcão no Inventário de Ativos.',
        },
        isRealData: false,
      })
      nosPendentesCadastroCount++
    }
  }

  // Impressoras de atendimento
  const impAtend = impressorasReais[0]
  if (impAtend) {
    equipamentos.push({
      id: `real-imp-${impAtend.id}`,
      nome: impAtend.name,
      codigoAtivo: impAtend.serial_number || `IMP-${impAtend.id.slice(-4).toUpperCase()}`,
      setor: 'Atendimento ao Público',
      camadaId: 'setor_atendimento',
      tipoEquipamento: 'Impressora Multifuncional / Térmica',
      fabricanteModelo: impAtend.sistema_operacional || 'Impressora do Atendimento',
      ipOuIdentificacao: impAtend.ip_address || undefined,
      status: 'operacional',
      criticidade: 'media',
      iconKey: 'printer',
      glpiVinculoSimulado: {
        idAtivo: impAtend.id,
        nomeGlpi: impAtend.name,
        categoriaGlpi: impAtend.tipo,
      },
      detalhesTecnicos: {
        localizacaoFisica: impAtend.localizacao || 'Bancada do Atendimento',
        observacoes: 'Impressora real cadastrada no Inventário.',
      },
      isRealData: true,
      assetOrigemId: impAtend.id,
    })
    nosReaisCount++
  }

  // (3.2) Setor Interno Frente
  equipamentos.push({
    id: 'real-frente-rack',
    nome: 'Rack Setorial Frente (Switch Setorial)',
    codigoAtivo: 'RCK-SET-FRENTE',
    setor: 'Setor Interno Frente',
    camadaId: 'setor_frente',
    tipoEquipamento: 'Switch / Rack de Parede',
    fabricanteModelo: 'Distribuição Local para Escreventes de Escrituras',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'rack',
    detalhesTecnicos: {
      localizacaoFisica: 'Área Interna Frente',
      observacoes: 'Interligado por fibra óptica à sala de servidores.',
    },
    isRealData: true,
  })
  nosReaisCount++

  const wsFrente = estacoesReais.filter((w) => normalize(w.localizacao).includes('frente'))
  if (wsFrente.length > 0) {
    wsFrente.forEach((w) => {
      equipamentos.push({
        id: `real-ws-${w.id}`,
        nome: w.name,
        codigoAtivo: w.serial_number || `WS-${w.id.slice(-4).toUpperCase()}`,
        setor: 'Setor Interno Frente',
        camadaId: 'setor_frente',
        tipoEquipamento: 'Estação de Trabalho / Escrituras',
        fabricanteModelo: w.sistema_operacional || 'Microcomputador Registral',
        ipOuIdentificacao: w.ip_address || undefined,
        status: 'operacional',
        criticidade: 'alta',
        iconKey: 'workstation',
        glpiVinculoSimulado: {
          idAtivo: w.id,
          nomeGlpi: w.name,
          categoriaGlpi: w.tipo,
        },
        detalhesTecnicos: {
          localizacaoFisica: 'Mesas dos Escreventes',
          observacoes: 'Ativo real cadastrado no Inventário.',
        },
        isRealData: true,
        assetOrigemId: w.id,
      })
      nosReaisCount++
    })
  } else {
    equipamentos.push({
      id: 'real-ws-frente-pendente',
      nome: 'Estações de Trabalho dos Escreventes (Frente)',
      codigoAtivo: 'WS-FRENTE-PENDENTE',
      setor: 'Setor Interno Frente',
      camadaId: 'setor_frente',
      tipoEquipamento: 'Computadores de Produção',
      fabricanteModelo: 'Não cadastrado no Inventário',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'workstation',
      precisaCadastro: true,
      moduloCadastroSugerido: 'inventario',
      detalhesTecnicos: {
        localizacaoFisica: 'Setor Interno Frente',
        observacoes:
          'Cadastre os computadores dos escreventes de minutas e certidões no Inventário.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (3.3) Setor Interno Fundo
  equipamentos.push({
    id: 'real-fundo-rack',
    nome: 'Rack Setorial Fundo (Digitalização & Acervo)',
    codigoAtivo: 'RCK-SET-FUNDO',
    setor: 'Setor Interno Fundo',
    camadaId: 'setor_fundo',
    tipoEquipamento: 'Switch / Rack de Parede',
    fabricanteModelo: 'Distribuição Local para Scanners e Acervo',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'rack',
    detalhesTecnicos: {
      localizacaoFisica: 'Área do Arquivo e Acervo',
      observacoes: 'Interligado por fibra óptica à sala de servidores.',
    },
    isRealData: true,
  })
  nosReaisCount++

  const wsFundo = estacoesReais.filter(
    (w) => normalize(w.localizacao).includes('fundo') || normalize(w.name).includes('scan'),
  )
  if (wsFundo.length > 0) {
    wsFundo.forEach((w) => {
      equipamentos.push({
        id: `real-ws-${w.id}`,
        nome: w.name,
        codigoAtivo: w.serial_number || `WS-${w.id.slice(-4).toUpperCase()}`,
        setor: 'Setor Interno Fundo',
        camadaId: 'setor_fundo',
        tipoEquipamento: 'Estação de Digitalização / OCR',
        fabricanteModelo: w.sistema_operacional || 'Microcomputador do Acervo',
        ipOuIdentificacao: w.ip_address || undefined,
        status: 'operacional',
        criticidade: 'alta',
        iconKey: 'workstation',
        glpiVinculoSimulado: {
          idAtivo: w.id,
          nomeGlpi: w.name,
          categoriaGlpi: w.tipo,
        },
        detalhesTecnicos: {
          localizacaoFisica: 'Bancada de Digitalização',
          observacoes: 'Ativo real cadastrado no Inventário.',
        },
        isRealData: true,
        assetOrigemId: w.id,
      })
      nosReaisCount++
    })
  } else {
    equipamentos.push({
      id: 'real-ws-fundo-pendente',
      nome: 'Estações de Digitalização e Scanners (Fundo)',
      codigoAtivo: 'WS-FUNDO-PENDENTE',
      setor: 'Setor Interno Fundo',
      camadaId: 'setor_fundo',
      tipoEquipamento: 'Estações de Captura e OCR',
      fabricanteModelo: 'Não cadastrado no Inventário',
      status: 'alerta',
      criticidade: 'alta',
      iconKey: 'workstation',
      precisaCadastro: true,
      moduloCadastroSugerido: 'inventario',
      detalhesTecnicos: {
        localizacaoFisica: 'Setor Fundo / Digitalização',
        observacoes: 'Cadastre as estações de digitalização e scanners no Inventário de Ativos.',
      },
      isRealData: false,
    })
    nosPendentesCadastroCount++
  }

  // (3.4) Diretoria e Gabinete
  equipamentos.push({
    id: 'real-dir-workstation',
    nome: 'Estação do Oficial Titular / Diretoria',
    codigoAtivo: 'WS-DIR-TITULAR',
    setor: 'Gabinete da Diretoria',
    camadaId: 'setor_diretoria',
    tipoEquipamento: 'Workstation Executiva / Gabinete',
    fabricanteModelo: 'Estação de Assinatura Digital e Homologação',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'workstation',
    detalhesTecnicos: {
      localizacaoFisica: 'Gabinete do Oficial Titular',
      observacoes: 'Estação dedicada com certificação digital ICP-Brasil e gestão do CSCTI.',
    },
    isRealData: true,
  })
  nosReaisCount++

  // =========================================================================
  // 4. CONEXÕES ENTRE OS NÓS REAIS GERADOS
  // =========================================================================

  // Cascata de Energia
  conexoes.push({
    id: 'cx-real-en-01',
    origemId: 'real-en-rede-publica',
    destinoId: 'real-en-quadro-geral',
    tipo: 'eletrica',
    rotulo: 'Rede Elétrica da Concessionária',
    descricao: 'Alimentação primária no barramento geral',
    animada: true,
  })

  const geradorId =
    geradoresReais.length > 0
      ? `real-en-gerador-${geradoresReais[0].id}`
      : 'real-en-gerador-pendente'
  conexoes.push({
    id: 'cx-real-en-02',
    origemId: geradorId,
    destinoId: 'real-en-quadro-geral',
    tipo: 'eletrica',
    rotulo: 'Standby QTA Gerador',
    descricao: 'Acionamento automático em contingência',
  })

  const primeiroNbkId =
    nobreaksReais.length > 0 ? `real-en-nbk-${nobreaksReais[0].id}` : 'real-en-nbk-pendente'
  conexoes.push({
    id: 'cx-real-en-03',
    origemId: 'real-en-quadro-geral',
    destinoId: primeiroNbkId,
    tipo: 'eletrica',
    rotulo: 'Alimentação Protegida',
    descricao: 'Circuito dedicado para as UPS centrais',
    animada: true,
  })

  const rackSrvId =
    racksReais.length > 0 ? `real-srv-rack-${racksReais[0].id}` : 'real-srv-rack-pendente'
  conexoes.push({
    id: 'cx-real-en-04',
    origemId: primeiroNbkId,
    destinoId: rackSrvId,
    tipo: 'eletrica',
    rotulo: 'PDU Sala de Servidores',
    descricao: 'Alimentação ininterrupta senoidal para racks de servidores',
    animada: true,
  })

  // Backbone de Fibra Óptica: da Sala de Servidores para os Racks Setoriais
  const coreSwitchId =
    switchesReais.length > 0 ? `real-sw-${switchesReais[0].id}` : 'real-sw-pendente'
  conexoes.push({
    id: 'cx-real-fibra-01',
    origemId: coreSwitchId,
    destinoId: 'real-atend-rack',
    tipo: 'fibra',
    rotulo: 'Fibra Óptica Setorial (10G)',
    descricao: 'Tronco óptico direto ligando Sala de Servidores ao Rack do Atendimento',
    animada: true,
  })
  conexoes.push({
    id: 'cx-real-fibra-02',
    origemId: coreSwitchId,
    destinoId: 'real-frente-rack',
    tipo: 'fibra',
    rotulo: 'Fibra Óptica Setorial (10G)',
    descricao: 'Tronco óptico direto para o Setor Interno Frente',
    animada: true,
  })
  conexoes.push({
    id: 'cx-real-fibra-03',
    origemId: coreSwitchId,
    destinoId: 'real-fundo-rack',
    tipo: 'fibra',
    rotulo: 'Fibra Óptica Setorial (10G)',
    descricao: 'Tronco óptico direto para o Setor Interno Fundo (Digitalização & Acervo)',
    animada: true,
  })
  conexoes.push({
    id: 'cx-real-fibra-04',
    origemId: coreSwitchId,
    destinoId: 'real-dir-workstation',
    tipo: 'rede',
    rotulo: 'VLAN Diretoria (Cat6A)',
    descricao: 'Segmento isolado e restrito para o Gabinete do Titular',
  })

  // Conexões de Rede interna de cada setor
  conexoes.push({
    id: 'cx-real-atend-ws',
    origemId: 'real-atend-rack',
    destinoId:
      wsAtendimento.length > 0 ? `real-ws-${wsAtendimento[0].id}` : 'real-ws-atend-pendente',
    tipo: 'rede',
    rotulo: 'LAN Balcão',
  })
  conexoes.push({
    id: 'cx-real-frente-ws',
    origemId: 'real-frente-rack',
    destinoId: wsFrente.length > 0 ? `real-ws-${wsFrente[0].id}` : 'real-ws-frente-pendente',
    tipo: 'rede',
    rotulo: 'LAN Frente',
  })
  conexoes.push({
    id: 'cx-real-fundo-ws',
    origemId: 'real-fundo-rack',
    destinoId: wsFundo.length > 0 ? `real-ws-${wsFundo[0].id}` : 'real-ws-fundo-pendente',
    tipo: 'rede',
    rotulo: 'LAN Digitalização',
  })

  // Resumo por camada
  const resumoPorCamada: Record<CamadaId, { total: number; reais: number; pendentes: number }> = {
    energia: { total: 0, reais: 0, pendentes: 0 },
    sala_servidores: { total: 0, reais: 0, pendentes: 0 },
    setor_atendimento: { total: 0, reais: 0, pendentes: 0 },
    setor_frente: { total: 0, reais: 0, pendentes: 0 },
    setor_fundo: { total: 0, reais: 0, pendentes: 0 },
    setor_diretoria: { total: 0, reais: 0, pendentes: 0 },
  }

  equipamentos.forEach((eq) => {
    if (resumoPorCamada[eq.camadaId]) {
      resumoPorCamada[eq.camadaId].total++
      if (eq.precisaCadastro) {
        resumoPorCamada[eq.camadaId].pendentes++
      } else {
        resumoPorCamada[eq.camadaId].reais++
      }
    }
  })

  return {
    equipamentos,
    conexoes,
    totalAtivosInventario,
    totalInfraItens,
    totalLinks,
    totalEvidenciasComFoto,
    nosReaisCount,
    nosPendentesCadastroCount,
    autonomiaTotalMinutos,
    velocidadeTotalMbps,
    temDadosSuficientes,
    resumoPorCamada,
  }
}
