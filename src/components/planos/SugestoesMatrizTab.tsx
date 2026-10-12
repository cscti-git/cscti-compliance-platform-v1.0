import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ShieldAlert,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { PlanoSugestaoMatriz, PersonItem, PlanoAcaoPrioridade } from '@/types/cscti'

export interface SugestoesMatrizTabProps {
  sugestoes: PlanoSugestaoMatriz[]
  people: PersonItem[]
  canEdit: boolean
  onTransformar: (sugestao: PlanoSugestaoMatriz) => void
  onDispensar: (itemCodigo: string, motivo: string) => Promise<void>
  onReativar: (itemCodigo: string) => Promise<void>
}

export const SugestoesMatrizTab: React.FC<SugestoesMatrizTabProps> = ({
  sugestoes,
  people,
  canEdit,
  onTransformar,
  onDispensar,
  onReativar,
}) => {
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState<number | 'todas'>('todas')
  const [exibirDispensadas, setExibirDispensadas] = useState(false)

  // Modal de Dispensa
  const [itemParaDispensar, setItemParaDispensar] = useState<PlanoSugestaoMatriz | null>(null)
  const [motivoDispensa, setMotivoDispensa] = useState('')
  const [isDispensando, setIsDispensando] = useState(false)
  const [erroDispensa, setErroDispensa] = useState<string | null>(null)

  // Filtragem
  const sugestoesFiltradas = sugestoes.filter((sug) => {
    if (!exibirDispensadas && sug.dispensado) return false
    if (exibirDispensadas && !sug.dispensado) return false
    if (filtroEtapa !== 'todas' && sug.etapa !== filtroEtapa) return false

    if (termoBusca.trim()) {
      const q = termoBusca.toLowerCase().trim()
      const matchCod = sug.itemCodigo.toLowerCase().includes(q)
      const matchTit = sug.titulo.toLowerCase().includes(q)
      const matchDesc = sug.descricao.toLowerCase().includes(q)
      if (!matchCod && !matchTit && !matchDesc) return false
    }

    return true
  })

  const handleConfirmarDispensa = async () => {
    if (!itemParaDispensar) return
    if (!motivoDispensa.trim()) {
      setErroDispensa('A justificativa da dispensa é obrigatória para a auditoria.')
      return
    }

    setIsDispensando(true)
    setErroDispensa(null)

    try {
      await onDispensar(itemParaDispensar.itemCodigo, motivoDispensa.trim())
      setItemParaDispensar(null)
      setMotivoDispensa('')
    } catch (err: any) {
      setErroDispensa(err?.message || 'Falha ao dispensar sugestão.')
    } finally {
      setIsDispensando(false)
    }
  }

  const pendentesReais = sugestoes.filter((s) => !s.jaConvertido && !s.dispensado).length

  return (
    <div className="space-y-4">
      {/* Quadro Informativo da Integração com a Matriz */}
      <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 rounded-xl border border-blue-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-[#F3C969]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Integração Nativa com a Matriz de Conformidade
              </h3>
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] px-2 py-0">
                {pendentesReais} sugestões ativas
              </Badge>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Itens da matriz com status <strong>Pendente de comprovação</strong> ou{' '}
              <strong>Não conforme</strong> são listados abaixo. Você pode transformá-los
              imediatamente em planos de ação rastreáveis ou dispensá-los com justificativa
              registrada na auditoria. Itens comprovados não são sugeridos.
            </p>
          </div>
        </div>

        <Link to="/conformidade" className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-blue-300 text-blue-900 bg-white hover:bg-blue-50 font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Matriz</span>
          </Button>
        </Link>
      </div>

      {/* Barra de Filtros */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar exigência ou código da matriz..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de Etapa */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <Button
              variant={filtroEtapa === 'todas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEtapa('todas')}
              className={`h-8 text-[11px] px-2.5 ${
                filtroEtapa === 'todas'
                  ? 'bg-[#0B2545] text-white'
                  : 'text-slate-600 border-slate-200'
              }`}
            >
              Todas
            </Button>
            {[1, 2, 3, 4, 5, 6].map((et) => (
              <Button
                key={et}
                variant={filtroEtapa === et ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroEtapa(et)}
                className={`h-8 text-[11px] px-2 ${
                  filtroEtapa === et ? 'bg-[#0B2545] text-white' : 'text-slate-600 border-slate-200'
                }`}
              >
                Etapa {et}
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExibirDispensadas(!exibirDispensadas)}
            className={`h-8 text-xs font-semibold px-2.5 ${
              exibirDispensadas
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {exibirDispensadas ? 'Exibindo Dispensadas' : 'Ver Dispensadas'}
          </Button>
        </div>
      </div>

      {/* Lista de Sugestões */}
      {sugestoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {exibirDispensadas
              ? 'Nenhuma sugestão dispensada'
              : 'Nenhuma sugestão pendente encontrada'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {exibirDispensadas
              ? 'Todas as pendências da matriz permanecem ativas ou já foram transformadas em plano de ação.'
              : 'Excelente! Todos os itens da matriz com exigências não comprovadas já foram convertidos em planos de ação ou não possuem apontamentos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sugestoesFiltradas.map((sug) => {
            return (
              <div
                key={sug.itemCodigo}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-2xs hover:shadow-xs ${
                  sug.jaConvertido
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : sug.dispensado
                      ? 'border-slate-200 bg-slate-50/40 opacity-75'
                      : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Bloco de Detalhes da Exigência */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        Item {sug.itemCodigo}
                      </span>

                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200"
                      >
                        Etapa {sug.etapa}
                      </Badge>

                      {sug.statusMatriz === 'nao_conforme' ? (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-semibold text-[10px]">
                          Não Conforme na Matriz
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-[10px]">
                          Pendente de Comprovação
                        </Badge>
                      )}

                      {sug.jaConvertido && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Plano Já Criado
                        </Badge>
                      )}

                      {sug.dispensado && (
                        <Badge className="bg-slate-200 text-slate-700 border-slate-300 font-semibold text-[10px]">
                          Dispensado
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                      {sug.titulo}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">{sug.descricao}</p>

                    {sug.dispensado && sug.motivoDispensa && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Motivo da Dispensa:</strong> {sug.motivoDispensa}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {sug.jaConvertido ? (
                      <div className="flex items-center gap-2">
                        <Link to="/conformidade">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-blue-700 hover:bg-blue-50 gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver na matriz</span>
                          </Button>
                        </Link>
                      </div>
                    ) : sug.dispensado ? (
                      canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReativar(sug.itemCodigo)}
                          className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1.5 font-medium"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reativar Sugestão</span>
                        </Button>
                      )
                    ) : (
                      canEdit && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemParaDispensar(sug)
                              setMotivoDispensa('')
                              setErroDispensa(null)
                            }}
                            className="h-8 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <span>Dispensar</span>
                          </Button>

                          <Button
                            onClick={() => onTransformar(sug)}
                            size="sm"
                            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-8 gap-1.5 shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#F3C969]" />
                            <span>Transformar em plano</span>
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Justificativa de Dispensa */}
      <Dialog open={!!itemParaDispensar} onOpenChange={(v) => !v && setItemParaDispensar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Dispensar Sugestão da Matriz
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Item {itemParaDispensar?.itemCodigo} • {itemParaDispensar?.titulo}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {erroDispensa && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {erroDispensa}
              </div>
            )}

            <p className="text-xs text-slate-600">
              A dispensa registrará esta decisão na trilha de auditoria e no histórico de
              conformidade da serventia, sem gerar plano de ação no momento.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Justificativa da Dispensa <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={motivoDispensa}
                onChange={(e) => setMotivoDispensa(e.target.value)}
                placeholder="Ex: Não aplicável à classe da serventia nesta fase ou compensado por controle alternativo..."
                rows={3}
                className="text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemParaDispensar(null)}
              disabled={isDispensando}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarDispensa}
              size="sm"
              disabled={isDispensando}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              {isDispensando ? 'Registrando...' : 'Confirmar Dispensa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SugestoesMatrizTab
