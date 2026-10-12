import React, { useState } from 'react'
import {
  History,
  Clock,
  User,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/dateTime'
import type { PlanoAcaoHistoricoItem } from '@/types/cscti'

export interface PlanosHistoricoTabProps {
  historico: PlanoAcaoHistoricoItem[]
}

export const PlanosHistoricoTab: React.FC<PlanosHistoricoTabProps> = ({ historico }) => {
  const [termoBusca, setTermoBusca] = useState('')

  const historicoFiltrado = historico.filter((h) => {
    if (!termoBusca.trim()) return true
    const q = termoBusca.toLowerCase().trim()
    const matchTit = h.plano_titulo?.toLowerCase().includes(q) || false
    const matchMot = h.motivo?.toLowerCase().includes(q) || false
    const matchAut = h.autor_nome?.toLowerCase().includes(q) || false
    const matchAlt = h.campo_alterado?.toLowerCase().includes(q) || false
    return matchTit || matchMot || matchAut || matchAlt
  })

  const renderTipoBadge = (tipo: PlanoAcaoHistoricoItem['tipo_evento']) => {
    switch (tipo) {
      case 'criacao':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-[10px]">
            Criação
          </Badge>
        )
      case 'conclusao':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">
            Conclusão
          </Badge>
        )
      case 'cancelamento':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-semibold text-[10px]">
            Cancelamento
          </Badge>
        )
      case 'alteracao_prazo':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-[10px]">
            Alteração de Prazo
          </Badge>
        )
      case 'reatribuicao':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[10px]">
            Reatribuição
          </Badge>
        )
      case 'dispensa_matriz':
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-semibold text-[10px]">
            Dispensa Matriz
          </Badge>
        )
      case 'mudanca_status':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold text-[10px]">
            Mudança de Status
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por plano, autor ou motivo no histórico..."
            className="pl-9 text-xs h-9"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium shrink-0">
          Total de registros: <strong>{historicoFiltrado.length}</strong>
        </div>
      </div>

      {/* Lista de Registros Append-Only */}
      {historicoFiltrado.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhum evento registrado no histórico
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Todas as criações, mudanças de status, alterações de prazos e dispensas serão gravadas
            aqui de forma imutável (append-only) para auditoria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-2xs overflow-hidden">
          {historicoFiltrado.map((item) => {
            let dataStr = '—'
            if (item.created) {
              try {
                dataStr = formatDateTime(item.created)
              } catch (_) {
                dataStr = item.created
              }
            }

            return (
              <div key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {renderTipoBadge(item.tipo_evento)}
                    {item.plano_titulo ? (
                      <span className="font-semibold text-xs text-slate-900">
                        {item.plano_titulo}
                      </span>
                    ) : item.campo_alterado ? (
                      <span className="font-semibold text-xs text-slate-900">
                        Item da Matriz {item.campo_alterado}
                      </span>
                    ) : (
                      <span className="font-semibold text-xs text-slate-900">Plano de Ação</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{dataStr}</span>
                  </div>
                </div>

                {/* Transição de Valores */}
                {(item.valor_anterior || item.valor_novo) && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {item.valor_anterior && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono">
                        {item.valor_anterior}
                      </span>
                    )}
                    {item.valor_anterior && item.valor_novo && (
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    )}
                    {item.valor_novo && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px] font-mono font-semibold">
                        {item.valor_novo}
                      </span>
                    )}
                  </div>
                )}

                {/* Motivo e Autor */}
                <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  {item.motivo && (
                    <p className="text-slate-600 text-xs italic leading-relaxed">"{item.motivo}"</p>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>
                      Registrado por: <strong>{item.autor_nome || 'Sistema'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PlanosHistoricoTab
