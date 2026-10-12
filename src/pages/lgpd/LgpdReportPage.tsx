import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  Lock,
  Database,
  ShieldCheck,
  FileCheck,
  AlertOctagon,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { CsctiLogoMark } from '@/components/CsctiLogo'
import {
  listLgpdDados,
  listLgpdFinalidades,
  listLgpdCiencias,
  listLgpdIncidentes,
} from '@/services/lgpdService'
import { listPeople } from '@/services/csctiService'
import { listDesignacoes } from '@/services/designacaoService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import type {
  LgpdDadoItem,
  LgpdFinalidadeItem,
  LgpdCienciaItem,
  LgpdIncidenteItem,
  PersonItem,
  DesignacaoItem,
} from '@/types/cscti'

export const LgpdReportPage: React.FC = () => {
  const { organization } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Extrajudicial'
  const emissaoIso = useMemo(() => new Date().toISOString(), [])

  const [dados, setDados] = useState<LgpdDadoItem[]>([])
  const [finalidades, setFinalidades] = useState<LgpdFinalidadeItem[]>([])
  const [ciencias, setCiencias] = useState<LgpdCienciaItem[]>([])
  const [incidentes, setIncidentes] = useState<LgpdIncidenteItem[]>([])
  const [colaboradores, setColaboradores] = useState<PersonItem[]>([])
  const [designacoes, setDesignacoes] = useState<DesignacaoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      setLoading(true)
      try {
        const [dadosRes, finRes, cienRes, incRes, peopleRes, desigRes] = await Promise.all([
          listLgpdDados(orgId),
          listLgpdFinalidades(orgId),
          listLgpdCiencias(orgId),
          listLgpdIncidentes(orgId),
          listPeople(orgId),
          listDesignacoes(orgId),
        ])

        setDados(dadosRes)
        setFinalidades(finRes)
        setCiencias(cienRes)
        setIncidentes(incRes)
        setColaboradores(peopleRes)
        setDesignacoes(desigRes)
      } catch (err) {
        console.error('[LgpdReportPage] Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId])

  // Encarregado de Dados
  const encarregado = useMemo(() => {
    return designacoes.find(
      (d) =>
        (d.expand?.papel_designado?.codigo === 'ENCARREGADO_DADOS' ||
          d.expand?.papel_designado?.papel?.toLowerCase().includes('encarregado de dados')) &&
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

  const totalConcedidas = ciencias.filter((c) => c.status === 'concedida').length
  const totalColaboradores = Math.max(colaboradores.length, ciencias.length)
  const percentualCiencia =
    totalColaboradores > 0 ? Math.round((totalConcedidas / totalColaboradores) * 100) : 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Barra Superior com Controles de Impressão (não visível na impressão) */}
      <div className="max-w-[840px] mx-auto mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link to="/lgpd">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-slate-300 bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Módulo LGPD</span>
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

      {/* Folha A4 Oficial */}
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
              Relatório de Governança de Dados Pessoais
            </h1>
            <p className="text-xs text-slate-600">
              Inventário de Dados, Registro de Operações de Tratamento e Controle de Incidentes
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
              <strong>Código do Relatório:</strong> LGPD-GOV-
              {emissaoIso.substring(0, 10).replace(/-/g, '')}
            </div>
          </div>
        </div>

        {/* Quadro Institucional da Serventia e Encarregado */}
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
              Encarregado de Dados Pessoais (DPO)
            </span>
            <div className="font-bold text-slate-900">
              {encarregado?.nome_designado || 'Designação em formalização'}
            </div>
            <div className="text-slate-600 text-[11px]">
              {encarregado?.email_designado || 'Contato oficial na serventia'}
            </div>
          </div>
        </div>

        {/* Quadro Resumo Executivo */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Dados Mapeados
            </span>
            <span className="text-xl font-extrabold text-[#0B2545]">{dados.length}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Dados Sensíveis
            </span>
            <span className="text-xl font-extrabold text-rose-700">
              {dados.filter((d) => d.categoria_sensibilidade === 'sensivel').length}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Operações Ativas
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {finalidades.filter((f) => f.status === 'ativo').length}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Ciência da PSI
            </span>
            <span className="text-xl font-extrabold text-blue-700">{percentualCiencia}%</span>
          </div>
        </div>

        {/* Seção 1: Inventário de Dados Pessoais */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <Database className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              1. Inventário de Dados Pessoais Mapeados
            </h2>
          </div>

          <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Dado</th>
                <th className="p-2 border-b border-slate-200">Sensibilidade</th>
                <th className="p-2 border-b border-slate-200">Operação Vinculada</th>
                <th className="p-2 border-b border-slate-200">Origem / Sistema</th>
                <th className="p-2 border-b border-slate-200">Retenção</th>
                <th className="p-2 border-b border-slate-200">Descarte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                    Nenhum dado pessoal inventariado até a presente data.
                  </td>
                </tr>
              ) : (
                dados.map((d) => (
                  <tr key={d.id}>
                    <td className="p-2 font-semibold text-slate-900">{d.nome}</td>
                    <td className="p-2">
                      {d.categoria_sensibilidade === 'sensivel' ? (
                        <span className="font-bold text-rose-700">Sensível</span>
                      ) : (
                        <span>Comum</span>
                      )}
                    </td>
                    <td className="p-2">{d.expand?.finalidade?.nome || '—'}</td>
                    <td className="p-2">{d.sistema_origem || '—'}</td>
                    <td className="p-2">{d.tempo_retencao || 'Legal'}</td>
                    <td className="p-2 capitalize">{d.forma_descarte}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 2: Operações de Tratamento (ROPA) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <ShieldCheck className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              2. Registro das Operações de Tratamento e Bases Legais
            </h2>
          </div>

          <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Operação de Tratamento</th>
                <th className="p-2 border-b border-slate-200">Base Legal de Sustentação</th>
                <th className="p-2 border-b border-slate-200">Categorias de Titulares</th>
                <th className="p-2 border-b border-slate-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {finalidades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                    Nenhuma operação cadastrada.
                  </td>
                </tr>
              ) : (
                finalidades.map((f) => (
                  <tr key={f.id}>
                    <td className="p-2 font-semibold text-slate-900">
                      <div>{f.nome}</div>
                      {f.descricao && (
                        <div className="text-[10px] text-slate-500 font-normal">{f.descricao}</div>
                      )}
                    </td>
                    <td className="p-2 font-medium capitalize">{f.base_legal}</td>
                    <td className="p-2">{(f.categorias_titulares || []).join(', ') || '—'}</td>
                    <td className="p-2 capitalize">{f.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 3: Mapa de Ciência da Política de Segurança */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <FileCheck className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              3. Mapa de Ciência da Política de Segurança da Informação (Adesão: {percentualCiencia}
              %)
            </h2>
          </div>

          <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Colaborador / Função</th>
                <th className="p-2 border-b border-slate-200">Status</th>
                <th className="p-2 border-b border-slate-200">Data</th>
                <th className="p-2 border-b border-slate-200">Modalidade</th>
                <th className="p-2 border-b border-slate-200">Autenticidade / Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ciencias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-slate-400 italic">
                    Nenhum registro de ciência efetuado.
                  </td>
                </tr>
              ) : (
                ciencias.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 font-semibold text-slate-900">
                      {c.nome_colaborador}
                      {c.cargo_colaborador ? ` (${c.cargo_colaborador})` : ''}
                    </td>
                    <td className="p-2 capitalize font-medium">{c.status}</td>
                    <td className="p-2">
                      {c.data_ciencia ? formatSpDateOnly(c.data_ciencia) : '—'}
                    </td>
                    <td className="p-2 capitalize">
                      {c.tipo_assinatura === 'digital' ? 'Assinatura Digital' : 'Termo Físico'}
                    </td>
                    <td className="p-2 font-mono text-[9px] text-slate-600 truncate max-w-[140px]">
                      {c.hash_sha256
                        ? `${c.hash_sha256.substring(0, 24)}...`
                        : c.protocolo_digital || 'Comprovante em arquivo'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 4: Registro de Incidentes e Cumprimento de Prazos */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
            <AlertOctagon className="w-4 h-4 text-[#0B2545]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
              4. Registro Cronológico de Incidentes com Dados Pessoais
            </h2>
          </div>

          <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="p-2 border-b border-slate-200">Incidente</th>
                <th className="p-2 border-b border-slate-200">Gravidade</th>
                <th className="p-2 border-b border-slate-200">Detecção</th>
                <th className="p-2 border-b border-slate-200">Fluxo</th>
                <th className="p-2 border-b border-slate-200">Notificação Órgão</th>
                <th className="p-2 border-b border-slate-200">Prazo 72h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {incidentes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-500 font-medium">
                    Nenhum incidente de segurança com dados pessoais registrado na serventia.
                  </td>
                </tr>
              ) : (
                incidentes.map((inc) => (
                  <tr key={inc.id}>
                    <td className="p-2 font-semibold text-slate-900">{inc.titulo}</td>
                    <td className="p-2 capitalize font-medium">{inc.gravidade}</td>
                    <td className="p-2">{formatSpDateOnly(inc.data_deteccao)}</td>
                    <td className="p-2 capitalize">{inc.status_fluxo.replace('_', ' ')}</td>
                    <td className="p-2">
                      {inc.data_comunicacao_orgao
                        ? formatSpDateOnly(inc.data_comunicacao_orgao)
                        : 'Não aplicável / pendente'}
                    </td>
                    <td className="p-2">
                      {inc.prazo_72h_cumprido ? (
                        <span className="font-bold text-emerald-700">Cumprido</span>
                      ) : inc.data_comunicacao_orgao ? (
                        <span className="font-bold text-rose-700">Fora do prazo</span>
                      ) : (
                        <span>Em cômputo</span>
                      )}
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
            Certifico, para todos os efeitos de governança corporativa, compliance regulatório e
            auditoria de segurança da informação, que o presente relatório reflete com fidelidade as
            operações de tratamento de dados pessoais, inventário de ativos e registro de eventos
            executados no âmbito desta serventia notarial e registral.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-6">
            <div className="text-center space-y-1">
              <div className="border-b border-slate-400 w-4/5 mx-auto pb-1 min-h-[30px] flex items-end justify-center font-bold text-xs text-slate-900">
                {encarregado?.nome_designado || 'Encarregado de Dados Pessoais'}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Encarregado de Dados Pessoais (DPO)
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

export default LgpdReportPage
