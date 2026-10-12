import React, { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, AlertTriangle, XCircle, Clock, ExternalLink } from 'lucide-react'
import type {
  ConformidadeItemCatalog,
  ConformidadeStatusItem,
  ConformidadeStatusType,
} from '@/types/cscti'

interface ConformidadeEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: (ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }) | null
  onSave: (payload: {
    status: ConformidadeStatusType
    referenciaComprovante: string
    linkComprovante: string
    hashSha256: string
    observacoes: string
    motivo: string
  }) => Promise<void>
}

export const ConformidadeEditModal: React.FC<ConformidadeEditModalProps> = ({
  open,
  onOpenChange,
  item,
  onSave,
}) => {
  const [status, setStatus] = useState<ConformidadeStatusType>(item?.status || 'pendente')
  const [referenciaComprovante, setReferenciaComprovante] = useState(
    item?.referencia_comprovante || '',
  )
  const [linkComprovante, setLinkComprovante] = useState(
    item?.link_comprovante || item?.catalog?.link_modulo || '',
  )
  const [hashSha256, setHashSha256] = useState(item?.hash_sha256 || '')
  const [observacoes, setObservacoes] = useState(item?.observacoes || '')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  // Atualizar form quando item mudar
  React.useEffect(() => {
    if (item) {
      setStatus(item.status)
      setReferenciaComprovante(item.referencia_comprovante || '')
      setLinkComprovante(item.link_comprovante || item.catalog?.link_modulo || '')
      setHashSha256(item.hash_sha256 || '')
      setObservacoes(item.observacoes || '')
      setMotivo('')
    }
  }, [item])

  if (!item) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        status,
        referenciaComprovante,
        linkComprovante,
        hashSha256,
        observacoes,
        motivo: motivo || 'Declaração formal do Titular/Suporte técnico',
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
              Item {item.item_codigo}
            </span>
            <span className="text-xs text-slate-500 font-medium">{item.catalog?.etapa_titulo}</span>
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 mt-1">
            {item.catalog?.titulo || `Item ${item.item_codigo}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            {item.catalog?.descricao}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Informações da exigência */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="text-slate-700">
              <strong>Módulo fonte de prova:</strong>{' '}
              <span className="capitalize font-medium text-blue-700">
                {item.catalog?.modulo_origem || 'Ambiente do Cliente'}
              </span>
            </div>
            {item.catalog?.tipo_evidencia_esperada && (
              <div className="text-slate-600">
                <strong>Evidência esperada:</strong> {item.catalog.tipo_evidencia_esperada}
              </div>
            )}
            {item.catalog?.link_modulo && (
              <div className="pt-1">
                <a
                  href={item.catalog.link_modulo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  <span>Abrir tela do módulo que comprova este item</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Seleção do status */}
          <div className="space-y-1.5">
            <Label htmlFor="status-select" className="text-xs font-semibold">
              Status de Conformidade Declarado *
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ConformidadeStatusType)}>
              <SelectTrigger id="status-select" className="text-xs h-9">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comprovado">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Comprovado (Evidência válida no ambiente)</span>
                  </div>
                </SelectItem>
                <SelectItem value="parcial">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Parcial (Em implantação / pendência menor)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pendente">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pendente de comprovação</span>
                  </div>
                </SelectItem>
                <SelectItem value="nao_conforme">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Não Conforme (Inexistente ou fora do padrão)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referência do Comprovante */}
          <div className="space-y-1.5">
            <Label htmlFor="ref-comp" className="text-xs font-semibold">
              Referência do Comprovante ou Parecer Técnico
            </Label>
            <Input
              id="ref-comp"
              className="text-xs h-9"
              placeholder="Ex: Laudo elétrico nº 104/2026 emitido com ART ou Termo de Designação assinado"
              value={referenciaComprovante}
              onChange={(e) => setReferenciaComprovante(e.target.value)}
            />
          </div>

          {/* Link direto para a evidência */}
          <div className="space-y-1.5">
            <Label htmlFor="link-comp" className="text-xs font-semibold">
              Link de Acesso Direto à Evidência
            </Label>
            <Input
              id="link-comp"
              className="text-xs h-9"
              placeholder="/evidencias ou /backup ou URL externa"
              value={linkComprovante}
              onChange={(e) => setLinkComprovante(e.target.value)}
            />
          </div>

          {/* Hash SHA-256 da evidência */}
          <div className="space-y-1.5">
            <Label htmlFor="hash-sha" className="text-xs font-semibold">
              Hash de Integridade (SHA-256) do Arquivo/Evidência
            </Label>
            <Input
              id="hash-sha"
              className="text-xs h-9 font-mono"
              placeholder="64 caracteres hexadecimais (ex: a3b8c7...)"
              value={hashSha256}
              onChange={(e) => setHashSha256(e.target.value)}
            />
            <p className="text-[10px] text-slate-500">
              Obrigatório para o Dossiê Técnico Integral das Classes 2 e 3.
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="obs-text" className="text-xs font-semibold">
              Observações e Notas do Titular
            </Label>
            <Textarea
              id="obs-text"
              rows={2}
              className="text-xs resize-none"
              placeholder="Detalhes adicionais sobre o cumprimento deste item..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {/* Motivo da alteração */}
          <div className="space-y-1.5">
            <Label htmlFor="motivo-text" className="text-xs font-semibold text-slate-700">
              Motivo / Justificativa para a Trilha de Auditoria *
            </Label>
            <Input
              id="motivo-text"
              className="text-xs h-9"
              placeholder="Ex: Anexado novo laudo de nobreak do fornecedor ou conferência física"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="text-xs bg-[#0B2545] hover:bg-[#124E78] text-white"
            >
              {saving ? 'Gravando...' : 'Salvar Avaliação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ConformidadeEditModal
