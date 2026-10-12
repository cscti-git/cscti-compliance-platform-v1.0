import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  User,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CsctiLogoMark } from '@/components/CsctiLogo'
import { useAuth } from '@/contexts/AuthContext'
import { formatSpDateTime, formatSpDateOnly } from '@/pages/backup/relatorioData'
import {
  listPlanosAcao,
  listSugestoesMatrizConformidade,
  calcularRaioXPlanos,
} from '@/services/planoAcaoService'
import { listDesignacoes } from '@/services/designacaoService'
import { listPeople } from '@/services/csctiService'
import type {
  PlanoAcaoItem,
  PlanoSugestaoMatriz,
  PlanosAcaoRaioX,
  DesignacaoItem,
  PersonItem,
} from '@/types/cscti'

export const PlanosAcaoReportPage: React.FC = () => {
  const { organization } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Não Identificada'
  const emissaoIso = useMemo(() => new Date().toISOString(), [])

  const [loading, setLoading] = useState(true)
  const [planos, setPlanos] = useState<PlanoAcaoItem[]>([])
  const [sugestoes, setSugestoes] = useState<PlanoSugestaoMatriz[]>([])
  const [designacoes, setDesignacoes] = useState<DesignacaoItem[]>([])
  const [colaboradores, setColaboradores] = useState<PersonItem[]>([])

  useEffect(() => {
    if (!orgId) return
    const loadReportData = async () => {
      setLoading(true)
      try {
        const [planosRes, sugRes, desigRes, peopleRes] = await Promise.all([
          listPlanosAcao(orgId),
          listSugestoesMatrizConformidade(orgId),
          listDesignacoes(orgId),
          listPeople(orgId),
        ])

        setPlanos(planosRes)
        setSugestoes(sugRes)
        setDesignacoes(desigRes)
        setColaboradores(peopleRes)
      } catch (err) {
        console.error('[PlanosAcaoReportPage] Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }

    loadReportData()
  }, [orgId])

  // Raio-x do relatório com dados reais
  const raioX: PlanosAcaoRaioX = useMemo(() => {
    const pendentesCount = sugestoes.filter((s) => !s.jaConvertido && !s.dispensado).length
    return calcularRaioXPlanos(planos, pendentesCount)
  }, [planos, sugestoes])

  // Sugestões pendentes que ainda não viraram plano de ação
  const sugestoesNaoConvertidas = useMemo(() => {
    return sugestoes.filter((s) => !s.jaConvertido && !s.dispensado)
  }, [sugestoes])

  // Titular da Serventia
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

  // Responsável pela Segurança da Informação formalmente designado
  const responsavelSeguranca = useMemo(() => {
    return designacoes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'RESP_SEGURANCA_INFO' ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('segurança')) &&
        d.status !== 'revogada',
    )
  }, [designacoes])

  const hojeIso = new Date().toISOString().substring(0, 10)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="max-w-[840px] mx-auto mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link to="/planos-de-acao">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-slate-300 bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar aos Planos</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
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

      {/* Folha A4 Padrão CSCTI */}
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
              Plano de Ação e Melhoria Contínua
            </h1>
            <p className="text-xs text-slate-600">
              Relatório consolidado de medidas corretivas, governança de pendências e cronograma de
              adequação.
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
            <div>
              <strong>Emissão:</strong> {formatSpDateTime(emissaoIso)}
            </div>
            <div>
              <strong>Serventia:</strong> {orgName}
            </div>
            {organization?.provimento_class && (
              <div>
                <strong>Classe:</strong> Classe {organization.provimento_class}
                {organization.provimento_subclass ? ` • ${organization.provimento_subclass}` : ''}
              </div>
            )}
            <div>
              <strong>Código do Relatório:</strong> REL-ACAO-
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
              Responsável pela Segurança da Informação
            </span>
            {responsavelSeguranca ? (
              <div>
                <div className="font-bold text-slate-900">
                  {responsavelSeguranca.nome_designado}
                </div>
                <div className="text-slate-600 text-[11px]">
                  Designação formalizada •{' '}
                  {responsavelSeguranca.cargo_designado || 'Segurança da Informação'}
                </div>
              </div>
            ) : (
              <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                Nenhum responsável formalmente designado cadastrado.
              </div>
            )}
          </div>
        </div>

        {/* Resumo Executivo / Raio-X */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Planos Cadastrados
            </span>
            <span className="text-xl font-extrabold text-[#0B2545]">{raioX.totalPlanos}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {raioX.abertos + raioX.emAndamento} ativos
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Críticos / Alta Vencidos
            </span>
            <span
              className={`text-xl font-extrabold ${
                raioX.criticosAltaVencidos > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {raioX.criticosAltaVencidos}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">exigem atenção</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Concluídos no Prazo
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {raioX.concluidosNoPrazo}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              de {raioX.concluidos} concluídos
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Sugestões da Matriz
            </span>
            <span className="text-xl font-extrabold text-blue-800">
              {raioX.sugestoesMatrizPendentes}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">pendentes de conversão</span>
          </div>
        </div>

        {/* 1. Tabela dos Planos de Ação Reais */}
        <div className="space-y-2 pt-2">
          <div className="border-b-2 border-[#0B2545] pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#0B2545]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                Planos de Ação Formalizados ({planos.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Cronograma de Medidas Corretivas</span>
          </div>

          {planos.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-200">
              Nenhum plano de ação formalizado até o momento nesta serventia.
            </div>
          ) : (
            <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="p-2 border-b border-slate-200">Título / Origem</th>
                  <th className="p-2 border-b border-slate-200 w-24">Prioridade</th>
                  <th className="p-2 border-b border-slate-200 w-24">Status</th>
                  <th className="p-2 border-b border-slate-200 w-32">Responsável</th>
                  <th className="p-2 border-b border-slate-200 w-24">Prazo</th>
                  <th className="p-2 border-b border-slate-200 w-28">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {planos.map((p) => {
                  const prazoStr = p.data_alvo ? p.data_alvo.substring(0, 10) : null
                  const isAtivo = p.status === 'aberto' || p.status === 'em_andamento'
                  const isVencido = isAtivo && prazoStr && prazoStr < hojeIso
                  const isConcluidoNoPrazo =
                    p.status === 'concluido' &&
                    (!p.data_conclusao ||
                      !prazoStr ||
                      p.data_conclusao.substring(0, 10) <= prazoStr)

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <div className="font-semibold text-slate-900">{p.titulo}</div>
                        <div className="text-[10px] text-slate-500">
                          Origem: {p.origem}
                          {p.referencia_codigo ? ` • Ref: ${p.referencia_codigo}` : ''}
                        </div>
                      </td>

                      <td className="p-2 uppercase font-bold text-[10px]">
                        {p.prioridade === 'critica' ? (
                          <span className="text-rose-700 font-extrabold">Crítica</span>
                        ) : p.prioridade === 'alta' ? (
                          <span className="text-orange-700">Alta</span>
                        ) : p.prioridade === 'media' ? (
                          <span className="text-amber-700">Média</span>
                        ) : (
                          <span className="text-slate-600">Baixa</span>
                        )}
                      </td>

                      <td className="p-2 font-semibold">
                        {p.status === 'concluido' ? (
                          <span className="text-emerald-700">Concluído</span>
                        ) : p.status === 'em_andamento' ? (
                          <span className="text-blue-700">Em Andamento</span>
                        ) : p.status === 'cancelado' ? (
                          <span className="text-slate-500">Cancelado</span>
                        ) : (
                          <span className="text-amber-700">Aberto</span>
                        )}
                      </td>

                      <td className="p-2 text-slate-800">
                        {p.responsavel_nome || <span className="text-slate-400 italic">—</span>}
                      </td>

                      <td className="p-2 font-mono text-[10px]">
                        {prazoStr ? formatSpDateOnly(prazoStr) : '—'}
                      </td>

                      <td className="p-2 text-[10px] font-bold">
                        {p.status === 'concluido' ? (
                          isConcluidoNoPrazo ? (
                            <span className="text-emerald-700">No Prazo</span>
                          ) : (
                            <span className="text-amber-700">Com Atraso</span>
                          )
                        ) : isVencido ? (
                          <span className="text-rose-700">Vencido</span>
                        ) : (
                          <span className="text-slate-600">Em Aberto</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 2. Tabela de Sugestões Pendentes da Matriz de Conformidade */}
        <div className="space-y-2 pt-2">
          <div className="border-b-2 border-slate-700 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Sugestões da Matriz de Conformidade Ainda Não Convertidas (
                {sugestoesNaoConvertidas.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Exigências sem comprovação integral</span>
          </div>

          {sugestoesNaoConvertidas.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-200">
              Todas as pendências da matriz de conformidade foram convertidas em planos de ação ou
              já se encontram comprovadas.
            </div>
          ) : (
            <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="p-2 border-b border-slate-200 w-16">Item</th>
                  <th className="p-2 border-b border-slate-200 w-24">Etapa</th>
                  <th className="p-2 border-b border-slate-200">Requisito da Matriz</th>
                  <th className="p-2 border-b border-slate-200 w-32">Status Matriz</th>
                  <th className="p-2 border-b border-slate-200 w-28">Prioridade Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sugestoesNaoConvertidas.map((sug) => (
                  <tr key={sug.itemCodigo} className="hover:bg-slate-50/50">
                    <td className="p-2 font-mono font-bold text-slate-900">{sug.itemCodigo}</td>
                    <td className="p-2 text-slate-600">Etapa {sug.etapa}</td>
                    <td className="p-2">
                      <div className="font-semibold text-slate-900">{sug.titulo}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{sug.descricao}</div>
                    </td>
                    <td className="p-2 font-bold text-[10px]">
                      {sug.statusMatriz === 'nao_conforme' ? (
                        <span className="text-rose-700">Não Conforme</span>
                      ) : (
                        <span className="text-amber-700">Pendente</span>
                      )}
                    </td>
                    <td className="p-2 uppercase font-bold text-[10px]">
                      {sug.prioridadeSugerida === 'critica' ? (
                        <span className="text-rose-700 font-extrabold">Crítica</span>
                      ) : sug.prioridadeSugerida === 'alta' ? (
                        <span className="text-orange-700">Alta</span>
                      ) : (
                        <span className="text-slate-600">Média</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Termo e Bloco de Assinaturas */}
        <div className="pt-6 space-y-4 border-t border-slate-300">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
            <h3 className="font-bold uppercase tracking-wider text-slate-800 text-[11px]">
              Compromisso Institucional de Melhoria Contínua
            </h3>
            <p>
              A serventia adota o presente Plano de Ação e Melhoria Contínua como instrumento
              estratégico de conformidade, comprometendo-se com a execução tempestiva das medidas
              técnicas e administrativas aqui discriminadas, sob a supervisão do Responsável pela
              Segurança da Informação e do Titular da Serventia.
            </p>
          </div>

          {/* Se não houver Responsável pela Segurança designado, exibe aviso honesto com link */}
          {!responsavelSeguranca && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center justify-between print:bg-white print:border-slate-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Aviso:</strong> Nenhum Responsável pela Segurança da Informação foi
                  designado formalmente para esta serventia.
                </span>
              </div>
              <Link to="/configuracoes?tab=papeis" className="print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  <Settings className="w-3 h-3 mr-1" /> Configurar em Papéis & Responsáveis
                </Button>
              </Link>
            </div>
          )}

          {/* Assinaturas */}
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
                  : (titular as PersonItem)?.role_title || 'Tabelião / Oficial Titular'}
              </div>
              <div className="text-[10px] text-slate-400">Homologação da Direção da Serventia</div>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900">
                {responsavelSeguranca?.nome_designado || 'Responsável pela Segurança da Informação'}
              </div>
              <div className="text-[11px] text-slate-600">
                Responsável pela Segurança da Informação
              </div>
              <div className="text-[10px] text-slate-400">
                {responsavelSeguranca
                  ? 'Gestão e Acompanhamento Técnico dos Prazos'
                  : 'Pendente de Designação Formal'}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Oficial */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>CSCTI - Compliance • Módulo Planos de Ação e Melhoria Contínua</div>
          <div>Página 1 de 1 • Emissão em {formatSpDateTime(emissaoIso)}</div>
        </div>
      </div>
    </div>
  )
}

export default PlanosAcaoReportPage
