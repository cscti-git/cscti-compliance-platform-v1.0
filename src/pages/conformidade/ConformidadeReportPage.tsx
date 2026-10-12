import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Shield,
  FileCheck2,
  Calendar,
  Lock,
  Hash,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { CsctiLogoMark } from '@/components/CsctiLogo'
import {
  listConformidadeCatalogo,
  listConformidadeStatus,
  avaliarStatusModulosIntegrados,
  consolidarMatrizConformidade,
} from '@/services/conformidadeService'
import { listDesignacoes } from '@/services/designacaoService'
import { listPeople } from '@/services/csctiService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import type {
  ConformidadeItemCatalog,
  ConformidadeStatusItem,
  DesignacaoItem,
  PersonItem,
  MatrizConformidadeConsolidada,
  EtapaConformidadeResumo,
} from '@/types/cscti'

export const ConformidadeReportPage: React.FC = () => {
  const { organization } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Notarial e Registral'
  const emissaoIso = useMemo(() => new Date().toISOString(), [])

  const [searchParams] = useSearchParams()
  const etapaParam = searchParams.get('etapa') // '1' a '6' ou null (todas)

  const [catalogo, setCatalogo] = useState<ConformidadeItemCatalog[]>([])
  const [statusList, setStatusList] = useState<ConformidadeStatusItem[]>([])
  const [itensAvaliados, setItensAvaliados] = useState<
    Array<ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }>
  >([])
  const [designacoes, setDesignacoes] = useState<DesignacaoItem[]>([])
  const [colaboradores, setColaboradores] = useState<PersonItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      setLoading(true)
      try {
        const [catRes, stRes, desigRes, peopleRes] = await Promise.all([
          listConformidadeCatalogo(),
          listConformidadeStatus(orgId),
          listDesignacoes(orgId),
          listPeople(orgId),
        ])

        setCatalogo(catRes)
        setStatusList(stRes)
        setDesignacoes(desigRes)
        setColaboradores(peopleRes)

        const avaliados = await avaliarStatusModulosIntegrados(orgId, catRes, stRes)
        setItensAvaliados(avaliados)
      } catch (err) {
        console.error('[ConformidadeReportPage] Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId])

  // Consolidação da Matriz
  const consolidada: MatrizConformidadeConsolidada = useMemo(() => {
    return consolidarMatrizConformidade(organization, itensAvaliados)
  }, [organization, itensAvaliados])

  // Identificar Titular / Responsável pela Serventia
  const titular = useMemo(() => {
    return (
      designacoes.find(
        (d) =>
          (d.expand?.papel_designado?.codigo === 'TITULAR_RESPONSAVEL' ||
            d.cargo_designado?.toLowerCase().includes('titular') ||
            d.cargo_designado?.toLowerCase().includes('tabeli') ||
            d.cargo_designado?.toLowerCase().includes('oficial')) &&
          d.status !== 'revogada',
      ) ||
      colaboradores.find(
        (c) =>
          c.role_title?.toLowerCase().includes('titular') ||
          c.role_title?.toLowerCase().includes('tabeli') ||
          c.role_title?.toLowerCase().includes('oficial'),
      )
    )
  }, [designacoes, colaboradores])

  // Identificar Responsável pela Segurança da Informação
  const responsavelSeguranca = useMemo(() => {
    return designacoes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'RESP_SEGURANCA_INFO' ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança')) &&
        d.status !== 'revogada',
    )
  }, [designacoes])

  // Etapas a serem exibidas no relatório (se etapa específica, filtra; senão, todas)
  const etapasExibidas: EtapaConformidadeResumo[] = useMemo(() => {
    if (etapaParam) {
      const num = parseInt(etapaParam, 10)
      return consolidada.etapas.filter((e) => e.numero === num)
    }
    return consolidada.etapas
  }, [consolidada.etapas, etapaParam])

  const isDossieCompleto =
    consolidada.serventiaClasse === 'C2' || consolidada.serventiaClasse === 'C3'

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Barra Superior de Controles (Oculta na Impressão) */}
      <div className="max-w-[840px] mx-auto mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link to="/conformidade">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-slate-300 bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Matriz</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {etapaParam && (
            <Link to="/relatorios/conformidade">
              <Button variant="outline" size="sm" className="text-xs h-9 text-slate-700 bg-white">
                <span>Ver Todas as Etapas</span>
              </Button>
            </Link>
          )}

          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Exportar PDF</span>
          </Button>
        </div>
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
              {etapaParam
                ? `Dossiê Comprobatório de Conformidade — Etapa ${etapaParam}`
                : 'Dossiê Comprobatório da Matriz de Conformidade'}
            </h1>
            <p className="text-xs text-slate-600">
              {isDossieCompleto
                ? 'Dossiê Técnico Integral com Hashes de Integridade SHA-256 e Fontes de Prova'
                : 'Relatório Executivo Simplificado de Conformidade'}
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
            <div>
              <strong>Emissão:</strong> {formatSpDateTime(emissaoIso)}
            </div>
            <div>
              <strong>Serventia:</strong> {orgName}
            </div>
            <div>
              <strong>Classe da Serventia:</strong> Classe {consolidada.serventiaClasse}
            </div>
            <div>
              <strong>Código do Dossiê:</strong> DOS-CONF-
              {emissaoIso.substring(0, 10).replace(/-/g, '')}
            </div>
          </div>
        </div>

        {/* Quadro Institucional da Serventia e Responsáveis */}
        <div className="grid grid-cols-2 gap-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
              Serventia Notarial e Registral
            </span>
            <div className="font-bold text-slate-900">{orgName}</div>
            <div className="text-slate-600 text-[11px]">
              {organization?.city
                ? `${organization.city} - ${organization.state || 'UF'}`
                : 'Comarca do Cartório'}
              {organization?.cnpj ? ` • CNPJ: ${organization.cnpj}` : ''}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
              Titular / Responsável pela Serventia
            </span>
            <div className="font-bold text-slate-900">
              {titular ? (
                'nome_designado' in titular ? (
                  (titular as DesignacaoItem).nome_designado
                ) : (
                  (titular as PersonItem).name || 'Titular da Serventia'
                )
              ) : (
                <span className="text-slate-500 italic">Titular da Serventia</span>
              )}
            </div>
            <div className="text-slate-600 text-[11px]">
              {titular && 'cargo_designado' in titular
                ? (titular as DesignacaoItem).cargo_designado
                : (titular as PersonItem)?.role_title || 'Tabelião / Oficial Titular'}
            </div>
          </div>
        </div>

        {/* Resumo Executivo da Matriz */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Aderência Global
            </span>
            <span className="text-xl font-extrabold text-[#0B2545]">
              {consolidada.percentualGeral}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {consolidada.totalComprovados} de {consolidada.totalItens} itens
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Prazo Etapas 1 e 2
            </span>
            <span className="text-xl font-extrabold text-blue-800">
              {consolidada.diasRestantesEtapas1e2}d
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              de {consolidada.prazoEtapas1e2Dias} dias previstos
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Etapas Cumpridas
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {consolidada.etapas.filter((e) => e.concluida).length} / 6
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">cumulativas</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Modelo Comprobatório
            </span>
            <span className="text-xs font-extrabold text-slate-800 block mt-1">
              {isDossieCompleto ? 'Integral com SHA-256' : 'Simplificado'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Classe {consolidada.serventiaClasse}
            </span>
          </div>
        </div>

        {/* Seções por Etapa de Implantação */}
        {etapasExibidas.map((etapa) => (
          <div key={etapa.numero} className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between border-b-2 border-[#0B2545] pb-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0B2545]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                  {etapa.titulo}
                </h2>
              </div>
              <div className="text-[11px] font-semibold text-slate-700">
                {etapa.percentual}% comprovado ({etapa.itensComprovados}/{etapa.itensTotal} itens)
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">{etapa.descricao}</p>

            {/* Tabela de Itens da Etapa */}
            <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="p-2 border-b border-slate-200 w-12">Item</th>
                  <th className="p-2 border-b border-slate-200">Requisito Neutro de Domínio</th>
                  <th className="p-2 border-b border-slate-200 w-24">Status</th>
                  <th className="p-2 border-b border-slate-200">Fonte da Prova Real no Ambiente</th>
                  {isDossieCompleto && (
                    <th className="p-2 border-b border-slate-200 w-44">Hash SHA-256</th>
                  )}
                  <th className="p-2 border-b border-slate-200 w-20">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {etapa.itens.map((it) => (
                  <tr key={it.item_codigo} className="hover:bg-slate-50/50">
                    <td className="p-2 font-mono font-bold text-slate-900">{it.item_codigo}</td>

                    <td className="p-2">
                      <div className="font-semibold text-slate-900">{it.catalog?.titulo}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {it.catalog?.descricao}
                      </div>
                    </td>

                    <td className="p-2 font-bold whitespace-nowrap">
                      {it.status === 'comprovado' ? (
                        <span className="text-emerald-700">Comprovado</span>
                      ) : it.status === 'parcial' ? (
                        <span className="text-amber-700">Parcial</span>
                      ) : it.status === 'nao_conforme' ? (
                        <span className="text-rose-700">Não Conforme</span>
                      ) : (
                        <span className="text-slate-500">Pendente</span>
                      )}
                    </td>

                    <td className="p-2">
                      {it.referencia_comprovante ? (
                        <div>
                          <div className="font-medium text-slate-800">
                            {it.referencia_comprovante}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Origem: {it.catalog?.modulo_origem || 'Ambiente'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pendente de comprovação</span>
                      )}
                    </td>

                    {isDossieCompleto && (
                      <td className="p-2 font-mono text-[9px] text-slate-600 break-all">
                        {it.hash_sha256 ? (
                          <span>{it.hash_sha256}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                    )}

                    <td className="p-2 whitespace-nowrap text-[10px] text-slate-600">
                      {it.data_comprovacao ? formatSpDateOnly(it.data_comprovacao) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Termo de Encerramento e Assinatura do Titular */}
        <div className="pt-6 space-y-4 border-t border-slate-300">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
            <h3 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
              Declaração Institucional de Autenticidade e Guarda
            </h3>
            <p>
              Declaro, sob as penas da lei e para os devidos fins perante a Corregedoria Geral da
              Justiça e autoridades competentes, que as informações, laudos técnicos, evidências
              fotográficas e relatórios de auditoria constantes deste dossiê espelham com
              fidedignidade o estado fático e técnico das instalações e sistemas da serventia.
            </p>
            <p className="text-[11px] text-slate-500">
              Nos termos regimentais, todas as evidências digitais e documentos comprobatórios
              associados a este dossiê são mantidos em arquivo seguro pelo prazo mínimo de 5 (cinco)
              anos.
            </p>
          </div>

          {/* Bloco de Assinaturas */}
          <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900">
                {titular
                  ? 'nome_designado' in titular
                    ? (titular as DesignacaoItem).nome_designado
                    : (titular as PersonItem).name || 'Titular / Delegatário Responsável'
                  : 'Titular / Delegatário Responsável'}
              </div>
              <div className="text-[11px] text-slate-600">
                {titular && 'cargo_designado' in titular
                  ? (titular as DesignacaoItem).cargo_designado
                  : (titular as PersonItem)?.role_title || 'Tabelião / Oficial da Serventia'}
              </div>
              <div className="text-[10px] text-slate-400">Assinatura do Titular da Serventia</div>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900">
                {responsavelSeguranca?.nome_designado ||
                  'Responsável Técnico / Segurança da Informação'}
              </div>
              <div className="text-[11px] text-slate-600">
                Responsável pela Segurança da Informação
              </div>
              <div className="text-[10px] text-slate-400">Validação Técnica Operacional</div>
            </div>
          </div>
        </div>

        {/* Rodapé do Documento */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>CSCTI - Compliance • Plataforma de Gestão e Conformidade Extrajudicial</div>
          <div>Página 1 de 1 • Emissão em {formatSpDateTime(emissaoIso)}</div>
        </div>
      </div>
    </div>
  )
}

export default ConformidadeReportPage
