import React from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Clock,
  UserCheck,
  Server,
  Layers,
} from 'lucide-react'
import { KpiCard } from '@/components/common/KpiCard'
import type { BackupExecucaoItem } from '@/types/cscti'
import { formatRelativeTimeSp } from '@/lib/dateTime'

export interface BackupRedesignKpisProps {
  totalAtivosProtegidosCompleto: number
  totalExigidosConfronto: number
  percentualProtegidoConfronto: number
  totalAtivosComProtecao: number
  execucoes: BackupExecucaoItem[]
  ocorrenciasAbertasCount: number
  ultimoMonitoramentoNocDate?: string
  ultimoMonitoramentoNocStatus?: string
  loading?: boolean
  onNavigateTab: (tab: string) => void
}

export const BackupRedesignKpis: React.FC<BackupRedesignKpisProps> = ({
  totalAtivosProtegidosCompleto,
  totalExigidosConfronto,
  percentualProtegidoConfronto,
  totalAtivosComProtecao,
  execucoes,
  ocorrenciasAbertasCount,
  ultimoMonitoramentoNocDate,
  ultimoMonitoramentoNocStatus,
  loading = false,
  onNavigateTab,
}) => {
  // Execuções nas últimas 24h e últimos 7 dias baseadas na data real do e-mail
  const agora = Date.now()
  const umDiaMs = 24 * 60 * 60 * 1000
  const seteDiasMs = 7 * umDiaMs

  const execucoes24h = execucoes.filter((e) => {
    const dataIso = e.data_email || e.data_inicio || e.created
    if (!dataIso) return false
    const parsed = new Date(dataIso.replace(' ', 'T')).getTime()
    return !isNaN(parsed) && agora - parsed <= umDiaMs
  })

  const execucoes7d = execucoes.filter((e) => {
    const dataIso = e.data_email || e.data_inicio || e.created
    if (!dataIso) return false
    const parsed = new Date(dataIso.replace(' ', 'T')).getTime()
    return !isNaN(parsed) && agora - parsed <= seteDiasMs
  })

  // Execução mais recente (RPO comprovado real)
  const execMaisRecente = execucoes[0]
  const dataRpoIso =
    execMaisRecente?.data_email || execMaisRecente?.data_inicio || execMaisRecente?.created
  const rpoRelativo = dataRpoIso ? formatRelativeTimeSp(dataRpoIso) : 'Sem comprovação'

  // Contagens por resultado geral
  const sucessoCount = execucoes.filter((e) => e.status === 'sucesso').length
  const alertaCount = execucoes.filter((e) => e.status === 'parcial').length
  const falhaCount = execucoes.filter((e) => e.status === 'erro').length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Proteção Efetiva / Ativos Salvaguardados */}
      <KpiCard
        label="Proteção Integral de Ativos"
        value={totalAtivosProtegidosCompleto}
        secondaryValue={`/ ${totalExigidosConfronto} exigidos`}
        unit=""
        supportText={`${percentualProtegidoConfronto}% de cobertura • ${totalAtivosComProtecao} com salvaguarda ativa`}
        icon={Database}
        iconBgColor={percentualProtegidoConfronto === 100 ? 'bg-emerald-100' : 'bg-blue-100'}
        iconColor={percentualProtegidoConfronto === 100 ? 'text-emerald-700' : 'text-blue-700'}
        infoTooltip="Ativos com todas as modalidades exigidas comprovadas por execuções com sucesso registradas no histórico real."
      />

      {/* KPI 2: RPO Mais Recente (Base data_email) */}
      <KpiCard
        label="RPO Comprovado Mais Recente"
        value={rpoRelativo}
        unit=""
        supportText={
          execMaisRecente?.data_email
            ? `Último e-mail: ${execMaisRecente.data_email.slice(0, 16)}`
            : `${execucoes.length} execuções registradas no histórico`
        }
        icon={Clock}
        iconBgColor="bg-purple-100"
        iconColor="text-purple-700"
        infoTooltip="Ponto de recuperação objetivo (RPO) baseado estritamente na data/hora do e-mail do comprovante recebido via IMAP."
      />

      {/* KPI 3: Janela Operacional (24h e 7 dias) */}
      <KpiCard
        label="Execuções Últimas 24h / 7d"
        value={execucoes24h.length}
        secondaryValue={`/ ${execucoes7d.length} em 7 dias`}
        unit=""
        supportText={`${sucessoCount} sucesso • ${alertaCount} alertas • ${falhaCount} falhas`}
        icon={CheckCircle2}
        iconBgColor={execucoes24h.length > 0 ? 'bg-emerald-100' : 'bg-slate-100'}
        iconColor={execucoes24h.length > 0 ? 'text-emerald-700' : 'text-slate-600'}
        infoTooltip="Total de jobs de backup registrados e processados nas últimas 24 horas e nos últimos 7 dias."
      />

      {/* KPI 4: Validação Externa (NOC) & Pendências */}
      <KpiCard
        label="Validação Externa (NOC) & Ocorrências"
        value={ocorrenciasAbertasCount > 0 ? `${ocorrenciasAbertasCount} pendência(s)` : 'Em dia'}
        unit=""
        supportText={
          ultimoMonitoramentoNocDate
            ? `NOC: ${ultimoMonitoramentoNocDate} (${ultimoMonitoramentoNocStatus || 'ok'})`
            : 'Aguardando atestado diário do NOC'
        }
        icon={ocorrenciasAbertasCount > 0 ? AlertTriangle : UserCheck}
        iconBgColor={
          ocorrenciasAbertasCount > 0
            ? 'bg-rose-100'
            : ultimoMonitoramentoNocDate
              ? 'bg-purple-100'
              : 'bg-emerald-100'
        }
        iconColor={
          ocorrenciasAbertasCount > 0
            ? 'text-rose-700'
            : ultimoMonitoramentoNocDate
              ? 'text-purple-700'
              : 'text-emerald-700'
        }
        infoTooltip="Status da segunda camada de conformidade: atestado diário da Validação Externa (NOC) e pendências operacionais em aberto."
      />
    </div>
  )
}

export default BackupRedesignKpis
