import React from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
  HelpCircle,
  HardDrive,
  Cloud,
  Copy,
  RefreshCw,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  BackupConfrontoResponse,
  ConfrontoAtivoItem,
  ConfrontoModalidadeInfo,
  ConfrontoStatusModalidade,
  ConfrontoStatusConsolidado,
} from '@/types/cscti'

export interface BackupConfrontoTableProps {
  confrontoData: BackupConfrontoResponse | null
  loading?: boolean
  onRefresh?: () => void
  onNavigateToEscopo?: () => void
  onNavigateToRotinas?: (ativoId?: string) => void
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'nunca'
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    if (diffMs < 0) return 'agora'
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return `há ${diffSec}s`
    if (diffMin < 60) return `há ${diffMin} min`
    if (diffHour < 24) return `há ${diffHour}h`
    if (diffDay === 1) return 'ontem'
    return `há ${diffDay} dias`
  } catch (_) {
    return 'data inválida'
  }
}

function ModalidadeSelo({
  modalidade,
  label,
  icon: Icon,
  exigida,
}: {
  modalidade?: ConfrontoModalidadeInfo
  label: string
  icon: React.ElementType
  exigida: boolean
}) {
  if (!exigida) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 border border-dashed border-slate-200">
        <Icon className="w-3 h-3 text-slate-300" />
        {label}: não exigida
      </span>
    )
  }

  if (!modalidade || modalidade.status_modalidade === 'SEM_FONTE') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-300 cursor-help">
              <Icon className="w-3 h-3 text-slate-500" />
              {label}: sem fonte
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            Ativo exige proteção de <strong>{label}</strong>, mas não há nenhuma fonte ativa
            vinculada a plano com esse destino cadastrada em Rotinas &amp; Fontes.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const {
    status_modalidade,
    ultima_comprovacao,
    horas_desde_ultima,
    rpo_horas_configurado,
    rotina_nome,
  } = modalidade

  if (status_modalidade === 'NUNCA_COMPROVADA') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 cursor-help">
              <Icon className="w-3 h-3 text-red-600" />
              {label}: nunca comprovada
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            Existe fonte cadastrada na rotina &ldquo;{rotina_nome || 'configurada'}&rdquo;, mas
            nenhum comprovante real foi processado com sucesso para este item. Proteção não é
            cadastro — é prova recente.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (status_modalidade === 'FORA_RPO') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 cursor-help">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              {label}: FORA do RPO ({formatRelativeTime(ultima_comprovacao)})
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            Última comprovação real ocorreu {formatRelativeTime(ultima_comprovacao)} (
            {horas_desde_ultima}h atrás), ultrapassando a meta de RPO configurada de{' '}
            {rpo_horas_configurado}h.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // ATENDIDA
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 cursor-help">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {label}: {formatRelativeTime(ultima_comprovacao)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          Comprovada com sucesso {formatRelativeTime(ultima_comprovacao)} via rotina &ldquo;
          {rotina_nome}&rdquo;. Dentro do RPO de {rpo_horas_configurado}h.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function StatusConsolidadoBadge({ status }: { status: ConfrontoStatusConsolidado }) {
  switch (status) {
    case 'PROTEGIDO':
      return (
        <Badge className="bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 shadow-2xs">
          <ShieldCheck className="w-3 h-3 mr-1" />
          PROTEGIDO
        </Badge>
      )
    case 'PARCIAL':
      return (
        <Badge className="bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600 shadow-2xs">
          <Clock className="w-3 h-3 mr-1" />
          PARCIAL
        </Badge>
      )
    case 'NAO_PROTEGIDO':
      return (
        <Badge className="bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 shadow-2xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          NÃO PROTEGIDO
        </Badge>
      )
    case 'NAO_CADASTRADO':
      return (
        <Badge
          variant="outline"
          className="border-slate-300 text-slate-700 bg-slate-100 font-bold text-[11px]"
        >
          <Layers className="w-3 h-3 mr-1 text-slate-500" />
          NÃO CADASTRADO
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export const BackupConfrontoTable: React.FC<BackupConfrontoTableProps> = ({
  confrontoData,
  loading = false,
  onRefresh,
  onNavigateToEscopo,
  onNavigateToRotinas,
}) => {
  const totais = confrontoData?.totais
  const ativos = confrontoData?.confronto || []

  const totalExigidos = totais?.total_ativos_exigidos ?? 0
  const totalProtegidos = totais?.total_protegidos ?? 0
  const percentual = totais?.percentual_protegido ?? 0

  return (
    <Card className="border-slate-200 shadow-2xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0B2545]" />
                Proteção por Ativo (Validação Centrada no Ativo)
              </CardTitle>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                Estilo Veeam ONE
              </span>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>
                Confronto contínuo: exigências normativas vs. fontes cadastradas vs. comprovações
                reais dentro do RPO.
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center text-slate-400 hover:text-slate-600 cursor-help">
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm text-xs">
                    <strong>Regra inegociável de conformidade:</strong> Cadastrar ativo na rotina
                    NÃO significa que ele está protegido. Proteção exige comprovação real processada
                    via comprovante dentro da janela do RPO configurada.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="text-xs h-8 text-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Atualizar confronto
              </Button>
            )}
          </div>
        </div>

        {/* Contador Honesto de Conformidade no Topo */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                percentual === 100
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : percentual > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Status de Proteção Efetiva da Serventia
              </p>
              <p className="text-base sm:text-lg font-bold text-white mt-0.5">
                <span
                  className={
                    percentual === 100
                      ? 'text-emerald-400'
                      : percentual > 0
                        ? 'text-amber-300'
                        : 'text-red-400'
                  }
                >
                  {totalProtegidos} de {totalExigidos} ativos exigidos
                </span>{' '}
                100% protegidos pelas regras da empresa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-xs">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Conformidade Global</span>
              <span className="text-xl font-extrabold text-white">{percentual}%</span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300">
                Parcial: <strong className="text-amber-300">{totais?.total_parcial ?? 0}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300">
                Não protegido:{' '}
                <strong className="text-red-400">{totais?.total_nao_protegido ?? 0}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300">
                Sem fonte:{' '}
                <strong className="text-slate-400">{totais?.total_nao_cadastrado ?? 0}</strong>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {totalExigidos === 0 ? (
          <div className="p-8 text-center">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhum ativo com exigência de backup configurada
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Configure as flags de exigência (Local, Nuvem, Replicação) na aba &ldquo;Inventário de
              Ativos&rdquo; para ativar a validação contínua de proteção.
            </p>
            {onNavigateToEscopo && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToEscopo}
                className="mt-3 text-xs"
              >
                Configurar exigências no Inventário
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ativo do Inventário</th>
                  <th className="py-3 px-4">Tipo / Criticidade</th>
                  <th className="py-3 px-4">Comprovação das Modalidades Exigidas</th>
                  <th className="py-3 px-4 text-center">Status Consolidado</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ativos.map((item: ConfrontoAtivoItem) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.nome}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.total_atendidas} de {item.exigencias.total_exigidas} modalidades
                          atendidas no RPO
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="capitalize">{item.tipo?.replace(/_/g, ' ')}</div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                            item.criticidade === 'alta'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : item.criticidade === 'media'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.criticidade?.toUpperCase() || 'NORMAL'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.exigencias.local && (
                            <ModalidadeSelo
                              modalidade={item.modalidades.local}
                              label="Local"
                              icon={HardDrive}
                              exigida={true}
                            />
                          )}
                          {item.exigencias.nuvem && (
                            <ModalidadeSelo
                              modalidade={item.modalidades.nuvem}
                              label="Nuvem"
                              icon={Cloud}
                              exigida={true}
                            />
                          )}
                          {item.exigencias.replicacao && (
                            <ModalidadeSelo
                              modalidade={item.modalidades.replicacao}
                              label="Replicação"
                              icon={Copy}
                              exigida={true}
                            />
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <StatusConsolidadoBadge status={item.status_consolidado} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {item.status_consolidado !== 'PROTEGIDO' && onNavigateToRotinas && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateToRotinas(item.id)}
                            className="h-7 text-[11px] text-blue-700 hover:text-blue-900 px-2"
                            title="Ver ou vincular fontes deste ativo"
                          >
                            Ver rotina
                          </Button>
                        )}
                        {item.status_consolidado === 'PROTEGIDO' && (
                          <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 100% OK
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BackupConfrontoTable
