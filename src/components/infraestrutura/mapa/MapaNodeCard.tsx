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
  PlusCircle,
  ExternalLink,
  Flame,
} from 'lucide-react'
import { EquipamentoSimulado } from './topologiaData'
import { Badge } from '@/components/ui/badge'

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
    case 'extintor':
      return <Flame className={className} />
    case 'link':
      return <Radio className={className} />
    case 'outro':
      return <Building className={className} />
    default:
      return <Server className={className} />
  }
}

const getIconBadgeColor = (camadaId: string, precisaCadastro?: boolean) => {
  if (precisaCadastro) {
    return 'bg-amber-100 text-amber-800 border-amber-300'
  }
  switch (camadaId) {
    case 'energia':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'sala_servidores':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'interligacao':
      return 'bg-cyan-100 text-cyan-700 border-cyan-200'
    case 'setor_atendimento':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'setor_frente':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200'
    case 'setor_fundo':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'setor_diretoria':
      return 'bg-slate-200 text-slate-800 border-slate-300'
    case 'protecao_sobreposta':
      return 'bg-rose-100 text-rose-700 border-rose-200'
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
  const isPendente = !!equipamento.precisaCadastro
  const hasImagem = Boolean(equipamento.imagemAnexada?.dataUrl)

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
              : isPendente
                ? 'bg-amber-50/40 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50/80 shadow-2xs'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone estilizado ou miniatura da imagem em destaque claro */}
        <div className="relative shrink-0">
          {hasImagem ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-300 bg-white shadow-xs relative group-hover:scale-105 group-hover:border-blue-500 transition-all">
              <img
                src={equipamento.imagemAnexada!.dataUrl}
                alt={equipamento.nome}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span
                title={`Foto/desenho anexado: ${equipamento.imagemAnexada!.nomeArquivo || 'comprovante'}`}
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold shadow-2xs"
              >
                📷
              </span>
            </div>
          ) : (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-2xs transition-transform group-hover:scale-105 ${getIconBadgeColor(
                equipamento.camadaId,
                isPendente,
              )}`}
            >
              {getIconForEquipamento(equipamento.iconKey, 'w-6 h-6')}
            </div>
          )}
        </div>

        {/* Informações centrais */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase truncate">
              {equipamento.codigoAtivo}
            </span>

            {isPendente ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 shrink-0">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Cadastrar manualmente
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {equipamento.isRealData ? 'Dado Real' : 'Operacional'}
              </span>
            )}
          </div>

          <h4
            className={`text-xs sm:text-sm font-bold leading-tight mt-0.5 group-hover:text-blue-900 transition-colors line-clamp-2 ${
              isPendente ? 'text-amber-950' : 'text-slate-900'
            }`}
          >
            {equipamento.nome}
          </h4>

          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-normal">
            {equipamento.fabricanteModelo}
          </p>

          {/* Rodapé do card com badges funcionais */}
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
                {equipamento.isRealData ? 'Ativo Real' : 'GLPI Simulado'}
              </span>
            )}
            {equipamento.evidenciaFotoSimulada && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                {equipamento.isRealData ? 'Foto Comprovada' : 'Evidência Foto'}
              </span>
            )}
            {equipamento.imagemAnexada && (
              <span
                className="text-[10px] font-medium text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200/70"
                title={`Imagem anexada: ${equipamento.imagemAnexada.nomeArquivo} (SHA-256: ${equipamento.imagemAnexada.sha256?.substring(0, 8)}...)`}
              >
                📷 {equipamento.imagemAnexada.isSvgProvisorio ? 'SVG Provisório' : 'Foto'}
              </span>
            )}
            {isPendente && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded border border-amber-300">
                + Ação necessária
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dica visual suave de clique para abrir painel */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          className={`text-[9px] font-medium px-1 py-0.5 rounded border ${
            isPendente
              ? 'text-amber-800 bg-amber-100 border-amber-300'
              : 'text-blue-700 bg-blue-50 border border-blue-200'
          }`}
        >
          {isPendente ? 'Ver como cadastrar' : 'Ver ficha técnica'}
        </span>
      </div>
    </div>
  )
}

export default MapaNodeCard
