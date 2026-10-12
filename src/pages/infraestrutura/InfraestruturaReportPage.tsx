import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CsctiLogo } from '@/components/CsctiLogo'
import {
  listInfraItens,
  listInfraLinks,
  listInfraChecklist,
  confrontarConectividade,
  analisarAtivosEol,
  consolidarInfraRaioX,
} from '@/services/infraestruturaService'
import {
  getCurrentUserOrganization,
  listPeople,
  listInventoryAssets,
} from '@/services/csctiService'
import { listDesignacoes } from '@/services/designacaoService'
import { getEvidenciaFileUrl } from '@/services/evidenciaService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import {
  Zap,
  Building,
  Wifi,
  Cpu,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  ArrowLeft,
  Loader2,
  FolderGit2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import type {
  InfraItem,
  InfraLinkItem,
  InfraChecklistItem,
  InventoryAssetItem,
  OrganizationItem,
  PersonItem,
  DesignacaoItem,
} from '@/types/cscti'

export const InfraestruturaReportPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const [org, setOrg] = useState<OrganizationItem | null>(null)
  const [itens, setItens] = useState<InfraItem[]>([])
  const [links, setLinks] = useState<InfraLinkItem[]>([])
  const [checklist, setChecklist] = useState<InfraChecklistItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [people, setPeople] = useState<PersonItem[]>([])
  const [designacoes, setDesignacoes] = useState<DesignacaoItem[]>([])

  const orgId = user?.organization || ''

  useEffect(() => {
    if (!orgId) return
    setLoading(true)

    Promise.all([
      getCurrentUserOrganization().catch(() => null),
      listInfraItens(orgId),
      listInfraLinks(orgId),
      listInfraChecklist(orgId),
      listInventoryAssets(orgId).catch(() => []),
      listPeople(orgId).catch(() => []),
      listDesignacoes(orgId).catch(() => []),
    ])
      .then(([o, it, lk, chk, ass, ppl, des]) => {
        setOrg(o)
        setItens(it)
        setLinks(lk)
        setChecklist(chk)
        setAssets(ass)
        setPeople(ppl)
        setDesignacoes(des)
      })
      .finally(() => setLoading(false))
  }, [orgId])

  const confronto = confrontarConectividade(org, links)
  const eolAnalisados = analisarAtivosEol(assets)
  const raioX = consolidarInfraRaioX(org, itens, links, checklist, assets)

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
    'Responsável Técnico Designado'
  const responsavelTecnicoPapel =
    rsiDesignado?.expand?.papel_designado?.papel || 'Responsável de Segurança da Informação / TI'

  const energiaItens = itens.filter((i) => i.categoria === 'energia')
  const ambienteItens = itens.filter((i) => i.categoria === 'ambiente_fisico')
  const criptoItens = itens.filter((i) => i.categoria === 'camada_logica')

  const getStatusText = (st: string) => {
    switch (st) {
      case 'conforme':
        return 'CONFORME'
      case 'parcial':
        return 'PARCIAL'
      case 'nao_conforme':
        return 'NÃO CONFORME'
      default:
        return 'PENDENTE'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">
            Gerando Relatório de Infraestrutura Física e Lógica...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      {/* Barra superior de ações (oculta na impressão) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/infraestrutura')}
          className="text-xs h-8 gap-1.5 bg-white shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Módulo</span>
        </Button>

        <Button
          size="sm"
          onClick={() => window.print()}
          className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs h-8 gap-1.5 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / Salvar PDF</span>
        </Button>
      </div>

      {/* Folha A4 Padronizada */}
      <div className="max-w-[210mm] mx-auto bg-white border border-slate-300 print:border-none shadow-md print:shadow-none p-8 md:p-10 space-y-6 text-slate-800 text-[11px] leading-normal font-sans">
        {/* Cabeçalho do Relatório */}
        <div className="flex items-start justify-between border-b-2 border-[#0B2545] pb-4">
          <div className="flex items-center gap-3">
            <CsctiLogo size="md" />
            <div>
              <h1 className="text-base font-bold text-[#0B2545] tracking-tight uppercase">
                Relatório Comprobatório de Infraestrutura Física e Lógica
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Dossiê Técnico do Ambiente Físico, Redundância Elétrica, Conectividade e Camada
                Lógica
              </p>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-500 space-y-0.5">
            <div>
              Emissão: <strong>{formatSpDateTime(new Date().toISOString())}</strong>
            </div>
            <div>
              Identificador: <strong className="font-mono">INF-{org?.id?.substring(0, 8)}</strong>
            </div>
          </div>
        </div>

        {/* Dados da Serventia e Raio-X */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px]">
          <div>
            <span className="text-slate-500 block">Serventia / Titular:</span>
            <strong className="text-slate-900 text-[11px] block">{org?.name || 'Serventia'}</strong>
            <span className="text-slate-600 block">CNPJ: {org?.cnpj || '—'}</span>
          </div>

          <div className="text-right space-y-0.5">
            <div>
              Enquadramento da Serventia:{' '}
              <strong className="text-slate-900">Classe {org?.provimento_class || '2'}</strong>
            </div>
            <div>
              Índice Geral de Conformidade do Ambiente:{' '}
              <strong className="text-emerald-700 font-bold">
                {raioX.percentualConformidade}%
              </strong>{' '}
              ({raioX.itensConformes}/{raioX.totalItens} conformes)
            </div>
            <div>
              Conexão com a Internet:{' '}
              <strong
                className={
                  confronto.statusGeral === 'conforme' ? 'text-emerald-700' : 'text-amber-700'
                }
              >
                {confronto.velocidadeTotalAtivaMbps} Mbps ({confronto.statusGeral.toUpperCase()})
              </strong>
            </div>
          </div>
        </div>

        {/* 1. SEÇÃO ENERGIA ELÉTRICA E REDUNDÂNCIA */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <Zap className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>1. Energia Elétrica e Redundância</span>
          </div>

          {energiaItens.length === 0 ? (
            <p className="text-slate-500 italic text-[10px]">
              Nenhum equipamento elétrico cadastrado.
            </p>
          ) : (
            <table className="w-full text-[10px] text-left border border-slate-200">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-1.5">Equipamento / Documento</th>
                  <th className="p-1.5">Especificações Técnicas</th>
                  <th className="p-1.5">Responsável / ART</th>
                  <th className="p-1.5">Hash SHA-256</th>
                  <th className="p-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {energiaItens.map((it) => (
                  <tr key={it.id}>
                    <td className="p-1.5 font-semibold text-slate-900">
                      {it.titulo}
                      <span className="block text-[9px] text-slate-500">{it.tipo_item}</span>
                    </td>
                    <td className="p-1.5">
                      {it.modelo && <div>Modelo: {it.modelo}</div>}
                      {it.autonomia_minutos && (
                        <div>
                          Autonomia: <strong>{it.autonomia_minutos} min</strong>
                        </div>
                      )}
                      {it.potencia_va && <div>Potência: {it.potencia_va} VA</div>}
                    </td>
                    <td className="p-1.5">
                      {it.art_numero && <div>ART: {it.art_numero}</div>}
                      {it.responsavel_tecnico && <div>Eng: {it.responsavel_tecnico}</div>}
                      {it.data_validade && (
                        <div>Validade: {formatSpDateOnly(it.data_validade)}</div>
                      )}
                    </td>
                    <td className="p-1.5 font-mono text-[9px] text-slate-500">
                      {it.hash_sha256 ? it.hash_sha256.substring(0, 16) + '...' : '—'}
                    </td>
                    <td className="p-1.5 text-center font-bold">
                      <span
                        className={
                          it.status === 'conforme'
                            ? 'text-emerald-700'
                            : it.status === 'parcial'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                        }
                      >
                        {getStatusText(it.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 2. SEÇÃO AMBIENTE FÍSICO */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <Building className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>2. Ambiente Físico, Climatização e Segurança Patrimonial</span>
          </div>

          {ambienteItens.length === 0 ? (
            <p className="text-slate-500 italic text-[10px]">Nenhum controle físico cadastrado.</p>
          ) : (
            <table className="w-full text-[10px] text-left border border-slate-200">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-1.5">Controle / Equipamento</th>
                  <th className="p-1.5">Características</th>
                  <th className="p-1.5">Redundância / Validade</th>
                  <th className="p-1.5">Evidência Vinculada</th>
                  <th className="p-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ambienteItens.map((it) => (
                  <tr key={it.id}>
                    <td className="p-1.5 font-semibold text-slate-900">
                      {it.titulo}
                      <span className="block text-[9px] text-slate-500">{it.tipo_item}</span>
                    </td>
                    <td className="p-1.5">
                      {it.tipo_controle_acesso && <div>Acesso: {it.tipo_controle_acesso}</div>}
                      {it.descricao && <div>{it.descricao}</div>}
                    </td>
                    <td className="p-1.5">
                      {it.redundancia_instalada !== undefined && (
                        <div>Redundância: {it.redundancia_instalada ? 'Sim' : 'Não'}</div>
                      )}
                      {it.data_vencimento_extintor && (
                        <div>Carga extintor: {formatSpDateOnly(it.data_vencimento_extintor)}</div>
                      )}
                    </td>
                    <td className="p-1.5 text-slate-600">
                      {it.expand?.evidencia_vinculada ? (
                        <span>{it.expand.evidencia_vinculada.titulo}</span>
                      ) : (
                        <span className="italic text-slate-400">Pendente de foto</span>
                      )}
                    </td>
                    <td className="p-1.5 text-center font-bold">
                      <span
                        className={
                          it.status === 'conforme'
                            ? 'text-emerald-700'
                            : it.status === 'parcial'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                        }
                      >
                        {getStatusText(it.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. SEÇÃO CONECTIVIDADE E CONFRONTO POR CLASSE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>3. Conectividade e Confronto de Links</span>
            </div>
            <div className="text-[10px] font-normal lowercase">
              classe {confronto.classeServentia}: exige mín.{' '}
              <strong>{confronto.velocidadeExigidaMbps} Mbps</strong> · total ativo:{' '}
              <strong>{confronto.velocidadeTotalAtivaMbps} Mbps</strong>
            </div>
          </div>

          <table className="w-full text-[10px] text-left border border-slate-200">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-1.5">Operadora / Circuito</th>
                <th className="p-1.5">Velocidade</th>
                <th className="p-1.5">Tipo / Meio</th>
                <th className="p-1.5">Função</th>
                <th className="p-1.5">Confronto com a Classe</th>
                <th className="p-1.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-400">
                    Nenhum link de internet cadastrado.
                  </td>
                </tr>
              ) : (
                links.map((link) => {
                  const atende = link.velocidade_mbps >= confronto.velocidadeExigidaMbps
                  return (
                    <tr key={link.id}>
                      <td className="p-1.5 font-semibold text-slate-900">
                        {link.operadora}
                        {link.circuito_id && (
                          <span className="block text-[9px] text-slate-500 font-mono">
                            ID: {link.circuito_id}
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 font-bold font-mono text-slate-900">
                        {link.velocidade_mbps} Mbps
                      </td>
                      <td className="p-1.5 capitalize">
                        {link.tipo_link} ({link.meio_transmissao?.replace(/_/g, ' ') || 'fibra'})
                      </td>
                      <td className="p-1.5">{link.redundancia ? 'Redundância' : 'Principal'}</td>
                      <td className="p-1.5">
                        <span
                          className={
                            atende ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'
                          }
                        >
                          {atende ? 'Atende ao Mínimo' : 'Abaixo do Exigido'}
                        </span>
                      </td>
                      <td className="p-1.5 text-center font-bold">
                        <span
                          className={
                            link.status === 'ativo' ? 'text-emerald-700' : 'text-slate-500'
                          }
                        >
                          {link.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. SEÇÃO CAMADA LÓGICA E ATIVOS EOL DO INVENTÁRIO REAL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>4. Camada Lógica: Suporte de Sistemas Operacionais (EOL)</span>
            </div>
            <div className="text-[10px] font-normal lowercase">
              {raioX.ativosEolTotal === 0
                ? 'todos os ativos com suporte oficial'
                : `${raioX.ativosEolTotal} ativo(s) sem suporte / EOL`}
            </div>
          </div>

          <table className="w-full text-[10px] text-left border border-slate-200">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-1.5">Ativo (Inventário Real)</th>
                <th className="p-1.5">Tipo</th>
                <th className="p-1.5">Sistema Operacional</th>
                <th className="p-1.5">Fim de Suporte</th>
                <th className="p-1.5 text-center">Situação EOL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {eolAnalisados.slice(0, 15).map((e) => (
                <tr key={e.ativo.id}>
                  <td className="p-1.5 font-medium text-slate-900">{e.ativo.name}</td>
                  <td className="p-1.5 capitalize text-slate-600">{e.ativo.tipo}</td>
                  <td className="p-1.5">
                    {e.sistemaOperacional} {e.versaoSo !== '—' && `(${e.versaoSo})`}
                  </td>
                  <td className="p-1.5 text-slate-600">
                    {e.dataFimSuporte ? e.dataFimSuporte.substring(0, 10) : '—'}
                  </td>
                  <td className="p-1.5 text-center font-bold">
                    <span
                      className={
                        e.eolStatus === 'suportado'
                          ? 'text-emerald-700'
                          : e.eolStatus === 'mitigado'
                            ? 'text-blue-700'
                            : 'text-rose-700'
                      }
                    >
                      {e.eolStatus.toUpperCase().replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. CHECKLIST SINTÉTICO DO AMBIENTE */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <ListChecks className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>5. Checklist de Requisitos Neutros do Ambiente</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {checklist.map((chk) => (
              <div
                key={chk.id}
                className="p-1.5 border border-slate-200 rounded flex items-center justify-between gap-2"
              >
                <div className="truncate">
                  <span className="font-mono font-bold text-slate-500 mr-1">{chk.codigo}</span>
                  <span className="text-slate-800 font-medium">{chk.item_nome}</span>
                </div>
                <span
                  className={`font-bold shrink-0 text-[9px] ${
                    chk.status === 'conforme'
                      ? 'text-emerald-700'
                      : chk.status === 'parcial'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                  }`}
                >
                  {getStatusText(chk.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. GALERIA DE FOTOS E EVIDÊNCIAS PROBATÓRIAS (MINIATURAS) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <FolderGit2 className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>6. Galeria Fotográfica Comprobatória (Central de Evidências)</span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {itens
              .filter(
                (it) =>
                  it.expand?.evidencia_vinculada?.arquivos &&
                  it.expand.evidencia_vinculada.arquivos.length > 0,
              )
              .slice(0, 8)
              .map((it) => {
                const ev = it.expand!.evidencia_vinculada!
                const fileUrl = getEvidenciaFileUrl(ev, ev.arquivos![0], '300x200')
                return (
                  <div
                    key={it.id}
                    className="border border-slate-200 rounded-lg p-1.5 text-center space-y-1 bg-slate-50"
                  >
                    <img
                      src={fileUrl}
                      alt={it.titulo}
                      className="w-full h-20 object-cover rounded border border-slate-200"
                    />
                    <div className="font-bold text-[9px] text-slate-800 truncate" title={it.titulo}>
                      {it.titulo}
                    </div>
                    <div className="text-[8px] text-slate-500 truncate">{ev.categoria_nome}</div>
                  </div>
                )
              })}
          </div>
          {itens.filter((it) => it.expand?.evidencia_vinculada?.arquivos?.length).length === 0 && (
            <p className="text-slate-400 italic text-[10px]">
              Nenhuma evidência fotográfica vinculada aos registros de infraestrutura no momento.
            </p>
          )}
        </div>

        {/* Termo de Encerramento e Assinaturas */}
        <div className="pt-8 mt-6 border-t border-slate-200 space-y-8">
          <p className="text-[10px] text-slate-600 text-justify">
            Atestamos que os dados, fotos, laudos técnicos com ART e parâmetros de conectividade
            apresentados neste relatório refletem com fidelidade o ambiente físico e a camada lógica
            instalados nesta serventia extrajudicial, com registro append-only de auditoria no
            sistema CSCTI - Compliance.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="text-center space-y-1">
              <div className="border-t border-slate-400 w-3/4 mx-auto" />
              <div className="font-bold text-slate-900 text-[11px]">
                {org?.name || 'Titular / Delegatário'}
              </div>
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

export default InfraestruturaReportPage
