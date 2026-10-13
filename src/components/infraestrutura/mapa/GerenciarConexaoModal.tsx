import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  TopologiaConexao,
  TipoConexao,
  EquipamentoSimulado,
  TIPOS_CONEXAO_CATALOGO,
} from './topologiaData'
import { useToast } from '@/hooks/use-toast'
import { Cable, Trash2, ArrowRight } from 'lucide-react'

export interface GerenciarConexaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSalvar: (conexao: TopologiaConexao) => void
  onRemover?: (conexaoId: string) => void
  conexaoExistente?: TopologiaConexao | null
  equipamentos: EquipamentoSimulado[]
  origemPreDefinidaId?: string
}

export const GerenciarConexaoModal: React.FC<GerenciarConexaoModalProps> = ({
  isOpen,
  onClose,
  onSalvar,
  onRemover,
  conexaoExistente,
  equipamentos,
  origemPreDefinidaId,
}) => {
  const { toast } = useToast()

  const [origemId, setOrigemId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [tipo, setTipo] = useState<TipoConexao>('fibra')
  const [rotulo, setRotulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [animada, setAnimada] = useState(true)

  useEffect(() => {
    if (conexaoExistente) {
      setOrigemId(conexaoExistente.origemId)
      setDestinoId(conexaoExistente.destinoId)
      setTipo(conexaoExistente.tipo)
      setRotulo(conexaoExistente.rotulo || '')
      setDescricao(conexaoExistente.descricao || '')
      setAnimada(conexaoExistente.animada ?? true)
    } else {
      setOrigemId(origemPreDefinidaId || equipamentos[0]?.id || '')
      const primeiroDestino = equipamentos.find(
        (e) => e.id !== (origemPreDefinidaId || equipamentos[0]?.id),
      )
      setDestinoId(primeiroDestino?.id || '')
      setTipo('fibra')
      setRotulo('Fibra óptica (10 Gbps SFP+)')
      setDescricao('Interligação física estruturada')
      setAnimada(true)
    }
  }, [conexaoExistente, equipamentos, origemPreDefinidaId, isOpen])

  // Ao trocar o tipo, preenche sugestão de rótulo se estiver vazio
  const handleTrocaTipo = (novoTipo: TipoConexao) => {
    setTipo(novoTipo)
    const achado = TIPOS_CONEXAO_CATALOGO.find((t) => t.tipo === novoTipo)
    if (
      achado &&
      (!rotulo || TIPOS_CONEXAO_CATALOGO.some((t) => t.label === rotulo || rotulo.includes('Gbps')))
    ) {
      setRotulo(
        novoTipo === 'fibra'
          ? 'Fibra óptica (10 Gbps SFP+)'
          : novoTipo === 'rede'
            ? 'Cabo Cat6 Gigabit LAN'
            : novoTipo === 'eletrica'
              ? 'Alimentação Ininterrupta UPS'
              : 'Ramal VoIP SIP / PABX',
      )
    }
  }

  const handleSalvar = () => {
    if (!origemId || !destinoId) {
      toast({
        title: 'Seleção incompleta',
        description: 'Selecione o equipamento de origem e o equipamento de destino.',
        variant: 'destructive',
      })
      return
    }

    if (origemId === destinoId) {
      toast({
        title: 'Origem e destino iguais',
        description: 'Um equipamento não pode conectar a ele mesmo.',
        variant: 'destructive',
      })
      return
    }

    const conexaoFinal: TopologiaConexao = {
      id: conexaoExistente?.id || `cx-manual-${Date.now()}`,
      origemId,
      destinoId,
      tipo,
      rotulo: rotulo.trim() || undefined,
      descricao: descricao.trim() || undefined,
      animada,
    }

    onSalvar(conexaoFinal)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cable className="w-5 h-5 text-blue-600" />
            <span>{conexaoExistente ? 'Editar Conexão' : 'Criar Nova Conexão'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Conecte nós por fibra óptica, rede local, alimentação elétrica ou telefonia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          {/* Equipamento de Origem */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Equipamento de Origem *</Label>
            <select
              value={origemId}
              onChange={(e) => setOrigemId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900"
            >
              <option value="">Selecione o nó de origem...</option>
              {equipamentos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.codigoAtivo} — {eq.nome} ({eq.setor})
                </option>
              ))}
            </select>
          </div>

          {/* Equipamento de Destino */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Equipamento de Destino *</Label>
            <select
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900"
            >
              <option value="">Selecione o nó de destino...</option>
              {equipamentos
                .filter((eq) => eq.id !== origemId)
                .map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.codigoAtivo} — {eq.nome} ({eq.setor})
                  </option>
                ))}
            </select>
          </div>

          {/* Tipo de Conexão */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Tipo de Interligação *</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_CONEXAO_CATALOGO.map((item) => {
                const isSelected = tipo === item.tipo
                return (
                  <button
                    key={item.tipo}
                    type="button"
                    onClick={() => handleTrocaTipo(item.tipo)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.cor }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800">{item.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{item.descricao}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Rótulo da Conexão */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Rótulo Editável da Conexão
            </Label>
            <Input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              placeholder="Ex: Fibra óptica (10 Gbps SFP+)"
              className="text-xs h-9"
            />
          </div>

          {/* Descrição Adicional */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Descrição / Notas</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cabo óptico dielétrico subterrâneo ligando ao Rack Atendimento"
              className="text-xs h-9"
            />
          </div>

          {/* Checkbox de animação */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cx-animada"
              checked={animada}
              onChange={(e) => setAnimada(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="cx-animada" className="text-xs text-slate-700 cursor-pointer">
              Animar fluxo de dados / corrente elétrica no diagrama
            </Label>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          {conexaoExistente && onRemover ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onRemover(conexaoExistente.id)
                onClose()
              }}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover Conexão</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvar}
              className="text-xs bg-[#0B2545] hover:bg-[#124E78] text-white"
            >
              {conexaoExistente ? 'Salvar Conexão' : 'Adicionar Conexão'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GerenciarConexaoModal
