import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Printer,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Server,
  HardDriveDownload,
  FolderGit2,
  Lock,
  Network,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { PanelHeader } from '@/components/common/PanelHeader'
import {
  carregarDossieConsolidado,
  type DossieConsolidadoBundle,
  type ModuloStatusResumo,
} from '@/services/dossieService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'

export const DossiePage: React.FC = () => {
  const { user, organization } = useAuth()
  const orgId = user?.organization || organization?.id || ''
  const orgName = organization?.name || 'Serventia Notarial e Registral'
  const navigate = useNavigate()

  const [bundle, setBundle] = useState<DossieConsolidadoBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const data = await carregarDossieConsolidado(orgId, organization)
      setBundle(data)
      setLastUpdated(formatSpDateTime(new Date().toISOString()))
    } catch (err: any) {
      console.error('[DossiePage] Erro ao carregar dossiê:', err)
      setError('Não foi possível consolidar os dados do dossiê da serventia.')
    } finally {
      setLoading(false)
    }
  }, [orgId, organization])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Identificação do ícone de cada módulo
  const getModuloIcon = (id: string) => {
    switch (id) {
      case 'governanca':
        return Users
      case 'lgpd':
        return Lock
      case 'ativos':
        return Server
      case 'infraestrutura':
        return Network
      case 'seguranca':
        return ShieldCheck
      case 'backup':
        return HardDriveDownload
      case 'evidencias':
        return FolderGit2
      default:
        return FileText
    }
  }

  // Lista de pendências que impedem o dossiê
  const pendenciasImpedimento = useMemo(() => {
    if (!bundle) return []
    return bundle.itensAvaliados.filter(
      (it) => it.status === 'pendente' || it.status === 'nao_conforme',
    )
  }, [bundle])

  // Planos de ação abertos
  const planosAbertos = useMemo(() => {
    if (!bundle) return []
    return bundle.planosAcao.filter((p) => p.status === 'aberto' || p.status === 'em_andamento')
  }, [bundle])

  const isDossieCompleto =
    bundle?.organization?.provimento_class === 'C2' ||
    bundle?.organization?.provimento_class === 'C3' ||
    bundle?.matrizConsolidada.serventiaClasse === 'C2' ||
    bundle?.matrizConsolidada.serventiaClasse === 'C3'

  return (
    <div className="space-y-6">
      {/* Cabeçalho Padrão CSCTI */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Visão Geral', href: '/' },
          { label: 'Governança', href: '/conformidade' },
          { label: 'Dossiê Consolidado' },
        ]}
        icon={FileText}
        title="Dossiê Consolidado"
        badgeText="Documento Oficial de Apresentação"
        subtitle="Dossiê técnico e probatório completo da serventia que une todos os módulos em um único documento auditável para apresentação ao Juiz Corregedor."
        serventiaNome={orgName}
        serventiaAtiva={Boolean(organization?.status !== 'inativa')}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadData}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/relatorios/consolidado">
              <Button className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-sm">
                <Printer className="w-3.5 h-3.5" />
                <span>Gerar Dossiê A4</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Alerta de erro */}
      {error && (
        <Card className="border-red-200 bg-red-50 text-red-900">
          <CardContent className="p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-7">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 1. KPIs no Topo (KpiCard padronizado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Conformidade Geral da Matriz"
          value={loading || !bundle ? '—' : `${bundle.matrizConsolidada.percentualGeral}%`}
          supportText={
            loading || !bundle
              ? 'Calculando...'
              : `${bundle.matrizConsolidada.totalComprovados} de ${bundle.matrizConsolidada.totalItens} itens comprovados`
          }
          icon={ShieldCheck}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
          href="/conformidade"
          infoTooltip="Percentual geral apurado item a item a partir do banco de dados real da serventia logada."
        />

        <KpiCard
          label="Itens Comprovados"
          value={loading || !bundle ? '—' : `${bundle.matrizConsolidada.totalComprovados}`}
          secondaryValue={
            loading || !bundle ? '' : `/ ${bundle.matrizConsolidada.totalItens} total`
          }
          supportText={
            loading || !bundle
              ? '...'
              : `${bundle.matrizConsolidada.totalParciais} parciais · ${bundle.matrizConsolidada.totalPendentes} pendentes`
          }
          icon={CheckCircle2}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-700"
          href="/conformidade?tab=itens"
          infoTooltip="Total de itens com prova técnica vinculada no ambiente do cliente."
        />

        <KpiCard
          label="Pendências / Planos de Ação"
          value={
            loading || !bundle
              ? '—'
              : `${bundle.planosRaioX.abertos + bundle.planosRaioX.emAndamento}`
          }
          secondaryValue={
            loading || !bundle
              ? ''
              : `${bundle.planosRaioX.criticosAltaVencidos > 0 ? `(${bundle.planosRaioX.criticosAltaVencidos} vencidos)` : 'no prazo'}`
          }
          supportText={
            loading || !bundle
              ? '...'
              : `${bundle.planosRaioX.concluidos} planos concluídos no histórico`
          }
          icon={ShieldAlert}
          iconBgColor={
            bundle && bundle.planosRaioX.criticosAltaVencidos > 0 ? 'bg-rose-50' : 'bg-amber-50'
          }
          iconColor={
            bundle && bundle.planosRaioX.criticosAltaVencidos > 0
              ? 'text-rose-700'
              : 'text-amber-700'
          }
          href="/planos-de-acao"
          infoTooltip="Planos de ação abertos para saneamento dos itens pendentes da serventia."
        />

        <KpiCard
          label="Prazo Etapas 1 e 2"
          value={loading || !bundle ? '—' : `${bundle.matrizConsolidada.diasRestantesEtapas1e2}d`}
          secondaryValue={
            loading || !bundle ? '' : `Classe ${bundle.matrizConsolidada.serventiaClasse}`
          }
          supportText={
            loading || !bundle
              ? '...'
              : `${bundle.matrizConsolidada.prazoEtapas1e2Dias} dias previstos para regularização`
          }
          icon={Clock}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-700"
          href="/conformidade?tab=prazos"
          infoTooltip="Contagem regressiva regulatória conforme a classe da serventia."
        />
      </div>

      {/* 2. Banner de Chamada para o Dossiê A4 Oficial */}
      <Card className="border-slate-200/90 bg-gradient-to-r from-[#0B2545] to-[#124E78] text-white rounded-xl shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#D4AF37] text-slate-950 font-bold text-[10px] hover:bg-[#D4AF37]">
                Dossiê Oficial Correcional
              </Badge>
              <span className="text-xs text-slate-200">
                {isDossieCompleto ? 'Padrão Integral com Hashes SHA-256' : 'Padrão Simplificado'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Pronto para emissão e protocolo correcional
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              O relatório consolida identificação institucional, síntese executiva por módulo,
              inventário de ativos, rotinas de backup com Validação Externa (NOC), laudos de
              infraestrutura, cobertura de segurança, inventário LGPD e termo formal com guarda por
              5 anos.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full md:w-auto">
            <Link to="/relatorios/consolidado" className="w-full md:w-auto">
              <Button
                size="lg"
                className="w-full bg-[#D4AF37] hover:bg-[#c49f27] text-slate-950 font-bold text-xs h-10 gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Visualizar e Imprimir Dossiê A4</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 3. Painel: Resumo por Etapa (6 etapas sequenciais/cumulativas) */}
      <Card className="border-slate-200/90 rounded-xl bg-white shadow-2xs">
        <PanelHeader
          title="Resumo por Etapa de Implantação"
          subtitle="6 etapas sequenciais e cumulativas — a próxima etapa só é desbloqueada quando a anterior estiver 100% comprovada"
          icon={Layers}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-700"
          badge={
            bundle && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5 bg-slate-50 text-slate-700 border-slate-300 font-semibold"
              >
                {bundle.matrizConsolidada.etapas.filter((e) => e.concluida).length} de 6 concluídas
              </Badge>
            )
          }
          viewAllLink={{
            label: 'Ver detalhes na Matriz',
            href: '/conformidade?tab=etapas',
          }}
        />

        <CardContent className="p-5 sm:p-6 space-y-4">
          {loading || !bundle ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundle.matrizConsolidada.etapas.map((etapa) => {
                const statusLabel = etapa.concluida
                  ? 'Concluída'
                  : etapa.bloqueada
                    ? 'Bloqueada'
                    : 'Em andamento'

                const badgeBg = etapa.concluida
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : etapa.bloqueada
                    ? 'bg-slate-100 text-slate-600 border-slate-300'
                    : 'bg-blue-50 text-blue-800 border-blue-300'

                return (
                  <div
                    key={etapa.numero}
                    className={`p-4 rounded-xl border transition-all ${
                      etapa.concluida
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : etapa.bloqueada
                          ? 'border-slate-200 bg-slate-50/50 opacity-80'
                          : 'border-blue-200 bg-blue-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Etapa {etapa.numero}
                        </span>
                        <h4
                          className="text-xs font-bold text-slate-900 truncate mt-0.5"
                          title={etapa.titulo}
                        >
                          {etapa.titulo.split('—')[1] || etapa.titulo}
                        </h4>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold shrink-0 ${badgeBg}`}
                      >
                        {statusLabel}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 min-h-[32px] leading-snug">
                      {etapa.descricao}
                    </p>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Progresso</span>
                        <span className="font-bold text-slate-900">
                          {etapa.percentual}% ({etapa.itensComprovados}/{etapa.itensTotal})
                        </span>
                      </div>
                      <Progress value={etapa.percentual} className="h-2" />
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
                      <span>
                        {etapa.itensPendentes > 0
                          ? `${etapa.itensPendentes} pendente(s)`
                          : 'Sem pendências'}
                      </span>
                      <Link
                        to={`/conformidade?etapa=${etapa.numero}`}
                        className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Itens</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Painel: Comprovação por Módulo */}
      <Card className="border-slate-200/90 rounded-xl bg-white shadow-2xs">
        <PanelHeader
          title="Comprovação por Módulo do Sistema"
          subtitle="Status e dados reais coletados de cada módulo que alimentam a Matriz de Conformidade"
          icon={ShieldCheck}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
          badge={
            <Badge
              variant="outline"
              className="text-xs px-2 py-0.5 bg-slate-50 text-slate-700 border-slate-300"
            >
              7 Módulos Conectados
            </Badge>
          }
        />

        <CardContent className="p-5 sm:p-6">
          {loading || !bundle ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundle.modulosResumo.map((mod) => {
                const IconComponent = getModuloIcon(mod.id)
                return (
                  <Card
                    key={mod.id}
                    className="border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-[#0B2545]/5 text-[#0B2545] flex items-center justify-center shrink-0 border border-[#0B2545]/10">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{mod.titulo}</h4>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Origem: {mod.moduloOrigem}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            mod.statusGeral === 'conforme'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : mod.statusGeral === 'parcial'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {mod.percentual}%
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                        {mod.descricao}
                      </p>

                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                        <span className="font-semibold block text-slate-900 text-[10px] uppercase tracking-wider mb-0.5">
                          Evidências no Módulo
                        </span>
                        <span className="line-clamp-1">{mod.detalhesTexto}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">
                          {mod.comprovados} de {mod.totalItens} comprovados
                        </span>
                        <Link
                          to={mod.linkModulo}
                          className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>Acessar Módulo</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Painéis Lado a Lado: Cronograma de Prazos & Pendências que impedem o dossiê */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel: Próximos Prazos */}
        <Card className="border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <PanelHeader
              title="Cronograma de Prazos da Serventia"
              subtitle={`Enquadramento: Classe ${bundle?.matrizConsolidada.serventiaClasse || '2'} — Prazos regulatórios cumulativos`}
              icon={Calendar}
              iconBgColor="bg-blue-50"
              iconColor="text-blue-700"
              viewAllLink={{
                label: 'Ver cronograma completo',
                href: '/conformidade?tab=prazos',
              }}
            />

            <CardContent className="p-5 sm:p-6 space-y-4">
              {loading || !bundle ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Prazo Etapas 1 e 2 */}
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>Etapas 1 e 2 (Governança, Infraestrutura e Backup)</span>
                      <span className="text-blue-800 text-sm font-extrabold">
                        {bundle.matrizConsolidada.diasRestantesEtapas1e2} dias restantes
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Prazo regulatório de {bundle.matrizConsolidada.prazoEtapas1e2Dias} dias
                      corridos para conclusão e validação probatória.
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>
                        Status atual:{' '}
                        <strong>
                          {bundle.matrizConsolidada.etapas[0]?.percentual ?? 0}% (Etapa 1) e{' '}
                          {bundle.matrizConsolidada.etapas[1]?.percentual ?? 0}% (Etapa 2)
                        </strong>
                      </span>
                      <span className="text-blue-700 font-semibold">Prioritário</span>
                    </div>
                  </div>

                  {/* Prazo Etapas 1 a 5 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>Etapas 1 a 5 (Adequação Integral do Ambiente)</span>
                      <span className="text-slate-800 text-sm font-extrabold">
                        {bundle.matrizConsolidada.mesesRestantesEtapas1a5} meses restantes
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Prazo limite de {bundle.matrizConsolidada.prazoEtapas1a5Meses} meses para
                      conclusão de todos os testes periódicos, EDR e telemetria.
                    </p>
                  </div>

                  {/* Declaração Anual de Conformidade */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>Declaração Anual de Conformidade</span>
                      <span className="text-emerald-700 text-xs font-bold uppercase">
                        Protocolo Anual
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Apresentação obrigatória do dossiê final atualizado à Corregedoria Geral da
                      Justiça até 1º de dezembro de cada ano.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Painel: Pendências que impedem o dossiê */}
        <Card className="border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <PanelHeader
              title="Pendências que Impedem a Plena Conformidade"
              subtitle={`${pendenciasImpedimento.length} item(ns) pendente(s) na matriz e ${planosAbertos.length} plano(s) de ação em aberto`}
              icon={ShieldAlert}
              iconBgColor="bg-amber-50"
              iconColor="text-amber-700"
              viewAllLink={{
                label: 'Gerenciar Planos de Ação',
                href: '/planos-de-acao',
              }}
            />

            <CardContent className="p-5 sm:p-6 space-y-3">
              {loading || !bundle ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pendenciasImpedimento.length === 0 ? (
                <div className="p-6 text-center space-y-2 border border-emerald-200 bg-emerald-50/30 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-xs font-bold text-emerald-950">
                    Nenhuma pendência crítica identificada
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Todos os itens da matriz de conformidade possuem comprovação técnica cadastrada.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {pendenciasImpedimento.slice(0, 6).map((it) => (
                    <div
                      key={it.item_codigo}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            Item {it.item_codigo}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {it.catalog?.titulo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {it.observacoes || it.catalog?.descricao}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Origem: {it.catalog?.modulo_origem} · Etapa {it.catalog?.etapa}
                        </div>
                      </div>

                      <div className="shrink-0 text-right space-y-1">
                        <Badge
                          variant="outline"
                          className={
                            it.status === 'nao_conforme'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 text-[10px]'
                              : 'bg-amber-50 text-amber-800 border-amber-300 text-[10px]'
                          }
                        >
                          {it.status === 'nao_conforme' ? 'Não Conforme' : 'Pendente'}
                        </Badge>
                        <div>
                          <Link
                            to={it.link_comprovante || `/conformidade?item=${it.item_codigo}`}
                            className="text-[10px] text-blue-700 font-semibold hover:underline block"
                          >
                            Resolver
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendenciasImpedimento.length > 6 && (
                    <p className="text-[10px] text-center text-slate-500 pt-1">
                      + {pendenciasImpedimento.length - 6} outro(s) item(ns) pendente(s). Consulte a
                      aba de Itens ou Planos de Ação.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* 6. Ação no Rodapé */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Dossiê Consolidado de Apresentação</h4>
            <p className="text-xs text-slate-500">
              Versão impressa com 10 seções, termos assinados, hashes de integridade SHA-256 e
              declaração de autenticidade.
            </p>
          </div>
        </div>

        <Link to="/relatorios/consolidado" className="shrink-0 w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-10 gap-2">
            <Printer className="w-4 h-4" />
            <span>Gerar Dossiê A4</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default DossiePage
