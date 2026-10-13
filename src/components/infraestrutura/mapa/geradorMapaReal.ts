import { InventoryAssetItem, InfraItem, InfraLinkItem, EvidenciaItem } from '@/types/cscti'
import { CamadaId, TopologiaConexao, EquipamentoSimulado } from './topologiaData'

export interface GeradorMapaRealResult {
  equipamentos: EquipamentoSimulado[]
  conexoes: TopologiaConexao[]
  totalAtivosInventario: number
  totalInfraItens: number
  totalLinks: number
  totalEvidenciasComFoto: number
  nosReaisCount: number
  autonomiaTotalMinutos: number
  velocidadeTotalMbps: number
  temDadosSuficientes: boolean
  resumoPorCamada: Record<CamadaId, { total: number; reais: number }>
}

function normalize(str?: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Monta a topologia da serventia EXCLUSIVAMENTE com o que existe no banco
 * da serventia logada (sem dados fictícios inventados).
 */
export function gerarTopologiaRealServentia(params: {
  assets: InventoryAssetItem[]
  infraItens: InfraItem[]
  infraLinks: InfraLinkItem[]
  evidencias: EvidenciaItem[]
}): GeradorMapaRealResult {
  const { assets = [], infraItens = [], infraLinks = [], evidencias = [] } = params

  const equipamentos: EquipamentoSimulado[] = []
  const conexoes: TopologiaConexao[] = []

  // Mapa de evidências por ativo ou categoria para marcação de comprovação visual
  const evidenciasPorAtivo: Record<string, EvidenciaItem> = {}
  let totalFotos = 0

  evidencias.forEach((ev) => {
    const temFoto =
      (ev.arquivos && ev.arquivos.length > 0) ||
      ev.titulo?.startsWith('Ilustração —') ||
      ev.tags?.includes('ilustracao')

    if (temFoto) {
      totalFotos++
      if (ev.ativo_vinculado) {
        evidenciasPorAtivo[ev.ativo_vinculado] = ev
      }
    }
  })

  // Função auxiliar para localizar evidência com comprovação visual por palavras-chave
  const findEvidencia = (keywords: string[]): EvidenciaItem | undefined => {
    return evidencias.find((ev) => {
      const matchKey = keywords.some(
        (kw) =>
          normalize(ev.titulo).includes(kw) ||
          normalize(ev.categoria_nome).includes(kw) ||
          (ev.tags || []).some((t) => normalize(t).includes(kw)),
      )
      const hasPhoto =
        (ev.arquivos && ev.arquivos.length > 0) ||
        ev.titulo?.startsWith('Ilustração —') ||
        ev.tags?.includes('ilustracao')
      return matchKey && hasPhoto
    })
  }

  // Identificação e separação dos itens reais de infraestrutura
  const nobreaksReais = infraItens.filter(
    (i) =>
      i.tipo_item === 'nobreak' ||
      normalize(i.titulo).includes('nobreak') ||
      normalize(i.modelo).includes('nobreak'),
  )
  const geradoresReais = infraItens.filter(
    (i) => i.tipo_item === 'gerador' || normalize(i.titulo).includes('gerador'),
  )
  const arCondicionadosReais = infraItens.filter(
    (i) =>
      i.tipo_item === 'ar_condicionado' ||
      normalize(i.titulo).includes('ar') ||
      normalize(i.titulo).includes('climatiz'),
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
  const extintoresReais = infraItens.filter(
    (i) =>
      i.tipo_item === 'combate_incendio' ||
      normalize(i.titulo).includes('extintor') ||
      normalize(i.titulo).includes('incendio') ||
      normalize(i.categoria_evidencia_sugerida).includes('extintor'),
  )
  const controleAcessoReais = infraItens.filter(
    (i) =>
      i.tipo_item === 'sala_ti' ||
      i.tipo_item === 'controle_acesso_fisico' ||
      normalize(i.tipo_controle_acesso).includes('biometria') ||
      normalize(i.titulo).includes('acesso') ||
      normalize(i.titulo).includes('sala'),
  )

  // Separar ativos reais de inventário
  const servidoresReais = assets.filter(
    (a) =>
      a.tipo === 'servidor_aplicacao' ||
      a.tipo === 'servidor_virtualizado' ||
      a.tipo === 'banco_dados' ||
      normalize(a.name).startsWith('srv') ||
      normalize(a.name).startsWith('spcm') ||
      normalize(a.tipo).includes('servidor'),
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
      normalize(a.name).includes('desktop') ||
      normalize(a.name).includes('notebook'),
  )
  const impressorasReais = assets.filter(
    (a) =>
      a.tipo === 'impressora_multifuncional' ||
      normalize(a.name).includes('imp') ||
      normalize(a.name).includes('printer') ||
      normalize(a.name).includes('zebra') ||
      normalize(a.name).includes('kyocera'),
  )

  // Outros ativos de inventário que não caíram nos filtros acima
  const outrosAtivos = assets.filter(
    (a) =>
      !servidoresReais.includes(a) &&
      !storagesReais.includes(a) &&
      !switchesReais.includes(a) &&
      !estacoesReais.includes(a) &&
      !impressorasReais.includes(a),
  )

  // Totais agregados
  const totalAtivosInventario = assets.length
  const totalInfraItens = infraItens.length
  const totalLinks = infraLinks.length
  const totalEvidenciasComFoto = totalFotos

  // Critério: há dados cadastrados se houver pelo menos 1 registro real
  const temDadosSuficientes = totalAtivosInventario > 0 || totalInfraItens > 0 || totalLinks > 0

  let nosReaisCount = 0

  let autonomiaTotalMinutos = 0
  nobreaksReais.forEach((n) => {
    autonomiaTotalMinutos += n.autonomia_minutos || 0
  })

  let velocidadeTotalMbps = 0
  infraLinks.forEach((l) => {
    velocidadeTotalMbps += l.velocidade_mbps || 0
  })

  // =========================================================================
  // 1. CAMADA DE ENERGIA (Somente registros cadastrados)
  // =========================================================================

  // (1.1) Laudo de Aterramento / Entrada Predial
  if (laudosAterramentoReais.length > 0) {
    laudosAterramentoReais.forEach((lat, idx) => {
      const evi =
        (lat.evidencia_vinculada && evidencias.find((e) => e.id === lat.evidencia_vinculada)) ||
        findEvidencia(['aterramento', 'spda', 'energia', 'padrao'])
      equipamentos.push({
        id: `real-en-aterramento-${lat.id}`,
        nome: lat.titulo || `Padrão de Entrada / Aterramento #${idx + 1}`,
        codigoAtivo: lat.art_numero ? `ART-${lat.art_numero}` : `PWR-GRD-${idx + 1}`,
        setor: 'Padrão Elétrico / Entrada Predial',
        camadaId: 'energia',
        tipoEquipamento: 'Aterramento & Entrada Concessionária',
        fabricanteModelo: lat.modelo || 'Entrada Trifásica / SPDA com Laudo Técnico',
        ipOuIdentificacao: lat.art_numero ? `ART: ${lat.art_numero}` : undefined,
        status: lat.status === 'conforme' ? 'operacional' : 'alerta',
        criticidade: 'alta',
        iconKey: 'zap',
        isRealData: true,
        infraOrigemId: lat.id,
        evidenciaFotoSimulada: evi
          ? {
              idEvidencia: evi.id,
              titulo: evi.titulo,
              categoria: evi.categoria_nome || 'Energia',
            }
          : undefined,
        detalhesTecnicos: {
          localizacaoFisica: 'Entrada Predial / Pátio Técnico',
          observacoes:
            lat.observacoes ||
            lat.descricao ||
            `Laudo técnico com status "${lat.status}". Responsável: ${lat.responsavel_tecnico || 'Não informado'}.`,
        },
      })
      nosReaisCount++
    })
  }

  // (1.2) Geradores reais
  geradoresReais.forEach((g, idx) => {
    const evi =
      (g.evidencia_vinculada && evidencias.find((e) => e.id === g.evidencia_vinculada)) ||
      findEvidencia(['gerador', 'grupo motogerador'])
    equipamentos.push({
      id: `real-en-gerador-${g.id}`,
      nome: g.titulo || `Grupo Gerador #${idx + 1}`,
      codigoAtivo: g.art_numero ? `GEN-${g.art_numero}` : `PWR-GEN-${idx + 1}`,
      setor: 'Área Técnica Externa',
      camadaId: 'energia',
      tipoEquipamento: 'Grupo Motogerador a Diesel / Gás',
      fabricanteModelo: g.modelo || 'Grupo Gerador com QTA',
      status: g.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'generator',
      isRealData: true,
      infraOrigemId: g.id,
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Gerador',
          }
        : undefined,
      detalhesTecnicos: {
        capacidade: g.potencia_va
          ? `${g.potencia_va} VA`
          : g.autonomia_minutos
            ? `${g.autonomia_minutos} min autonomia`
            : undefined,
        tensaoOuAlimentacao: g.redundancia_instalada
          ? 'Acionamento automático QTA com redundância'
          : 'Acionamento automático por QTA',
        localizacaoFisica: 'Pátio técnico / Área externa',
        observacoes:
          g.observacoes ||
          g.descricao ||
          'Grupo gerador cadastrado no módulo de Infraestrutura → Energia.',
      },
    })
    nosReaisCount++
  })

  // (1.3) Nobreaks reais
  nobreaksReais.forEach((nbk, idx) => {
    const evi =
      (nbk.evidencia_vinculada && evidencias.find((e) => e.id === nbk.evidencia_vinculada)) ||
      findEvidencia(['nobreak', 'ups', 'bateria'])
    equipamentos.push({
      id: `real-en-nbk-${nbk.id}`,
      nome: nbk.titulo || `Nobreak #${idx + 1}`,
      codigoAtivo: `PWR-NBK-${idx + 1}`,
      setor: 'Sala Técnica de Energia',
      camadaId: 'energia',
      tipoEquipamento: 'UPS Senoidal Online / Interativo',
      fabricanteModelo: nbk.modelo || 'Nobreak Profissional da Serventia',
      status: nbk.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'nobreak',
      isRealData: true,
      infraOrigemId: nbk.id,
      infraNobreakSimulado: {
        autonomiaMinutos: nbk.autonomia_minutos || 0,
        potenciaKva: nbk.potencia_va
          ? `${(nbk.potencia_va / 1000).toFixed(1)} kVA`
          : 'Capacidade padrão',
        bateriasStatus: nbk.data_validade
          ? `Validade baterias: ${nbk.data_validade}`
          : 'Baterias em regime regular',
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Nobreaks',
          }
        : undefined,
      detalhesTecnicos: {
        capacidade: nbk.potencia_va
          ? `${nbk.potencia_va} VA (${nbk.autonomia_minutos || 0} min)`
          : undefined,
        tensaoOuAlimentacao: nbk.redundancia_instalada
          ? 'Redundância instalada (PDUs A+B)'
          : 'Circuito Nobreak dedicado',
        localizacaoFisica: 'Sala de TI / Energia',
        observacoes:
          nbk.observacoes || nbk.descricao || 'Nobreak registrado no módulo de Infraestrutura.',
      },
    })
    nosReaisCount++
  })

  // =========================================================================
  // 2. CAMADA DA SALA DE SERVIDORES (CPD)
  // Racks, Servidores, Storages, Switches, Links, Climatização, Extintores, Acesso
  // =========================================================================

  // (2.1) Racks reais
  racksReais.forEach((r, idx) => {
    const evi =
      (r.evidencia_vinculada && evidencias.find((e) => e.id === r.evidencia_vinculada)) ||
      findEvidencia(['rack', 'cpd', 'sala de ti'])
    equipamentos.push({
      id: `real-srv-rack-${r.id}`,
      nome: r.titulo || `Rack de Servidores #${idx + 1}`,
      codigoAtivo: `RCK-CPD-0${idx + 1}`,
      setor: 'Sala de Servidores (CPD)',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Rack 19" Fechado',
      fabricanteModelo: r.modelo || 'Rack Padrão Fechado da Serventia',
      status: r.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'rack',
      isRealData: true,
      infraOrigemId: r.id,
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Racks',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores',
        observacoes: r.observacoes || r.descricao || 'Rack cadastrado na Infraestrutura Física.',
      },
    })
    nosReaisCount++
  })

  // (2.2) Servidores reais do Inventário de Ativos
  servidoresReais.forEach((srv) => {
    const evi =
      evidenciasPorAtivo[srv.id] ||
      findEvidencia([srv.name, 'servidor', 'servidores', 'cluster', 'virtualiz'])
    equipamentos.push({
      id: `real-srv-${srv.id}`,
      nome: srv.name,
      codigoAtivo: srv.serial_number || `SRV-${srv.id.slice(-4).toUpperCase()}`,
      setor: srv.localizacao || 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento:
        srv.tipo === 'servidor_virtualizado'
          ? 'Servidor Virtualizado (VM)'
          : 'Servidor Físico / Aplicação',
      fabricanteModelo: srv.sistema_operacional
        ? `${srv.sistema_operacional} ${srv.versao_so || ''}`.trim()
        : 'Servidor em Produção',
      ipOuIdentificacao: srv.ip_address || undefined,
      status: srv.status === 'ativo' ? 'operacional' : 'alerta',
      criticidade: srv.criticidade || 'alta',
      iconKey: 'server',
      isRealData: true,
      assetOrigemId: srv.id,
      glpiVinculoSimulado: {
        idAtivo: srv.id,
        nomeGlpi: srv.name,
        categoriaGlpi: srv.tipo,
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Servidores',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: srv.localizacao || 'Sala de Servidores',
        observacoes:
          srv.descricao ||
          `Ativo registrado no Inventário (Origem: ${srv.origem || 'manual'}). Exige backup: ${
            [
              srv.exige_backup_local && 'Local',
              srv.exige_backup_nuvem && 'Nuvem',
              srv.exige_backup_replicacao && 'Replicação',
            ]
              .filter(Boolean)
              .join(', ') || 'Nenhum'
          }.`,
      },
    })
    nosReaisCount++
  })

  // (2.3) Storages reais do Inventário
  storagesReais.forEach((str) => {
    const evi =
      evidenciasPorAtivo[str.id] || findEvidencia([str.name, 'storage', 'san', 'nas', 'backup'])
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
      isRealData: true,
      assetOrigemId: str.id,
      glpiVinculoSimulado: {
        idAtivo: str.id,
        nomeGlpi: str.name,
        categoriaGlpi: str.tipo,
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Storage',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: str.localizacao || 'Sala de Servidores',
        observacoes: str.descricao || 'Storage central cadastrado no Inventário de Ativos.',
      },
    })
    nosReaisCount++
  })

  // (2.4) Switches reais
  switchesReais.forEach((sw) => {
    const evi =
      evidenciasPorAtivo[sw.id] ||
      findEvidencia([sw.name, 'switch', 'rede', 'switches / redes', 'fibra'])
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
      isRealData: true,
      assetOrigemId: sw.id,
      glpiVinculoSimulado: {
        idAtivo: sw.id,
        nomeGlpi: sw.name,
        categoriaGlpi: sw.tipo,
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Switches / Redes',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: sw.localizacao || 'Rack Sala Servidores',
        observacoes: sw.descricao || 'Equipamento de rede cadastrado no Inventário de Ativos.',
      },
    })
    nosReaisCount++
  })

  // (2.5) Links reais de conectividade
  infraLinks.forEach((link, idx) => {
    const evi = findEvidencia(['link', 'operadora', link.operadora, 'fibra', 'telecom'])
    equipamentos.push({
      id: `real-link-${link.id}`,
      nome: `Link: ${link.operadora}`,
      codigoAtivo: link.circuito_id ? `CIR-${link.circuito_id}` : `WAN-0${idx + 1}`,
      setor: 'Sala de Servidores / DIO de Telecom',
      camadaId: 'sala_servidores',
      tipoEquipamento: `Link ${link.tipo_link === 'dedicado' ? 'Dedicado' : 'Banda Larga'} (${link.meio_transmissao?.replace('_', ' ') || 'Fibra Óptica'})`,
      fabricanteModelo: `${link.operadora} • ${link.velocidade_mbps} Mbps ${link.ip_fixo ? '(IP Fixo)' : ''}`,
      ipOuIdentificacao: link.ip_fixo ? 'IP Fixo Configurado' : 'IP Dinâmico',
      status: link.status === 'ativo' ? 'operacional' : 'alerta',
      criticidade: link.redundancia ? 'alta' : 'media',
      iconKey: 'telecom',
      isRealData: true,
      conectividadeLinkSimulado: {
        operadora: link.operadora,
        tipoLink: link.tipo_link,
        velocidade: `${link.velocidade_mbps} Mbps`,
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Conectividade',
          }
        : undefined,
      detalhesTecnicos: {
        capacidade: `${link.velocidade_mbps} Mbps`,
        localizacaoFisica: 'DIO / Rack de Telecomunicações',
        observacoes:
          link.observacoes ||
          `Suporte: ${link.contato_suporte || 'Não informado'}. Redundância: ${link.redundancia ? 'Sim' : 'Não'}.`,
      },
    })
    nosReaisCount++
  })

  // (2.6) Ar-condicionado / Climatização real
  arCondicionadosReais.forEach((ac, idx) => {
    const evi =
      (ac.evidencia_vinculada && evidencias.find((e) => e.id === ac.evidencia_vinculada)) ||
      findEvidencia(['ar-condicionado', 'ar', 'climatiz', 'temperatura'])
    equipamentos.push({
      id: `real-ac-${ac.id}`,
      nome: ac.titulo || `Climatização CPD #${idx + 1}`,
      codigoAtivo: `CLIM-CPD-0${idx + 1}`,
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Ar-Condicionado / Climatização Contínua',
      fabricanteModelo: ac.modelo || 'Ar-Condicionado da Sala de TI',
      status: ac.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'hvac',
      isRealData: true,
      infraOrigemId: ac.id,
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Ar-condicionado',
          }
        : undefined,
      detalhesTecnicos: {
        capacidade: ac.potencia_va ? `${ac.potencia_va} BTUs` : undefined,
        tensaoOuAlimentacao: ac.redundancia_instalada
          ? 'Revezamento automático de compressores ativo'
          : undefined,
        localizacaoFisica: 'Sala de Servidores',
        observacoes:
          ac.observacoes ||
          ac.descricao ||
          'Equipamento de climatização cadastrado na Infraestrutura.',
      },
    })
    nosReaisCount++
  })

  // (2.7) Extintores / Combate a Incêndio reais
  extintoresReais.forEach((ext, idx) => {
    const evi =
      (ext.evidencia_vinculada && evidencias.find((e) => e.id === ext.evidencia_vinculada)) ||
      findEvidencia(['extintor', 'incendio', 'gas limpo', 'co2'])
    equipamentos.push({
      id: `real-ext-${ext.id}`,
      nome: ext.titulo || `Extintor de Incêndio #${idx + 1}`,
      codigoAtivo: `EXT-0${idx + 1}`,
      setor: 'Sala de Servidores / Corredor Técnico',
      camadaId: 'sala_servidores',
      tipoEquipamento: 'Extintor de Incêndio (Gás Limpo / CO2)',
      fabricanteModelo: ext.modelo || 'Extintor CO2 / Gás Limpo Classe BC',
      status: ext.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'media',
      iconKey: 'shield',
      isRealData: true,
      infraOrigemId: ext.id,
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Extintores de incêndio',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: 'Sala de Servidores',
        observacoes:
          ext.observacoes ||
          ext.descricao ||
          `Validade da recarga: ${ext.data_vencimento_extintor || 'Em conformidade'}.`,
      },
    })
    nosReaisCount++
  })

  // (2.8) Controle de Acesso / Sala de TI
  controleAcessoReais.forEach((ctrl, idx) => {
    const evi =
      (ctrl.evidencia_vinculada && evidencias.find((e) => e.id === ctrl.evidencia_vinculada)) ||
      findEvidencia(['sala de ti', 'sala_ti', 'acesso', 'biometria', 'cftv'])
    equipamentos.push({
      id: `real-ctrl-${ctrl.id}`,
      nome: ctrl.titulo || `Controle de Acesso CPD #${idx + 1}`,
      codigoAtivo: `ACC-CPD-0${idx + 1}`,
      setor: 'Sala de Servidores',
      camadaId: 'sala_servidores',
      tipoEquipamento: ctrl.tipo_controle_acesso || 'Controle de Acesso Biométrico IP',
      fabricanteModelo: ctrl.modelo || 'Fechadura Eletrônica / Leitor Biométrico',
      status: ctrl.status === 'conforme' ? 'operacional' : 'alerta',
      criticidade: 'alta',
      iconKey: 'shield',
      isRealData: true,
      infraOrigemId: ctrl.id,
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Sala de TI',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: 'Porta da Sala de Servidores',
        observacoes:
          ctrl.observacoes ||
          ctrl.descricao ||
          'Controle de acesso físico e registro de entradas/saídas.',
      },
    })
    nosReaisCount++
  })

  // =========================================================================
  // 3. SETORES OPERACIONAIS (Atendimento, Frente, Fundo, Diretoria)
  // Agrupados estritamente pelo campo setor/localizacao dos ativos reais
  // =========================================================================

  // Função para determinar camada de um ativo com base na localização ou nome
  const classificarCamadaSetorial = (ativo: InventoryAssetItem): CamadaId => {
    const loc = normalize(ativo.localizacao)
    const nm = normalize(ativo.name)

    if (
      loc.includes('diretor') ||
      loc.includes('gabinete') ||
      loc.includes('titular') ||
      nm.includes('dir')
    ) {
      return 'setor_diretoria'
    }
    if (
      loc.includes('fundo') ||
      loc.includes('arquivo') ||
      loc.includes('acervo') ||
      loc.includes('scan') ||
      nm.includes('fundo')
    ) {
      return 'setor_fundo'
    }
    if (
      loc.includes('frente') ||
      loc.includes('escritura') ||
      loc.includes('certidao') ||
      nm.includes('frente')
    ) {
      return 'setor_frente'
    }
    if (
      loc.includes('atend') ||
      loc.includes('balcao') ||
      loc.includes('recep') ||
      nm.includes('atend')
    ) {
      return 'setor_atendimento'
    }

    // Se a localização indicar sala de servidores/datacenter
    if (loc.includes('servidor') || loc.includes('cpd') || loc.includes('rack')) {
      return 'sala_servidores'
    }

    // Padrão setorial distribuído se for estação de trabalho
    return 'setor_atendimento'
  }

  // Alocar estações de trabalho reais
  estacoesReais.forEach((ws) => {
    const camadaDestino = classificarCamadaSetorial(ws)
    const evi = evidenciasPorAtivo[ws.id] || findEvidencia([ws.name, 'estacao', 'workstation'])

    equipamentos.push({
      id: `real-ws-${ws.id}`,
      nome: ws.name,
      codigoAtivo: ws.serial_number || `WS-${ws.id.slice(-4).toUpperCase()}`,
      setor: ws.localizacao || 'Setor Operacional',
      camadaId: camadaDestino,
      tipoEquipamento: 'Estação de Trabalho',
      fabricanteModelo: ws.sistema_operacional
        ? `${ws.sistema_operacional} ${ws.versao_so || ''}`.trim()
        : 'Microcomputador da Serventia',
      ipOuIdentificacao: ws.ip_address || undefined,
      status: ws.status === 'ativo' ? 'operacional' : 'alerta',
      criticidade: ws.criticidade || 'media',
      iconKey: 'workstation',
      isRealData: true,
      assetOrigemId: ws.id,
      glpiVinculoSimulado: {
        idAtivo: ws.id,
        nomeGlpi: ws.name,
        categoriaGlpi: ws.tipo,
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Inventário',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: ws.localizacao || 'Mesa de Trabalho',
        observacoes: ws.descricao || 'Estação real vinculada ao Inventário de Ativos.',
      },
    })
    nosReaisCount++
  })

  // Alocar impressoras reais
  impressorasReais.forEach((imp) => {
    const camadaDestino = classificarCamadaSetorial(imp)
    const evi = evidenciasPorAtivo[imp.id] || findEvidencia([imp.name, 'impressora', 'printer'])

    equipamentos.push({
      id: `real-imp-${imp.id}`,
      nome: imp.name,
      codigoAtivo: imp.serial_number || `IMP-${imp.id.slice(-4).toUpperCase()}`,
      setor: imp.localizacao || 'Setor Operacional',
      camadaId: camadaDestino,
      tipoEquipamento: 'Impressora / Multifuncional',
      fabricanteModelo: imp.sistema_operacional || 'Impressora Registral',
      ipOuIdentificacao: imp.ip_address || undefined,
      status: imp.status === 'ativo' ? 'operacional' : 'alerta',
      criticidade: imp.criticidade || 'media',
      iconKey: 'printer',
      isRealData: true,
      assetOrigemId: imp.id,
      glpiVinculoSimulado: {
        idAtivo: imp.id,
        nomeGlpi: imp.name,
        categoriaGlpi: imp.tipo,
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Inventário',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: imp.localizacao || 'Bancada do Setor',
        observacoes: imp.descricao || 'Impressora real cadastrada no Inventário.',
      },
    })
    nosReaisCount++
  })

  // Outros ativos avulsos
  outrosAtivos.forEach((ot) => {
    const camadaDestino = classificarCamadaSetorial(ot)
    const evi = evidenciasPorAtivo[ot.id] || findEvidencia([ot.name])

    equipamentos.push({
      id: `real-ativo-${ot.id}`,
      nome: ot.name,
      codigoAtivo: ot.serial_number || `ATV-${ot.id.slice(-4).toUpperCase()}`,
      setor: ot.localizacao || 'Setor da Serventia',
      camadaId: camadaDestino,
      tipoEquipamento: ot.tipo.replace('_', ' ').toUpperCase(),
      fabricanteModelo: ot.sistema_operacional || 'Ativo Registral',
      ipOuIdentificacao: ot.ip_address || undefined,
      status: ot.status === 'ativo' ? 'operacional' : 'alerta',
      criticidade: ot.criticidade || 'baixa',
      iconKey: 'workstation',
      isRealData: true,
      assetOrigemId: ot.id,
      glpiVinculoSimulado: {
        idAtivo: ot.id,
        nomeGlpi: ot.name,
        categoriaGlpi: ot.tipo,
      },
      evidenciaFotoSimulada: evi
        ? {
            idEvidencia: evi.id,
            titulo: evi.titulo,
            categoria: evi.categoria_nome || 'Inventário',
          }
        : undefined,
      detalhesTecnicos: {
        localizacaoFisica: ot.localizacao || 'Instalações da serventia',
        observacoes: ot.descricao || 'Ativo cadastrado no Inventário.',
      },
    })
    nosReaisCount++
  })

  // =========================================================================
  // 4. CONEXÕES REAIS DERIVADAS DOS ELEMENTOS EXISTENTES
  // =========================================================================

  // Interligação elétrica entre nós de energia existentes
  const nosEnergia = equipamentos.filter((e) => e.camadaId === 'energia')
  for (let i = 0; i < nosEnergia.length - 1; i++) {
    conexoes.push({
      id: `cx-en-${nosEnergia[i].id}-${nosEnergia[i + 1].id}`,
      origemId: nosEnergia[i].id,
      destinoId: nosEnergia[i + 1].id,
      tipo: 'eletrica',
      rotulo: 'Circuito Elétrico',
      animada: true,
    })
  }

  // Interligação da energia para o primeiro nó de servidor/rack
  const primeiroSrv = equipamentos.find(
    (e) => e.camadaId === 'sala_servidores' && (e.iconKey === 'rack' || e.iconKey === 'server'),
  )
  const ultimoEn = nosEnergia[nosEnergia.length - 1]
  if (primeiroSrv && ultimoEn) {
    conexoes.push({
      id: `cx-en-srv-${ultimoEn.id}-${primeiroSrv.id}`,
      origemId: ultimoEn.id,
      destinoId: primeiroSrv.id,
      tipo: 'eletrica',
      rotulo: 'Alimentação Ininterrupta Nobreak',
      animada: true,
    })
  }

  // Interligação entre nós da Sala de Servidores
  const switchPrincipal =
    equipamentos.find((e) => e.camadaId === 'sala_servidores' && e.iconKey === 'switch') ||
    equipamentos.find((e) => e.camadaId === 'sala_servidores' && e.iconKey === 'server')

  if (switchPrincipal) {
    // Ligar aos links de internet
    equipamentos
      .filter((e) => e.camadaId === 'sala_servidores' && e.iconKey === 'telecom')
      .forEach((linkNode) => {
        conexoes.push({
          id: `cx-link-${linkNode.id}-${switchPrincipal.id}`,
          origemId: linkNode.id,
          destinoId: switchPrincipal.id,
          tipo: 'fibra',
          rotulo: 'Uplink Internet',
          animada: true,
        })
      })

    // Ligar aos servidores e storages
    equipamentos
      .filter(
        (e) =>
          e.camadaId === 'sala_servidores' &&
          (e.iconKey === 'server' || e.iconKey === 'storage') &&
          e.id !== switchPrincipal.id,
      )
      .forEach((srvNode) => {
        conexoes.push({
          id: `cx-srv-${switchPrincipal.id}-${srvNode.id}`,
          origemId: switchPrincipal.id,
          destinoId: srvNode.id,
          tipo: 'rede',
          rotulo: 'VLAN Produção',
        })
      })

    // Ligar do switch principal para os nós setoriais (Backbone de Fibra / Rede)
    const setoresIds: CamadaId[] = [
      'setor_atendimento',
      'setor_frente',
      'setor_fundo',
      'setor_diretoria',
    ]
    setoresIds.forEach((setorId) => {
      const primeiroDoSetor = equipamentos.find((e) => e.camadaId === setorId)
      if (primeiroDoSetor) {
        conexoes.push({
          id: `cx-bb-${switchPrincipal.id}-${primeiroDoSetor.id}`,
          origemId: switchPrincipal.id,
          destinoId: primeiroDoSetor.id,
          tipo: setorId === 'setor_diretoria' ? 'rede' : 'fibra',
          rotulo: setorId === 'setor_diretoria' ? 'VLAN Diretoria' : 'Tronco de Fibra Óptica',
          animada: true,
        })
      }
    })
  }

  // Resumo por camada
  const resumoPorCamada: Record<CamadaId, { total: number; reais: number }> = {
    energia: { total: 0, reais: 0 },
    sala_servidores: { total: 0, reais: 0 },
    interligacao: { total: 0, reais: 0 },
    setor_atendimento: { total: 0, reais: 0 },
    setor_frente: { total: 0, reais: 0 },
    setor_fundo: { total: 0, reais: 0 },
    setor_diretoria: { total: 0, reais: 0 },
    protecao_sobreposta: { total: 0, reais: 0 },
  }

  equipamentos.forEach((eq) => {
    if (resumoPorCamada[eq.camadaId]) {
      resumoPorCamada[eq.camadaId].total++
      resumoPorCamada[eq.camadaId].reais++
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
    autonomiaTotalMinutos,
    velocidadeTotalMbps,
    temDadosSuficientes,
    resumoPorCamada,
  }
}
