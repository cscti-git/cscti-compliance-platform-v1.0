import React, { useState } from 'react'
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Server,
  Laptop,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  Edit2,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PanelHeader } from '@/components/common/PanelHeader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import { formatSpDateOnly } from '@/pages/backup/relatorioData'
import { saveSegCoberturaExigida } from '@/services/segurancaService'
import type {
  InventoryAssetItem,
  SegSolucaoItem,
  SegCoberturaExigidaItem,
  SegComprovanteItem,
  SegurancaCoberturaCalculada,
} from '@/types/cscti'

export interface SegurancaCoberturaTabProps {
  orgId: string
  assets: InventoryAssetItem[]
  solucoes: SegSolucaoItem[]
  coberturasExigidas: SegCoberturaExigidaItem[]
  comprovantes: SegComprovanteItem[]
  coberturaCalculada: SegurancaCoberturaCalculada
  canEdit: boolean
  onReload: () => void
}

export const SegurancaCoberturaTab: React.FC<SegurancaCoberturaTabProps> = ({
  orgId,
  assets,
  solucoes,
  coberturasExigidas,
  comprovantes,
  coberturaCalculada,
  canEdit,
  onReload,
}) => {
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false)
  const [novaQtdExigida, setNovaQtdExigida] = useState<string>(
    String(coberturaCalculada.exigidasEndpoint),
  )
  const [salvandoAjuste, setSalvandoAjuste] = useState(false)

  // Máquinas de endpoint do inventário
  const estacoes = assets.filter((a) => a.tipo === 'estacao')
  const servidores = assets.filter(
    (a) =>
      a.tipo === 'servidor_aplicacao' ||
      a.tipo === 'servidor_virtualizado' ||
      a.tipo === 'banco_dados',
  )
  const outrosAtivos = assets.filter((a) => !estacoes.includes(a) && !servidores.includes(a))

  const comprovadas = coberturaCalculada.comprovadasEndpoint
  const exigidas = coberturaCalculada.exigidasEndpoint
  const percentual = coberturaCalculada.percentualCobertura
  const semAgente = coberturaCalculada.semAgenteEndpoint

  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoAjuste(true)
    try {
      const cobAtual = coberturasExigidas.find((c) => c.tipo_solucao === 'endpoint_antivirus')
      await saveSegCoberturaExigida(orgId, {
        id: cobAtual?.id,
        tipo_solucao: 'endpoint_antivirus',
        quantidade_exigida: Number(novaQtdExigida) || 0,
        base_calculo: 'Ajuste manual da serventia',
        ajuste_manual: true,
      })
      toast({
        title: 'Cobertura exigida atualizada',
        description: `Total de ativos exigidos definido para ${novaQtdExigida}.`,
      })
      setAjusteModalOpen(false)
      onReload()
    } catch (err: any) {
      console.error('Erro ao ajustar cobertura exigida:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao atualizar cobertura exigida.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAjuste(false)
    }
  }

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Confronto de Cobertura do Ambiente Real"
        subtitle="Comparativo visual entre a base instalada no inventário da serventia e o total de agentes e proteções comprovados via console ou laudo técnico."
        action={
          canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNovaQtdExigida(String(exigidas))
                setAjusteModalOpen(true)
              }}
              className="text-xs h-9 border-slate-300 hover:bg-slate-50 gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Ajustar Exigência Manual</span>
            </Button>
          ) : undefined
        }
      />

      {/* Card Principal de Confronto Estilo Backup */}
      <Card className="border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Confronto de Endpoint Security / Antivírus
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-none">
                  {comprovadas}
                </span>
                <span className="text-sm sm:text-base font-semibold text-slate-500">
                  máquinas protegidas de {exigidas} exigidas
                </span>
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    percentual >= 100
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : percentual >= 70
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {percentual}% Cobertura Real
                </Badge>
              </div>
            </div>

            {/* Avisos rápidos */}
            <div className="flex items-center gap-3">
              {semAgente > 0 && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-rose-800 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{semAgente} máquinas sem agente acusadas no último laudo</span>
                </div>
              )}
              {semAgente === 0 && comprovadas > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sem máquinas pendentes de agente</span>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Progresso do Confronto */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Progresso de Cobertura Efetiva</span>
              <span className="font-mono">{percentual}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  percentual >= 100
                    ? 'bg-emerald-500'
                    : percentual >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, percentual)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              * Fórmula: (Máquinas com agente comprovado ativo ÷ Total de ativos exigidos) × 100.
              Base de cálculo real extraída dos comprovantes ingeridos.
            </p>
          </div>

          {/* Comparativo de Indicadores Auxiliares */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Definições de Antivírus
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  {coberturaCalculada.definicoesAtualizadasData
                    ? formatSpDateOnly(coberturaCalculada.definicoesAtualizadasData)
                    : 'Pendente de laudo'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Firewall Perimetral
              </span>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 capitalize">
                  {coberturaCalculada.statusFirewallConsolidado === 'ativo'
                    ? 'Ativo e Operacional'
                    : coberturaCalculada.statusFirewallConsolidado === 'em_manutencao'
                      ? 'Em Manutenção'
                      : 'Aguardando comprovação'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Ameaças Bloqueadas (Histórico)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Activity className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">
                  {coberturaCalculada.ameacasBloqueadasTotal} eventos contidos
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ativos do Inventário Real */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">
            Ativos Físicos e Lógicos do Inventário da Serventia ({assets.length} ativos)
          </h4>
          <span className="text-xs text-slate-500">
            {estacoes.length} estações • {servidores.length} servidores
          </span>
        </div>

        {assets.length === 0 ? (
          <Card className="border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            Nenhum ativo cadastrado no módulo Inventário de Ativos.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assets.map((asset) => {
              const isEstacao = asset.tipo === 'estacao'
              const isServidor =
                asset.tipo === 'servidor_aplicacao' ||
                asset.tipo === 'servidor_virtualizado' ||
                asset.tipo === 'banco_dados'

              return (
                <Card
                  key={asset.id}
                  className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all bg-white"
                >
                  <CardContent className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isServidor
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : isEstacao
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isServidor ? (
                          <Server className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {asset.name}
                        </span>
                        <span className="text-[11px] text-slate-400 capitalize block truncate">
                          {asset.tipo.replace('_', ' ')}
                          {asset.ip_address ? ` • ${asset.ip_address}` : ''}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isServidor || isEstacao
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isServidor || isEstacao ? 'Exige Proteção' : 'Apoio'}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL DE AJUSTE MANUAL DA QUANTIDADE EXIGIDA */}
      <Dialog open={ajusteModalOpen} onOpenChange={setAjusteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Ajustar Cobertura Exigida (Endpoint)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Permite definir manualmente a meta de ativos a serem cobertos caso haja
              particularidades de escopo não refletidas no inventário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarAjuste} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Quantidade de Ativos Exigidos *
              </Label>
              <Input
                type="number"
                min="1"
                value={novaQtdExigida}
                onChange={(e) => setNovaQtdExigida(e.target.value)}
                required
                className="text-xs h-9"
              />
              <span className="text-[11px] text-slate-400 block">
                Total atual derivado do inventário: {coberturaCalculada.totalAtivosInventario}{' '}
                máquinas (estações + servidores).
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAjusteModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoAjuste}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
              >
                {salvandoAjuste ? 'Gravando...' : 'Salvar Ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegurancaCoberturaTab
