import React from 'react'
import { Zap, Cable, Network, Info, CheckCircle2, Shield, Layers, Sparkles } from 'lucide-react'

export interface MapaConexoesLegendaProps {
  filtroConexao?: 'todos' | 'eletrica' | 'fibra' | 'rede'
  onSelectFiltro?: (filtro: 'todos' | 'eletrica' | 'fibra' | 'rede') => void
}

export const MapaConexoesLegenda: React.FC<MapaConexoesLegendaProps> = ({
  filtroConexao = 'todos',
  onSelectFiltro,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0B2545]" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Legenda de Conexões e Meios Físicos
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Clique nos itens para filtrar as rotas no diagrama
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Opção Todos */}
        <button
          type="button"
          onClick={() => onSelectFiltro?.('todos')}
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
            filtroConexao === 'todos'
              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300/40 text-blue-900 font-bold'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60 text-slate-700'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs block leading-tight">Todas as Rotas</span>
            <span className="text-[10px] text-slate-500 block">Visão consolidada</span>
          </div>
        </button>

        {/* Elétrica */}
        <button
          type="button"
          onClick={() => onSelectFiltro?.('eletrica')}
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
            filtroConexao === 'eletrica'
              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40 text-amber-900 font-bold'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60 text-slate-700'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 rounded-full bg-amber-500 inline-block" />
              <span className="text-xs block leading-tight">Elétrica / UPS</span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              Rede, Gerador, QGBT e Nobreaks
            </span>
          </div>
        </button>

        {/* Fibra Óptica */}
        <button
          type="button"
          onClick={() => onSelectFiltro?.('fibra')}
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
            filtroConexao === 'fibra'
              ? 'bg-cyan-50/70 border-cyan-300 ring-1 ring-cyan-300/40 text-cyan-900 font-bold'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60 text-slate-700'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
            <Cable className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 rounded-full bg-cyan-500 inline-block" />
              <span className="text-xs block leading-tight">Fibra Óptica (Backbone)</span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              10 Gbps Sala Servidores → Racks
            </span>
          </div>
        </button>

        {/* Rede / Cabeamento Estruturado */}
        <button
          type="button"
          onClick={() => onSelectFiltro?.('rede')}
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
            filtroConexao === 'rede'
              ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/40 text-emerald-900 font-bold'
              : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60 text-slate-700'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Network className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 rounded-full bg-emerald-500 inline-block" />
              <span className="text-xs block leading-tight">Rede UTP Cat6 / PoE</span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              Estações, Totem e Impressoras
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default MapaConexoesLegenda
