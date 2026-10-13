import React from 'react'
import { useNavigate } from 'react-router-dom'
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
  PlusCircle,
  ArrowRight,
  Database,
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
  const navigate = useNavigate()

  if (!equipamento) return null

  const isReal = !!equipamento.isRealData
  const isPendente = !!equipamento.precisaCadastro

  // Ações de navegação aos módulos reais
  const handleIrParaModulo = () => {
    if (equipamento.moduloCadastroSugerido === 'inventario') {
      navigate('/inventario')
    } else if (equipamento.moduloCadastroSugerido === 'conectividade') {
      navigate('/infraestrutura?tab=conectividade')
    } else if (equipamento.moduloCadastroSugerido === 'evidencias') {
      navigate('/evidencias')
    } else {
      navigate('/infraestrutura')
    }
  }

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Cabeçalho do Drawer */}
      <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-gradient-to-r from-slate-50 to-white flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm border ${
              isPendente
                ? 'bg-amber-600 border-amber-700'
                : 'bg-gradient-to-br from-[#0B2545] to-[#124E78] border-[#124E78]/30'
            }`}
          >
            {getIconForEquipamento(equipamento.iconKey, 'w-6 h-6 text-white')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                {equipamento.codigoAtivo}
              </span>
              {isPendente ? (
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
                >
                  ⚠ Cadastrar manualmente
                </Badge>
              ) : isReal ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
                >
                  ✓ Registro Real da Serventia
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-800 border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
                >
                  ● Simulado
                </Badge>
              )}
            </div>
            <h3
              id="drawer-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight mt-1"
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

      {/* Alerta de Ação / Simulação */}
      {isPendente ? (
        <div className="bg-amber-50 border-b border-amber-200 p-3.5 px-4 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-950">Item não localizado no banco da serventia</p>
            <p className="text-amber-800/90 leading-relaxed text-[11px]">
              Este componente faz parte da topologia técnica indispensável, mas ainda não possui
              registro no módulo correspondente. Cadastre-o para alimentar o mapa com dados
              auditáveis.
            </p>
            <Button
              size="sm"
              onClick={handleIrParaModulo}
              className="mt-1 h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1 shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>
                Cadastrar no módulo{' '}
                {equipamento.moduloCadastroSugerido === 'inventario'
                  ? 'Inventário de Ativos'
                  : equipamento.moduloCadastroSugerido === 'conectividade'
                    ? 'Conectividade'
                    : 'Infraestrutura'}
              </span>
            </Button>
          </div>
        </div>
      ) : isReal ? (
        <div className="bg-emerald-50/80 border-b border-emerald-200/70 p-3 px-4 flex items-center gap-2 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Dados Reais:</strong> Este nó foi montado dinamicamente a partir dos registros
            cadastrados da serventia no PocketBase.
          </span>
        </div>
      ) : (
        <div className="bg-amber-50/80 border-b border-amber-200/70 p-3 px-4 flex items-center gap-2 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Simulação de Vínculo:</strong> Estes botões indicam como o nó se integrará aos
            módulos do CSCTI.
          </span>
        </div>
      )}

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
              <span className="text-xs text-slate-500">Fabricante / Modelo / SO:</span>
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
                <span className="text-xs text-slate-500">Capacidade / Potência / Velocidade:</span>
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

        {/* Seção 3: Vínculos com Módulos Reais do CSCTI (Requisito 3 com dados REAIS quando existirem) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              {isReal ? 'Vínculos Auditáveis do Registro' : 'Integração com Módulos Reais'}
            </h4>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isReal
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isReal ? 'Dados Conectados' : 'Prévia'}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-snug">
            {isReal
              ? 'Este equipamento está amarrado aos registros reais do banco de dados da serventia:'
              : 'Na versão homologada, o usuário poderá navegar aos registros auditáveis do cliente:'}
          </p>

          <div className="space-y-2.5 pt-1">
            {/* Vínculo GLPI / Inventário */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {isReal && equipamento.assetOrigemId
                        ? 'Ativo Real do Inventário (GLPI / Manual)'
                        : 'Vincular ao ativo do Inventário (GLPI)'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.glpiVinculoSimulado
                        ? `${equipamento.glpiVinculoSimulado.nomeGlpi} (${equipamento.glpiVinculoSimulado.categoriaGlpi})`
                        : 'Sincronizar dados de configuração de hardware e garantia'}
                    </p>
                  </div>
                </div>
              </div>

              {isReal && equipamento.assetOrigemId ? (
                <Button
                  size="sm"
                  onClick={() => navigate('/inventario')}
                  className="w-full text-xs h-8 bg-blue-700 hover:bg-blue-800 text-white justify-between shadow-2xs"
                >
                  <span>Abrir no Inventário de Ativos</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
                >
                  <span>Vincular ao ativo do Inventário (GLPI)</span>
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {isPendente ? 'Pendente' : 'Simulação'}
                  </span>
                </Button>
              )}
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
                      {equipamento.evidenciaFotoSimulada
                        ? 'Foto na Central de Evidências'
                        : 'Comprovação Visual (Foto/Laudo)'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.evidenciaFotoSimulada
                        ? `Evidência: ${equipamento.evidenciaFotoSimulada.titulo} (${equipamento.evidenciaFotoSimulada.categoria})`
                        : 'Comprovar existência física e fixação do equipamento'}
                    </p>
                  </div>
                </div>
              </div>

              {equipamento.evidenciaFotoSimulada?.idEvidencia && isReal ? (
                <Button
                  size="sm"
                  onClick={() => navigate('/evidencias')}
                  className="w-full text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white justify-between shadow-2xs"
                >
                  <span>Abrir Evidência Fotográfica</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
                >
                  <span>Ver foto na Central de Evidências</span>
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {equipamento.evidenciaFotoSimulada ? 'Exemplo' : 'Sem foto anexada'}
                  </span>
                </Button>
              )}
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
                      Registro de Nobreak na Infraestrutura
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.infraNobreakSimulado
                        ? `Autonomia: ${equipamento.infraNobreakSimulado.autonomiaMinutos} min • Potência: ${equipamento.infraNobreakSimulado.potenciaKva}`
                        : 'Aferir autonomia e histórico de baterias cadastradas'}
                    </p>
                  </div>
                </div>
              </div>

              {isReal && equipamento.infraOrigemId ? (
                <Button
                  size="sm"
                  onClick={() => navigate('/infraestrutura?tab=energia')}
                  className="w-full text-xs h-8 bg-amber-700 hover:bg-amber-800 text-white justify-between shadow-2xs"
                >
                  <span>Abrir Registro na Infraestrutura</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
                >
                  <span>Ver registro de Nobreak na Infraestrutura</span>
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {isPendente ? 'Pendente' : 'Simulação'}
                  </span>
                </Button>
              )}
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
                      Link em Conectividade
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {equipamento.conectividadeLinkSimulado
                        ? `${equipamento.conectividadeLinkSimulado.operadora} • ${equipamento.conectividadeLinkSimulado.velocidade}`
                        : 'Confrontar velocidade contratada x velocidade mínima da classe'}
                    </p>
                  </div>
                </div>
              </div>

              {isReal && equipamento.conectividadeLinkSimulado ? (
                <Button
                  size="sm"
                  onClick={() => navigate('/infraestrutura?tab=conectividade')}
                  className="w-full text-xs h-8 bg-cyan-700 hover:bg-cyan-800 text-white justify-between shadow-2xs"
                >
                  <span>Abrir em Conectividade</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full text-xs h-8 bg-white border-slate-200 text-slate-400 justify-between cursor-not-allowed opacity-80"
                >
                  <span>Ver link em Conectividade</span>
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {isPendente ? 'Pendente' : 'Simulação'}
                  </span>
                </Button>
              )}
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
