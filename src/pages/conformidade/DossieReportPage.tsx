import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Server,
  HardDriveDownload,
  Building,
  Zap,
  Wifi,
  Cpu,
  Lock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderGit2,
  Clock,
  UserCheck,
  FileCheck2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { CsctiLogo, CsctiLogoMark } from '@/components/CsctiLogo'
import { carregarDossieConsolidado, type DossieConsolidadoBundle } from '@/services/dossieService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import { getEvidenciaFileUrl } from '@/services/evidenciaService'
import { logAudit } from '@/services/csctiService'
import type {
  DesignacaoItem,
  PersonItem,
  InventoryAssetItem,
  InfraItem,
  InfraLinkItem,
  SegSolucaoItem,
  SegComprovanteItem,
  LgpdDadoItem,
  PlanoAcaoItem,
} from '@/types/cscti'

export const DossieReportPage: React.FC = () => {
  const { user, organization } = useAuth()
  const orgId = user?.organization || organization?.id || ''
  const orgName = organization?.name || 'Serventia Notarial e Registral'
  const navigate = useNavigate()

  const [bundle, setBundle] = useState<DossieConsolidadoBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const emissaoIso = useMemo(() => new Date().toISOString(), [])

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    carregarDossieConsolidado(orgId, organization)
      .then((data) => {
        setBundle(data)
        // Auditoria da emissão do dossiê consolidado
        logAudit({
          organizationId: orgId,
          action: 'EMISSAO_DOSSIE_CONSOLIDADO',
          entity: 'dossie_consolidado',
          detail: `Dossiê consolidado emitido para a serventia "${orgName}"`,
          metadata: {
            classe: organization?.provimento_class || '2',
            percentualGeral: data.matrizConsolidada.percentualGeral,
            totalItens: data.matrizConsolidada.totalItens,
          },
        }).catch((err) => console.warn('[DossieReportPage] Falha ao auditar emissão:', err))
      })
      .catch((err) => {
        console.error('[DossieReportPage] Erro ao carregar dados:', err)
        setError('Não foi possível gerar o dossiê consolidado.')
      })
      .finally(() => setLoading(false))
  }, [orgId, organization, orgName])

  const handlePrint = () => {
    window.print()
  }

  // Verifica se é Classe 2 ou 3 para exibição completa de Hashes SHA-256
  const isClasse2ou3 = useMemo(() => {
    if (!bundle) return true
    const c = bundle.matrizConsolidada.serventiaClasse
    return (
      c === 'C2' ||
      c === 'C3' ||
      organization?.provimento_class === 'C2' ||
      organization?.provimento_class === 'C3'
    )
  }, [bundle, organization])

  const renderHashSha256 = (hash?: string) => {
    if (!hash) return <span className="text-slate-400 italic">—</span>
    if (isClasse2ou3) {
      return (
        <span className="font-mono text-[9px] text-slate-700 break-all select-all leading-tight">
          {hash}
        </span>
      )
    }
    // Classe 1: hash simplificado
    return (
      <span className="font-mono text-[9px] text-slate-700 font-semibold">
        {hash.substring(0, 12)}...{hash.substring(hash.length - 8)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3 max-w-md w-full shadow-sm">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            Consolidando Dossiê Geral da Serventia
          </h3>
          <p className="text-xs text-slate-500">
            Coletando dados reais dos módulos de Inventário, Backup, LGPD, Segurança, Infraestrutura
            e Matriz de Conformidade...
          </p>
        </div>
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3 max-w-md w-full shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Erro ao Gerar Dossiê</h3>
          <p className="text-xs text-slate-500">{error || 'Falha ao carregar registros.'}</p>
          <Button
            onClick={() => navigate('/dossie')}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar
          </Button>
        </div>
      </div>
    )
  }

  const {
    organization: org,
    titular,
    rsiDesignado,
    matrizConsolidada,
    modulosResumo,
    ativos,
    ativosEol,
    backupBundle,
    backupPlanos,
    backupTestes,
    backupNoc,
    infraItens,
    infraLinks,
    infraConfronto,
    segSolucoes,
    segCobertura,
    segItens,
    lgpdDados,
    lgpdFinalidades,
    lgpdCiencias,
    lgpdIncidentes,
    planosAcao,
    planosRaioX,
  } = bundle

  const titularNome = titular
    ? 'nome_designado' in titular
      ? (titular as DesignacaoItem).nome_designado
      : (titular as PersonItem).name || 'Titular / Tabelião Responsável'
    : 'Titular / Delegatário Responsável'

  const titularCargo = titular
    ? 'cargo_designado' in titular
      ? (titular as DesignacaoItem).cargo_designado
      : (titular as PersonItem)?.role_title || 'Tabelião / Oficial Titular'
    : 'Tabelião / Oficial da Serventia'

  const rsiNome = rsiDesignado?.nome_designado || rsiDesignado?.expand?.colaborador?.name || ''
  const rsiCargo =
    rsiDesignado?.cargo_designado ||
    rsiDesignado?.expand?.papel_designado?.papel ||
    'Responsável pela Segurança da Informação (RSI)'

  // Separação dos planos de ação
  const planosAbertos = planosAcao.filter(
    (p) => p.status === 'aberto' || p.status === 'em_andamento',
  )
  const planosConcluidos = planosAcao.filter((p) => p.status === 'concluido')
  const planosVencidos = planosAbertos.filter(
    (p) => p.data_alvo && p.data_alvo < emissaoIso.substring(0, 10),
  )

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Barra Superior de Ações (Oculta na Impressão) */}
      <div className="max-w-[860px] mx-auto mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link to="/dossie">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-slate-300 bg-white shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Dossiê</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </Button>
        </div>
      </div>

      {/* Folha A4 Oficial CSCTI */}
      <div
        id="dossie-a4"
        className="max-w-[860px] mx-auto bg-white border border-slate-300 shadow-sm print:shadow-none print:border-none p-8 sm:p-10 space-y-6 text-[11px] leading-normal"
      >
        {/* ========================================================
            CABEÇALHO INSTITUCIONAL CSCTI - COMPLIANCE
        ======================================================== */}
        <div className="border-b-2 border-[#0B2545] pb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CsctiLogoMark size={30} />
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2545]">
                CSCTI - Compliance
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
              Relatório Consolidado Final de Conformidade e Segurança
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Dossiê Técnico Comprobatório da Serventia perante o Juízo Corregedor Competente
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
              <strong>Enquadramento:</strong> Classe {matrizConsolidada.serventiaClasse}
              {org?.provimento_subclass ? ` · Subclasse ${org.provimento_subclass}` : ''}
            </div>
            <div>
              <strong>Código do Dossiê:</strong> DOS-CSCTI-
              {emissaoIso.substring(0, 10).replace(/-/g, '')}-
              {org?.id?.substring(0, 6).toUpperCase()}
            </div>
          </div>
        </div>

        {/* ========================================================
            SEÇÃO 1 — IDENTIFICAÇÃO DA SERVENTIA E RESPONSÁVEIS
        ======================================================== */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <Users className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>1. Identificação da Serventia e Responsáveis Designados</span>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="space-y-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Serventia Extrajudicial
                </span>
                <strong className="text-slate-900 text-xs block">{orgName}</strong>
                <span className="text-slate-600 text-[10px] block">
                  {org?.city ? `${org.city} - ${org.state || 'UF'}` : 'Comarca'}
                  {org?.cnpj ? ` • CNPJ: ${org.cnpj}` : ''}
                </span>
              </div>
              <div className="pt-1 text-[10px] text-slate-600">
                <span>Faixa de Receita / Porte: </span>
                <strong>
                  {org?.revenue_range ? org.revenue_range : 'Conforme enquadramento de Classe'}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Titular / Delegatário
                </span>
                <strong className="text-slate-900 text-xs block">{titularNome}</strong>
                <span className="text-slate-600 text-[10px] block">{titularCargo}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Responsável pela Segurança da Informação (RSI)
                </span>
                {rsiNome ? (
                  <div>
                    <strong className="text-slate-900 text-xs block">{rsiNome}</strong>
                    <span className="text-slate-600 text-[10px] block">
                      {rsiCargo} · Situação:{' '}
                      <strong className="text-emerald-700">
                        {rsiDesignado?.status === 'assinada_digital'
                          ? 'Termo Assinado Digitalmente'
                          : rsiDesignado?.status === 'assinada_fisica'
                            ? 'Termo Assinado Fisicamente'
                            : 'Designação Registrada'}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <div className="p-1.5 border border-amber-200 bg-amber-50 rounded text-amber-900 text-[10px]">
                    <strong>Atenção:</strong> Responsável pela Segurança da Informação ainda não
                    formalmente designado em Papéis & Responsáveis.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SEÇÃO 2 — SÍNTESE EXECUTIVA DE CONFORMIDADE
        ======================================================== */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>2. Síntese Executiva de Conformidade</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Aderência Global
              </span>
              <span className="text-xl font-extrabold text-[#0B2545]">
                {matrizConsolidada.percentualGeral}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {matrizConsolidada.totalComprovados} de {matrizConsolidada.totalItens} itens
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Etapas Concluídas
              </span>
              <span className="text-xl font-extrabold text-emerald-700">
                {matrizConsolidada.etapas.filter((e) => e.concluida).length} / 6
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">cumulativas</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Prazo Etapas 1 e 2
              </span>
              <span className="text-xl font-extrabold text-blue-800">
                {matrizConsolidada.diasRestantesEtapas1e2}d
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                de {matrizConsolidada.prazoEtapas1e2Dias} dias
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Modelo do Dossiê
              </span>
              <span className="text-xs font-extrabold text-slate-800 block mt-1">
                {isClasse2ou3 ? 'Integral com Hashes SHA-256' : 'Simplificado'}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Classe {matrizConsolidada.serventiaClasse}
              </span>
            </div>
          </div>

          {/* Tabela de Índices por Módulo */}
          <table className="w-full text-left text-[10px] border border-slate-200 mt-2">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-1.5 border-b border-slate-200">Módulo do Sistema</th>
                <th className="p-1.5 border-b border-slate-200">Escopo da Comprovação</th>
                <th className="p-1.5 border-b border-slate-200 text-center">Itens</th>
                <th className="p-1.5 border-b border-slate-200 text-center">Percentual</th>
                <th className="p-1.5 border-b border-slate-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {modulosResumo.map((mod) => (
                <tr key={mod.id}>
                  <td className="p-1.5 font-bold text-slate-900">{mod.titulo}</td>
                  <td className="p-1.5 text-slate-600">{mod.detalhesTexto}</td>
                  <td className="p-1.5 text-center text-slate-700">
                    {mod.comprovados}/{mod.totalItens}
                  </td>
                  <td className="p-1.5 text-center font-bold text-slate-900">{mod.percentual}%</td>
                  <td className="p-1.5 text-center font-bold">
                    <span
                      className={
                        mod.statusGeral === 'conforme'
                          ? 'text-emerald-700'
                          : mod.statusGeral === 'parcial'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                      }
                    >
                      {mod.statusGeral === 'conforme'
                        ? 'CONFORME'
                        : mod.statusGeral === 'parcial'
                          ? 'PARCIAL'
                          : 'PENDENTE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ========================================================
            SEÇÃO 3 — DETALHAMENTO DAS 6 ETAPAS DE CONFORMIDADE
        ======================================================== */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <FileCheck2 className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>3. Detalhamento por Etapa de Implantação (Matriz Completa)</span>
          </div>

          {matrizConsolidada.etapas.map((etapa) => (
            <div key={etapa.numero} className="space-y-1.5">
              <div className="flex items-center justify-between bg-slate-100 px-2.5 py-1 rounded text-[10px] font-bold text-slate-800">
                <span>
                  {etapa.titulo} ({etapa.itensComprovados}/{etapa.itensTotal} itens comprovados)
                </span>
                <span
                  className={
                    etapa.concluida
                      ? 'text-emerald-700'
                      : etapa.bloqueada
                        ? 'text-slate-500'
                        : 'text-blue-800'
                  }
                >
                  {etapa.percentual}% ·{' '}
                  {etapa.concluida ? 'Concluída' : etapa.bloqueada ? 'Bloqueada' : 'Em andamento'}
                </span>
              </div>

              <table className="w-full text-left text-[10px] border border-slate-200">
                <thead className="bg-slate-50 text-[9px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="p-1 border-b border-slate-200 w-10">Item</th>
                    <th className="p-1 border-b border-slate-200">Requisito Neutro de Domínio</th>
                    <th className="p-1 border-b border-slate-200 w-20 text-center">Status</th>
                    <th className="p-1 border-b border-slate-200">
                      Fonte da Prova Real no Cliente
                    </th>
                    <th className="p-1 border-b border-slate-200 w-36">Hash SHA-256</th>
                    <th className="p-1 border-b border-slate-200 w-16 text-center">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {etapa.itens.map((it) => (
                    <tr key={it.item_codigo} className="hover:bg-slate-50/50">
                      <td className="p-1 font-mono font-bold text-slate-900">{it.item_codigo}</td>
                      <td className="p-1">
                        <span className="font-semibold text-slate-900">{it.catalog?.titulo}</span>
                      </td>
                      <td className="p-1 text-center font-bold">
                        <span
                          className={
                            it.status === 'comprovado'
                              ? 'text-emerald-700'
                              : it.status === 'parcial'
                                ? 'text-amber-700'
                                : it.status === 'nao_conforme'
                                  ? 'text-rose-700'
                                  : 'text-slate-400'
                          }
                        >
                          {it.status === 'comprovado'
                            ? 'Comprovado'
                            : it.status === 'parcial'
                              ? 'Parcial'
                              : it.status === 'nao_conforme'
                                ? 'Não Conforme'
                                : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-1 text-slate-600">
                        {it.referencia_comprovante || (
                          <span className="text-slate-400 italic">Sem comprovação registrada</span>
                        )}
                      </td>
                      <td className="p-1">{renderHashSha256(it.hash_sha256)}</td>
                      <td className="p-1 text-center text-slate-600">
                        {it.data_comprovacao ? formatSpDateOnly(it.data_comprovacao) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* ========================================================
            SEÇÃO 4 — INVENTÁRIO DE ATIVOS E ANÁLISE EOL
        ======================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>4. Inventário de Ativos Tecnológicos e Ciclo de Vida (EOL)</span>
            </div>
            <span className="text-[10px] font-normal lowercase">
              {ativos.length} ativo(s) cadastrado(s)
            </span>
          </div>

          {ativos.length === 0 ? (
            <p className="text-slate-400 italic text-[10px]">
              Nenhum ativo tecnológico cadastrado no inventário.
            </p>
          ) : (
            <table className="w-full text-left text-[10px] border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-1.5 border-b border-slate-200">Identificação do Ativo</th>
                  <th className="p-1.5 border-b border-slate-200">Tipo</th>
                  <th className="p-1.5 border-b border-slate-200">Sistema Operacional</th>
                  <th className="p-1.5 border-b border-slate-200">Localização</th>
                  <th className="p-1.5 border-b border-slate-200 text-center">
                    Fim de Suporte (EOL)
                  </th>
                  <th className="p-1.5 border-b border-slate-200 text-center">Situação EOL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ativosEol.map((item) => (
                  <tr key={item.ativo.id}>
                    <td className="p-1.5 font-bold text-slate-900">
                      {item.ativo.name}
                      {item.ativo.serial_number && (
                        <span className="block text-[9px] text-slate-500 font-mono">
                          SN: {item.ativo.serial_number}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 capitalize text-slate-600">{item.ativo.tipo}</td>
                    <td className="p-1.5 text-slate-700">
                      {item.sistemaOperacional} {item.versaoSo !== '—' && `(${item.versaoSo})`}
                    </td>
                    <td className="p-1.5 text-slate-600">
                      {item.ativo.localizacao || 'Serventia'}
                    </td>
                    <td className="p-1.5 text-center text-slate-600 font-mono">
                      {item.dataFimSuporte ? item.dataFimSuporte.substring(0, 10) : '—'}
                    </td>
                    <td className="p-1.5 text-center font-bold">
                      <span
                        className={
                          item.eolStatus === 'suportado'
                            ? 'text-emerald-700'
                            : item.eolStatus === 'mitigado'
                              ? 'text-blue-700'
                              : 'text-rose-700'
                        }
                      >
                        {item.eolStatus.toUpperCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================================
            SEÇÃO 5 — CONTINUIDADE E BACKUP COM VALIDAÇÃO EXTERNA (NOC)
        ======================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <HardDriveDownload className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>5. Continuidade Operacional, Rotinas de Backup e Validação Externa (NOC)</span>
            </div>
            <span className="text-[10px] font-normal">
              Proteção Efetiva:{' '}
              <strong className="text-emerald-700">{backupBundle?.pct_protegido ?? 0}%</strong>
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-1">
            <div className="flex items-center justify-between">
              <span>
                <strong>Planos de Backup Ativos:</strong> {backupPlanos.length} cadastrados ·{' '}
                {backupBundle?.total_completos ?? 0} com proteção completa ·{' '}
                {backupBundle?.total_parciais ?? 0} com proteção parcial
              </span>
              <span>
                <strong>Último Teste de Restauração:</strong>{' '}
                {backupTestes.length > 0 ? (
                  <strong className="text-emerald-700">
                    {formatSpDateOnly(backupTestes[0].data_teste)} (Sucesso)
                  </strong>
                ) : (
                  <span className="text-slate-400 italic">Pendente</span>
                )}
              </span>
            </div>
            <p className="text-slate-500 italic text-[9px]">
              Nota técnica: O status de proteção utiliza a data operacional do comprovante
              (data_email, fuso de São Paulo), comprovando exclusivamente a modalidade demonstrada
              em relatório técnico.
            </p>
          </div>

          {/* Validação Externa (NOC) */}
          <div className="p-2.5 border border-purple-200 bg-purple-50/40 rounded text-[10px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-950 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                Validação Externa (NOC) — Dupla Camada
              </span>
              <span className="text-purple-900 font-medium">
                {backupNoc.length > 0
                  ? `${backupNoc.length} atestado(s) emitido(s)`
                  : 'Sem atestado no período'}
              </span>
            </div>
            {backupNoc.length > 0 ? (
              <p className="text-slate-700 leading-snug">
                Último parecer do NOC em{' '}
                {formatSpDateTime(backupNoc[0].data_monitoramento || backupNoc[0].created || '')}:{' '}
                <strong>
                  {backupNoc[0].status_geral === 'ok'
                    ? 'Convergente / Operação Estável'
                    : 'Alerta / Ocorrência Registrada'}
                </strong>
                {backupNoc[0].observacoes && ` — ${backupNoc[0].observacoes}`}.
              </p>
            ) : (
              <p className="text-slate-500 italic">
                Nenhum atestado de Validação Externa (NOC) emitido recentemente para esta serventia.
              </p>
            )}
          </div>
        </div>

        {/* ========================================================
            SEÇÃO 6 — INFRAESTRUTURA FÍSICA E LÓGICA
        ======================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>6. Infraestrutura Física, Redundância Elétrica e Conectividade</span>
            </div>
            <span className="text-[10px] font-normal lowercase">
              links: {infraConfronto.velocidadeTotalAtivaMbps} Mbps (
              {infraConfronto.statusGeral.toUpperCase()})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[10px]">
            {/* Energia */}
            <div className="p-2.5 border border-slate-200 bg-slate-50 rounded space-y-1">
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[9px]">
                Redundância de Energia & Laudos Técnicos
              </span>
              {infraItens.filter((i) => i.categoria === 'energia').length === 0 ? (
                <p className="text-slate-400 italic">Sem nobreaks ou laudos registrados.</p>
              ) : (
                <ul className="space-y-1 text-slate-700">
                  {infraItens
                    .filter((i) => i.categoria === 'energia')
                    .map((it) => (
                      <li key={it.id} className="flex items-center justify-between">
                        <span>
                          <strong>{it.titulo}</strong>
                          {it.autonomia_minutos ? ` (${it.autonomia_minutos} min)` : ''}
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          {it.status.toUpperCase()}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Links de Internet */}
            <div className="p-2.5 border border-slate-200 bg-slate-50 rounded space-y-1">
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[9px]">
                Links de Comunicação de Dados
              </span>
              {infraLinks.length === 0 ? (
                <p className="text-slate-400 italic">Nenhum link cadastrado.</p>
              ) : (
                <ul className="space-y-1 text-slate-700">
                  {infraLinks.map((lk) => (
                    <li key={lk.id} className="flex items-center justify-between">
                      <span>
                        <strong>{lk.operadora}</strong> ({lk.velocidade_mbps} Mbps)
                      </span>
                      <span className="text-slate-600">
                        {lk.redundancia ? 'Redundância' : 'Principal'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            SEÇÃO 7 — SEGURANÇA DO AMBIENTE E ENDPOINTS
        ======================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>7. Segurança do Ambiente, Proteção de Endpoints e Perímetro</span>
            </div>
            <span className="text-[10px] font-normal">
              Cobertura de Endpoints:{' '}
              <strong className="text-emerald-700">{segCobertura.percentualCobertura}%</strong>
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-1">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-slate-500 block">Soluções Ativas:</span>
                <strong className="text-slate-900 text-xs">
                  {segSolucoes.filter((s) => s.status === 'ativa').length} solução(ões)
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Endpoints Protegidos:</span>
                <strong className="text-slate-900 text-xs">
                  {segCobertura.comprovadasEndpoint} de {segCobertura.exigidasEndpoint} exigidos
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Status do Firewall:</span>
                <strong className="text-emerald-700 text-xs uppercase">
                  {segCobertura.statusFirewallConsolidado.replace(/_/g, ' ')}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SEÇÃO 8 — DADOS PESSOAIS E GOVERNANÇA LGPD
        ======================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>8. Dados Pessoais, Governança LGPD e Incidentes</span>
            </div>
            <span className="text-[10px] font-normal lowercase">
              {lgpdFinalidades.length} operação(ões) ROPA · {lgpdDados.length} dados inventariados
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-[10px]">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[9px]">
                Inventário & ROPA
              </span>
              <p className="text-slate-700">
                <strong>{lgpdFinalidades.length}</strong> bases legais catalogadas e{' '}
                <strong>{lgpdDados.length}</strong> tipos de dados pessoais mapeados.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[9px]">
                Ciência da PSI pelos Prepostos
              </span>
              <p className="text-slate-700">
                <strong>
                  {lgpdCiencias.filter((c) => c.status === 'concedida').length} de{' '}
                  {lgpdCiencias.length}
                </strong>{' '}
                termos de ciência formalmente assinados por colaboradores.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
              <span className="font-bold text-slate-900 block uppercase tracking-wider text-[9px]">
                Incidentes com Dados
              </span>
              <p className="text-slate-700">
                <strong>{lgpdIncidentes.length}</strong> ocorrência(s) registrada(s).{' '}
                {lgpdIncidentes.length === 0
                  ? 'Nenhum incidente de segurança com dados violados.'
                  : `${lgpdIncidentes.filter((i) => i.prazo_72h_cumprido).length} comunicado(s) no prazo de 72h.`}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            SEÇÃO 9 — PLANOS DE AÇÃO (SANEAMENTO DE PENDÊNCIAS)
        ======================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-900 font-bold text-xs uppercase">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0B2545]" />
              <span>9. Planos de Ação e Saneamento de Pendências</span>
            </div>
            <span className="text-[10px] font-normal lowercase">
              {planosAbertos.length} em aberto · {planosConcluidos.length} concluído(s)
            </span>
          </div>

          {planosAcao.length === 0 ? (
            <p className="text-slate-400 italic text-[10px]">
              Nenhum plano de ação formalizado no período.
            </p>
          ) : (
            <table className="w-full text-left text-[10px] border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-1.5 border-b border-slate-200">Plano de Ação</th>
                  <th className="p-1.5 border-b border-slate-200">Origem</th>
                  <th className="p-1.5 border-b border-slate-200">Prioridade</th>
                  <th className="p-1.5 border-b border-slate-200">Responsável</th>
                  <th className="p-1.5 border-b border-slate-200 text-center">Prazo Alvo</th>
                  <th className="p-1.5 border-b border-slate-200 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {planosAcao.slice(0, 10).map((plano) => (
                  <tr key={plano.id}>
                    <td className="p-1.5 font-bold text-slate-900">
                      {plano.titulo}
                      {plano.referencia_codigo && (
                        <span className="block text-[9px] text-slate-500">
                          Ref: Item {plano.referencia_codigo}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 capitalize text-slate-600">{plano.origem}</td>
                    <td className="p-1.5 capitalize">
                      <span
                        className={
                          plano.prioridade === 'critica'
                            ? 'text-rose-700 font-bold'
                            : plano.prioridade === 'alta'
                              ? 'text-amber-700 font-bold'
                              : 'text-slate-700'
                        }
                      >
                        {plano.prioridade}
                      </span>
                    </td>
                    <td className="p-1.5 text-slate-700">
                      {plano.responsavel_nome || 'A definir'}
                    </td>
                    <td className="p-1.5 text-center text-slate-600 font-mono">
                      {plano.data_alvo ? formatSpDateOnly(plano.data_alvo) : '—'}
                    </td>
                    <td className="p-1.5 text-center font-bold">
                      <span
                        className={
                          plano.status === 'concluido'
                            ? 'text-emerald-700'
                            : plano.status === 'em_andamento'
                              ? 'text-blue-700'
                              : 'text-amber-700'
                        }
                      >
                        {plano.status.toUpperCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================================
            SEÇÃO 10 — TERMO DE DECLARAÇÃO DE AUTENTICIDADE + ASSINATURAS
        ======================================================== */}
        <div className="pt-6 space-y-4 border-t-2 border-[#0B2545]">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0B2545]" />
              <span>10. Termo de Declaração de Autenticidade e Guarda do Dossiê</span>
            </h3>
            <p className="text-[11px] text-slate-700 text-justify">
              O Delegatário / Titular e o Responsável pela Segurança da Informação (RSI) abaixo
              assinados declaram, sob as penas da lei e para os devidos fins de fiscalização e
              apresentação perante a Corregedoria Geral da Justiça e Corregedorias Permanentes, que:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-700">
              <li>
                Todas as informações, relatórios de backup com data operacional do comprovante,
                laudos técnicos com ART de aterramento, cópias de telas de consoles antivírus e
                inventários contidos neste Dossiê Consolidado espelham com fidedignidade o ambiente
                físico, lógico e operacional da serventia.
              </li>
              <li>
                Nenhum dado é fictício ou simulado: as evidências derivam exclusivamente do ambiente
                tecnológico do cartório, com controle criptográfico de integridade via hash SHA-256.
              </li>
              <li>
                Nos termos regulamentares da Corregedoria, todas as evidências digitais,
                comprovantes de backup e termos de designação deste dossiê serão mantidos sob guarda
                segura e à disposição da fiscalização pelo prazo mínimo de{' '}
                <strong>5 (cinco) anos</strong>.
              </li>
            </ol>
          </div>

          {/* Bloco de Assinaturas */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t border-slate-500 pt-2 font-bold text-slate-900">
                {titularNome}
              </div>
              <div className="text-[11px] text-slate-600">{titularCargo}</div>
              <div className="text-[10px] text-slate-400">Titular / Delegatário Responsável</div>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-500 pt-2 font-bold text-slate-900">
                {rsiNome || '________________________________________________'}
              </div>
              <div className="text-[11px] text-slate-600">
                {rsiNome ? rsiCargo : 'Responsável pela Segurança da Informação (RSI)'}
              </div>
              <div className="text-[10px] text-slate-400">
                {rsiNome ? 'Validação Técnica Operacional' : '(Aguardando Designação Formal)'}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Oficial da Folha */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>CSCTI - Compliance • Plataforma de Gestão, Governança e Auditoria Extrajudicial</div>
          <div>Dossiê Consolidado • Emissão em {formatSpDateTime(emissaoIso)}</div>
        </div>
      </div>
    </div>
  )
}

export default DossieReportPage
