import React from 'react'
import { History, Clock, UserCheck, CheckCircle2, AlertTriangle, XCircle, Hash } from 'lucide-react'
import { formatSpDateTime } from '@/pages/backup/relatorioData'
import type { ConformidadeEventoItem } from '@/types/cscti'

interface ConformidadeHistoricoTabProps {
  eventos: ConformidadeEventoItem[]
  loading?: boolean
}

export const ConformidadeHistoricoTab: React.FC<ConformidadeHistoricoTabProps> = ({
  eventos,
  loading = false,
}) => {
  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'comprovado':
        return (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            Comprovado
          </span>
        )
      case 'parcial':
        return (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            Parcial
          </span>
        )
      case 'nao_conforme':
        return (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
            Não Conforme
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            Pendente
          </span>
        )
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Trilha de Auditoria Append-Only de Conformidade
          </h3>
        </div>
        <span className="text-[11px] text-slate-500">
          Registro imutável de declarações e avaliações do ambiente
        </span>
      </div>

      {eventos.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500">
          Nenhum evento registrado até o momento. As declarações e avaliações manuais ou automáticas
          geram trilha de auditoria nesta tela.
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map((ev) => (
            <div
              key={ev.id}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    Item {ev.item_codigo}
                  </span>
                  <div className="flex items-center gap-1">
                    {ev.status_anterior && (
                      <>
                        <span className="text-slate-400 line-through">{ev.status_anterior}</span>
                        <span className="text-slate-400">→</span>
                      </>
                    )}
                    {getStatusBadge(ev.status_novo)}
                  </div>
                  <span className="text-slate-400 text-[11px]">•</span>
                  <span className="text-slate-600 text-[11px] font-medium">
                    {ev.usuario_nome || 'Operador'}
                  </span>
                </div>

                {ev.motivo && (
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    <strong>Motivo:</strong> {ev.motivo}
                  </p>
                )}

                {ev.evidencia_referencia && (
                  <p className="text-slate-600 text-[11px]">
                    <strong>Evidência:</strong> {ev.evidencia_referencia}
                  </p>
                )}

                {ev.hash_sha256 && (
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                    <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>SHA-256: {ev.hash_sha256}</span>
                  </div>
                )}
              </div>

              <div className="text-right text-[11px] text-slate-500 shrink-0">
                <Clock className="w-3 h-3 inline mr-1 text-slate-400" />
                {ev.created ? formatSpDateTime(ev.created) : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ConformidadeHistoricoTab
