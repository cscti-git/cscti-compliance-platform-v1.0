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
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowRight,
  HelpCircle,
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
      subtitle: 'O que proteger',
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
      title: 'Fontes',
      subtitle: 'Itens, VMs e Aliases',
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
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
                      Etapa 1 — Escopo de Proteção
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-blue-800 bg-blue-50 border-blue-200"
                    >
                      Compromisso Formal
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Define <strong>O QUE</strong> será protegido no ambiente da serventia.
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
            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                O Escopo é o compromisso formal da serventia sobre quais sistemas, bases de dados,
                servidores e documentos entram obrigatoriamente sob a política de backup e
                recuperação de desastres. Ele funciona como a linha de base e a referência contra a
                qual tudo é confrontado nas auditorias.
              </p>
            </div>

            {/* Por que existe */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Por que existe (o que prova)
              </h4>
              <p className="leading-relaxed">
                Prova que a gestão da serventia mapeou expressamente todos os seus ativos críticos e
                assumiu a responsabilidade de protegê-los. Qualquer item encontrado em relatórios
                sem escopo cadastrado é apontado como desvio de inventário.
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
                    No menu lateral ou no topo, acerte na aba <strong>1. Escopo</strong> e clique em{' '}
                    <strong>+ Novo Escopo</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Informe o <strong>Nome do Escopo</strong> (ex.:{' '}
                    <em>Base Central de Atos e Documentos Notariais</em>,{' '}
                    <em>Servidor de Aplicação Principal</em> ou{' '}
                    <em>Imagens de Livros Digitalizados</em>
                    ).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Selecione a <strong>Criticidade</strong> (Alta, Média ou Baixa) e o status de
                    vigência (Ativo, Em Revisão ou Inativo).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    <strong>
                      Selecione os ativos do inventário que exigem backup — este vínculo é a base da
                      validação por ativo.
                    </strong>{' '}
                    O seletor multi-seleção exibe máquinas virtuais, bancos de dados e storages
                    cadastrados na serventia em <em>Ambiente &rarr; Ativos</em>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <span>
                    Descreva os sistemas, impactos e particularidades técnicas do escopo e salve. O
                    escopo agora é a referência formal para vincular fontes e rotinas.
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
                  <strong>Plano 3 (Mídia Externa Físico):</strong> ex.:{' '}
                  <em>&quot;Cópia semanal cofre off-site&quot;</em> com periodicidade semanal e
                  destino Externo.
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
                    Dê um nome descritivo baseado na estratégia (ex.:{' '}
                    <em>Plano Contínuo de Produção (30 min)</em>).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Preencha os <strong>Requisitos Técnicos</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs text-slate-600">
                      <li>
                        <strong>RTO (horas):</strong> tempo máximo previsto para restabelecer a
                        operação (ex.: 2 ou 4).
                      </li>
                      <li>
                        <strong>RPO (horas):</strong> perda máxima tolerável entre backups (ex.: 0.5
                        para 30 min, ou 24 para diário).
                      </li>
                      <li>
                        <strong>Retenção (dias):</strong> guarda dos pontos de restauração (ex.: 30,
                        60 ou 365 dias).
                      </li>
                    </ul>
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
                    e/ou <em>Externo (Fita/HD off-site)</em>.
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
                    Selecione a qual <strong>Plano</strong> a rotina pertence.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Defina o <strong>Nome da Rotina</strong> (ex.:{' '}
                    <em>Rotina Veeam Produção Local</em>).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    No campo <strong>Aliases / Apelidos do Job</strong>, insira todos os nomes
                    literais como o software emissor (Veeam, Acronis, Script) chama esse job nos
                    relatórios, separados por vírgula.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <span>
                    Ajuste a <strong>Periodicidade</strong> (ex.: intervalo de 30 minutos ou diária
                    com horário 23:00) e o tipo de execução (Incremental/Full).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    6
                  </span>
                  <span>
                    Salve a rotina. Em seguida, clique no botão{' '}
                    <strong>&quot;Fontes &amp; Ativos&quot;</strong> no card da rotina para
                    cadastrar as origens protegidas.
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

      {/* ETAPA 4 — FONTES */}
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
                      Etapa 4 — Fontes Protegidas e Cobertura de Ativos
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-teal-800 bg-teal-50 border-teal-200"
                    >
                      Granularidade de VMs e Bancos
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Cada item físico, virtual ou lógico contido no backup, com cobertura e aliases
                    literais.
                  </CardDescription>
                </div>
              </div>
              <Link to="/backup?tab=rotinas">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 gap-1"
                >
                  Gerenciar Fontes <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
            {/* O que é */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">O que é</h4>
              <p className="leading-relaxed">
                As Fontes são os elementos específicos resguardados dentro de uma rotina: uma
                Máquina Virtual (snapshot/imagem), uma base de dados relacional (ex.: PostgreSQL,
                SQL Server, Oracle), uma pasta de rede ou um plano de proteção na nuvem. Cada fonte
                é ligada a um <strong>Ativo do Inventário</strong> e possui seus próprios{' '}
                <strong>Aliases</strong>.
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
                      Endereço ou domínio de envio (ex.: <em>newsletter@proitcs.com.br</em> ou{' '}
                      <em>veeam@</em>).
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <strong className="text-slate-900 block mb-0.5">Filtro Assunto</strong>
                    <span className="text-slate-600">
                      Palavras-chave contidas no subject (ex.: <em>Backup Copy</em>,{' '}
                      <em>Replication</em>, <em>SocNoc</em>).
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
                      Processa e-mails humanos diários enviados pela equipe de suporte/NOC com
                      resumo preventivo das rotinas executadas.
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
            {/* O que é */}
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
          <Link to="/relatorios/backup" target="_blank">
            <Button
              variant="outline"
              className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1.5"
            >
              Visualizar Relatório Comprobatório <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default BackupGuiaPage
