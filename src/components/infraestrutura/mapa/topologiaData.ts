import React from 'react'
import {
  Zap,
  BatteryCharging,
  Server,
  HardDrive,
  Network,
  Wind,
  PhoneCall,
  Printer,
  Monitor,
  Shield,
  Layers,
  Activity,
  Cpu,
  Wifi,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Database,
  Building2,
  ArrowRight,
  Radio,
} from 'lucide-react'

export type CamadaId =
  | 'energia'
  | 'sala_servidores'
  | 'setor_atendimento'
  | 'setor_frente'
  | 'setor_fundo'
  | 'setor_diretoria'

export type TipoConexao = 'eletrica' | 'fibra' | 'rede'

export interface TopologiaConexao {
  id: string
  origemId: string
  destinoId: string
  tipo: TipoConexao
  rotulo?: string
  descricao?: string
  animada?: boolean
}

export interface EquipamentoSimulado {
  id: string
  nome: string
  codigoAtivo: string // Ex: AT-SRV-01, NBK-01
  setor: string
  camadaId: CamadaId
  tipoEquipamento: string
  fabricanteModelo: string
  ipOuIdentificacao?: string
  status: 'operacional' | 'alerta' | 'manutencao' | 'critico'
  criticidade: 'alta' | 'media' | 'baixa'
  iconKey:
    | 'zap'
    | 'generator'
    | 'quadro'
    | 'nobreak'
    | 'server'
    | 'storage'
    | 'switch'
    | 'hvac'
    | 'telecom'
    | 'totem'
    | 'workstation'
    | 'printer'
    | 'rack'
    | 'shield'
  // Metadados para enriquecer a simulação dos botões desabilitados
  glpiVinculoSimulado?: {
    idAtivo: string
    nomeGlpi: string
    categoriaGlpi: string
  }
  evidenciaFotoSimulada?: {
    idEvidencia: string
    titulo: string
    categoria: string
  }
  infraNobreakSimulado?: {
    autonomiaMinutos: number
    potenciaKva: string
    bateriasStatus: string
  }
  conectividadeLinkSimulado?: {
    operadora: string
    tipoLink: string
    velocidade: string
  }
  detalhesTecnicos: {
    capacidade?: string
    tensaoOuAlimentacao?: string
    localizacaoFisica: string
    observacoes: string
  }
}

export interface CamadaConfig {
  id: CamadaId
  titulo: string
  subtitulo: string
  badge: string
  corBorda: string
  corFundo: string
  corCabecalho: string
  corBadge: string
  ordem: number
}

export const CAMADAS_TOPOLOGIA: CamadaConfig[] = [
  {
    id: 'energia',
    titulo: '1. Camada Energia Elétrica',
    subtitulo: 'Entrada da concessionária, geração de emergência e distribuição protegida',
    badge: 'Alimentação Primária',
    corBorda: 'border-amber-200/80',
    corFundo: 'bg-amber-50/40',
    corCabecalho: 'text-amber-900',
    corBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    ordem: 1,
  },
  {
    id: 'sala_servidores',
    titulo: '2. Sala de Servidores (CPD / Datacenter Local)',
    subtitulo:
      'Núcleo de processamento, armazenamento, conectividade externa e climatização de precisão',
    badge: 'Core Infra',
    corBorda: 'border-blue-200/80',
    corFundo: 'bg-blue-50/40',
    corCabecalho: 'text-blue-900',
    corBadge: 'bg-blue-100 text-blue-800 border-blue-300',
    ordem: 2,
  },
  {
    id: 'setor_atendimento',
    titulo: '3. Setor Atendimento ao Público',
    subtitulo: 'Balcão de senhas, guichês dos escreventes e impressão térmica/documental',
    badge: 'Front-Office',
    corBorda: 'border-emerald-200/80',
    corFundo: 'bg-emerald-50/40',
    corCabecalho: 'text-emerald-900',
    corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    ordem: 3,
  },
  {
    id: 'setor_frente',
    titulo: '4. Setor Interno Frente',
    subtitulo: 'Processamento de escrituras, certidões e conferência registral',
    badge: 'Back-Office 1',
    corBorda: 'border-indigo-200/80',
    corFundo: 'bg-indigo-50/40',
    corCabecalho: 'text-indigo-900',
    corBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    ordem: 4,
  },
  {
    id: 'setor_fundo',
    titulo: '5. Setor Interno Fundo',
    subtitulo: 'Arquivo, digitalização, microfilmagem e setor financeiro/administrativo',
    badge: 'Back-Office 2',
    corBorda: 'border-purple-200/80',
    corFundo: 'bg-purple-50/40',
    corCabecalho: 'text-purple-900',
    corBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    ordem: 5,
  },
  {
    id: 'setor_diretoria',
    titulo: '6. Setor Diretoria e Gabinete',
    subtitulo: 'Estações dos oficiais titulares, substitutos e assessoria jurídica',
    badge: 'Gabinete & Gestão',
    corBorda: 'border-slate-300',
    corFundo: 'bg-slate-50/70',
    corCabecalho: 'text-slate-900',
    corBadge: 'bg-slate-200 text-slate-800 border-slate-300',
    ordem: 6,
  },
]

export const EQUIPAMENTOS_SIMULADOS: EquipamentoSimulado[] = [
  // ---------------- ENERGIA ----------------
  {
    id: 'en-rede-publica',
    nome: 'Rede Pública (Concessionária)',
    codigoAtivo: 'PWR-GRID-01',
    setor: 'Entrada Predial / Padrão',
    camadaId: 'energia',
    tipoEquipamento: 'Alimentação Trifásica Concessionária',
    fabricanteModelo: 'Entrada 220V/127V Trifásica 150A',
    ipOuIdentificacao: 'Medidor CEMIG/ENEL #489201',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'zap',
    evidenciaFotoSimulada: {
      idEvidencia: 'evi-foto-padrao-01',
      titulo: 'Foto do Padrão de Entrada e Aterramento',
      categoria: 'ambiente_fisico',
    },
    detalhesTecnicos: {
      tensaoOuAlimentacao: 'Trifásico 220V / 60Hz',
      localizacaoFisica: 'Fachada Lateral Externa - Caixa Padrão Selada',
      observacoes:
        'Fornecimento principal da concessionária pública local com laudo de aterramento em conformidade.',
    },
  },
  {
    id: 'en-gerador',
    nome: 'Gerador de Energia (Grupo Gerador)',
    codigoAtivo: 'PWR-GEN-01',
    setor: 'Área Técnica Externa',
    camadaId: 'energia',
    tipoEquipamento: 'Grupo Motogerador Diesel Silenciado',
    fabricanteModelo: 'Stemac 60 kVA / Motor MWM com QTA Automático',
    ipOuIdentificacao: 'Painel Microprocessado QTA-01',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'generator',
    evidenciaFotoSimulada: {
      idEvidencia: 'evi-gerador-art',
      titulo: 'ART e Registro Fotográfico do Grupo Gerador',
      categoria: 'energia',
    },
    detalhesTecnicos: {
      capacidade: '60 kVA / 48 kW - Autonomia 14 horas contínuas',
      tensaoOuAlimentacao: 'Trifásico 220V com acionamento em < 12 segundos',
      localizacaoFisica: 'Pátio Técnico Externo - Base de Concreto Antivibração',
      observacoes:
        'Partida automática por Quadro de Transferência Automática (QTA) em caso de queda da rede pública.',
    },
  },
  {
    id: 'en-quadro-geral',
    nome: 'Quadro de Alimentação Geral (QGBT)',
    codigoAtivo: 'PWR-QGBT-01',
    setor: 'Subsolo / Entrada Técnica',
    camadaId: 'energia',
    tipoEquipamento: 'Quadro Geral de Baixa Tensão com DPS',
    fabricanteModelo: 'Painel Schneider Electric com DPS Classe I+II e DRs',
    ipOuIdentificacao: 'Barramento Central Blindado',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'quadro',
    evidenciaFotoSimulada: {
      idEvidencia: 'evi-laudo-dps',
      titulo: 'Laudo de Aterramento e DPS Válido',
      categoria: 'energia',
    },
    detalhesTecnicos: {
      capacidade: 'Barramento 200A com Disjuntores Caixa Moldada',
      tensaoOuAlimentacao: 'Trifásico 220V / 127V',
      localizacaoFisica: 'Hall Técnico de Entrada / Sala de Medição',
      observacoes:
        'Recebe a rede da concessionária e do gerador; alimenta os Nobreaks centrais e quadros setoriais.',
    },
  },
  {
    id: 'en-nobreak-central',
    nome: 'Nobreak Central Dupla Conversão',
    codigoAtivo: 'PWR-NBK-CORE',
    setor: 'Sala Técnica de Energia',
    camadaId: 'energia',
    tipoEquipamento: 'UPS Online Dupla Conversão Trifásico/Monofásico',
    fabricanteModelo: 'APC / Schneider Smart-UPS VT 20kVA com Módulo SNMP',
    ipOuIdentificacao: '192.168.10.250 (Placa SNMP)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'nobreak',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-NBK-20K',
      nomeGlpi: 'UPS-APC-20KVA-CORE',
      categoriaGlpi: 'Nobreak / Energia',
    },
    infraNobreakSimulado: {
      autonomiaMinutos: 90,
      potenciaKva: '20 kVA',
      bateriasStatus: '16 Baterias Estacionárias Novas (Troca Jan/2026)',
    },
    evidenciaFotoSimulada: {
      idEvidencia: 'evi-foto-nobreak-sala',
      titulo: 'Banco de Baterias do Nobreak Central',
      categoria: 'energia',
    },
    detalhesTecnicos: {
      capacidade: '20 kVA / 16 kW com banco externo',
      tensaoOuAlimentacao: 'Entrada 220V / Saída 120V+220V Senoidal Pura',
      localizacaoFisica: 'Antecâmara da Sala de Servidores (Climatizada)',
      observacoes:
        'Alimenta os Racks centrais, Storages, Core Switches e infraestrutura crítica da sala de servidores.',
    },
  },

  // ---------------- SALA DE SERVIDORES ----------------
  {
    id: 'srv-rack-principal',
    nome: 'Rack 42U Fechado Sala Servidores',
    codigoAtivo: 'RCK-CPD-01',
    setor: 'Sala de Servidores',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Rack 19" 42U Padrão Fechado com Biometria',
    fabricanteModelo: 'Rittal TS IT 42U 800x1000mm com Porta Perfurada',
    ipOuIdentificacao: 'Fechadura Biométrica IP: 192.168.10.245',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'rack',
    evidenciaFotoSimulada: {
      idEvidencia: 'evi-rack-cpd-fechado',
      titulo: 'Organização Interna do Rack Principal 42U',
      categoria: 'ambiente_fisico',
    },
    detalhesTecnicos: {
      localizacaoFisica: 'Sala de Servidores - Posição Central (Piso Elevado)',
      tensaoOuAlimentacao: 'PDUs A+B Redundantes ligadas ao Nobreak Central',
      observacoes:
        'Hospeda servidores físicos, storage SAN, patch panels de fibra e switches de núcleo.',
    },
  },
  {
    id: 'srv-host-01',
    nome: 'Servidor Host Virtualizador 01',
    codigoAtivo: 'SRV-HOST-01',
    setor: 'Sala de Servidores - Rack 42U',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Servidor Rack 2U Virtualização (Proxmox / Hyper-V)',
    fabricanteModelo: 'Dell PowerEdge R750 2x Xeon Silver 128GB RAM',
    ipOuIdentificacao: '192.168.10.11 (iDRAC: 192.168.10.110)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'server',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-SRV-DELL-01',
      nomeGlpi: 'SRV-DELL-R750-PROD01',
      categoriaGlpi: 'Servidor',
    },
    detalhesTecnicos: {
      capacidade: '2x Intel Xeon Silver 4314, 128GB ECC, 4x 10GbE SFP+',
      tensaoOuAlimentacao: '2x Fontes Redundantes Hot-Plug 800W Platinum',
      localizacaoFisica: 'Rack 42U Sala Servidores (U18-U19)',
      observacoes:
        'Executa as VMs do Banco de Dados Registral, Servidor de Arquivos e Sistema de Selos.',
    },
  },
  {
    id: 'srv-host-02',
    nome: 'Servidor Host Virtualizador 02 (HA)',
    codigoAtivo: 'SRV-HOST-02',
    setor: 'Sala de Servidores - Rack 42U',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Servidor Rack 2U Alta Disponibilidade (Failover)',
    fabricanteModelo: 'Dell PowerEdge R750 2x Xeon Silver 128GB RAM',
    ipOuIdentificacao: '192.168.10.12 (iDRAC: 192.168.10.111)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'server',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-SRV-DELL-02',
      nomeGlpi: 'SRV-DELL-R750-PROD02',
      categoriaGlpi: 'Servidor',
    },
    detalhesTecnicos: {
      capacidade: '2x Intel Xeon Silver 4314, 128GB ECC, 4x 10GbE SFP+',
      tensaoOuAlimentacao: '2x Fontes Redundantes Hot-Plug 800W Platinum',
      localizacaoFisica: 'Rack 42U Sala Servidores (U21-U22)',
      observacoes:
        'Par do cluster Proxmox/VMware com failover automático e réplica contínua de memória e disco.',
    },
  },
  {
    id: 'srv-storage-san',
    nome: 'Storage Central SAN / Backup Local',
    codigoAtivo: 'STR-SAN-01',
    setor: 'Sala de Servidores - Rack 42U',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Storage All-Flash / SAS Híbrido com RAID 6/10',
    fabricanteModelo: 'Dell PowerVault ME5024 24TB SAS 10Gb iSCSI',
    ipOuIdentificacao: '192.168.10.20 (Controladoras A & B)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'storage',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-STR-ME5024',
      nomeGlpi: 'STR-DELL-ME5024-SAN',
      categoriaGlpi: 'Storage de Dados',
    },
    detalhesTecnicos: {
      capacidade: '24 TB Úteis em RAID-6 Duplo + Spare Global Hot',
      tensaoOuAlimentacao: 'Fontes Duplas Redundantes 580W',
      localizacaoFisica: 'Rack 42U Sala Servidores (U15-U16)',
      observacoes:
        'Armazena volumes de produção do acervo registral e repositório de snapshots locais imutáveis.',
    },
  },
  {
    id: 'srv-switch-core',
    nome: 'Switches de Núcleo (Core Stack 10GbE)',
    codigoAtivo: 'SW-CORE-STACK',
    setor: 'Sala de Servidores - Rack 42U',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Switches Gerenciáveis L3 em Stack com Uplinks Fibra SFP+',
    fabricanteModelo: 'Aruba CX 6200F 24G 4SFP+ (Stack Duplo Ativo-Ativo)',
    ipOuIdentificacao: '192.168.10.1 (VLANs 10, 20, 30, 40, 50, 99)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'switch',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-SW-CORE',
      nomeGlpi: 'SW-ARUBA-CORE-STACK',
      categoriaGlpi: 'Equipamento de Rede',
    },
    detalhesTecnicos: {
      capacidade: '2x 24 Portas Gigabit + 8 Portas 10GbE SFP+ Fibra',
      tensaoOuAlimentacao: 'Fontes Duplas em circuitos independentes',
      localizacaoFisica: 'Rack 42U Sala Servidores (U25-U26)',
      observacoes:
        'Ponto focal de terminação de toda a fibra óptica dos setores da serventia e roteamento de VLANs.',
    },
  },
  {
    id: 'srv-telecom-fibra',
    nome: 'Comunicação Internet (Links Fibra Redundantes)',
    codigoAtivo: 'NET-LINKS-WAN',
    setor: 'Sala de Servidores - DIO Fibra',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Roteador BGP / SD-WAN com Dois Links de Fibra Óptica',
    fabricanteModelo: 'Link Principal Vivo Fibra 600 Mbps + Backup Claro 500 Mbps',
    ipOuIdentificacao: 'IPs Fixos com Failover Automático < 3s',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'telecom',
    conectividadeLinkSimulado: {
      operadora: 'Vivo Empresas 600Mbps (Primário) + Claro Fibra 500Mbps (Redundante)',
      tipoLink: 'Fibra Óptica Dedicada Ponto a Ponto',
      velocidade: '1100 Mbps Agregados',
    },
    detalhesTecnicos: {
      capacidade: '600 Mbps Down/Up Simétrico + 500 Mbps Backup',
      tensaoOuAlimentacao: 'Nobreak Dedicado do DIO / Modems',
      localizacaoFisica: 'DIO de Entrada Fibra - Parede Sul Sala Servidores',
      observacoes:
        'Atende com folga as exigências mínimas da classe registral, com redundância de operadora física.',
    },
  },
  {
    id: 'srv-telefonia-voip',
    nome: 'Central de Telefonia IP (PABX VoIP)',
    codigoAtivo: 'TEL-PABX-VOIP',
    setor: 'Sala de Servidores',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Appliance VoIP SIP com Tronco E1 / SIP Cloud',
    fabricanteModelo: 'Grandstream UCM6304 / Tronco SIP Dedicado Cartório',
    ipOuIdentificacao: '192.168.10.15',
    status: 'operacional',
    criticidade: 'media',
    iconKey: 'telecom',
    detalhesTecnicos: {
      capacidade: 'Até 100 ramais IP e 60 chamadas simultâneas gravadas',
      tensaoOuAlimentacao: 'Alimentação redundante via PoE e Nobreak',
      localizacaoFisica: 'Rack 42U Sala Servidores (U12)',
      observacoes:
        'Atende aos ramais de atendimento, escreventes, salas internas e diretoria com gravação de segurança.',
    },
  },
  {
    id: 'srv-ar-condicionado',
    nome: 'Climatização Dedicada da Sala (Split Inverter Duplo)',
    codigoAtivo: 'CLIM-CPD-01',
    setor: 'Sala de Servidores',
    camadaId: 'sala_servidores',
    tipoEquipamento: 'Ar-Condicionado de Precisão / Revezamento Automático 24x7',
    fabricanteModelo: '2x Daikin Inverter 24.000 BTUs com Termostato SNMP',
    ipOuIdentificacao: 'Sensor de Temperatura: 192.168.10.230 (19.8 °C)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'hvac',
    evidenciaFotoSimulada: {
      idEvidencia: 'evi-ar-cpd-foto',
      titulo: 'Evidência de Climatização Contínua e Sensor de Temperatura',
      categoria: 'ambiente_fisico',
    },
    detalhesTecnicos: {
      capacidade: '2x 24.000 BTU/h em ciclo de revezamento a cada 12h',
      tensaoOuAlimentacao: 'Circuito 220V alimentado pelo QGBT / Gerador',
      localizacaoFisica: 'Paredes Leste e Oeste da Sala de Servidores',
      observacoes:
        'Mantém temperatura entre 19°C e 22°C com monitoramento de umidade e alarmes sonoros/e-mail.',
    },
  },

  // ---------------- SETOR ATENDIMENTO AO PÚBLICO ----------------
  {
    id: 'atend-rack-setor',
    nome: 'Rack Setorial Atendimento (Switch + Nobreak)',
    codigoAtivo: 'RCK-SET-ATEND',
    setor: 'Atendimento ao Público',
    camadaId: 'setor_atendimento',
    tipoEquipamento: 'Mini-Rack de Parede 12U com Switch PoE e Nobreak',
    fabricanteModelo: 'Rack 12U com Switch Aruba 24p PoE + Nobreak SMS 3kVA',
    ipOuIdentificacao: 'Switch: 192.168.20.2 | Nobreak: 192.168.20.250',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'rack',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-RCK-ATEND',
      nomeGlpi: 'SW-ARUBA-24P-POE-ATEND',
      categoriaGlpi: 'Equipamento de Rede',
    },
    infraNobreakSimulado: {
      autonomiaMinutos: 45,
      potenciaKva: '3 kVA Senoidal',
      bateriasStatus: 'Operacional (Baterias internas recarregadas)',
    },
    detalhesTecnicos: {
      capacidade: 'Alimenta 8 guichês de atendimento, totem e impressoras',
      tensaoOuAlimentacao: 'Entrada 220V do QGBT / Saída estabilizada 120V',
      localizacaoFisica: 'Gabinete Técnico Embutido no Balcão de Recepção',
      observacoes:
        'Alimentado diretamente por cabo de fibra óptica vindo do switch de núcleo da Sala de Servidores.',
    },
  },
  {
    id: 'atend-totem-senhas',
    nome: 'Totem de Senhas e Recepção Triagem',
    codigoAtivo: 'TOTEM-SENHA-01',
    setor: 'Atendimento ao Público - Hall',
    camadaId: 'setor_atendimento',
    tipoEquipamento: 'Totem Interativo Touchscreen com Impressora Térmica',
    fabricanteModelo: 'Totem Slim 21.5" Touch com Impressora Térmica 80mm',
    ipOuIdentificacao: '192.168.20.101',
    status: 'operacional',
    criticidade: 'media',
    iconKey: 'totem',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-TOTEM-01',
      nomeGlpi: 'TOTEM-RECEPCAO-SENHAS',
      categoriaGlpi: 'Estação / Terminal',
    },
    detalhesTecnicos: {
      localizacaoFisica: 'Entrada Principal do Cartório - Hall de Triagem',
      tensaoOuAlimentacao: 'Alimentado pelo Nobreak do Rack Setorial',
      observacoes:
        'Software integrado de triagem prioritária (Lei 10.048/00) e fila eletrônica de atendimento.',
    },
  },
  {
    id: 'atend-workstations',
    nome: 'Estações de Trabalho do Balcão (Guichês 1 a 6)',
    codigoAtivo: 'WS-ATEND-01-06',
    setor: 'Atendimento ao Público - Balcão',
    camadaId: 'setor_atendimento',
    tipoEquipamento: 'Microcomputadores Corporativos com Leitor Biométrico e Webcam',
    fabricanteModelo: '6x Lenovo ThinkCentre M70q i5 16GB SSD 512GB com Windows 11 Pro',
    ipOuIdentificacao: 'IPs DHCP Reserva: 192.168.20.11 a 192.168.20.16',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'workstation',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-GRP-WS-ATEND',
      nomeGlpi: 'WS-ATEND-LNV-01..06',
      categoriaGlpi: 'Computador',
    },
    detalhesTecnicos: {
      capacidade: '6 estações ativas equipadas com leitor de cartão de assinatura e biometria',
      tensaoOuAlimentacao: 'Alimentadas pelos circuitos do Nobreak Setorial',
      localizacaoFisica: 'Guichês 01 ao 06 do Balcão de Atendimento',
      observacoes:
        'Acesso seguro restrito com autenticação em dois fatores e bloqueio por inatividade de 5 min.',
    },
  },
  {
    id: 'atend-impressoras',
    nome: 'Impressoras Térmicas e Multifuncionais do Atendimento',
    codigoAtivo: 'IMP-ATEND-01',
    setor: 'Atendimento ao Público',
    camadaId: 'setor_atendimento',
    tipoEquipamento: 'Impressoras de Etiquetas Térmicas + Multifuncional Departamental',
    fabricanteModelo: '2x Zebra ZD220 (Etiquetas) + 1x Kyocera ECOSYS M3655idn',
    ipOuIdentificacao: '192.168.20.50 e 192.168.20.51',
    status: 'operacional',
    criticidade: 'media',
    iconKey: 'printer',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-IMP-KYOCERA-ATEND',
      nomeGlpi: 'IMP-KYOCERA-ECOSYS-ATEND',
      categoriaGlpi: 'Impressora Multifuncional',
    },
    detalhesTecnicos: {
      capacidade: '55 ppm Duplex com scanner de alta velocidade para certidões',
      tensaoOuAlimentacao: 'Rede estabilizada do Rack Setorial',
      localizacaoFisica: 'Bancada de Suporte do Atendimento ao Público',
      observacoes:
        'Impressão direta de recibos de protocolo, etiquetas de selagem e traslados imediatos.',
    },
  },

  // ---------------- SETOR INTERNO FRENTE ----------------
  {
    id: 'frente-rack-setor',
    nome: 'Rack Setorial Frente (Switch + Nobreak)',
    codigoAtivo: 'RCK-SET-FRENTE',
    setor: 'Setor Interno Frente',
    camadaId: 'setor_frente',
    tipoEquipamento: 'Rack 12U de Parede com Switch Gerenciável e Nobreak',
    fabricanteModelo: 'Switch HP Aruba 2530 24G + Nobreak APC Smart-UPS 2.2kVA',
    ipOuIdentificacao: '192.168.30.2 (VLAN 30 - Produção Interna Frente)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'rack',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-RCK-FRENTE',
      nomeGlpi: 'SW-ARUBA-24P-FRENTE',
      categoriaGlpi: 'Equipamento de Rede',
    },
    infraNobreakSimulado: {
      autonomiaMinutos: 40,
      potenciaKva: '2.2 kVA Senoidal',
      bateriasStatus: 'Operacional com teste semestral registrado',
    },
    detalhesTecnicos: {
      capacidade: '24 portas Gigabit com uplink por fibra óptica monomodo',
      tensaoOuAlimentacao: 'Alimentado pelo QGBT com Nobreak de suporte local',
      localizacaoFisica: 'Parede lateral da sala dos escreventes da frente',
      observacoes:
        'Interligado por fibra óptica direta da Sala de Servidores, provendo tráfego sem interferência.',
    },
  },
  {
    id: 'frente-workstations',
    nome: 'Estações de Trabalho Escreventes (8 Estações)',
    codigoAtivo: 'WS-FRENTE-01-08',
    setor: 'Setor Interno Frente',
    camadaId: 'setor_frente',
    tipoEquipamento: 'Desktops de Produção Registral e Notarial',
    fabricanteModelo: '8x Dell OptiPlex 7000 i5 16GB SSD 512GB NVMe Monitor Duplo',
    ipOuIdentificacao: '192.168.30.11 a 192.168.30.18',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'workstation',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-GRP-WS-FRENTE',
      nomeGlpi: 'WS-DELL-OPT-FRENTE-01..08',
      categoriaGlpi: 'Computador',
    },
    detalhesTecnicos: {
      capacidade: '8 estações com dois monitores para cotejo de matrículas e minutas',
      tensaoOuAlimentacao: 'Conexão em tomadas estabilizadas pelo Nobreak do setor',
      localizacaoFisica: 'Mesas do Setor de Escrituras e Procurações',
      observacoes:
        'Todos os computadores com disco criptografado BitLocker e antivírus corporativo gerenciado.',
    },
  },
  {
    id: 'frente-impressoras',
    nome: 'Impressora Multifuncional do Departamento Frente',
    codigoAtivo: 'IMP-FRENTE-01',
    setor: 'Setor Interno Frente',
    camadaId: 'setor_frente',
    tipoEquipamento: 'Multifuncional Laser A4/A3 Monocromática e Colorida',
    fabricanteModelo: 'Canon imageRUNNER ADVANCE DX C3830i',
    ipOuIdentificacao: '192.168.30.50',
    status: 'operacional',
    criticidade: 'media',
    iconKey: 'printer',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-IMP-CANON-FRENTE',
      nomeGlpi: 'IMP-CANON-C3830I-FRENTE',
      categoriaGlpi: 'Impressora Multifuncional',
    },
    detalhesTecnicos: {
      capacidade: '30 ppm A3/A4 com bandeja para papel timbrado de escrituras',
      tensaoOuAlimentacao: 'Circuito protegido do setor',
      localizacaoFisica: 'Área central de circulação do Setor Frente',
      observacoes:
        'Controle de impressão com liberação por crachá/código individual para confidencialidade.',
    },
  },

  // ---------------- SETOR INTERNO FUNDO ----------------
  {
    id: 'fundo-rack-setor',
    nome: 'Rack Setorial Fundo (Switch + Nobreak)',
    codigoAtivo: 'RCK-SET-FUNDO',
    setor: 'Setor Interno Fundo (Arquivo & Digitalização)',
    camadaId: 'setor_fundo',
    tipoEquipamento: 'Rack 12U de Parede com Switch e Nobreak de Proteção',
    fabricanteModelo: 'Switch Aruba 2530 24G + Nobreak SMS Sinus Triad 3kVA',
    ipOuIdentificacao: '192.168.40.2 (VLAN 40 - Digitalização e Acervo)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'rack',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-RCK-FUNDO',
      nomeGlpi: 'SW-ARUBA-24P-FUNDO',
      categoriaGlpi: 'Equipamento de Rede',
    },
    infraNobreakSimulado: {
      autonomiaMinutos: 45,
      potenciaKva: '3.0 kVA Senoidal Dupla Conversão',
      bateriasStatus: 'Operacional com monitoramento contínuo',
    },
    detalhesTecnicos: {
      capacidade: '24 portas Gigabit dedicadas a scanners e digitalização maciça',
      tensaoOuAlimentacao: 'Alimentação estabilizada via Nobreak dedicado',
      localizacaoFisica: 'Corredor de acesso ao Acervo / Arquivo Histórico',
      observacoes: 'Ligado por cabo de fibra óptica dedicado diretamente à Sala de Servidores.',
    },
  },
  {
    id: 'fundo-workstations',
    nome: 'Estações de Digitalização e Registro (6 Estações)',
    codigoAtivo: 'WS-FUNDO-01-06',
    setor: 'Setor Interno Fundo',
    camadaId: 'setor_fundo',
    tipoEquipamento: 'Estações para Captura de Imagens, OCR e Financeiro',
    fabricanteModelo: '6x Dell OptiPlex 7000 i7 16GB + Scanners Fujitsu fi-7160',
    ipOuIdentificacao: '192.168.40.11 a 192.168.40.16',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'workstation',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-GRP-WS-FUNDO',
      nomeGlpi: 'WS-DELL-FUNDO-SCAN-01..06',
      categoriaGlpi: 'Computador',
    },
    detalhesTecnicos: {
      capacidade: '6 estações acopladas a scanners profissionais de 60 ppm / 120 ipm duplex',
      tensaoOuAlimentacao: 'Tomadas estabilizadas pelo Nobreak do Setor Fundo',
      localizacaoFisica: 'Bancadas de Digitalização e Indexação do Acervo',
      observacoes:
        'Geração de pacotes PDF/A com assinatura digital com carimbo do tempo e hash ICP-Brasil.',
    },
  },
  {
    id: 'fundo-impressoras',
    nome: 'Impressora Departamental e Plotter do Fundo',
    codigoAtivo: 'IMP-FUNDO-01',
    setor: 'Setor Interno Fundo',
    camadaId: 'setor_fundo',
    tipoEquipamento: 'Multifuncional Pesada para Livros e Relatórios Financeiros',
    fabricanteModelo: 'Kyocera TASKalfa 4054ci Multifuncional Laser A3/A4',
    ipOuIdentificacao: '192.168.40.50',
    status: 'operacional',
    criticidade: 'media',
    iconKey: 'printer',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-IMP-KYOCERA-FUNDO',
      nomeGlpi: 'IMP-KYOCERA-4054CI-FUNDO',
      categoriaGlpi: 'Impressora Multifuncional',
    },
    detalhesTecnicos: {
      capacidade: '40 ppm A4 / 20 ppm A3 com encadernador automático',
      tensaoOuAlimentacao: 'Rede estabilizada do Rack Fundo',
      localizacaoFisica: 'Área do Arquivo e Departamento Financeiro',
      observacoes:
        'Emissão dos livros de notas e registro de imóveis, termos de encerramento e balancetes.',
    },
  },

  // ---------------- DIRETORIA ----------------
  {
    id: 'dir-workstations',
    nome: 'Estações da Diretoria (Oficial Titular e Substituto)',
    codigoAtivo: 'WS-DIR-01-02',
    setor: 'Gabinete da Diretoria',
    camadaId: 'setor_diretoria',
    tipoEquipamento: 'Workstations Executivas com Token A3 e Monitor Ultrawide',
    fabricanteModelo: '2x Dell Precision 3660 i7 32GB SSD 1TB NVMe + Monitor 34" Curvo',
    ipOuIdentificacao: '192.168.50.10 e 192.168.50.11 (VLAN 50 - Gestão Restrita)',
    status: 'operacional',
    criticidade: 'alta',
    iconKey: 'workstation',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-WS-TITULAR',
      nomeGlpi: 'WS-DELL-TITULAR-PRECISION',
      categoriaGlpi: 'Computador',
    },
    detalhesTecnicos: {
      capacidade: '2 estações de alto desempenho para auditoria, relatórios e homologação final',
      tensaoOuAlimentacao: 'Circuito dedicado com Nobreak individual 1.5kVA Senoidal',
      localizacaoFisica: 'Gabinete do Oficial Titular e Sala do Tabelião Substituto',
      observacoes:
        'Acesso pleno ao CSCTI Compliance, com certificação digital de assinatura em lote e aprovações.',
    },
  },
  {
    id: 'dir-impressora-sigilosa',
    nome: 'Impressora Segura da Diretoria',
    codigoAtivo: 'IMP-DIR-SEC',
    setor: 'Gabinete da Diretoria',
    camadaId: 'setor_diretoria',
    tipoEquipamento: 'Impressora Laser Compacta com Disco Criptografado',
    fabricanteModelo: 'HP LaserJet Enterprise M406dn com Secure Print',
    ipOuIdentificacao: '192.168.50.25',
    status: 'operacional',
    criticidade: 'media',
    iconKey: 'printer',
    glpiVinculoSimulado: {
      idAtivo: 'GLPI-IMP-DIR',
      nomeGlpi: 'IMP-HP-M406-DIRETORIA',
      categoriaGlpi: 'Impressora Multifuncional',
    },
    detalhesTecnicos: {
      capacidade: '40 ppm Monocromática com bandeja de papéis de segurança',
      tensaoOuAlimentacao: 'Alimentada pelo nobreak da diretoria',
      localizacaoFisica: 'Gabinete do Oficial Titular',
      observacoes:
        'Uso exclusivo para emissão de certidões sigilosas, atos notariais especiais e documentos de gestão.',
    },
  },
]

export const CONEXOES_SIMULADAS: TopologiaConexao[] = [
  // Camada Energia em cascata
  {
    id: 'cx-en-01',
    origemId: 'en-rede-publica',
    destinoId: 'en-quadro-geral',
    tipo: 'eletrica',
    rotulo: 'Alimentação Trifásica 220V',
    descricao: 'Rede primária da concessionária entregue no quadro geral com DPS',
    animada: true,
  },
  {
    id: 'cx-en-02',
    origemId: 'en-gerador',
    destinoId: 'en-quadro-geral',
    tipo: 'eletrica',
    rotulo: 'Standby / QTA Automático',
    descricao: 'Acionamento automático do gerador a diesel em caso de falha da concessionária',
    animada: false,
  },
  {
    id: 'cx-en-03',
    origemId: 'en-quadro-geral',
    destinoId: 'en-nobreak-central',
    tipo: 'eletrica',
    rotulo: 'Alimentação Protegida',
    descricao: 'Circuito dedicado para a UPS Central online de dupla conversão',
    animada: true,
  },
  {
    id: 'cx-en-04',
    origemId: 'en-nobreak-central',
    destinoId: 'srv-rack-principal',
    tipo: 'eletrica',
    rotulo: 'PDU A + B Sala Servidores',
    descricao: 'Alimentação ininterrupta senoidal pura para todos os servidores e switches',
    animada: true,
  },

  // Da Sala de Servidores: Interligação em Fibra Óptica para os Racks dos Setores
  {
    id: 'cx-fibra-01',
    origemId: 'srv-switch-core',
    destinoId: 'atend-rack-setor',
    tipo: 'fibra',
    rotulo: 'Fibra óptica (10 Gbps SFP+)',
    descricao: 'Cabo óptico dielétrico subterrâneo ligando o Core ao Rack do Atendimento',
    animada: true,
  },
  {
    id: 'cx-fibra-02',
    origemId: 'srv-switch-core',
    destinoId: 'frente-rack-setor',
    tipo: 'fibra',
    rotulo: 'Fibra óptica (10 Gbps SFP+)',
    descricao: 'Cabo óptico interligando a Sala de Servidores ao Setor Interno Frente',
    animada: true,
  },
  {
    id: 'cx-fibra-03',
    origemId: 'srv-switch-core',
    destinoId: 'fundo-rack-setor',
    tipo: 'fibra',
    rotulo: 'Fibra óptica (10 Gbps SFP+)',
    descricao: 'Cabo óptico interligando o Core ao Setor Interno Fundo (Arquivo e Digitalização)',
    animada: true,
  },
  {
    id: 'cx-fibra-04',
    origemId: 'srv-switch-core',
    destinoId: 'dir-workstations',
    tipo: 'rede',
    rotulo: 'VLAN 50 Diretoria (Cat6A Blindado)',
    descricao: 'Ponto seguro e blindado dedicado para as estações da Diretoria',
    animada: false,
  },

  // Setor Atendimento ao Público: do Rack Setorial para equipamentos
  {
    id: 'cx-atend-01',
    origemId: 'atend-rack-setor',
    destinoId: 'atend-totem-senhas',
    tipo: 'rede',
    rotulo: 'Rede PoE + Elétrica UPS',
    descricao: 'Cabo de rede Cat6 PoE alimentando o Totem de Senhas',
  },
  {
    id: 'cx-atend-02',
    origemId: 'atend-rack-setor',
    destinoId: 'atend-workstations',
    tipo: 'rede',
    rotulo: 'Gigabit LAN + Elétrica UPS',
    descricao: 'Alimentação elétrica e dados dos guichês 1 a 6',
  },
  {
    id: 'cx-atend-03',
    origemId: 'atend-rack-setor',
    destinoId: 'atend-impressoras',
    tipo: 'rede',
    rotulo: 'Fila de Impressão Segura',
    descricao: 'Comunicação direta com as impressoras térmicas e departamentais',
  },

  // Setor Interno Frente: do Rack Setorial para equipamentos
  {
    id: 'cx-frente-01',
    origemId: 'frente-rack-setor',
    destinoId: 'frente-workstations',
    tipo: 'rede',
    rotulo: 'VLAN 30 + Nobreak Setor',
    descricao: '8 estações com duplo monitor ligadas ao switch e nobreak do setor',
  },
  {
    id: 'cx-frente-02',
    origemId: 'frente-rack-setor',
    destinoId: 'frente-impressoras',
    tipo: 'rede',
    rotulo: 'Fila Departamental',
    descricao: 'Impressora laser multifuncional colorida A3/A4',
  },

  // Setor Interno Fundo: do Rack Setorial para equipamentos
  {
    id: 'cx-fundo-01',
    origemId: 'fundo-rack-setor',
    destinoId: 'fundo-workstations',
    tipo: 'rede',
    rotulo: 'VLAN 40 + Nobreak Setor',
    descricao: '6 estações de digitalização e scanners profissionais de alta velocidade',
  },
  {
    id: 'cx-fundo-02',
    origemId: 'fundo-rack-setor',
    destinoId: 'fundo-impressoras',
    tipo: 'rede',
    rotulo: 'Fila Livros / Acervo',
    descricao: 'Impressora departamental Kyocera TASKalfa com acabamento de livros',
  },
]

export const CAMADA_PROTECAO_SOBREPOSTA = {
  titulo: 'Camada de Proteção e Monitoramento Sobreposta',
  subtitulo: 'Superfície de defesa lógica e resiliência 24/7 cobrindo todo o ecossistema',
  itens: [
    {
      nome: 'Firewall NGFW Perimetral',
      status: 'ativo',
      descricao:
        'Inspeção profunda de pacotes (DPI), prevenção de intrusão (IPS) e VPN IPsec para suporte remoto seguro.',
      badge: 'Defesa de Borda',
    },
    {
      nome: 'EDR / Antivírus de Próxima Geração',
      status: 'ativo',
      descricao:
        'Agente corporativo ativo em 100% das estações (balcão, setores e diretoria) com isolamento automático.',
      badge: 'Endpoint Security',
    },
    {
      nome: 'NOC / Monitoramento 24x7',
      status: 'ativo',
      descricao:
        'Telemetria contínua de nobreaks, links de internet, temperatura da sala de servidores e status dos hosts.',
      badge: 'Vigilância 24x7',
    },
    {
      nome: 'Backups Criptografados (3-2-1-1-0)',
      status: 'ativo',
      descricao:
        'Rotinas a cada 30 minutos em storage local SAN + cópia externa imutável na nuvem com retenção de 5 anos.',
      badge: 'Continuidade',
    },
  ],
}
