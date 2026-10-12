import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShieldAlert, Calendar, User, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'
import type {
  PlanoAcaoItem,
  PlanoAcaoOrigem,
  PlanoAcaoPrioridade,
  PlanoAcaoStatus,
  PersonItem,
} from '@/types/cscti'

export interface PlanoAcaoFormModalProps {
  open: boolean
  onClose: () => void
  plano?: PlanoAcaoItem | null
  people: PersonItem[]
  onSubmit: (data: {
    titulo: string
    descricao?: string
    origem: PlanoAcaoOrigem
    referenciaCodigo?: string
    prioridade: PlanoAcaoPrioridade
    status?: PlanoAcaoStatus
    responsavelId?: string
    responsavelNome?: string
    dataAlvo?: string
    observacoes?: string
    motivoMudancaPrazo?: string
  }) => Promise<void>
  isSubmitting?: boolean
}

export const PlanoAcaoFormModal: React.FC<PlanoAcaoFormModalProps> = ({
  open,
  onClose,
  plano,
  people,
  onSubmit,
  isSubmitting = false,
}) => {
  const isEditing = !!plano

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [origem, setOrigem] = useState<PlanoAcaoOrigem>('manual')
  const [referenciaCodigo, setReferenciaCodigo] = useState('')
  const [prioridade, setPrioridade] = useState<PlanoAcaoPrioridade>('media')
  const [status, setStatus] = useState<PlanoAcaoStatus>('aberto')
  const [responsavelId, setResponsavelId] = useState<string>('nenhum')
  const [dataAlvo, setDataAlvo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [motivoMudancaPrazo, setMotivoMudancaPrazo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (plano) {
      setTitulo(plano.titulo || '')
      setDescricao(plano.descricao || '')
      setOrigem(plano.origem || 'manual')
      setReferenciaCodigo(plano.referencia_codigo || '')
      setPrioridade(plano.prioridade || 'media')
      setStatus(plano.status || 'aberto')
      setResponsavelId(plano.responsavel || 'nenhum')
      setDataAlvo(plano.data_alvo ? plano.data_alvo.substring(0, 10) : '')
      setObservacoes(plano.observacoes || '')
      setMotivoMudancaPrazo('')
    } else {
      setTitulo('')
      setDescricao('')
      setOrigem('manual')
      setReferenciaCodigo('')
      setPrioridade('media')
      setStatus('aberto')
      setResponsavelId('nenhum')
      setDataAlvo('')
      setObservacoes('')
      setMotivoMudancaPrazo('')
    }
    setErro(null)
  }, [plano, open])

  const prazoOriginal = plano?.data_alvo ? plano.data_alvo.substring(0, 10) : ''
  const alterouPrazo = isEditing && prazoOriginal && dataAlvo && dataAlvo !== prazoOriginal
  const adiouPrazo = alterouPrazo && dataAlvo > prazoOriginal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!titulo.trim()) {
      setErro('O título do plano de ação é obrigatório.')
      return
    }

    if (adiouPrazo && !motivoMudancaPrazo.trim()) {
      setErro('É obrigatório justificar o motivo do adiamento do prazo no histórico.')
      return
    }

    const respPerson = people.find((p) => p.id === responsavelId)
    const respNome = respPerson ? respPerson.name : ''

    try {
      await onSubmit({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        origem,
        referenciaCodigo: referenciaCodigo.trim() || undefined,
        prioridade,
        status,
        responsavelId: responsavelId === 'nenhum' ? undefined : responsavelId,
        responsavelNome: respNome || undefined,
        dataAlvo: dataAlvo || undefined,
        observacoes: observacoes.trim() || undefined,
        motivoMudancaPrazo: motivoMudancaPrazo.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar o plano de ação.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B2545] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEditing ? 'Editar Plano de Ação' : 'Novo Plano de Ação'}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Atualize os dados, responsável ou prazo do plano'
                  : 'Cadastre uma nova medida corretiva ou preventiva na serventia'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {erro && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="titulo" className="text-xs font-semibold text-slate-700">
              Título do Plano <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Regularizar política de retenção de dados e ROPA"
              className="text-xs"
              required
            />
          </div>

          {/* Linha 1: Origem e Referência */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="origem" className="text-xs font-semibold text-slate-700">
                Origem da Pendência
              </Label>
              <Select
                value={origem}
                onValueChange={(v) => setOrigem(v as PlanoAcaoOrigem)}
                disabled={isEditing && plano?.origem === 'conformidade'}
              >
                <SelectTrigger id="origem" className="text-xs">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual / Administrativo</SelectItem>
                  <SelectItem value="conformidade">Matriz de Conformidade</SelectItem>
                  <SelectItem value="seguranca">Segurança do Ambiente</SelectItem>
                  <SelectItem value="backup">Continuidade & Backup</SelectItem>
                  <SelectItem value="lgpd">LGPD & Governança</SelectItem>
                  <SelectItem value="inventario">Inventário de Ativos</SelectItem>
                  <SelectItem value="infraestrutura">Infraestrutura Física e Lógica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="refCodigo" className="text-xs font-semibold text-slate-700">
                Cód. Referência (Opcional)
              </Label>
              <Input
                id="refCodigo"
                value={referenciaCodigo}
                onChange={(e) => setReferenciaCodigo(e.target.value)}
                placeholder="Ex: 1.4, AT-01, OCORR-32"
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* Linha 2: Prioridade e Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prioridade" className="text-xs font-semibold text-slate-700">
                Prioridade
              </Label>
              <Select
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as PlanoAcaoPrioridade)}
              >
                <SelectTrigger id="prioridade" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica (Imediata)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-slate-700">
                Status Atual
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PlanoAcaoStatus)}>
                <SelectTrigger id="status" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto (Não iniciado)</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 3: Responsável e Prazo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="responsavel" className="text-xs font-semibold text-slate-700">
                Responsável Designado
              </Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger id="responsavel" className="text-xs">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum responsável atribuído</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.role_title ? `(${p.role_title})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataAlvo" className="text-xs font-semibold text-slate-700">
                Prazo Alvo
              </Label>
              <Input
                id="dataAlvo"
                type="date"
                value={dataAlvo}
                onChange={(e) => setDataAlvo(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Campo obrigatório de justificativa de alteração de prazo */}
          {adiouPrazo && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Justificativa Obrigatória de Adiamento</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O prazo está sendo prorrogado de {prazoOriginal} para {dataAlvo}. Informe a
                justificativa que será gravada na trilha de auditoria e no histórico do plano:
              </p>
              <Textarea
                value={motivoMudancaPrazo}
                onChange={(e) => setMotivoMudancaPrazo(e.target.value)}
                placeholder="Motivo técnico ou operacional da prorrogação..."
                rows={2}
                className="text-xs bg-white"
                required
              />
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="descricao" className="text-xs font-semibold text-slate-700">
              Descrição da Medida Corretiva
            </Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a ação a ser realizada, escopo e requisitos técnicos..."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="obs" className="text-xs font-semibold text-slate-700">
              Observações Adicionais
            </Label>
            <Input
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas internas, dependências de fornecedores, etc."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold"
            >
              {isSubmitting
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar Alterações'
                  : 'Criar Plano de Ação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PlanoAcaoFormModal
