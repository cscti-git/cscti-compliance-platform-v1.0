import React from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  HardDriveDownload,
  Lock,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { CAMADA_PROTECAO_SOBREPOSTA } from './topologiaData'

export interface MapaProtecaoOverlayProps {
  expandido?: boolean
  onToggle?: () => void
}

export const MapaProtecaoOverlay: React.FC<MapaProtecaoOverlayProps> = ({ expandido = true }) => {
  return (
    <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-900 via-[#0B2545] to-[#124E78] text-white p-5 shadow-sm relative overflow-hidden">
      {/* Detalhe de fundo com padrão sutil de rede */}
      <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
        <ShieldCheck className="w-64 h-64 text-white" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Cabeçalho da Camada */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Camada Transversal Sobreposta
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% Protegido
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight mt-0.5">
                {CAMADA_PROTECAO_SOBREPOSTA.titulo}
              </h3>
            </div>
          </div>
          <p className="text-xs text-blue-200/80 max-w-md">
            Políticas ativas cobrindo a totalidade dos nós elétricos, de rede, servidores e estações
            de trabalho.
          </p>
        </div>

        {/* 4 Cards de Proteção Sobreposta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMADA_PROTECAO_SOBREPOSTA.itens.map((item, idx) => (
            <div
              key={idx}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-xs rounded-xl p-3 border border-white/15 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                  {item.badge}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <h4 className="text-xs font-bold text-white leading-tight pt-1">{item.nome}</h4>
              <p className="text-[11px] text-blue-100/80 leading-relaxed">{item.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MapaProtecaoOverlay
