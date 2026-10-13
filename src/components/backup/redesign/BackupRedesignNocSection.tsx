import React from 'react'
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Info,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PanelHeader } from '@/components/common/PanelHeader'
import type { BackupMonitoramentoExternoItem, BackupEvidenciaItem } from '@/types/cscti'
import { formatRelativeTimeSp } from '@/lib/dateTime'

export interface BackupRedesignNocSectionProps {
  monitoramentosNoc: BackupMonitoramentoExternoItem[]
  evidenciasNoc: BackupEvidenciaItem[]
  loading?: boolean
  onNavigateTab: (tab: string) => void
}

/**
 * Validação Externa (NOC) — Terminologia OBRIGATÓRIA (NUNCA "Validação Humana").
 * Representa o atestado diário de monitoramento preventivo emitido pela equipe externa NOC.
 */
export const BackupRedesignNocSection: React.FC<BackupRedesignNocSectionProps> = ({
  monitoramentosNoc,
  evidenciasNoc,
  loading = false,
  onNavigateTab,
}) => {
  const ultimoAtestado = monitoramentosNoc[0]

  return (
    <Card className="border-purple-200/90 shadow-2xs hover:border-purple-300 transition-colors bg-white rounded-xl overflow-hidden">
      <PanelHeader
        title="Validação Externa (NOC)"
        subtitle="Camada independente de atestação diária: monitoramento preventivo e auditoria externa de salvaguarda"
        icon={UserCheck}
        iconBgColor="bg-purple-100"
        iconColor="text-purple-700"
        badge={
          <Badge className="bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold">
            {monitoramentosNoc.length} atestado(s) registrado(s)
          </Badge>
        }
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('evidencias')}
            className="text-xs text-purple-800 border-purple-200 hover:bg-purple-50 h-8"
          >
            Ver no Módulo Evidências
          </Button>
        }
      />

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Banner Informativo sobre a Validação Externa (NOC) */}
        <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-200 text-purple-900 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-purple-950">
              Segunda Camada de Conformidade: Análise Preventiva Diária do NOC
            </h4>
            <p className="text-purple-900/80 mt-0.5 leading-relaxed">
              Além da conferência automatizada por software (Veeam / Acronis), o CSCTI - Compliance
              registra a chancela técnica emitida pelos analistas do NOC externo, garantindo
              rastreabilidade em caso de fiscalização judicial ou corregedoria.
            </p>
          </div>
        </div>

        {/* Status do Último Atestado e Histórico Recente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card Resumo do Atestado Mais Recente */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Último Atestado Homologado
              </span>
              <div className="text-lg font-extrabold text-slate-900">
                {ultimoAtestado
                  ? ultimoAtestado.data_monitoramento || ultimoAtestado.created
                  : 'Pendente'}
              </div>
              <p className="text-xs text-slate-500">
                {ultimoAtestado
                  ? `Origem: ${ultimoAtestado.origem_remetente || 'NOC Especializado'}`
                  : 'Nenhum atestado processado ainda'}
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Resultado:</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase ${
                  ultimoAtestado?.status_geral === 'ok'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : ultimoAtestado
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {ultimoAtestado?.status_geral || 'Não informado'}
              </Badge>
            </div>
          </div>

          {/* Card Cobertura de Dias / Rastreabilidade */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cobertura de Monitoramento
              </span>
              <div className="text-lg font-extrabold text-slate-900">
                {monitoramentosNoc.length} dias atestados
              </div>
              <p className="text-xs text-slate-500">
                {evidenciasNoc.length} e-mails e relatórios de NOC arquivados
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Canal:</span>
              <span className="font-semibold text-slate-800">E-mail IMAP + Relatório Técnico</span>
            </div>
          </div>

          {/* Card Veredito da Validação Externa (NOC) */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Veredito Operacional
              </span>
              <div className="text-lg font-extrabold text-purple-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-purple-700" />
                <span>{ultimoAtestado ? 'Homologado pelo NOC' : 'Aguardando envio'}</span>
              </div>
              <p className="text-xs text-purple-900/80">
                {ultimoAtestado?.observacoes ||
                  'Os relatórios do NOC são capturados diariamente pelo conector de e-mail.'}
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-purple-200/60 flex items-center justify-between text-xs">
              <span className="text-purple-700">SLA NOC:</span>
              <span className="font-semibold text-purple-900">Ativo</span>
            </div>
          </div>
        </div>

        {/* Tabela dos últimos atestados do NOC */}
        {monitoramentosNoc.length > 0 && (
          <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs mt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/90 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Data Referência</th>
                    <th className="py-2.5 px-3">Origem / E-mail</th>
                    <th className="py-2.5 px-3">Avaliador NOC</th>
                    <th className="py-2.5 px-3">Observações / Parecer</th>
                    <th className="py-2.5 px-4 text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monitoramentosNoc.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {item.data_monitoramento || item.created}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {item.origem_remetente || 'socnoc / proitcs'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {item.registrado_por || 'Equipe NOC'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {item.observacoes || 'Validação preventiva diária executada com sucesso.'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-bold uppercase"
                        >
                          {item.status_geral || 'OK'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BackupRedesignNocSection
