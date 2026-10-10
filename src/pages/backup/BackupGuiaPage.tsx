import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  ArrowLeft,
  Layers,
  Sliders,
  Calendar,
  HardDrive,
  FileCheck2,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Info,
  Clock,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Mail,
  Percent,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Terminal,
  Server,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CopyableCodeProps {
  text: string
  label?: string
}

const CopyableCode: React.FC<CopyableCodeProps> = ({ text, label }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silencioso se clipboard não disponível
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-md bg-slate-900 text-slate-100 font-mono text-xs border border-slate-800">
      <div className="truncate flex-1">
        {label && (
          <span className="text-slate-400 select-none mr-2 font-sans text-[11px]">{label}:</span>
        )}
        <span className="text-emerald-400 selection:bg-emerald-800 selection:text-white">
          {text}
        </span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
        title="Copiar para a área de transferência"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  )
}

export const BackupGuiaPage: React.FC = () => {
  const scrollToStep = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const roadmapSteps = [
    {
      id: 'etapa-1-escopo',
      num: '1',
      title: 'Escopo',
      subtitle: 'Exigências e Escopo',
      icon: Layers,
      tab: 'escopo',
    },
    {
      id: 'etapa-2-planos',
      num: '2',
      title: 'Planos',
      subtitle: 'RTO / RPO / 3-2-1',
      icon: Sliders,
      tab: 'planos',
    },
    {
      id: 'etapa-3-rotinas',
      num: '3',
      title: 'Rotinas',
      subtitle: 'Quem executa e quando',
      icon: Calendar,
      tab: 'rotinas',
    },
    {
      id: 'etapa-4-fontes',
      num: '4',
      title: 'Regras & Adapt.',
      subtitle: 'Fontes (Rotinas) vs Regras',
      icon: HardDrive,
      tab: 'regras',
    },
    {
      id: 'etapa-5-evidencias',
      num: '5',
      title: 'Evidências',
      subtitle: 'Comprovantes e Laudos',
      icon: FileCheck2,
      tab: 'evidencias',
    },
    {
      id: 'etapa-6-execucoes',
      num: '6',
      title: 'Execuções',
      subtitle: 'Histórico e Auditoria',
      icon: PlayCircle,
      tab: 'execucoes',
    },
    {
      id: 'etapa-7-ocorrencias',
      num: '7',
      title: 'Ocorrências',
      subtitle: 'Falhas e Resolução',
      icon: AlertTriangle,
      tab: 'ocorrencias',
    },
    {
      id: 'etapa-8-testes',
      num: '8',
      title: 'Testes',
      subtitle: 'Restauração Provada',
      icon: CheckCircle2,
      tab: 'testes',
    },
    {
      id: 'etapa-9-noc',
      num: '9',
      title: 'Validação Externa (NOC)',
      subtitle: 'Atestado Diário & Convergência',
      icon: UserCheck,
      tab: 'evidencias',
    },
  ]

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Top Header / Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/backup">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-600 hover:text-slate-900 gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Backup
              </Button>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">Documentação e Ajuda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-[#0B2545]" />
            Manual de Uso — Ciclo de Backup e Continuidade
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            Guia prático e operacional passo a passo para configurar a política de continuidade de
            ponta a ponta na plataforma <strong>CSCTI - Compliance</strong>. Siga a ordem
            recomendada para habilitar a avaliação automatizada.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link to="/backup">
            <Button
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold shadow-2xs gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Acessar Módulo /backup
            </Button>
          </Link>
        </div>
      </div>

      {/* Seção 0: Comece aqui — Sequência Recomendada (Roadmap Clicável) */}
      <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#0B2545] text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900">
                Comece aqui — Sequência Recomendada
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="bg-amber-100/80 text-amber-900 border-amber-300 text-xs font-semibold"
            >
              Regra fundamental: configure na ordem — cada etapa depende da anterior
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-600 mt-1">
            O ciclo foi desenhado com consistência relacional: primeiro define-se o compromisso
            formal (Escopo e Planos), depois amarram-se os agendamentos e nomes técnicos (Rotinas e
            Fontes com Aliases) e, por fim, processam-se os comprovantes (Evidências) para gerar
            Execuções, Ocorrências e Testes de Recuperação.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2.5">
            {roadmapSteps.map((st) => {
              const Icon = st.icon
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => scrollToStep(st.id)}
                  className="group p-3 rounded-lg border border-slate-200/90 bg-white hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs transition text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-[#0B2545] text-slate-700 group-hover:text-white font-mono text-[11px] font-bold flex items-center justify-center transition">
                        {st.num}
                      </span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900 leading-tight">
                      {st.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{st.subtitle}</div>
                  </div>
                  <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Ver guia</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Como navegar:</strong> Clique em qualquer etapa acima para saltar diretamente
              para as instruções detalhadas ou use o botão &quot;Configurar agora no sistema&quot;
              dentro de cada card para abrir a aba correspondente no módulo /backup.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ETAPA 1 — ESCOPO */}
      <section id="etapa-1-escopo" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  1
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 1 — Escopo de Proteção &amp; Exigências de Salvaguarda
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-blue-800 bg-blue-50 border-blue-200"
                    >
                      Núcleo Centrado no Ativo
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Define <strong>QUAIS ATIVOS EXIGEM BACKUP</strong> (Local, Nuvem e/ou
                    Replicação) e agrupa os ativos que participarão dos escopos de salvaguarda.
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=escopo">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                >
                  Configurar Escopo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* O novo conceito centrado no ativo */}
            <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/70 text-blue-950 space-y-1.5 shadow-2xs">
              <span className="font-bold text-xs uppercase tracking-wide text-blue-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-700" />
                Conceito Central: Ativos, Exigências &amp; Escopo de Proteção
              </span>
              <p className="text-xs leading-relaxed text-blue-950 font-medium">
                Todo ativo importado do GLPI (ou cadastrado no Inventário de Ativos) aparece aqui
                automaticamente. Marque quais exigem backup e de que tipo: <strong>Local</strong>,{' '}
                <strong>Nuvem</strong> e/ou <strong>Replicação</strong>. Em seguida, crie o Escopo
                selecionando os ativos que dele participam. O Escopo alimenta os Planos, os Planos
                alimentam as Rotinas e as Fontes derivam dos Ativos em 1 clique.
              </p>
              <p className="text-[11px] text-blue-800 leading-snug">
                Nem todo ativo precisa de salvaguarda: alguns exigem apenas cópia local, outros
                nuvem, outros replicação contínua, e ativos sem marcação são neutros (não entram nas
                exigências de auditoria).
              </p>
            </div>

            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                A etapa de <strong>Escopo</strong> une o parque tecnológico em tempo real à
                governança de salvaguarda. Ela permite selecionar em lote as exigências técnicas de
                cada máquina ou banco de dados e agrupá-los formalmente em escopos sistêmicos contra
                os quais tudo é confrontado nas auditorias.
              </p>
            </div>

            {/* Por que existe */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Por que existe (o que prova)
              </h4>
              <p className="leading-relaxed">
                Prova ao juiz corregedor e a auditorias externas que o cartório sabe com precisão
                quais ativos existem, quais deles guardam dados críticos, quais modalidades de cópia
                (Local, Nuvem, Replicação) são mandatórias para cada um e quais rotinas comprovam
                essas garantias.
              </p>
            </div>

            {/* Como configurar passo a passo */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Como configurar passo a passo
              </h4>
              <ol className="space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Acesse a aba <strong>1. Escopo</strong>. No topo, a tabela lista todos os ativos
                    importados do GLPI ou cadastrados no inventário.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Para cada ativo, ative os toggles das modalidades exigidas:{' '}
                    <strong>Local</strong> (storage/disco interno), <strong>Nuvem</strong> (cópia
                    externa segura) e/ou <strong>Replicação</strong> (máquinas virtuais contínuas).
                    Ativos sem seleção permanecem como &quot;Não exige backup&quot;.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Clique no botão verde <strong>Salvar exigências</strong>. As alterações são
                    gravadas em lote e registradas de forma append-only no log de auditoria.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Na seção abaixo, crie o <strong>Escopo de Proteção</strong> (ex.:{' '}
                    <em>Base Central de Atos Notariais</em>) marcando exatamente quais ativos do
                    inventário farão parte deste escopo.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <span>
                    Avance para <strong>2. Planos</strong>: ao criar o plano, selecione este escopo
                    e os ativos vinculados aparecerão de imediato no formulário.
                  </span>
                </li>
              </ol>
            </div>

            {/* Dica / Destaque */}
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/60 text-blue-950 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold">Dica Operacional:</span>
                <p>
                  O escopo é a referência central do módulo: quando um laudo técnico for emitido
                  para qualquer comprovante, o sistema verifica se as máquinas e bancos listados
                  estão contidos no escopo formalmente aprovado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 2 — PLANOS */}
      <section id="etapa-2-planos" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 2 — Planos de Continuidade e Requisitos Técnicos
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border-indigo-200"
                    >
                      Estratégia 3-2-1
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Define <strong>COMO</strong> será protegido por estratégia técnica (RTO, RPO,
                    retenção e destinos).
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=planos">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
                >
                  Configurar Planos <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* Delimitação de abas: Fontes mora na aba 3; Regras & Adaptadores é a aba própria */}
            <div className="p-3.5 rounded-lg border-2 border-teal-200 bg-teal-50/60 text-teal-950 flex items-start gap-3">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-bold">Onde configurar o quê (abas separadas):</span>
                <p className="leading-relaxed">
                  As <strong>Fontes Protegidas</strong> são geridas dentro da aba{' '}
                  <strong>3. Rotinas &amp; Fontes</strong>, no modal &quot;Fontes &amp; Ativos&quot;
                  de cada rotina — é lá que se cadastra cada VM/banco, o tipo de fonte e os aliases
                  literais do comprovante. Já a aba <strong>Regras &amp; Adaptadores</strong> (menu
                  lateral) é uma etapa própria e independente: nela se cria as{' '}
                  <strong>regras de identificação</strong> (remetente, assunto e padrão de conteúdo)
                  e se escolhe o <strong>adaptador de extração</strong> que interpreta cada tipo de
                  comprovante. Fonte é <em>o que</em> é protegido; regra é <em>como</em> o sistema
                  reconhece e lê o e-mail que prova essa proteção.
                </p>
              </div>
            </div>

            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                O Plano de Backup estabelece a política técnica de salvaguarda. Ele agrupa os
                parâmetros operacionais:
                <strong> RTO</strong> (Recovery Time Objective — tempo máximo tolerável para
                restauração em horas),
                <strong> RPO</strong> (Recovery Point Objective — limite máximo aceitável de perda
                de dados em horas),
                <strong> Retenção</strong> (número de dias em que os backups são preservados), a{' '}
                <strong>Periodicidade Geral</strong> e os <strong>Destinos de Mídia</strong>.
              </p>
            </div>

            {/* Por que existe */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Por que existe (o que prova)
              </h4>
              <p className="leading-relaxed">
                Prova que a serventia segue a regra 3-2-1 e critérios mensuráveis de resiliência.
                Quando um comprovante chega, o sistema afere automaticamente se o RPO do comprovante
                respeita a tolerância cadastrada no plano.
              </p>
            </div>

            {/* Regra de Ouro em Callout */}
            <div className="p-3.5 rounded-lg border-2 border-amber-300 bg-amber-50/70 text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Regra de Ouro para o Cliente: Um Plano por Estratégia Diferente</span>
              </div>
              <p className="text-xs leading-relaxed">
                <strong>Nunca crie um plano por ferramenta!</strong> Crie planos por estratégia
                técnica distinta:
              </p>
              <ul className="list-disc pl-5 text-xs space-y-1 text-amber-900">
                <li>
                  <strong>Plano 1 (Estratégia Contínua Local):</strong> ex.:{' '}
                  <em>&quot;Veeam contínuo local — A cada 30 min&quot;</em> com RTO=2h, RPO=1h,
                  retenção de 30 dias e destino Local.
                </li>
                <li>
                  <strong>Plano 2 (Estratégia Noturna Nuvem):</strong> ex.:{' '}
                  <em>&quot;Acronis noturno só nuvem — Diário às 23h&quot;</em> com RTO=4h, RPO=24h,
                  retenção de 90 dias e destino Nuvem.
                </li>
                <li>
                  <strong>Plano 3 (Replicação / Cópia Externa):</strong> ex.:{' '}
                  <em>&quot;Cópia semanal / replicação off-site&quot;</em> com periodicidade semanal
                  e destino Replicação.
                </li>
              </ul>
            </div>

            {/* Como configurar passo a passo */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Como configurar passo a passo
              </h4>
              <ol className="space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Acesse a aba <strong>2. Planos</strong> e clique em{' '}
                    <strong>+ Novo Plano</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Selecione o <strong>Escopo Vinculado</strong> (dropdown com os escopos
                    cadastrados e o total de ativos de cada um). Ao selecionar, os ativos protegidos
                    por aquele escopo são exibidos em modo informativo com seus selos de exigência.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Dê um nome descritivo baseado na estratégia (ex.:{' '}
                    <em>Plano Contínuo de Produção (30 min)</em>) e defina os alvos de RTO, RPO e
                    Retenção.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Escolha a <strong>Periodicidade Geral</strong>: Diária, Semanal, Mensal ou{' '}
                    <em>&quot;A cada X minutos&quot;</em>. Nos intervalos em minutos, utilize os
                    atalhos rápidos <strong>15, 30, 60 ou 120 minutos</strong>. Se diária ou
                    superior, indique o horário da janela (ex.: 23:00).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <span>
                    Marque os <strong>Destinos de Mídia</strong> (multi-checkbox):{' '}
                    <em>Local (NAS/Storage interno)</em>, <em>Nuvem (Cloud/Wasabi/Azure/AWS)</em>{' '}
                    e/ou <em>Replicação (cópia externa / off-site)</em>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    6
                  </span>
                  <span>Salve o plano. Ele agora pode receber rotinas associadas.</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 3 — ROTINAS */}
      <section id="etapa-3-rotinas" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 3 — Rotinas de Execução e Aliases
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border-emerald-200"
                    >
                      Vínculo Rigoroso
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    As execuções concretas agendadas (quem executa, quando e com quais apelidos).
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=rotinas">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                >
                  Configurar Rotinas <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                A Rotina é a instância de execução real vinculada a um plano. Ela define a
                periodicidade concreta (ex.: incremental a cada 30 min ou full semanal aos
                domingos), o tipo de execução (Completo, Incremental ou Diferencial), o responsável
                técnico e, crucialmente, os <strong>Aliases / Apelidos</strong> da rotina.
              </p>
            </div>

            {/* Callout em Destaque — Caminho Simples */}
            <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/90 text-emerald-950 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Fluxo Rápido de Configuração (Caminho Simples)</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-emerald-950">
                1. Cadastre a rotina com os aliases do job &rarr; 2. Cole o comprovante em
                Evidências &rarr; 3. Abra o laudo &rarr; 4. Clique em &quot;Cadastrar fontes
                pendentes&quot;. O sistema cria as fontes com os nomes exatos do comprovante.
              </p>
              <p className="text-[11px] text-emerald-800 leading-snug">
                Você não precisa digitar manualmente o nome de cada máquina virtual ou ativo: o
                laudo detecta os itens do comprovante e permite criá-los com um único clique.
              </p>
            </div>

            {/* Como funciona o vínculo */}
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Mecanismo Chave: Vínculo Comprovante &rarr; Rotina por Igualdade Exata</span>
              </div>
              <p className="text-xs leading-relaxed">
                O motor do sistema avalia cada comprovante que chega confrontando o{' '}
                <strong>Nome do Job</strong> identificado no e-mail ou PDF contra o{' '}
                <strong>Nome da Rotina</strong> e todos os seus <strong>Aliases</strong>.
              </p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li>
                  A checagem usa <strong>igualdade normalizada</strong>: remove espaços extras e
                  ignora maiúsculas/minúsculas.
                </li>
                <li>
                  <strong>Não há adivinhação:</strong> se o nome no comprovante não casar
                  perfeitamente, a execução é registrada sem rotina vinculada e o laudo exibe o
                  alerta:{' '}
                  <em>
                    &quot;Nenhuma rotina corresponde ao job — cadastre o alias em Rotinas &amp;
                    Fontes&quot;
                  </em>
                  .
                </li>
              </ul>
            </div>

            {/* Como configurar passo a passo */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Como configurar passo a passo
              </h4>
              <ol className="space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Acesse a aba <strong>3. Rotinas &amp; Fontes</strong> e clique em{' '}
                    <strong>+ Nova Rotina</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Selecione o <strong>Plano Vinculado</strong>. O formulário exibe o breadcrumb da
                    cadeia de herança (Escopo &rarr; Plano &rarr; Rotina) e resume os ativos
                    herdados que receberão cobertura.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Defina o <strong>Nome da Rotina</strong> (ex.:{' '}
                    <em>Rotina Veeam Produção Local</em>) e ajuste a periodicidade e o horário.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Salve a rotina. No card, clique no botão{' '}
                    <strong>&quot;Fontes &amp; Ativos&quot;</strong>: o modal já lista todos os
                    ativos herdados com o botão <strong>&quot;Criar fonte deste ativo&quot;</strong>{' '}
                    em 1 clique, com preenchimento automático.
                  </span>
                </li>
              </ol>
            </div>

            {/* Subseção Detalhada: Botão e Modal "Fontes da Rotina" */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3 pt-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  O Botão e Modal &quot;Fontes da Rotina&quot; (O que esta rotina protege?)
                </h4>
              </div>
              <p className="text-xs leading-relaxed text-emerald-950">
                Cada rotina agrupa uma ou mais <strong>Fontes Protegidas</strong>. Quando um
                comprovante (e-mail do Veeam, PDF da Acronis, e-mail do NOC) chega, o sistema extrai
                cada item individual e confere se ele bate com as fontes vinculadas a esta rotina.
                Clicando no botão <strong>&quot;Fontes &amp; Ativos&quot;</strong> em qualquer
                rotina, abre-se o modal de gestão com 4 campos essenciais:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">1. Tipo de Fonte</span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Classifica a natureza do dado resguardado:
                    <strong> Banco de Dados</strong> (backup do banco, ex. PostgreSQL/WALs),
                    <strong> Máquina Virtual Inteira</strong> (backup por snapshot da VM completa no
                    Proxmox/VMware), <strong>Arquivos / PDF/A</strong> ou{' '}
                    <strong>Sistema / Aplicação</strong>.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">
                    2. Tipo de Execução da Fonte
                  </span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    <strong>Padrão da Rotina</strong> = herda o tipo definido na rotina (ex.
                    Incremental). Use outro valor (Completo/Diferencial) só se esta fonte tem ciclo
                    de execução próprio.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">
                    3. Vincular Ativo do Inventário
                  </span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    <strong>Opcional:</strong> conecta esta fonte a um ativo cadastrado em{' '}
                    <em>Ambiente &rarr; Ativos</em>. É este vínculo que permite ao dashboard apontar{' '}
                    <em>&quot;X máquinas protegidas&quot;</em> e cruzar o inventário contra as
                    rotinas.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">
                    4. Nome no Comprovante (Caminho / Identificação)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Texto <strong>EXATAMENTE igual</strong> ao que aparece no comprovante emitido
                    pelo software (ex.:{' '}
                    <code className="font-mono bg-slate-100 px-1">SPCM-PROTESTO</code> na tabela do
                    e-mail Veeam, <code className="font-mono bg-slate-100 px-1">BK-SPCM-ORION</code>{' '}
                    no relatório Acronis). O vínculo é feito por igualdade exata contra este nome e
                    os aliases.
                  </p>
                </div>
              </div>

              {/* Exemplos Prontos de Fontes */}
              <div className="p-3 rounded-lg bg-white border border-emerald-200 space-y-2 mt-2">
                <span className="text-xs font-bold text-emerald-950 block">
                  Exemplos Reais para Copiar no Modal de Fontes:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 text-xs">
                    <span className="font-semibold text-slate-800">Cenário Veeam (4 VMs):</span>
                    <p className="text-[11px] text-slate-600">
                      Cadastre cada VM como Tipo = <em>Máquina Virtual Inteira</em> e Nome no
                      Comprovante igual a:
                    </p>
                    <div className="space-y-1">
                      <CopyableCode text="SPCM-TDePJ" label="VM 1" />
                      <CopyableCode text="SPCM-REGWIN" label="VM 2" />
                      <CopyableCode text="SPCM-PROTESTO" label="VM 3" />
                      <CopyableCode text="SPCM-ORION" label="VM 4" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="font-semibold text-slate-800">Cenário Acronis / SocNoc:</span>
                    <p className="text-[11px] text-slate-600">
                      Cadastre as fontes com os nomes dos planos exatamente como constam no PDF:
                    </p>
                    <div className="space-y-1">
                      <CopyableCode text="BK-SPCM-TDePJ" label="Plano 1" />
                      <CopyableCode text="BK-SPCM-ORION" label="Plano 2" />
                      <CopyableCode text="BK-SPCM-PROTESTO" label="Plano 3" />
                      <CopyableCode text="BK-SPCM-REGWIN" label="Plano 4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 4 — REGRAS & ADAPTADORES (E SEPARAÇÃO CLARA DE FONTES) */}
      <section id="etapa-4-fontes" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  4
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 4 — Regras &amp; Adaptadores (Separação de Fontes)
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-teal-800 bg-teal-50 border-teal-200"
                    >
                      Reconhecimento Automático
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Separação fundamental: a aba real chama-se &quot;Regras &amp; Adaptadores&quot;,
                    enquanto &quot;Fontes&quot; fica dentro de &quot;Rotinas &amp; Fontes&quot;.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/backup?tab=regras">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 gap-1"
                  >
                    Regras &amp; Adaptadores <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
                <Link to="/backup?tab=rotinas">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1"
                  >
                    Rotinas &amp; Fontes <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* Esclarecimento de Separação de Abas */}
            <div className="p-4 rounded-xl border-2 border-teal-400 bg-teal-50/90 text-teal-950 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-teal-900">
                <Sliders className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  Separação Obrigatória: &quot;Fontes&quot; vs &quot;Regras &amp; Adaptadores&quot;
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-teal-950">
                • <strong>Fontes Protegidas</strong> (o que é protegido): ficam dentro da aba{' '}
                <strong>Rotinas &amp; Fontes</strong> (Etapa 3), acessíveis pelo botão{' '}
                <strong>&quot;Fontes &amp; Ativos&quot;</strong> de cada rotina.
                <br />• <strong>Regras &amp; Adaptadores</strong> (como reconhecer o comprovante): é
                uma <strong>aba dedicada</strong> no menu do módulo Backup, responsável por filtrar
                remetente, assunto e acionar os adaptadores de extração (VEEAM_HTML, ACRONIS_PDF,
                NOC_DIARIO, EMAIL_HTML_GENERICO).
              </p>
              <p className="text-[11px] text-teal-800 leading-snug">
                Nunca confunda as duas configurações: cadastrar a fonte na rotina vincula o ativo;
                cadastrar a regra ensina o sistema a identificar o e-mail que chega à caixa postal.
              </p>
            </div>

            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                O que são Fontes (dentro de Rotinas &amp; Fontes)
              </h4>
              <p className="leading-relaxed">
                As Fontes são os elementos específicos resguardados dentro de uma rotina: uma
                Máquina Virtual (snapshot/imagem), uma base de dados relacional (ex.: PostgreSQL,
                SQL Server, Oracle), uma pasta de rede ou um plano de proteção na nuvem. Cada fonte
                é ligada a um <strong>Ativo do Inventário</strong> e possui seus próprios{' '}
                <strong>Aliases</strong> literais para conferência contra os comprovantes.
              </p>
            </div>

            {/* Callout em Destaque — Caminho Simples */}
            <div className="p-4 rounded-xl border-2 border-teal-300 bg-teal-50/90 text-teal-950 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-teal-900">
                <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Fluxo Rápido de Configuração (Caminho Simples)</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-teal-950">
                1. No modal &quot;Fontes &amp; Ativos&quot;, clique em &quot;Criar fonte deste
                ativo&quot; para derivar automaticamente as origens a partir dos ativos herdados
                &rarr; 2. Opcionalmente, importe as fontes do último comprovante recebido &rarr; 3.
                As fontes derivadas ganham o badge &quot;Do Inventário&quot;.
              </p>
              <p className="text-[11px] text-teal-800 leading-snug">
                Você não precisa digitar novamente o nome do ativo: o sistema preenche o caminho com
                o nome do inventário, associa o tipo correspondente e mantém o vínculo de
                integridade em 1 clique.
              </p>
            </div>

            {/* Por que existe */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Por que existe (o que prova)
              </h4>
              <p className="leading-relaxed">
                Permite a <strong>auditoria granular item a item</strong>. Quando o Veeam faz backup
                de 4 VMs ou o Acronis protege 3 planos, o laudo de avaliação confronta cada item
                extraído do relatório contra as fontes cadastradas. Se uma VM estiver no relatório
                mas não cadastrada no sistema, ela ganha destaque âmbar de &quot;item sem fonte
                cadastrada&quot;.
              </p>
            </div>

            {/* Exemplos Reais Prontos para Copiar */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-slate-600" />
                Exemplos Reais Prontos para Copiar (use nos seus cadastros)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      Cenário A: Veeam Backup &amp; Replication
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white">
                      Ambiente Local
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    O relatório do Veeam traz um job principal com múltiplas VMs protegidas em lote.
                  </p>
                  <CopyableCode
                    text="Backup VMs GOLD, Backup VMs Gold - Diario"
                    label="Alias da Rotina"
                  />
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Cadastre 4 Fontes com estes nomes/aliases:
                    </span>
                    <CopyableCode text="SPCM-PROTESTO" label="Fonte 1 (VM)" />
                    <CopyableCode text="SRV-PRODUCAO" label="Fonte 2 (VM)" />
                    <CopyableCode text="SRV-ATOS-DB" label="Fonte 3 (Banco)" />
                    <CopyableCode text="SRV-DOCUMENTOS" label="Fonte 4 (VM)" />
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      Cenário B: Acronis Cyber Protect Cloud
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white">
                      Nuvem / SocNoc
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    O relatório diário traz planos de proteção com prefixos padronizados.
                  </p>
                  <CopyableCode
                    text="Acronis Cyber Protect Cloud, SocNoc Backup Nuvem"
                    label="Alias da Rotina"
                  />
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Cadastre as Fontes com estes nomes/aliases:
                    </span>
                    <CopyableCode text="BK-SPCM-TDePJ" label="Fonte 1" />
                    <CopyableCode text="BK-SPCM-ORION" label="Fonte 2" />
                    <CopyableCode text="BK-SPCM-PROTESTO" label="Fonte 3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dica Crítica */}
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-950 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold">Atenção Máxima com Nomes e Aliases:</span>
                <p>
                  O nome ou alias cadastrado no sistema{' '}
                  <strong>tem que ser literalmente igual</strong> ao texto que aparece no
                  comprovante. Diferenças de um hífen, underline ou sufixo impedem o reconhecimento
                  automático. Caso o software use nomes técnicos diferentes do nome usual na
                  serventia, cadastre ambos no campo de aliases separados por vírgula.
                </p>
              </div>
            </div>

            {/* Subseção: Regras de Identificação — como o sistema reconhece seus e-mails */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="p-3.5 rounded-lg border-2 border-slate-300 bg-white shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-800 text-white">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Delimitação: Fontes (aba 3) × Regras &amp; Adaptadores (aba própria, menu
                    lateral)
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 mt-2">
                  A subseção abaixo — <strong>Regras de Identificação</strong> e{' '}
                  <strong>Adaptadores de Extração</strong> — documenta a aba{' '}
                  <strong>separada</strong> &quot;Regras &amp; Adaptadores&quot; (entrada própria no
                  menu lateral do módulo /backup), e não o modal &quot;Fontes &amp; Ativos&quot; da
                  Etapa 3. Fonte é <em>o que</em> é protegido (Etapa 3, aba Rotinas &amp; Fontes);
                  regra é <em>como</em> o sistema reconhece e interpreta o e-mail que prova a
                  proteção (aba Regras &amp; Adaptadores).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-teal-100 text-teal-800">
                  <Sliders className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Regras de Identificação — como o sistema reconhece seus e-mails
                </h4>
              </div>

              <p className="leading-relaxed">
                A aba <strong>Regras &amp; Adaptadores</strong> automatiza o reconhecimento dos
                e-mails e relatórios de backup que chegam à caixa postal de monitoramento. Cada{' '}
                <strong>regra de identificação</strong> combina critérios de triagem com um{' '}
                <strong>adaptador de extração especializado</strong>.
              </p>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 space-y-2 text-xs">
                <div className="font-bold text-slate-800">
                  Anatomia de uma Regra de Identificação:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <strong className="text-slate-900 block mb-0.5">Filtro Remetente</strong>
                    <span className="text-slate-600">
                      Endereço ou domínio de envio (ex.: <em>@proitcs.com.br</em> ou <em>veeam@</em>
                      ).
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <strong className="text-slate-900 block mb-0.5">Filtro Assunto</strong>
                    <span className="text-slate-600">
                      Palavras-chave contidas no subject (ex.: <em>ANALISE PREVENTIVA DIARIA</em>,{' '}
                      <em>Backup Copy</em>, <em>Replication</em>, <em>SocNoc</em>).
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <strong className="text-slate-900 block mb-0.5">Padrão Conteúdo</strong>
                    <span className="text-slate-600">
                      Expressão presente no corpo da mensagem (ex.: <em>Backup Copy job:</em> ou{' '}
                      <em>Success</em>).
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Adaptadores de Extração Disponíveis:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-mono">
                        VEEAM_HTML
                      </Badge>
                      <span className="font-bold text-slate-900 text-[11px]">
                        Veeam B&amp;R 12.x / Jobs HTML
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Lê a tabela completa de VMs do e-mail oficial do Veeam, extraindo tamanho,
                      duração, taxa de transferência e status individual de cada máquina.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-mono">
                        ACRONIS_PDF
                      </Badge>
                      <span className="font-bold text-slate-900 text-[11px]">
                        Relatório PDF Acronis / SocNoc
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Extrai dados estruturados do anexo PDF diário da Acronis, identificando planos
                      de proteção na nuvem e resultados consolidados.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-mono">
                        NOC_DIARIO
                      </Badge>
                      <span className="font-bold text-slate-900 text-[11px]">
                        Análise Preventiva Diária do NOC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Processa e-mails diários de Validação Externa enviados pela equipe de
                      suporte/NOC com resumo preventivo das rotinas executadas.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-mono">
                        EMAIL_HTML_GENERICO
                      </Badge>
                      <span className="font-bold text-slate-900 text-[11px]">
                        Leitor Genérico Universal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Leitor padrão para scripts customizados, Bacula, pg_dump, shell scripts ou
                      qualquer notificação de backup em texto ou HTML.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/60 text-blue-950 space-y-1">
                  <span className="text-xs font-bold block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                    Modelos Rápidos de Identificação
                  </span>
                  <p className="text-[11px] leading-relaxed text-blue-900">
                    Ao criar uma nova regra, clique nos botões de <strong>
                      Modelos Rápidos
                    </strong> (
                    <em>Veeam Backup Job</em>, <em>Veeam Copy Job</em>,{' '}
                    <em>Acronis (PDF SocNoc)</em> ou <em>NOC Diário</em>). Eles preenchem de
                    imediato os critérios típicos recomendados — basta ajustar o remetente
                    específico da sua serventia se for diferente.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 space-y-1">
                  <span className="text-xs font-bold block flex items-center gap-1.5 text-slate-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Destino: &quot;Auto-detectada&quot; vs &quot;Fonte Específica&quot;
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Quando o campo <em>Vincular a Fonte Específica</em> fica em branco, a regra
                    opera em modo <strong>Auto-detectada</strong>: a vinculação com a fonte e rotina
                    é resolvida automaticamente por igualdade de nomes e aliases. Se preferir forçar
                    que todas as evidências capturadas por esta regra alimentem sempre um destino
                    fixo, escolha uma fonte específica da lista.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 5 — EVIDÊNCIAS */}
      <section id="etapa-5-evidencias" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  5
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 5 — Evidências, Hash SHA-256 e Laudos
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-purple-800 bg-purple-50 border-purple-200"
                    >
                      Pipeline em 7 Passos
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Comprovantes brutos recebidos via e-mail IMAP ou colados manualmente, com
                    integridade criptográfica.
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=evidencias">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50 gap-1"
                >
                  Ver Evidências <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                As Evidências são os comprovantes autênticos gerados pelas ferramentas de backup ou
                operadores de NOC. Elas chegam de forma contínua via ingestão de e-mail IMAP
                monitorada pelo sistema ou podem ser coladas/anexadas manualmente no botão{' '}
                <strong>&quot;Registrar Comprovante&quot;</strong>.
              </p>
            </div>

            {/* Pipeline em 7 Passos */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                O Pipeline Automatizado de Ingestão em 7 Passos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                {[
                  { step: '1', title: 'Chegada', desc: 'E-mail IMAP ou colado manual' },
                  { step: '2', title: 'Identificação', desc: 'Regra por remetente e assunto' },
                  { step: '3', title: 'Extração', desc: 'Adaptador lê status, job e VMs' },
                  { step: '4', title: 'SHA-256', desc: 'Hash criptográfico (sem duplicação)' },
                  { step: '5', title: 'Execução', desc: 'Gera registro formal de cópia' },
                  { step: '6', title: 'Avaliação', desc: 'Laudo de conformidade técnico' },
                  { step: '7', title: 'Ocorrência', desc: 'Abertura automática se houver falha' },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/40 flex flex-col justify-between"
                  >
                    <div>
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center mb-1">
                        {item.step}
                      </span>
                      <p className="text-xs font-bold text-purple-950">{item.title}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REGRA DA DATA OPERACIONAL: data_email como verdade do comprovante */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-700" />
                Regra da Data Operacional — o relógio da prova é a data do comprovante (data_email)
              </h4>
              <div className="p-3.5 rounded-lg border-2 border-purple-300 bg-purple-50/60 text-purple-950 space-y-2">
                <p className="text-xs leading-relaxed">
                  O <strong>RPO</strong> (Recovery Point Objective), a{' '}
                  <strong>&quot;execução mais recente&quot;</strong> e a{' '}
                  <strong>janela de comprovação</strong> sempre utilizam a{' '}
                  <strong>data/hora do e-mail comprovante</strong> (campo <code>data_email</code>),{' '}
                  <strong>nunca a data de processamento no sistema</strong> — requisito técnico
                  indispensável para a comprovação contínua (ex.: rotinas a cada 30 minutos).
                </p>
                <div className="p-2.5 rounded bg-white border border-purple-200 text-xs space-y-1">
                  <span className="font-bold text-purple-900 block">
                    Ordem rigorosa de extração da data_email:
                  </span>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-700 text-[11px]">
                    <li>
                      <strong>Data por extenso no corpo do relatório:</strong> ex.{' '}
                      <code className="font-mono bg-purple-50 text-purple-900 px-1">
                        &quot;sexta-feira, 9 de outubro de 2026 08:35:08&quot;
                      </code>
                    </li>
                    <li>
                      <strong>Cabeçalho MIME:</strong> header{' '}
                      <code className="font-mono">Date:</code> do arquivo EML
                    </li>
                    <li>
                      <strong>Campo do agente local:</strong> carimbo de transmissão do agente
                      homologado
                    </li>
                    <li>
                      <strong>Carimbos adicionais do corpo:</strong> timestamps estruturados de
                      início e fim da tarefa
                    </li>
                  </ol>
                  <p className="text-[11px] font-semibold text-red-700 pt-1">
                    ⚠️ A linha <code className="font-mono">&quot;Created by ... at ...&quot;</code>{' '}
                    do Veeam é <strong>explicitamente IGNORADA</strong> pelo extrator: ela indica a
                    data/hora em que o job foi criado na console do Veeam, e não a data em que o
                    backup foi executado.
                  </p>
                </div>
                <p className="text-xs leading-relaxed">
                  Cada execução comprova <strong>somente a modalidade que o job demonstra</strong>:{' '}
                  <code className="font-mono">Backup job:</code> → <strong>Local</strong>,{' '}
                  <code className="font-mono">Copy job:</code> → <strong>Nuvem</strong>,{' '}
                  <code className="font-mono">Replication job:</code> → <strong>Replicação</strong>.
                  Job ambíguo <strong>não comprova nada</strong>. Um comprovante novo para o mesmo
                  job gera uma execução nova e <strong>substitui a anterior no cálculo</strong> — o
                  processo é idempotente pelo hash SHA-256 do conteúdo (o mesmo e-mail nunca é
                  processado duas vezes).
                </p>
              </div>
            </div>

            {/* O que o "Ver Laudo" avalia */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-slate-800">
                <FileCheck2 className="w-4 h-4 text-purple-700 shrink-0" />
                <span>O que você encontra ao clicar em &quot;Ver Laudo&quot;</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Cada evidência processada disponibiliza um laudo técnico completo, auditável item
                por item:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <strong>1. Identificação e Regra:</strong> qual regra casou remetente/assunto e
                  qual adaptador processou.
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <strong>2. Vínculo de Rotina:</strong> nome da rotina encontrada via match ou
                  indicação de alias faltante.
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <strong>3. Status do Job:</strong> sucesso, atenção ou erro reportado pela
                  ferramenta.
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <strong>4. Cobertura de Fontes:</strong> lista de VMs/bancos presentes, com
                  destaque âmbar para não cadastradas.
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <strong>5. Destino e RPO:</strong> confirma se o destino atende ao plano e se o
                  intervalo de cópia está no prazo.
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <strong>6. Veredito Final:</strong> parecer conclusivo em português claro
                  (Conforme, Atenção ou Não Conforme).
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 6 — EXECUÇÕES */}
      <section id="etapa-6-execucoes" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  6
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 6 — Execuções Concluídas e Auditoria
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-amber-800 bg-amber-50 border-amber-200"
                    >
                      Rastreabilidade Total
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    O histórico formal de cada backup realizado, com laudo associado e trilha
                    imutável.
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=execucoes">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-amber-700 border-amber-200 hover:bg-amber-50 gap-1"
                >
                  Ver Execuções <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                Cada execução representa um evento de backup consumado: data e horário de
                início/término, tamanho transferido, destino do armazenamento, status (Sucesso,
                Parcial ou Falha), origem do registro (automático via e-mail ou manual) e o laudo
                técnico gerado.
              </p>
            </div>

            {/* Por que existe */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Por que existe (o que prova)
              </h4>
              <p className="leading-relaxed">
                É a prova fática cabal de que a cópia de segurança existiu e foi aferida. O botão{' '}
                <strong>&quot;Ver Laudo&quot;</strong>
                em cada linha da tabela reabre a avaliação original daquele momento do tempo,
                garantindo que a serventia nunca dependa da memória de operadores.
              </p>
            </div>

            {/* Exclusão e Auditoria */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-slate-900">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Exclusão Individual e em Lote com Justificativa Obrigatória</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Operadores com perfil <strong>Administrador</strong> ou <strong>Suporte</strong>{' '}
                podem excluir execuções (individualmente ou em lote através da seleção múltipla). No
                entanto, <strong>a justificativa da exclusão é estritamente obrigatória</strong>
                e é gravada de forma indelével na <em>Trilha de Auditoria</em> do sistema,
                registrando quem excluiu, quando, o motivo e os dados do item.
              </p>
              <p className="text-xs leading-relaxed text-slate-600">
                Execuções excluídas <strong>somem do cômputo</strong> da Proteção Efetiva, do
                confronto por ativo e do Relatório Comprobatório — a justificativa permanece
                disponível na Trilha de Auditoria, garantindo rastreabilidade append-only. A data
                exibida em cada execução é a <strong>data do comprovante (data_email)</strong>, no
                fuso de São Paulo, e não a data de processamento.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 7 — OCORRÊNCIAS */}
      <section id="etapa-7-ocorrencias" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  7
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 7 — Ocorrências e Tratamento de Desvios
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-red-800 bg-red-50 border-red-200"
                    >
                      Gestão de Falhas
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Incidentes abertos automaticamente pelo sistema ou lançados manualmente para
                    correção.
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=ocorrencias">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50 gap-1"
                >
                  Ver Ocorrências <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                As Ocorrências registram tudo o que saiu do padrão previsto: um job que falhou com
                erro no Veeam/Acronis, uma VM que foi detectada no comprovante mas não consta no
                escopo formal, um lapso temporal onde uma rotina diária não recebeu comprovante
                dentro da tolerância de RPO ou espaço em disco insuficiente no destino.
              </p>
            </div>

            {/* Como funciona */}
            <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/50 text-red-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                <span>Nascimento Automático e Resolução com Registro de Tratamento</span>
              </div>
              <p className="text-xs leading-relaxed">
                Quando a avaliação técnica da etapa 5 detecta uma não conformidade, a ocorrência
                nasce automaticamente. Ela permanece com status <strong>Aberta</strong> ou{' '}
                <strong>Em Tratamento</strong> até que um operador realize a intervenção técnica,
                informe a ação corretiva realizada e mude o status para <strong>Resolvida</strong>{' '}
                com a data de conclusão.
              </p>
            </div>

            {/* Como tratar */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Como tratar uma ocorrência
              </h4>
              <ol className="space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Acesse a aba <strong>7. Ocorrências</strong> e localize o item em aberto.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Clique no botão de edição para abrir os detalhes da falha reportada.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    No campo <strong>Tratamento Realizado</strong>, descreva a providência técnica
                    tomada (ex.:{' '}
                    <em>
                      &quot;Liberado espaço no NAS, reiniciado serviço e executado novo backup
                      pontual com sucesso&quot;
                    </em>
                    ).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Marque o status como <strong>Resolvida</strong> e salve. A pendência é encerrada
                    e passa a constar como tratada no relatório formal.
                  </span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* COMPLEMENTO — PROTEÇÃO EFETIVA EM % (BLOCO EXPLICATIVO) */}
      <section id="etapa-protecao-efetiva" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shadow-2xs">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Complemento — Proteção Efetiva em % (Visão Geral)
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-blue-800 bg-blue-50 border-blue-200"
                    >
                      Métrica Honesta
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    O número do card &quot;Proteção Efetiva&quot; mede proteção por ativo, não
                    sucesso de jobs.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Como o percentual é calculado
              </h4>
              <p className="leading-relaxed">
                O percentual é a <strong>média de proteção por ativo</strong>: para cada ativo com
                exigências, conta-se quantas modalidades (Local, Nuvem, Replicação) estão
                comprovadas <strong>dentro do RPO</strong> — até 3 — e divide-se por 3. A média
                desses quocientes, de 0 a 100%, é a &quot;Proteção Efetiva&quot; exibida no card da
                Visão Geral.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Como ler o card
              </h4>
              <p className="leading-relaxed">
                A contagem &quot;
                <strong>X de Y ativos parcialmente protegidos · Z com proteção completa</strong>
                &quot; distingue os ativos que possuem comprovação recente em ao menos uma
                modalidade (X) daqueles que cumpriram todas as exigências configuradas (Z). A
                validação é rigorosa com o relógio: ela considera a <strong>
                  janela de RPO
                </strong>{' '}
                de cada modalidade e plano cadastrado.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-950 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold">Comprovantes fora da janela de RPO:</span>
                <p className="leading-relaxed">
                  Se um backup foi realizado no passado mas excedeu a janela estipulada (ex.: 24h
                  para backup diário ou 30 min para contínuo), o sistema sinaliza a modalidade como{' '}
                  <strong className="text-amber-900">&quot;FORA do RPO&quot;</strong> e exibe
                  explicitamente a <strong>idade do comprovante</strong> (ex.:{' '}
                  <em>&quot;FORA do RPO (há 2 dias)&quot;</em> ou{' '}
                  <em>&quot;FORA do RPO (há 45 min)&quot;</em>). Modalidades fora do RPO não pontuam
                  na proteção efetiva, pois backup defasado não constitui proteção ativa perante a
                  fiscalização.
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/60 text-blue-950 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold">Banner &quot;X% protegido perante a rotina&quot;:</span>
                <p>
                  O percentual grande do card alimenta também o banner de status perante a rotina
                  cadastrada: 100% significa que toda exigência de todo ativo está comprovada dentro
                  do RPO. Qualquer valor menor indica modalidades sem fonte, nunca comprovadas ou
                  fora do RPO — o detalhe por ativo está na tabela de confronto logo abaixo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 8 — TESTES DE RECUPERAÇÃO */}
      <section id="etapa-8-testes" className="scroll-mt-6 space-y-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  8
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Etapa 8 — Testes de Recuperação e Validação Prática
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-emerald-900 bg-emerald-50 border-emerald-300"
                    >
                      RTO Provado na Prática
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    A comprovação empírica de que os dados e sistemas podem ser efetivamente
                    restaurados em caso de desastre.
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=testes">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50 gap-1"
                >
                  Registrar Teste <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                O Teste de Recuperação é o exercício simulado periódico no qual a serventia restaura
                uma base de dados, uma máquina virtual ou arquivos reais em ambiente isolado
                (sandbox ou servidor de contingência), medindo o tempo real despendido (RTO
                comprovado) e atestando a integridade dos dados recuperados.
              </p>
            </div>

            {/* Máxima da continuidade */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-slate-900 to-[#0B2545] text-white space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Princípio Essencial da Continuidade</span>
              </div>
              <p className="text-sm font-semibold italic text-slate-100">
                &quot;Sem teste de recuperação homologado, o backup não é prova de segurança — é
                apenas uma esperança.&quot;
              </p>
              <p className="text-xs text-slate-300">
                Ter arquivos de backup no disco não garante que eles não estejam corrompidos ou que
                a senha de decriptografia funcione. O teste periódico é o único elemento que atesta
                formalmente a operacionalidade do plano diante de qualquer auditoria.
              </p>
            </div>

            {/* Como configurar passo a passo */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Como registrar um teste de recuperação
              </h4>
              <ol className="space-y-2 list-none pl-0">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Acesse a aba <strong>8. Testes de Recuperação</strong> e clique em{' '}
                    <strong>+ Registrar Teste</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Indique a <strong>Data e Hora do Teste</strong> e o <strong>Tipo</strong>{' '}
                    (Restauração Total de Servidor/VM, Restauração Parcial de Tabelas ou Simulação
                    de Desastre).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Descreva o <strong>Escopo Testado</strong> (ex.:{' '}
                    <em>
                      &quot;Restauração da VM SPCM-PROTESTO a partir do backup Veeam noturno em host
                      isolado&quot;
                    </em>
                    ).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Informe o <strong>Tempo Decorrido</strong> em minutos (este número prova o RTO
                    na prática) e selecione o <strong>Resultado</strong> (Sucesso, Parcial ou
                    Falha).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <span>
                    Adicione observações técnicas e o responsável pela homologação. Salve o laudo do
                    teste.
                  </span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ETAPA 9 — VALIDAÇÃO EXTERNA (NOC) */}
      <section id="etapa-9-noc" className="scroll-mt-6 space-y-3">
        <Card className="border-2 border-purple-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b border-purple-100 pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Validação Externa (NOC) — Monitoramento Externo e Dupla Camada
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-purple-800 bg-purple-50 border-purple-200"
                    >
                      Dupla Camada de Conformidade
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Validação diária externa da equipe NOC, pipeline de ingestão resiliente e prova
                    incontestável para auditorias.
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=evidencias&sub=monitoramento_externo">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50 gap-1"
                >
                  Sub-aba Monitoramento NOC <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rotina Diária de Validação Externa pelo NOC
              </h4>
              <p className="leading-relaxed">
                Todo dia, um técnico do NOC (Network Operations Center) conecta-se diretamente no
                servidor de backup e valida as rotinas de backup do Veeam; caso encontre qualquer
                anomalia ou falha de replicação/cópia, ele reporta imediatamente as ações tomadas e
                o status de cada máquina.
              </p>
            </div>

            <div className="p-4 rounded-xl border-2 border-purple-300 bg-purple-50/70 text-purple-950 space-y-2 shadow-2xs">
              <span className="font-bold text-xs uppercase tracking-wide text-purple-900 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-purple-700" />
                Pipeline de E-mail Automático Tolerante a Acentos e Travessões
              </span>
              <p className="text-xs leading-relaxed">
                O e-mail do NOC chega com o assunto exato{' '}
                <strong>
                  &quot;PRO IT CLOUD SOLUTIONS | NOC – ANALISE PREVENTIVA DIARIA DE BACKUP&quot;
                </strong>{' '}
                originado do remetente <strong>@proitcs.com.br</strong>. O pipeline de e-mail do
                sistema é{' '}
                <strong>
                  detectado automaticamente de forma tolerante a acentos e variações de
                  travessão/hífen
                </strong>{' '}
                (– / -).
              </p>
              <p className="text-xs leading-relaxed">
                Cada relatório processado é convertido em um registro de{' '}
                <strong>&quot;Validação Externa (NOC)&quot;</strong>, contendo:
              </p>
              <ul className="list-disc pl-5 text-[11px] space-y-1 text-purple-950 font-medium">
                <li>
                  <strong>Status por VM:</strong> lista exata das máquinas virtuais com o veredito
                  do técnico (Sucesso, Atenção ou Falha);
                </li>
                <li>
                  <strong>Ações do técnico:</strong> descritivo de eventuais correções, reinício de
                  jobs ou ajustes de storage executados;
                </li>
                <li>
                  <strong>Data correta do relatório:</strong> extraída fielmente do corpo do e-mail
                  do técnico, <strong>nunca a data de criação do job no console do Veeam</strong>.
                </li>
              </ul>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Onde usar no sistema
              </h4>
              <p className="leading-relaxed">
                • <strong>Sub-aba &quot;Monitoramento Externo (NOC)&quot;</strong> dentro da aba{' '}
                <strong>5. Evidências</strong>: histórico completo dos atestados diários, tabela por
                VM e data do relatório.
                <br />• <strong>Botão &quot;Registrar Avaliação Manual&quot;</strong>: disponível
                para perfis <strong>Administrador</strong> e <strong>Suporte</strong> para
                lançamento imediato de laudos técnicos em dias sem tráfego de e-mail.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/60 text-purple-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-purple-900">
                <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  Card &quot;Validação Externa (NOC)&quot; na Visão Geral e Selo de Convergência
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                Na tela inicial da Visão Geral, ao lado da tabela &quot;Proteção por Ativo&quot;, o
                card <strong>&quot;Validação Externa (NOC)&quot;</strong> apresenta o selo de
                convergência do dia:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    &quot;NOC concorda com a análise do sistema&quot;
                  </span>
                  <p className="text-[11px] mt-1 text-emerald-900">
                    A Validação Externa (NOC) converge integralmente com os laudos técnicos
                    automáticos gerados a partir dos comprovantes.
                  </p>
                </div>
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-950">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    &quot;Divergência detectada&quot;
                  </span>
                  <p className="text-[11px] mt-1 text-amber-900">
                    A divergência NOC × sistema é <strong>REGISTRADA para auditoria</strong> e{' '}
                    <strong>NUNCA sobrescreve o veredito do sistema</strong> (o motor permanece
                    fonte da verdade técnica).
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-purple-900 pt-1 font-semibold">
                Essa é a <strong>dupla camada de conformidade</strong> (prova automática via
                evidência criptográfica + Validação Externa do NOC) que se apresenta ao juiz
                corregedor e auditores.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-950 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold">
                  Ciclo de Ocorrências: Abertura por Fato Real e Encerramento Automático
                </span>
                <p className="leading-relaxed">
                  Falha reportada pelo NOC <strong>abre ocorrência automaticamente</strong> com o
                  fato real detalhado por VM. Um relatório posterior de sucesso do NOC{' '}
                  <strong>encerra as ocorrências automaticamente</strong>, registrando o parecer de
                  normalização e restabelecendo o status positivo na trilha de auditoria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Resumo Final / Chamada para o Relatório A4 */}
      <Card className="border-slate-200 bg-slate-50/70 p-6 text-center rounded-xl space-y-3">
        <h3 className="text-base font-bold text-slate-900">
          Ciclo de Continuidade Pronto para Operar
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Com as etapas configuradas nesta sequência, o sistema opera de forma contínua e autônoma,
          validando comprovantes, alimentando laudos técnicos e municiando a serventia com o{' '}
          <strong>Relatório Comprobatório de Backup</strong> completo para impressão e fiscalização.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/backup">
            <Button className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4" /> Ir para a Visão Geral do Backup
            </Button>
          </Link>
          <Link to="/backup/relatorio" target="_blank">
            <Button
              variant="outline"
              className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1.5"
            >
              Emitir Relatório A4 <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default BackupGuiaPage
