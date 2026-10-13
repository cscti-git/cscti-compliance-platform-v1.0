import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Shield,
  FileCheck,
  Activity,
  ListChecks,
  AlertTriangle,
  Calendar,
  Lock,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { CsctiLogoMark } from '@/components/CsctiLogo'
import {
  listSegSolucoes,
  listSegCoberturasExigidas,
  listSegComprovantes,
  listSegItensConformidade,
  calcularCoberturaSeguranca,
} from '@/services/segurancaService'
import { listInventoryAssets, listPeople } from '@/services/csctiService'
import { listDesignacoes } from '@/services/designacaoService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import type {
  SegSolucaoItem,
  SegCoberturaExigidaItem,
  SegComprovanteItem,
  SegItemConformidadeItem,
  InventoryAssetItem,
  PersonItem,
  DesignacaoItem,
  SegurancaCoberturaCalculada,
} from '@/types/cscti'

export const SegurancaReportPage: React.FC = () => {
  const { organization } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Extrajudicial'
  const emissaoIso = useMemo(() => new Date().toISOString(), [])

  const [solucoes, setSolucoes] = useState<SegSolucaoItem[]>([])
  const [coberturasExigidas, setCoberturasExigidas] = useState<SegCoberturaExigidaItem[]>([])
  const [comprovantes, setComprovantes] = useState<SegComprovanteItem[]>([])
  const [itensConformidade, setItensConformidade] = useState<SegItemConformidadeItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [colaboradores, setColaboradores] = useState<PersonItem[]>([])
  const [designacoes, setDesignacoes] = useState<DesignacaoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      setLoading(true)
      try {
        const [solRes, cobRes, compRes, itensRes, assetsRes, peopleRes, desigRes] =
          await Promise.all([
            listSegSolucoes(orgId),
            listSegCoberturasExigidas(orgId),
            listSegComprovantes(orgId),
            listSegItensConformidade(orgId),
            listInventoryAssets(orgId),
            listPeople(orgId),
            listDesignacoes(orgId),
          ])

        setSolucoes(solRes)
        setCoberturasExigidas(cobRes)
        setComprovantes(compRes)
        setItensConformidade(itensRes)
        setAssets(assetsRes)
        setColaboradores(peopleRes)
        setDesignacoes(desigRes)
      } catch (err) {
        console.error('[SegurancaReportPage] Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId])

  // Responsável pela Segurança da Informação
  const responsavelSeguranca = useMemo(() => {
    return designacoes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'RESPONSAVEL_SEGURANCA' ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança da informação') ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança')) &&
        d.status !== 'revogada',
    )
  }, [designacoes])

  // Titular da Serventia
  const titular = useMemo(() => {
    return (
      designacoes.find(
        (d) => d.expand?.papel_designado?.codigo === 'TITULAR_TABELIAO' && d.status !== 'revogada',
      ) ||
      colaboradores.find(
        (c) =>
          c.role_title?.toLowerCase().includes('titular') ||
          c.role_title?.toLowerCase().includes('tabeliã') ||
          c.role_title?.toLowerCase().includes('oficial'),
      )
    )
  }, [designacoes, colaboradores])

  const coberturaCalculada: SegurancaCoberturaCalculada = useMemo(() => {
    return calcularCoberturaSeguranca(
      assets,
      solucoes,
      coberturasExigidas,
      comprovantes,
      itensConformidade,
    )
  }, [assets, solucoes, coberturasExigidas, comprovantes, itensConformidade])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Barra Superior com Controles de Impressão */}
      <div className="max-w-[840px] mx-auto mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link to="/seguranca">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-slate-300 bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Módulo Segurança</span>
          </Button>
        </Link>

        <Button
          onClick={handlePrint}
          size="sm"
          className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Exportar PDF</span>
        </Button>
      </div>

      {/* Folha A4 Oficial CSCTI */}
      <div className="max-w-[840px] mx-auto bg-white border border-slate-300 shadow-sm print:shadow-none print:border-none p-8 sm:p-10 space-y-6">
        {/* Cabeçalho Institucional Padrão */}
        <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CsctiLogoMark size={28} />
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2545]">
                CSCTI - Compliance
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Relatório de Segurança do Ambiente e Proteção Lógica
            </h1>
            <p className="text-xs text-slate-600">
              Confronto de Ativos, Cobertura de Endpoint, Firewall de Borda e Monitoramento SOC/NOC
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-600 space-y-0.5">
            <div>
              <strong>Emissão:</strong> {formatSpDateTime(emissaoIso)}
            </div>
            <div>
              <strong>Serventia:</strong> {orgName}
            </div>
            <div>
              <strong>Código do Relatório:</strong> SEG-AMB-
              {emissaoIso.substring(0, 10).replace(/-/g, '')}
            </div>
          </div>
        </div>

        {/* Quadro Institucional da Serventia e Responsável */}
        <div className="grid grid-cols-2 gap-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
              Serventia Notarial / Registral
            </span>
            <div className="font-bold text-slate-900">{orgName}</div>
            <div className="text-slate-600 text-[11px]">
              {organization?.city
                ? `${organization.city} - ${organization.state || 'UF'}`
                : 'Comarca competente'}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
              Responsável pela Segurança da Informação
            </span>
            <div className="font-bold text-slate-900">
              {responsavelSeguranca?.nome_designado || (
                <span className="text-amber-700 italic">Designação formal não vinculada</span>
              )}
            </div>
            <div className="text-slate-600 text-[11px]">
              {responsavelSeguranca?.email_designado ||
                'Aguardando registro em Papéis & Responsáveis'}
            </div>
          </div>
        </div>

        {/* Quadro Resumo Executivo */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Soluções Ativas
            </span>
            <span className="text-xl font-extrabold text-[#0B2545]">
              {coberturaCalculada.solucoesAtivasCount}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Cobertura Endpoint
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {coberturaCalculada.percentualCobertura}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {coberturaCalculada.comprovadasEndpoint} de {coberturaCalculada.exigidasEndpoint} máq.
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Checklist Conforme
            </span>
            <span className="text-xl font-extrabold text-blue-700">
              {coberturaCalculada.itensComprovadosCount} / {coberturaCalculada.itensTotalCount}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Firewall Perimetral
            </span>
            <span className="text-sm font-extrabold text-slate-800 block mt-1 capitalize">
              {coberturaCalculada.statusFirewallConsolidado === 'ativo'
                ? 'Operacional'
                : coberturaCalculada.statusFirewallConsolidado.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Seção 1: Catálogo de Soluções de Segurança Homologadas */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <Shield className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              1. Catálogo de Soluções de Proteção do Cliente
            </h2>
          </div>

          <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Solução / Software</th>
                <th className="p-2 border-b border-slate-200">Tipo de Proteção</th>
                <th className="p-2 border-b border-slate-200">Fabricante</th>
                <th className="p-2 border-b border-slate-200">Versão</th>
                <th className="p-2 border-b border-slate-200">Escopo</th>
                <th className="p-2 border-b border-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {solucoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                    Nenhuma solução de segurança registrada no catálogo.
                  </td>
                </tr>
              ) : (
                solucoes.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 font-semibold text-slate-900">{s.nome}</td>
                    <td className="p-2 capitalize">{s.tipo.replace('_', ' ')}</td>
                    <td className="p-2">{s.fornecedor || '—'}</td>
                    <td className="p-2">{s.versao || '—'}</td>
                    <td className="p-2 capitalize">
                      {s.escopo ? s.escopo.replace(/_/g, ' ') : 'Geral'}
                    </td>
                    <td className="p-2 capitalize font-medium">{s.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 2: Confronto de Cobertura e Tabela Nominal de Ativos */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <Activity className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              2. Confronto e Tabela Nominal de Cobertura por Ativo
            </h2>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Ativos com Proteção Exigida
                </span>
                <span className="text-base font-bold text-slate-800">
                  {coberturaCalculada.exigidasEndpoint} máquinas ({coberturaCalculada.estacoesCount}{' '}
                  estações, {coberturaCalculada.servidoresCount} servidores)
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Ativos Protegidos (Comprovados)
                </span>
                <span className="text-base font-bold text-emerald-700">
                  {coberturaCalculada.comprovadasEndpoint} de {coberturaCalculada.exigidasEndpoint}{' '}
                  ({coberturaCalculada.percentualCobertura}%)
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Sem Agente / Sem Comprovação
                </span>
                <span className="text-base font-bold text-amber-700">
                  {coberturaCalculada.semAgenteEndpoint} sem agente •{' '}
                  {coberturaCalculada.semComprovacaoEndpoint} sem laudo
                </span>
              </div>
            </div>

            {coberturaCalculada.semAgenteEndpoint > 0 && (
              <div className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 p-2 rounded">
                Atenção: Constam {coberturaCalculada.semAgenteEndpoint} máquina(s) sem agente ou
                desprotegidas no inventário ativo da serventia.
              </div>
            )}
          </div>

          {/* Tabela Nominal Máquina por Máquina */}
          <table className="w-full text-left text-[10px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[9px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Nome / Hostname</th>
                <th className="p-2 border-b border-slate-200">Tipo de Ativo</th>
                <th className="p-2 border-b border-slate-200">Origem</th>
                <th className="p-2 border-b border-slate-200">Exigência</th>
                <th className="p-2 border-b border-slate-200">Status de Proteção</th>
                <th className="p-2 border-b border-slate-200">Comprovante Vinculado</th>
                <th className="p-2 border-b border-slate-200">Data Documento</th>
                <th className="p-2 border-b border-slate-200">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-slate-400 italic">
                    Nenhum ativo registrado no inventário da serventia.
                  </td>
                </tr>
              ) : (
                assets.map((a) => {
                  const statusProt = a.endpoint_status || 'sem_comprovacao'
                  const compVinculado =
                    a.expand?.endpoint_comprovante ||
                    comprovantes.find((c) => c.id === a.endpoint_comprovante)

                  const dataDoc = compVinculado?.data_comprovante || a.endpoint_data_comprovacao
                  const hashDoc = compVinculado?.hash_sha256 || a.endpoint_hash_sha256

                  return (
                    <tr key={a.id}>
                      <td className="p-2 font-semibold text-slate-900">
                        <div>{a.name}</div>
                        {a.ip_address && (
                          <div className="text-[9px] text-slate-400 font-mono">{a.ip_address}</div>
                        )}
                      </td>
                      <td className="p-2 capitalize">{a.tipo.replace('_', ' ')}</td>
                      <td className="p-2">
                        {a.origem === 'glpi' ? (
                          <span className="font-semibold text-blue-700">
                            GLPI #{a.external_id || ''}
                          </span>
                        ) : (
                          <span className="text-slate-600">Manual</span>
                        )}
                      </td>
                      <td className="p-2">
                        {a.exige_endpoint_protection !== false ? (
                          <span className="text-slate-800 font-medium">Exigida</span>
                        ) : (
                          <span className="text-slate-400">Dispensada</span>
                        )}
                      </td>
                      <td className="p-2 font-bold">
                        {statusProt === 'protegido' ? (
                          <span className="text-emerald-700">Protegido</span>
                        ) : statusProt === 'sem_agente' ? (
                          <span className="text-rose-700">Sem Agente</span>
                        ) : (
                          <span className="text-amber-700">Sem Comprovação</span>
                        )}
                      </td>
                      <td className="p-2">
                        {compVinculado ? (
                          <span>
                            {compVinculado.expand?.solucao?.nome || 'Comprovante Console'} (
                            {compVinculado.tipo.replace('_', ' ')})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        {dataDoc ? (
                          formatSpDateOnly(dataDoc)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-[8px] text-slate-500 truncate max-w-[110px]">
                        {hashDoc ? `${hashDoc.substring(0, 16)}...` : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 3: Checklist do Ambiente */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <ListChecks className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              3. Checklist de Controles e Requisitos Neutros do Ambiente
            </h2>
          </div>

          <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Item de Controle</th>
                <th className="p-2 border-b border-slate-200">Categoria</th>
                <th className="p-2 border-b border-slate-200">Status</th>
                <th className="p-2 border-b border-slate-200">Prazo / Revisão</th>
                <th className="p-2 border-b border-slate-200">Comprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {itensConformidade.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-slate-400 italic">
                    Nenhum item de conformidade registrado.
                  </td>
                </tr>
              ) : (
                itensConformidade.map((it) => (
                  <tr key={it.id}>
                    <td className="p-2 font-semibold text-slate-900">
                      <div>{it.item_nome}</div>
                      {it.descricao && (
                        <div className="text-[10px] text-slate-500 font-normal">{it.descricao}</div>
                      )}
                    </td>
                    <td className="p-2 capitalize">{it.categoria.replace('_', ' ')}</td>
                    <td className="p-2 capitalize font-bold">
                      {it.status === 'comprovado' ? (
                        <span className="text-emerald-700">Comprovado</span>
                      ) : it.status === 'nao_conforme' ? (
                        <span className="text-rose-700">Não Conforme</span>
                      ) : (
                        <span className="text-amber-700">Pendente</span>
                      )}
                    </td>
                    <td className="p-2">{it.prazo ? formatSpDateOnly(it.prazo) : '—'}</td>
                    <td className="p-2 text-[10px]">
                      {it.expand?.comprovante_vinculado ? (
                        <span className="text-slate-700">
                          Laudo de{' '}
                          {formatSpDateOnly(it.expand.comprovante_vinculado.data_comprovante)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Pendente de laudo</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 4: Cronologia de Comprovantes Ingeridos */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <FileCheck className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              4. Cronologia de Comprovantes e Integridade (SHA-256)
            </h2>
          </div>

          <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Data Documento</th>
                <th className="p-2 border-b border-slate-200">Solução</th>
                <th className="p-2 border-b border-slate-200">Tipo</th>
                <th className="p-2 border-b border-slate-200">Máquinas Protegidas</th>
                <th className="p-2 border-b border-slate-200">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {comprovantes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-slate-400 italic">
                    Nenhum comprovante ingerido até a presente data.
                  </td>
                </tr>
              ) : (
                comprovantes.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 font-semibold text-slate-900">
                      {formatSpDateOnly(c.data_comprovante)}
                    </td>
                    <td className="p-2">{c.expand?.solucao?.nome || 'Geral'}</td>
                    <td className="p-2 capitalize">{c.tipo.replace('_', ' ')}</td>
                    <td className="p-2">
                      {c.maquinas_protegidas !== undefined
                        ? `${c.maquinas_protegidas} máquinas`
                        : '—'}
                    </td>
                    <td className="p-2 font-mono text-[9px] text-slate-600 truncate max-w-[150px]">
                      {c.hash_sha256 ? `${c.hash_sha256.substring(0, 24)}...` : 'Arquivo em nuvem'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Declaração de Conformidade e Campo de Assinatura */}
        <div className="pt-8 space-y-8">
          <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
            Certifico, para todos os efeitos de governança técnica, auditoria e compliance, que as
            soluções de endpoint security, firewalls perimetrais e rotinas de monitoramento
            operacional discriminadas neste laudo refletem o ambiente computacional real ativo e
            homologado na serventia, com registros imutáveis e comprovação auditável.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-6">
            <div className="text-center space-y-1">
              <div className="border-b border-slate-400 w-4/5 mx-auto pb-1 min-h-[30px] flex items-end justify-center font-bold text-xs text-slate-900">
                {responsavelSeguranca?.nome_designado || (
                  <span className="text-amber-800 italic">
                    Responsável pela Segurança da Informação
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Responsável pela Segurança da Informação
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="border-b border-slate-400 w-4/5 mx-auto pb-1 min-h-[30px] flex items-end justify-center font-bold text-xs text-slate-900">
                {(titular as any)?.nome_designado ||
                  (titular as any)?.name ||
                  'Titular / Responsável pela Serventia'}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Titular / Tabelião / Oficial Registrador
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SegurancaReportPage
