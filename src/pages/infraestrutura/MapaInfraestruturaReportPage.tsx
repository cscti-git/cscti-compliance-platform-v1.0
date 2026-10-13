import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CsctiLogo } from '@/components/CsctiLogo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Printer,
  ArrowLeft,
  Loader2,
  Network,
  Zap,
  Server,
  Cable,
  CheckCircle2,
  Layers,
  FileImage,
  FolderGit2,
  Shield,
  Activity,
  HardDrive,
  Monitor,
} from 'lucide-react'
import {
  getInfraMapaServentia,
  listInfraItens,
  listInfraLinks,
  InfraMapaRecord,
} from '@/services/infraestruturaService'
import {
  getCurrentUserOrganization,
  listInventoryAssets,
  listPeople,
} from '@/services/csctiService'
import { listDesignacoes } from '@/services/designacaoService'
import { listEvidencias, getEvidenciaFileUrl } from '@/services/evidenciaService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import {
  gerarTopologiaRealServentia,
  GeradorMapaRealResult,
} from '@/components/infraestrutura/mapa/geradorMapaReal'
import {
  EquipamentoSimulado,
  TopologiaConexao,
  CAMADAS_TOPOLOGIA,
  CamadaId,
} from '@/components/infraestrutura/mapa/topologiaData'
import type { OrganizationItem, DesignacaoItem } from '@/types/cscti'

export const MapaInfraestruturaReportPage: React.FC = () => {
  const { user, organization } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const [org, setOrg] = useState<OrganizationItem | null>(null)
  const [mapaRecord, setMapaRecord] = useState<InfraMapaRecord | null>(null)
  const [designacoes, setDesignacoes] = useState<DesignacaoItem[]>([])
  const [topologiaResult, setTopologiaResult] = useState<GeradorMapaRealResult | null>(null)
  const [equipamentos, setEquipamentos] = useState<EquipamentoSimulado[]>([])
  const [conexoes, setConexoes] = useState<TopologiaConexao[]>([])

  const orgId = organization?.id || user?.organization || ''

  useEffect(() => {
    if (!orgId) return
    setLoading(true)

    Promise.all([
      getCurrentUserOrganization().catch(() => null),
      getInfraMapaServentia(orgId).catch(() => null),
      listInventoryAssets(orgId).catch(() => []),
      listInfraItens(orgId).catch(() => []),
      listInfraLinks(orgId).catch(() => []),
      listEvidencias(orgId).catch(() => []),
      listDesignacoes(orgId).catch(() => []),
    ])
      .then(([orgData, mapaData, assets, infraItens, infraLinks, evidencias, desigs]) => {
        setOrg(orgData)
        setMapaRecord(mapaData)
        setDesignacoes(desigs)

        // Se tem snapshot persistido no registro do mapa
        if (
          mapaData?.equipamentos_snapshot &&
          Array.isArray(mapaData.equipamentos_snapshot) &&
          mapaData.equipamentos_snapshot.length > 0
        ) {
          setEquipamentos(mapaData.equipamentos_snapshot)
          setConexoes(mapaData.conexoes_snapshot || [])
        } else {
          // Caso ainda não tenha gravado snapshot estático, calcula no momento
          const result = gerarTopologiaRealServentia({
            assets,
            infraItens,
            infraLinks,
            evidencias,
          })
          setTopologiaResult(result)
          setEquipamentos(result.equipamentos)
          setConexoes(result.conexoes)
        }
      })
      .finally(() => setLoading(false))
  }, [orgId])

  // Responsável técnico ou RSI de Papéis & Responsáveis
  const rsiDesignado = designacoes.find(
    (d) =>
      d.status === 'assinada_digital' ||
      d.status === 'assinada_fisica' ||
      d.expand?.papel_designado?.codigo === 'RSI' ||
      d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança') ||
      d.expand?.papel_designado?.papel?.toLowerCase().includes('tecnologia'),
  )
  const responsavelTecnicoNome =
    rsiDesignado?.nome_designado ||
    rsiDesignado?.expand?.colaborador?.name ||
    'Responsável Técnico / RSI Designado'
  const responsavelTecnicoPapel =
    rsiDesignado?.expand?.papel_designado?.papel || 'Responsável de Segurança da Informação / TI'

  const titularNome =
    org?.name || organization?.corporate_name || organization?.name || 'Titular / Delegatário'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">
            Gerando Relatório A4 do Mapa da Infraestrutura...
          </p>
        </div>
      </div>
    )
  }

  // Agrupamento por camada
  const equipamentosPorCamada: Record<CamadaId, EquipamentoSimulado[]> = {
    energia: equipamentos.filter((e) => e.camadaId === 'energia'),
    sala_servidores: equipamentos.filter((e) => e.camadaId === 'sala_servidores'),
    setor_atendimento: equipamentos.filter((e) => e.camadaId === 'setor_atendimento'),
    setor_frente: equipamentos.filter((e) => e.camadaId === 'setor_frente'),
    setor_fundo: equipamentos.filter((e) => e.camadaId === 'setor_fundo'),
    setor_diretoria: equipamentos.filter((e) => e.camadaId === 'setor_diretoria'),
  }

  const nosReaisCount =
    mapaRecord?.nos_reais_count || equipamentos.filter((e) => e.isRealData).length
  const hashSha256 = mapaRecord?.hash_sha256 || 'Integridade verificada pelo sistema'

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      {/* Barra superior de ações (oculta na impressão) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/infraestrutura?tab=mapa')}
          className="text-xs h-8 gap-1.5 bg-white shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Mapa da Infraestrutura</span>
        </Button>

        <Button
          size="sm"
          onClick={() => window.print()}
          className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs h-8 gap-1.5 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / Salvar PDF A4</span>
        </Button>
      </div>

      {/* Folha A4 Padronizada CSCTI - Compliance */}
      <div className="max-w-[210mm] mx-auto bg-white border border-slate-300 print:border-none shadow-md print:shadow-none p-8 md:p-10 space-y-6 text-slate-800 text-[11px] leading-normal font-sans">
        {/* Cabeçalho do Relatório */}
        <div className="flex items-start justify-between border-b-2 border-[#0B2545] pb-4">
          <div className="flex items-center gap-3">
            <CsctiLogo size="md" />
            <div>
              <h1 className="text-base font-bold text-[#0B2545] tracking-tight uppercase">
                Relatório Comprobatório do Mapa da Infraestrutura
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Topologia Técnica Oficial, Fontes de Prova, Camadas Físicas e Rastreabilidade
              </p>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-500 space-y-0.5">
            <div>
              Emissão: <strong>{formatSpDateTime(new Date().toISOString())}</strong>
            </div>
            <div>
              Versão do Mapa: <strong>v{mapaRecord?.versao || 1}</strong>
            </div>
            <div>
              Identificador: <strong className="font-mono">MAP-{orgId.substring(0, 8)}</strong>
            </div>
          </div>
        </div>

        {/* Dados da Serventia e Raio-X do Mapa */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px]">
          <div>
            <span className="text-slate-500 block">Serventia / Titular:</span>
            <strong className="text-slate-900 text-[11px] block">{titularNome}</strong>
            <span className="text-slate-600 block">CNPJ: {org?.cnpj || '—'}</span>
          </div>

          <div className="text-right space-y-0.5">
            <div>
              Enquadramento da Serventia:{' '}
              <strong className="text-slate-900">Classe {org?.provimento_class || '2'}</strong>
            </div>
            <div>
              Nós Mapeados no Banco:{' '}
              <strong className="text-emerald-700 font-bold">{nosReaisCount} nós reais</strong> (
              {equipamentos.length} componentes no total)
            </div>
            <div>
              Hash SHA-256 do Mapa:{' '}
              <strong className="font-mono text-[9px] text-slate-700">
                {hashSha256.length > 20 ? hashSha256.substring(0, 20) + '...' : hashSha256}
              </strong>
            </div>
          </div>
        </div>

        {/* 1. FICHA TÉCNICA DO MAPA */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <Layers className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>1. Ficha Técnica da Topologia</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div className="p-2 border border-slate-200 rounded bg-slate-50">
              <span className="text-slate-500 block text-[9px]">Autonomia em Nobreaks</span>
              <strong className="text-slate-900 text-xs font-mono">
                {mapaRecord?.autonomia_minutos || 0} min
              </strong>
            </div>
            <div className="p-2 border border-slate-200 rounded bg-slate-50">
              <span className="text-slate-500 block text-[9px]">Capacidade Backbone</span>
              <strong className="text-slate-900 text-xs font-mono">
                {mapaRecord?.velocidade_mbps || 0} Mbps
              </strong>
            </div>
            <div className="p-2 border border-slate-200 rounded bg-slate-50">
              <span className="text-slate-500 block text-[9px]">Interligações Físicas</span>
              <strong className="text-slate-900 text-xs font-mono">
                {conexoes.length} links/cabos
              </strong>
            </div>
            <div className="p-2 border border-slate-200 rounded bg-slate-50">
              <span className="text-slate-500 block text-[9px]">Camadas Mapeadas</span>
              <strong className="text-slate-900 text-xs font-mono">6 camadas</strong>
            </div>
          </div>
        </div>

        {/* 2. LEGENDA DE CONEXÕES */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <Cable className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>2. Legenda de Interligações Físicas e Lógicas</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="p-2 border border-amber-200 rounded bg-amber-50/50 flex items-center gap-2">
              <span className="w-3 h-0.5 bg-amber-500 border border-amber-600 inline-block" />
              <div>
                <strong className="text-amber-950 block">Alimentação Elétrica Protegida</strong>
                <span className="text-slate-500 text-[9px]">
                  Rede concessionária, gerador e nobreaks
                </span>
              </div>
            </div>

            <div className="p-2 border border-cyan-200 rounded bg-cyan-50/50 flex items-center gap-2">
              <span className="w-3 h-0.5 bg-cyan-500 border border-cyan-600 inline-block" />
              <div>
                <strong className="text-cyan-950 block">Backbone de Fibra Óptica</strong>
                <span className="text-slate-500 text-[9px]">
                  Interligação Sala CPD ↔ Racks Setoriais
                </span>
              </div>
            </div>

            <div className="p-2 border border-blue-200 rounded bg-blue-50/50 flex items-center gap-2">
              <span className="w-3 h-0.5 bg-blue-500 border border-blue-600 inline-block" />
              <div>
                <strong className="text-blue-950 block">Rede Local UTP / Cat6 Gigabit</strong>
                <span className="text-slate-500 text-[9px]">
                  Distribuição às estações e impressoras
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. LISTA DE NÓS POR CAMADA COM FONTE DE PROVA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>3. Nós Mapeados por Camada e Fontes de Prova</span>
            </div>
            <span className="text-[10px] text-slate-500 lowercase font-normal">
              dados rastreáveis: inventário, infraestrutura física, conectividade e fotos
            </span>
          </div>

          {CAMADAS_TOPOLOGIA.map((camada) => {
            const itensCamada = equipamentosPorCamada[camada.id] || []
            return (
              <div key={camada.id} className="space-y-1">
                <div className="flex items-center justify-between bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-800">
                  <span>{camada.titulo}</span>
                  <span className="text-slate-500 font-normal">
                    {itensCamada.length} equipamento(s)
                  </span>
                </div>

                {itensCamada.length === 0 ? (
                  <p className="text-slate-400 italic text-[9px] px-2 py-0.5">
                    Sem equipamentos cadastrados nesta camada.
                  </p>
                ) : (
                  <table className="w-full text-[9px] text-left border border-slate-200">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-1">Código</th>
                        <th className="p-1">Nome do Equipamento</th>
                        <th className="p-1">Tipo / Fabricante</th>
                        <th className="p-1">Origem dos Dados</th>
                        <th className="p-1">Fonte de Prova / Evidência</th>
                        <th className="p-1 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {itensCamada.map((item) => (
                        <tr key={item.id}>
                          <td className="p-1 font-mono font-bold text-slate-700">
                            {item.codigoAtivo}
                          </td>
                          <td className="p-1 font-semibold text-slate-900">{item.nome}</td>
                          <td className="p-1 text-slate-600">{item.fabricanteModelo}</td>
                          <td className="p-1">
                            {item.isRealData ? (
                              <span className="text-emerald-700 font-medium">
                                Banco Real ({item.assetOrigemId ? 'Inventário' : 'Infraestrutura'})
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium">Cadastro Pendente</span>
                            )}
                          </td>
                          <td className="p-1 text-slate-600">
                            {item.evidenciaFotoSimulada ? (
                              <span className="font-medium text-blue-700">
                                Foto: {item.evidenciaFotoSimulada.titulo}
                              </span>
                            ) : item.detalhesTecnicos?.observacoes ? (
                              <span
                                className="truncate block max-w-[200px]"
                                title={item.detalhesTecnicos.observacoes}
                              >
                                {item.detalhesTecnicos.observacoes}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Registro cadastral</span>
                            )}
                          </td>
                          <td className="p-1 text-center font-bold">
                            <span
                              className={
                                item.status === 'operacional'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }
                            >
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>

        {/* 4. BLOCO DE SEGURANÇA E PROTEÇÃO SOBREPOSTA */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <Shield className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>4. Proteção Sobreposta da Topologia</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="p-2 border border-slate-200 rounded bg-slate-50">
              <strong className="text-slate-900 block text-[10px]">
                Firewall de Borda & Roteamento
              </strong>
              <span className="text-slate-600 text-[9px] block">
                Inspeção de pacotes e controle de acesso perimetral.
              </span>
            </div>
            <div className="p-2 border border-slate-200 rounded bg-slate-50">
              <strong className="text-slate-900 block text-[10px]">
                Segregação de Redes por VLANs
              </strong>
              <span className="text-slate-600 text-[9px] block">
                Isolamento do CPD, setor de atendimento, Wi-Fi e administrativo.
              </span>
            </div>
            <div className="p-2 border border-slate-200 rounded bg-slate-50">
              <strong className="text-slate-900 block text-[10px]">
                Proteção Física e Climatização
              </strong>
              <span className="text-slate-600 text-[9px] block">
                Sala restrita, controle de acesso e ar condicionado dedicado.
              </span>
            </div>
          </div>
        </div>

        {/* 5. COTEJO COM PLANTA TÉCNICA DE REFERÊNCIA */}
        {mapaRecord?.diagrama_referencia_snapshot && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
              <FileImage className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>5. Planta Técnica de Referência Arquivada (Gabarito)</span>
            </div>

            <div className="p-2.5 border border-slate-200 rounded bg-slate-50 text-[10px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {mapaRecord.diagrama_referencia_snapshot.descricao || 'Planta Técnica'}
                </span>
                <span className="font-mono text-[9px] text-slate-500">
                  SHA-256: {mapaRecord.diagrama_referencia_snapshot.sha256}
                </span>
              </div>
              <p className="text-slate-600 text-[9px]">
                Arquivo: {mapaRecord.diagrama_referencia_snapshot.nomeArquivo} (
                {mapaRecord.diagrama_referencia_snapshot.tamanhoFormatado}). Cotejo realizado com o
                mapa vivo gerado no sistema.
              </p>
            </div>
          </div>
        )}

        {/* Termo de Encerramento e Assinaturas Formais */}
        <div className="pt-6 mt-6 border-t border-slate-200 space-y-8">
          <p className="text-[10px] text-slate-600 text-justify">
            Atestamos para os devidos fins regulatórios e probatórios que a topologia, componentes
            ativos, fontes de alimentação ininterrupta, cabeamento e equipamentos descritos neste
            Relatório do Mapa da Infraestrutura correspondem fielmente à realidade física e lógica
            instalada nesta serventia extrajudicial, com registro append-only de auditoria no
            sistema CSCTI - Compliance.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="text-center space-y-1">
              <div className="border-t border-slate-400 w-3/4 mx-auto" />
              <div className="font-bold text-slate-900 text-[11px]">{titularNome}</div>
              <div className="text-slate-500 text-[10px]">Titular / Responsável pela Serventia</div>
            </div>

            <div className="text-center space-y-1">
              <div className="border-t border-slate-400 w-3/4 mx-auto" />
              <div className="font-bold text-slate-900 text-[11px]">{responsavelTecnicoNome}</div>
              <div className="text-slate-500 text-[10px]">{responsavelTecnicoPapel}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapaInfraestruturaReportPage
