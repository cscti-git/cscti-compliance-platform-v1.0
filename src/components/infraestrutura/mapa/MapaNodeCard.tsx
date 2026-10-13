import React from 'react'
import {
  Zap,
  BatteryCharging,
  Server,
  HardDrive,
  Network,
  Wind,
  PhoneCall,
  Printer,
  Monitor,
  Shield,
  Layers,
  Activity,
  Cpu,
  Radio,
  Building,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react'
import { EquipamentoSimulado } from './topologiaData'

export interface MapaNodeCardProps {
  equipamento: EquipamentoSimulado
  selecionado: boolean
  onClick: (equipamento: EquipamentoSimulado) => void
  onHighlightHover?: (id: string | null) => void
  isDestacado?: boolean
  isOfuscado?: boolean
}

export const getIconForEquipamento = (
  iconKey: EquipamentoSimulado['iconKey'],
  className = 'w-5 h-5',
) => {
  switch (iconKey) {
    case 'zap':
      return <Zap className={className} />
    case 'generator':
      return <Cpu className={className} />
    case 'quadro':
      return <Activity className={className} />
    case 'nobreak':
      return <BatteryCharging className={className} />
    case 'server':
      return <Server className={className} />
    case 'storage':
      return <HardDrive className={className} />
    case 'switch':
      return <Network className={className} />
    case 'hvac':
      return <Wind className={className} />
    case 'telecom':
      return <Radio className={className} />
    case 'totem':
      return <Monitor className={className} />
    case 'workstation':
      return <Monitor className={className} />
    case 'printer':
      return <Printer className={className} />
    case 'rack':
      return <Layers className={className} />
    case 'shield':
      return <Shield className={className} />
    default:
      return <Server className={className} />
  }
}

const getIconBadgeColor = (camadaId: string) => {
  switch (camadaId) {
    case 'energia':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'sala_servidores':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'setor_atendimento':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'setor_frente':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200'
    case 'setor_fundo':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'setor_diretoria':
      return 'bg-slate-200 text-slate-800 border-slate-300'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export const MapaNodeCard: React.FC<MapaNodeCardProps> = ({
  equipamento,
  selecionado,
  onClick,
  onHighlightHover,
  isDestacado = false,
  isOfuscado = false,
}) => {
  return (
    <div
      id={`node-${equipamento.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(equipamento)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(equipamento)
        }
      }}
      onMouseEnter={() => onHighlightHover?.(equipamento.id)}
      onMouseLeave={() => onHighlightHover?.(null)}
      className={`group relative text-left w-full rounded-xl p-3 border transition-all duration-200 cursor-pointer select-none ${
        selecionado
          ? 'bg-blue-50/90 border-[#124E78] shadow-md ring-2 ring-[#124E78]/30 translate-y-[-1px]'
          : isDestacado
            ? 'bg-white border-blue-400 shadow-sm ring-1 ring-blue-300'
            : isOfuscado
              ? 'bg-white/60 border-slate-200 opacity-60'
              : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone estilizado em círculo pastel de acordo com a camada */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105 ${getIconBadgeColor(
            equipamento.camadaId,
          )}`}
        >
          {getIconForEquipamento(equipamento.iconKey, 'w-5 h-5')}
        </div>

        {/* Informações centrais */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase truncate">
              {equipamento.codigoAtivo}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operacional
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mt-0.5 group-hover:text-blue-900 transition-colors line-clamp-2">
            {equipamento.nome}
          </h4>

          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-normal">
            {equipamento.fabricanteModelo}
          </p>

          {/* Rodapé do card com badges funcionais de prévia */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {equipamento.ipOuIdentificacao && (
              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[170px]">
                {equipamento.ipOuIdentificacao}
              </span>
            )}
            {equipamento.infraNobreakSimulado && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                UPS {equipamento.infraNobreakSimulado.potenciaKva} (
                {equipamento.infraNobreakSimulado.autonomiaMinutos}m)
              </span>
            )}
            {equipamento.glpiVinculoSimulado && (
              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                GLPI Simulado
              </span>
            )}
            {equipamento.evidenciaFotoSimulada && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                Evidência Foto
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dica visual suave de clique para abrir painel */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded">
          Ver detalhes
        </span>
      </div>
    </div>
  )
}

export default MapaNodeCard
