import React from 'react'
import {
  X,
  ExternalLink,
  Shield,
  Layers,
  Camera,
  BatteryCharging,
  Wifi,
  HardDrive,
  Info,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Server,
  FolderGit2,
  Lock,
} from 'lucide-react'
import { EquipamentoSimulado } from './topologiaData'
import { getIconForEquipamento } from './MapaNodeCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export interface MapaNodeDetailsDrawerProps {
  equipamento: EquipamentoSimulado | null
  onClose: () => void
}

export const MapaNodeDetailsDrawer: React.FC<MapaNodeDetailsDrawerProps> = ({
  equipamento,
  onClose,
}) => {
  if (!equipamento) return null

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Cabeçalho do Drawer */}
      <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-gradient-to-r from-slate-50 to-white flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#124E78] text-white flex items-center justify-center shrink-0 shadow-sm border border-[#124E78]/30">
            {getIconForEquipamento(equipamento.iconKey, 'w-6 h-6 text-white')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                {equipamento.codigoAtivo}
              </span>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                ● Operacional
              </Badge>
            </div>
            <h3
              id="drawer-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight mt-0.5"
            >
              {equipamento.nome}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{equipamento.setor}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-8 w-8 rounded-lg shrink-0"
          aria-label="Fechar painel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Aviso de Simulação / Protótipo */}
      <div className="bg-amber-50/80 border-b border-amber-200/70 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Simulação de Vínculo:</strong> Estes botões indicam como o nó se integrará aos
          módulos reais do CSCTI após homologação.
        </span>
      </div>

      {/* Conteúdo com rolagem suave */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-sm">
        {/* Seção 1: Especificações do Equipamento */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ficha Técnica do Equipamento
          </h4>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs text-slate-500">Tipo de Ativo:</span>
              <span className="text-xs font-semibold text-slate-900 text-right">
                {equipamento.tipoEquipamento}
              </span>
            </div>

            <div className="flex justify-between items-start gap-2">
              <span className="text-xs text-slate-500">Fabricante / Modelo:</span>
              <span className="text-xs font-semibold text-slate-900 text-right">
                {equipamento.fabricanteModelo}
              </span>
            </div>

            {equipamento.ipOuIdentificacao && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-slate-500">Identificação / IP:</span>
                <span className="text-xs font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {equipamento.ipOuIdentificacao}
                </span>
              </div>
            )}

            {equipamento.detalhesTecnicos.capacidade && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-slate-500">Capacidade / Potência:</span>
                <span className="text-xs font-semibold text-slate-900 text-right">
                  {equipamento.detalhesTecnicos.capacidade}
                </span>
              </div>
            )}

            {equipamento.detalhesTecnicos.tensaoOuAlimentacao && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-slate-500">Alimentação Elétrica:</span>
                <span className="text-xs font-semibold text-slate-900 text-right">
                  {equipamento.detalhesTecnicos.tensaoOuAlimentacao}
                </span>
              </div>
            )}

            <div className="flex justify-between items-start gap-2">
              <span className="text-xs text-slate-500">Localização Física:</span>
              <span className="text-xs font-semibold text-slate-800 text-right">
                {equipamento.detalhesTecnicos.localizacaoFisica}
              </span>
            </div>
          </div>
        </div>

        {/* Seção 2: Observações e Papel na Topologia */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Função e Conectividade
          </h4>
          <p className="text-xs text-slate-600 bg-white rounded-xl p-3 border border-slate-200 leading-relaxed">
            {equipamento.detalhesTecnicos.observacoes}
          </p>
        </div>

        <Separator />

        {/* Seção 3: Placeholders de Vínculos com Módulos Reais do CSCTI (Requisito 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Integração com Módulos Reais
            </h4>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Versão Final
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-snug">
            No sistema oficial, ao clicar neste nó o usuário poderá navegar diretamente aos
            registros auditáveis ou realizar ações instantâneas:
          </p>

          <div className="space-y-2.5 pt-1">
            {/* Vínculo GLPI */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      Vincular ao ativo do Inventário (GLPI)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.glpiVinculoSimulado
                        ? `Ativo sugerido: ${equipamento.glpiVinculoSimulado.nomeGlpi}`
                        : 'Sincronizar dados de configuração de hardware e garantia'}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
              >
                <span>Vincular ao ativo do Inventário (GLPI)</span>
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Simulação
                </span>
              </Button>
            </div>

            {/* Vínculo Central de Evidências */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      Ver foto na Central de Evidências
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.evidenciaFotoSimulada
                        ? `Evidência: ${equipamento.evidenciaFotoSimulada.titulo}`
                        : 'Comprovar organização e existência física ao Corregedor'}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
              >
                <span>Ver foto na Central de Evidências</span>
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Simulação
                </span>
              </Button>
            </div>

            {/* Vínculo Registro de Nobreak */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <BatteryCharging className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      Ver registro de Nobreak na Infraestrutura
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.infraNobreakSimulado
                        ? `Autonomia: ${equipamento.infraNobreakSimulado.autonomiaMinutos} min • ${equipamento.infraNobreakSimulado.potenciaKva}`
                        : 'Aferir autonomia e histórico de baterias cadastradas'}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
              >
                <span>Ver registro de Nobreak na Infraestrutura</span>
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Simulação
                </span>
              </Button>
            </div>

            {/* Vínculo Conectividade */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      Ver link em Conectividade
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.conectividadeLinkSimulado
                        ? `${equipamento.conectividadeLinkSimulado.operadora}`
                        : 'Confrontar velocidade contratada x velocidade mínima'}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
              >
                <span>Ver link em Conectividade</span>
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Simulação
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé do Drawer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400">CSCTI • Visualizador de Topologia</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-xs h-8 border-slate-300 text-slate-700"
        >
          Fechar
        </Button>
      </div>
    </div>
  )
}

export default MapaNodeDetailsDrawer
