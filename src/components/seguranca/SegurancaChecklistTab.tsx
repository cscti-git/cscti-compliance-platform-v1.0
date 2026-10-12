import React, { useState } from 'react'
import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Plus,
  Edit2,
  Trash2,
  FileCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { PanelHeader } from '@/components/common/PanelHeader'
import { toast } from '@/hooks/use-toast'
import {
  saveSegItemConformidade,
  deleteSegItemConformidade,
  SaveSegItemConformidadePayload,
} from '@/services/segurancaService'
import { formatSpDateOnly } from '@/pages/backup/relatorioData'
import type {
  SegItemConformidadeItem,
  SegComprovanteItem,
  SegItemConformidadeStatus,
  SegItemConformidadeCategoria,
} from '@/types/cscti'

export interface SegurancaChecklistTabProps {
  orgId: string
  itens: SegItemConformidadeItem[]
  comprovantes: SegComprovanteItem[]
  canEdit: boolean
  onReload: () => void
}

export const SegurancaChecklistTab: React.FC<SegurancaChecklistTabProps> = ({
  orgId,
  itens,
  comprovantes,
  canEdit,
  onReload,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SegItemConformidadeItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form states
  const [itemNome, setItemNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<SegItemConformidadeCategoria>('endpoint')
  const [status, setStatus] = useState<SegItemConformidadeStatus>('pendente')
  const [comprovanteVinculado, setComprovanteVinculado] = useState<string>('none')
  const [prazo, setPrazo] = useState<string>('')
  const [observacoes, setObservacoes] = useState('')

  const handleOpenNew = () => {
    setEditingItem(null)
    setItemNome('')
    setDescricao('')
    setCategoria('endpoint')
    setStatus('pendente')
    setComprovanteVinculado('none')
    setPrazo('')
    setObservacoes('')
    setModalOpen(true)
  }

  const handleOpenEdit = (item: SegItemConformidadeItem) => {
    setEditingItem(item)
    setItemNome(item.item_nome)
    setDescricao(item.descricao || '')
    setCategoria(item.categoria)
    setStatus(item.status)
    setComprovanteVinculado(item.comprovante_vinculado || 'none')
    setPrazo(item.prazo || '')
    setObservacoes(item.observacoes || '')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemNome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o título do requisito de conformidade.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: SaveSegItemConformidadePayload = {
        id: editingItem?.id,
        item_nome: itemNome,
        descricao,
        categoria,
        status,
        comprovante_vinculado: comprovanteVinculado !== 'none' ? comprovanteVinculado : undefined,
        prazo: prazo || undefined,
        observacoes,
      }
      await saveSegItemConformidade(orgId, payload)
      toast({
        title: editingItem ? 'Item atualizado' : 'Item cadastrado',
        description: `O requisito de conformidade foi salvo.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: any) {
      console.error('Erro ao salvar item de conformidade:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao gravar item de conformidade.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o requisito "${nome}"?`)) return
    setDeletingId(id)
    try {
      await deleteSegItemConformidade(id, orgId, nome)
      toast({
        title: 'Item removido',
        description: `O requisito "${nome}" foi excluído.`,
      })
      onReload()
    } catch (err: any) {
      console.error('Erro ao excluir item:', err)
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao remover item.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatCategoriaLabel = (c: SegItemConformidadeCategoria) => {
    switch (c) {
      case 'endpoint':
        return 'Endpoint & Antivírus'
      case 'firewall':
        return 'Firewall & Redes'
      case 'monitoramento':
        return 'Monitoramento Contínuo'
      case 'acessos_senhas':
        return 'Contas, Privilégios & Senhas'
      case 'ativos_sistemas':
        return 'Sistemas & Ciclo de Vida'
      default:
        return 'Geral'
    }
  }

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Checklist de Conformidade de Segurança do Ambiente"
        subtitle="Verificação dos controles de proteção do ambiente da serventia com status auditável, vínculo a laudos comprobatórios e prazos."
        action={
          canEdit ? (
            <Button
              onClick={handleOpenNew}
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-9 gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Requisito</span>
            </Button>
          ) : undefined
        }
      />

      {itens.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Nenhum item de conformidade cadastrado.
        </Card>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => {
            const isComprovado = item.status === 'comprovado'
            const isNaoConforme = item.status === 'nao_conforme'
            const compVinculado = item.expand?.comprovante_vinculado

            return (
              <Card
                key={item.id}
                className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all bg-white"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            isComprovado
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isNaoConforme
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] px-2 py-0.5"
                        >
                          {formatCategoriaLabel(item.categoria)}
                        </Badge>

                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {item.item_nome}
                        </h4>
                      </div>

                      {item.descricao && (
                        <p className="text-xs text-slate-600 leading-relaxed">{item.descricao}</p>
                      )}

                      <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 pt-1">
                        {item.prazo && (
                          <div className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Prazo / Revisão:</span>
                            <span className="font-semibold text-slate-700">
                              {formatSpDateOnly(item.prazo)}
                            </span>
                          </div>
                        )}

                        {compVinculado ? (
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-emerald-800 text-[11px] font-medium">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              Comprovado via: {compVinculado.tipo} em{' '}
                              {formatSpDateOnly(compVinculado.data_comprovante)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Sem comprovante anexado</span>
                          </div>
                        )}
                      </div>

                      {item.observacoes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                          {item.observacoes}
                        </p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="shrink-0 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="text-xs h-8 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id, item.item_nome)}
                          className="text-xs h-8 text-slate-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL DE EDIÇÃO DO REQUISITO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingItem ? 'Editar Requisito de Conformidade' : 'Novo Requisito de Conformidade'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Itens técnicos neutros que comprovam as boas práticas de segurança do ambiente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Título do Requisito *</Label>
              <Input
                placeholder="Ex.: Antivírus ativo em todas as estações"
                value={itemNome}
                onChange={(e) => setItemNome(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Descrição Detalhada</Label>
              <Textarea
                rows={2}
                placeholder="Detalhamento do controle aplicado no ambiente..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Categoria *</Label>
                <Select value={categoria} onValueChange={(val: any) => setCategoria(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="endpoint">Endpoint & Antivírus</SelectItem>
                    <SelectItem value="firewall">Firewall & Redes</SelectItem>
                    <SelectItem value="monitoramento">Monitoramento Contínuo</SelectItem>
                    <SelectItem value="acessos_senhas">Contas & Senhas</SelectItem>
                    <SelectItem value="ativos_sistemas">Sistemas & EOL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Status de Conformidade *
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprovado">Comprovado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Comprovante Vinculado</Label>
              <Select value={comprovanteVinculado} onValueChange={setComprovanteVinculado}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Vincular comprovante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum comprovante vinculado</SelectItem>
                  {comprovantes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.tipo} — {formatSpDateOnly(c.data_comprovante)}{' '}
                      {c.expand?.solucao ? `(${c.expand.solucao.nome})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Prazo / Próxima Revisão
              </Label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Observações</Label>
              <Textarea
                rows={2}
                placeholder="Anotações de auditoria ou justificativas..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
              >
                {saving ? 'Gravando...' : 'Salvar Requisito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegurancaChecklistTab
