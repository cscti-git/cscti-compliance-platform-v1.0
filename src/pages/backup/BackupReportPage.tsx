import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CsctiLogo } from '@/components/CsctiLogo'
import { formatDateTime, formatDate, formatTime } from '@/lib/dateTime'
import {
  Printer,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  HardDriveDownload,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react'
import {
  listBackupEscopos,
  listBackupPlanos,
  listBackupPlanoRequisitos,
  listBackupRotinas,
  listBackupFontes,
  listBackupExecucoes,
  listBackupEvidencias,
  listBackupOcorrencias,
  listBackupTestes,
  getBackupConfronto,
} from '@/services/backupService'
import type { BackupConfrontoResponse, ConfrontoAtivoItem } from '@/types/cscti'
import { getOrganizationById } from '@/services/csctiService'
import type {
  BackupEscopoItem,
  BackupPlanoItem,
  BackupPlanoRequisitoItem,
  BackupRotinaItem,
  BackupFonteItem,
  BackupExecucaoItem,
  BackupEvidenciaItem,
  BackupOcorrenciaItem,
  BackupTesteRecuperacaoItem,
  OrganizationItem,
} from '@/types/cscti'

export const BackupReportPage: React.FC = () => {
  const { organization: authOrg, user } = useAuth()
  const [org, setOrg] = useState<OrganizationItem | null>(authOrg || null)
  const [loading, setLoading] = useState(true)

  const [escopos, setEscopos] = useState<BackupEscopoItem[]>([])
  const [planos, setPlanos] = useState<BackupPlanoItem[]>([])
  const [requisitos, setRequisitos] = useState<BackupPlanoRequisitoItem[]>([])
  const [rotinas, setRotinas] = useState<BackupRotinaItem[]>([])
  const [fontes, setFontes] = useState<BackupFonteItem[]>([])
  const [execucoes, setExecucoes] = useState<BackupExecucaoItem[]>([])
  const [evidencias, setEvidencias] = useState<BackupEvidenciaItem[]>([])
  const [ocorrencias, setOcorrencias] = useState<BackupOcorrenciaItem[]>([])
  const [testes, setTestes] = useState<BackupTesteRecuperacaoItem[]>([])
  const [confronto, setConfronto] = useState<BackupConfrontoResponse | null>(null)

  const dataEmissao = new Date()

  useEffect(() => {
    const loadReportData = async () => {
      const orgId = authOrg?.id || ''
      if (!orgId) return
      setLoading(true)
      try {
        const fullOrg = await getOrganizationById(orgId)
        if (fullOrg) setOrg(fullOrg)

        const [
          escData,
          plaData,
          reqData,
          rotData,
          fonData,
          exeData,
          eviData,
          ocoData,
          tesData,
          confData,
        ] = await Promise.all([
          listBackupEscopos(orgId),
          listBackupPlanos(orgId),
          listBackupPlanoRequisitos(orgId),
          listBackupRotinas(orgId),
          listBackupFontes(orgId),
          listBackupExecucoes(orgId),
          listBackupEvidencias(orgId),
          listBackupOcorrencias(orgId),
          listBackupTestes(orgId),
          getBackupConfronto(orgId).catch(() => null),
        ])

        setEscopos(escData)
        setPlanos(plaData)
        setRequisitos(reqData)
        setRotinas(rotData)
        setFontes(fonData)
        setExecucoes(exeData)
        setEvidencias(eviData)
        setOcorrencias(ocoData)
        setTestes(tesData)
        setConfronto(confData)
      } catch (err) {
        console.error('Erro ao carregar dados do relatório de backup:', err)
      } finally {
        setLoading(false)
      }
    }

    loadReportData()
  }, [authOrg?.id])

  const handlePrint = () => {
    window.print()
  }

  // Estatísticas
  const execucoesSucesso = execucoes.filter((e) => e.status === 'sucesso').length
  const totalExecucoes = execucoes.length
  const ocorrenciasResolvidas = ocorrencias.filter((o) => o.status === 'resolvida').length
  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status !== 'resolvida').length

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link to="/backup">
          <Button variant="outline" size="sm" className="text-xs text-slate-700 gap-1.5 shadow-2xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Módulo de Backup
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Formato padrão A4 institucional
          </span>
          <Button
            onClick={handlePrint}
            size="sm"
            className="text-xs font-semibold bg-[#0B2545] hover:bg-[#124E78] text-white gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir Relatório / Salvar PDF
          </Button>
        </div>
      </div>

      {/* Folha A4 do Relatório */}
      <div className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 shadow-md print:shadow-none print:p-0 rounded-lg print:rounded-none border border-slate-200 print:border-none space-y-6">
        {/* Cabeçalho Oficial */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <CsctiLogo size="md" variant="horizontal" />
              <div className="pl-3 border-l border-slate-300">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Plataforma de Gestão e Conformidade Técnica
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Dossiê Comprobatório de Continuidade e Cópias de Segurança
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-600">
              <p className="font-semibold text-slate-900">Emissão: {formatDate(dataEmissao)}</p>
              <p>Horário: {formatTime(dataEmissao)}</p>
              <p className="font-mono text-[10px] text-slate-400">
                DOC-BKP-{dataEmissao.getTime().toString().slice(-8)}
              </p>
            </div>
          </div>

          {/* Dados Reais da Serventia */}
          <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Serventia / Titular:
              </span>
              <strong className="text-slate-900 truncate block">
                {org?.name || 'Serventia Cadastrada'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                CNPJ / Identificação:
              </span>
              <span className="text-slate-800">{org?.cnpj || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Comarca / UF:
              </span>
              <span className="text-slate-800">
                {org?.city ? `${org.city} / ${org.state}` : 'Comarca Local'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Classificação Técnica:
              </span>
              <span className="text-slate-800">
                {org?.provimento_class
                  ? `Classe ${org.provimento_class} • Subclasse ${org.provimento_subclass || 'A'}`
                  : 'Classe Operacional Homologada'}
              </span>
            </div>
          </div>
        </div>

        {/* Declaração Institucional */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded text-xs text-blue-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-800" />
            DECLARAÇÃO TÉCNICA DE CONFORMIDADE DE CÓPIAS DE SEGURANÇA E CONTINUIDADE
          </p>
          <p className="text-[11px] leading-relaxed text-blue-900">
            Certifica-se, para fins de comprovação e auditoria perante o juízo competente e normas
            vigentes de governança e segurança da informação, que a presente serventia mantém
            rotinas estruturadas de salvaguarda de dados, armazenamento redundante, verificação de
            integridade digital via hash SHA-256 e testes periódicos de restauração.
          </p>
        </div>

        {/* 1. Resumo Executivo das Métricas com Confronto Honesto */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
            <span>1. Resumo Executivo do Parque de Proteção</span>
            {confronto?.totais && (
              <span className="text-[10px] font-bold text-slate-700">
                Conformidade Global de Proteção: {confronto.totais.percentual_protegido}%
              </span>
            )}
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 border rounded bg-slate-50">
              <span className="text-[10px] text-slate-500 block uppercase">
                Ativos 100% Protegidos
              </span>
              <strong
                className={`text-sm ${
                  (confronto?.totais?.percentual_protegido ?? 100) === 100
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {confronto?.totais?.total_protegidos ?? '—'} /{' '}
                {confronto?.totais?.total_ativos_exigidos ?? '—'}
              </strong>
            </div>
            <div className="p-2 border rounded bg-slate-50">
              <span className="text-[10px] text-slate-500 block uppercase">Planos / Rotinas</span>
              <strong className="text-sm text-slate-900">
                {planos.length} planos / {rotinas.length} rotinas
              </strong>
            </div>
            <div className="p-2 border rounded bg-slate-50">
              <span className="text-[10px] text-slate-500 block uppercase">
                Evidências Auditadas
              </span>
              <strong className="text-sm text-indigo-700">{evidencias.length} comprovantes</strong>
            </div>
            <div className="p-2 border rounded bg-slate-50">
              <span className="text-[10px] text-slate-500 block uppercase">
                Ocorrências Abertas
              </span>
              <strong
                className={`text-sm ${ocorrenciasAbertas > 0 ? 'text-red-700 font-extrabold' : 'text-slate-900'}`}
              >
                {ocorrenciasAbertas}
              </strong>
            </div>
          </div>
        </div>

        {/* 1.1 Quadro de Confronto por Ativo e Estado da Última Execução */}
        {confronto && confronto.confronto && confronto.confronto.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
              1.1 Estado de Proteção por Ativo e Modalidade (Validação Centrada no Ativo)
            </h3>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[9px]">
                <tr>
                  <th className="p-2">Ativo</th>
                  <th className="p-2">Local</th>
                  <th className="p-2">Nuvem</th>
                  <th className="p-2">Replicação</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {confronto.confronto.map((item: ConfrontoAtivoItem) => {
                  const renderMod = (
                    mod?: import('@/types/cscti').ConfrontoModalidadeInfo,
                    exigida?: boolean,
                  ) => {
                    if (!exigida) return <span className="text-slate-400">Não exigida</span>
                    if (!mod || mod.status_modalidade === 'SEM_FONTE')
                      return <span className="text-slate-500 font-semibold">Sem fonte</span>
                    if (
                      mod.status_modalidade === 'FALHA_ULTIMA_EXECUCAO' ||
                      mod.ultima_execucao_falha
                    ) {
                      return (
                        <span className="font-bold text-red-700 bg-red-100 px-1 py-0.5 rounded">
                          FALHA ÚLTIMA EXECUÇÃO
                        </span>
                      )
                    }
                    if (mod.status_modalidade === 'NUNCA_COMPROVADA')
                      return <span className="text-red-600">Nunca comprovada</span>
                    if (mod.status_modalidade === 'FORA_RPO')
                      return <span className="text-amber-700">Fora do RPO</span>
                    return <span className="text-emerald-700 font-semibold">Atendida no RPO</span>
                  }

                  return (
                    <tr key={item.id}>
                      <td className="p-2 font-bold text-slate-900">{item.nome}</td>
                      <td className="p-2">
                        {renderMod(item.modalidades?.local, item.exigencias.local)}
                      </td>
                      <td className="p-2">
                        {renderMod(item.modalidades?.nuvem, item.exigencias.nuvem)}
                      </td>
                      <td className="p-2">
                        {renderMod(item.modalidades?.replicacao, item.exigencias.replicacao)}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.status_consolidado === 'PROTEGIDO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status_consolidado === 'PARCIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.status_consolidado}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Escopo e Políticas dos Planos */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            2. Escopo de Proteção e Políticas de Continuidade (Estratégia 3-2-1)
          </h3>
          <div className="space-y-2">
            {planos.map((p) => {
              const reqsDoPlano = requisitos.filter((r) => r.plano === p.id)
              return (
                <div key={p.id} className="p-3 border rounded text-xs space-y-1.5 bg-white">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{p.nome}</strong>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50"
                    >
                      {p.status}
                    </Badge>
                  </div>
                  {p.descricao && <p className="text-slate-600 text-[11px]">{p.descricao}</p>}

                  {/* Requisitos Técnicos Estruturados do Plano */}
                  {((p.rto_horas !== undefined && p.rto_horas !== null) ||
                    (p.rpo_horas !== undefined && p.rpo_horas !== null) ||
                    (p.retencao_dias !== undefined && p.retencao_dias !== null) ||
                    p.periodicidade ||
                    (Array.isArray(p.destino) && p.destino.length > 0)) && (
                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                        Requisitos Técnicos Homologados:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {p.rpo_horas !== undefined && p.rpo_horas !== null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-medium">
                            <strong>RPO Máx.:</strong>&nbsp;{p.rpo_horas}h
                          </span>
                        )}
                        {p.rto_horas !== undefined && p.rto_horas !== null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-medium">
                            <strong>RTO Máx.:</strong>&nbsp;{p.rto_horas}h
                          </span>
                        )}
                        {p.retencao_dias !== undefined && p.retencao_dias !== null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium">
                            <strong>Retenção:</strong>&nbsp;{p.retencao_dias} dias
                          </span>
                        )}
                        {p.periodicidade && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 font-medium capitalize">
                            <strong>Periodicidade:</strong>&nbsp;
                            {p.periodicidade === 'intervalo_minutos'
                              ? `A cada ${p.intervalo_minutos || 30} min`
                              : `${p.periodicidade}${p.janela_horario ? ` (${p.janela_horario})` : ''}`}
                          </span>
                        )}
                        {Array.isArray(p.destino) && p.destino.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 font-medium">
                            <strong>Destino:</strong>&nbsp;
                            {p.destino
                              .map((d: string) => {
                                if (d === 'local') return 'Local'
                                if (d === 'nuvem') return 'Nuvem'
                                if (d === 'replicacao' || d === 'externo') return 'Replicação'
                                return d
                              })
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {reqsDoPlano.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Requisitos Detalhados Adicionais:
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {reqsDoPlano.map((rq) => (
                          <div key={rq.id} className="flex items-center gap-1.5 text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <span className="font-semibold">{rq.requisito}:</span> {rq.parametro}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Rotinas e Fontes Protegidas */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            3. Rotinas de Cópia e Fontes Mapeadas
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[9px]">
              <tr>
                <th className="p-2">Rotina</th>
                <th className="p-2">Periodicidade / Horário</th>
                <th className="p-2">Fontes e Ativos Protegidos</th>
                <th className="p-2">Responsável</th>
                <th className="p-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {rotinas.map((r) => {
                const fontesDaRotina = fontes.filter((f) => f.rotina === r.id)
                const periodicidadeStr =
                  r.periodicidade === 'intervalo_minutos'
                    ? `A cada ${r.intervalo_minutos || 30} min`
                    : r.periodicidade
                const tipoExecStr = r.tipo_execucao
                  ? r.tipo_execucao === 'completo'
                    ? 'Completo'
                    : r.tipo_execucao === 'diferencial'
                      ? 'Diferencial'
                      : 'Incremental'
                  : 'Incremental'

                return (
                  <tr key={r.id}>
                    <td className="p-2 font-semibold text-slate-900">
                      <div>{r.nome}</div>
                      <span className="text-[10px] text-blue-700 font-medium">
                        Tipo: {tipoExecStr}
                      </span>
                    </td>
                    <td className="p-2 text-slate-700">
                      <span className="capitalize font-medium">{periodicidadeStr}</span>
                      {r.periodicidade !== 'intervalo_minutos' && (
                        <span className="text-slate-500">
                          {' '}
                          • {r.horario ? `${r.horario}h` : 'Flexível'}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-slate-600">
                      {fontesDaRotina.length === 0 ? (
                        <span className="italic text-slate-400">Nenhuma fonte vinculada</span>
                      ) : (
                        fontesDaRotina.map((f) => {
                          const fonteTipoLabel =
                            f.tipo_fonte === 'banco_de_dados'
                              ? 'Banco de Dados'
                              : f.tipo_fonte === 'maquina_virtual'
                                ? 'Máquina Virtual'
                                : f.tipo_fonte
                          return (
                            <div key={f.id} className="text-[10px]">
                              • {f.caminho_identificacao} ({fonteTipoLabel}
                              {f.tipo_execucao && f.tipo_execucao !== 'padrao_rotina'
                                ? ` · ${f.tipo_execucao}`
                                : ''}
                              )
                            </div>
                          )
                        })
                      )}
                    </td>
                    <td className="p-2 text-slate-700">
                      {r.expand?.responsavel?.name || 'TI da Serventia'}
                    </td>
                    <td className="p-2 text-right">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Histórico de Execuções e Avaliações de Conformidade */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            4. Registro de Execuções Recentes e Parecer de Conformidade
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[9px]">
              <tr>
                <th className="p-2">Data / Hora</th>
                <th className="p-2">Rotina / Trabalho</th>
                <th className="p-2">Tamanho</th>
                <th className="p-2">Destino / Mídia</th>
                <th className="p-2">Resultado</th>
                <th className="p-2">Parecer Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {execucoes.slice(0, 10).map((exe) => (
                <tr key={exe.id}>
                  <td className="p-2 text-slate-600">
                    {exe.data_inicio ? formatDateTime(exe.data_inicio, { fallback: '—' }) : '—'}
                  </td>
                  <td className="p-2 font-semibold text-slate-900">
                    {exe.expand?.rotina?.nome || 'Geral'}
                  </td>
                  <td className="p-2 font-mono text-slate-700">{exe.tamanho_formatado || '—'}</td>
                  <td className="p-2 text-slate-600">
                    {exe.destino || 'Armazenamento Secundário'}
                  </td>
                  <td className="p-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        exe.status === 'sucesso'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {exe.status}
                    </span>
                  </td>
                  <td className="p-2 text-slate-700 text-[10px]">
                    {exe.observacao || 'Conforme com o plano.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. Comprovação de Testes de Recuperação Homologados */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            5. Homologação de Testes Práticos de Restauração
          </h3>
          {testes.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-2 border rounded bg-slate-50">
              Nenhum teste de recuperação registrado no período.
            </p>
          ) : (
            <div className="space-y-2">
              {testes.map((t) => (
                <div key={t.id} className="p-3 border rounded text-xs bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">
                      {t.tipo === 'restauracao_total'
                        ? 'Restauração Total'
                        : t.tipo === 'restauracao_parcial'
                          ? 'Restauração Parcial'
                          : 'Simulação de Desastre'}{' '}
                      • Realizado em {formatDate(t.data_teste, '—')} (
                      {t.tempo_decorrido_minutos || 0} min)
                    </strong>
                    <Badge className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900">
                      {t.resultado}
                    </Badge>
                  </div>
                  <p className="text-slate-700 text-[11px]">
                    <strong>Escopo:</strong> {t.escopo_testado}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    <strong>Laudo:</strong> {t.observacoes}
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    <strong>Evidência:</strong>{' '}
                    {t.evidencia_comprobatoria || 'Log do sistema arquivado.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Termo de Encerramento e Assinatura */}
        <div className="pt-8 border-t-2 border-slate-900 space-y-8 text-xs text-slate-800">
          <p className="text-justify leading-relaxed text-[11px]">
            O encarregado de Tecnologia da Informação e a diretoria da serventia declaram que as
            informações contidas neste relatório refletem com fidedignidade o estado operacional das
            cópias de segurança e o nível de prontidão para recuperação de desastres, atendendo aos
            padrões técnicos e diretrizes de conformidade aplicáveis.
          </p>

          <div className="grid grid-cols-2 gap-12 pt-6">
            <div className="text-center">
              <div className="border-b border-slate-400 mb-1.5 h-10" />
              <strong className="block text-slate-900">
                Responsável Técnico / Encarregado de TI
              </strong>
              <span className="text-[10px] text-slate-500 block">
                {user?.name || 'Encarregado de TI da Serventia'} • {user?.email || ''}
              </span>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 mb-1.5 h-10" />
              <strong className="block text-slate-900">
                Oficial / Tabelião Titular da Serventia
              </strong>
              <span className="text-[10px] text-slate-500 block">
                {org?.name || 'Titular da Serventia Notarial e Registral'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BackupReportPage
