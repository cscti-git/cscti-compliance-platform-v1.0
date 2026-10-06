import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Edit2, Trash2, Layers, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveBackupEscopo, deleteBackupEscopo } from '@/services/backupService'
import type { BackupEscopoItem } from '@/types/cscti'

interface BackupEscopoTabProps {
  escopos: BackupEscopoItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupEscopoTab: React.FC<BackupEscopoTabProps> = ({
  escopos,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BackupEscopoItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<BackupEscopoItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [sistemasProtegidos, setSistemasProtegidos] = useState('')
  const [criticidade, setCriticidade] = useState<'baixa' | 'media' | 'alta'>('alta')
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'em_revisao'>('ativo')

  const openNew = () => {
    setEditingItem(null)
    setNome('')
    setDescricao('')
    setSistemasProtegidos('')
    setCriticidade('alta')
    setStatus('ativo')
    setModalOpen(true)
  }

  const openEdit = (item: BackupEscopoItem) => {
    setEditingItem(item)
    setNome(item.nome)
    setDescricao(item.descricao || '')
    setSistemasProtegidos(item.sistemas_protegidos || '')
    setCriticidade(item.criticidade)
    setStatus(item.status)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSubmitting(true)
    try {
      await saveBackupEscopo({
        id: editingItem?.id,
        organization: orgId,
        nome: nome.trim(),
        descricao: descricao.trim(),
        sistemas_protegidos: sistemasProtegidos.trim(),
        criticidade,
        status,
      })
      toast({
        title: editingItem ? 'Escopo atualizado' : 'Escopo cadastrado',
        description: `O escopo "${nome}" foi salvo com sucesso.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar escopo',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    setSubmitting(true)
    try {
      await deleteBackupEscopo(deletingItem.id, orgId, deletingItem.nome)
      toast({
        title: 'Escopo excluído',
        description: `O escopo "${deletingItem.nome}" foi removido.`,
      })
      setDeletingItem(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir escopo',
        description: err instanceof Error ? err.message : 'Falha na exclusão.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Escopos de Proteção do Cartório</h2>
          <p className="text-xs text-slate-500">
            Define detalhadamente o que a serventia mantém sob cobertura de cópia de segurança
            (bancos de dados, sistemas registrais, repositórios de certidões e VMs).
          </p>
        </div>
        {canOperate && (
          <Button
            onClick={openNew}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Escopo
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {escopos.length === 0 ? (
          <Card className="col-span-full border-dashed border-slate-300 p-8 text-center">
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum escopo cadastrado</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Cadastre o que precisa ser protegido para estruturar os planos e rotinas de backup.
            </p>
            {canOperate && (
              <Button onClick={openNew} size="sm" variant="outline" className="mt-4 text-xs">
                <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Escopo
              </Button>
            )}
          </Card>
        ) : (
          escopos.map((item) => (
            <Card key={item.id} className="border-slate-200 shadow-2xs hover:shadow-xs transition">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                <div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold mb-1.5 ${
                      item.criticidade === 'alta'
                        ? 'text-red-700 bg-red-50 border-red-200'
                        : item.criticidade === 'media'
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-slate-700 bg-slate-100'
                    }`}
                  >
                    Criticidade {item.criticidade}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                    {item.nome}
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    item.status === 'ativo'
                      ? 'text-emerald-700 bg-emerald-50'
                      : item.status === 'em_revisao'
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-slate-500 bg-slate-100'
                  }`}
                >
                  {item.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                {item.descricao && <p className="text-slate-600 line-clamp-3">{item.descricao}</p>}

                {item.sistemas_protegidos && (
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Sistemas Protegidos:
                    </span>
                    <span className="text-slate-800 font-mono text-[11px]">
                      {item.sistemas_protegidos}
                    </span>
                  </div>
                )}

                {canOperate && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                      className="h-8 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingItem(item)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingItem ? 'Editar Escopo de Proteção' : 'Novo Escopo de Proteção'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mapeie os elementos críticos que compõem o plano de continuidade da serventia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome do Escopo <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Base Central de Atos e Documentos Notariais"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Criticidade</label>
                  <Select
                    value={criticidade}
                    onValueChange={(val: 'baixa' | 'media' | 'alta') => setCriticidade(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta (Sistemas de Atos)</SelectItem>
                      <SelectItem value="media">Média (Apoio / Administrativo)</SelectItem>
                      <SelectItem value="baixa">Baixa (Arquivo Histórico)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <Select
                    value={status}
                    onValueChange={(val: 'ativo' | 'inativo' | 'em_revisao') => setStatus(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="em_revisao">Em Revisão</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Sistemas, Bases e Ativos Protegidos
                </label>
                <Input
                  placeholder="Ex: PostgreSQL (banco_atos), Storage NAS (PDF/A), VM-APLICACAO"
                  value={sistemasProtegidos}
                  onChange={(e) => setSistemasProtegidos(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Descrição e Abrangência do Escopo
                </label>
                <Textarea
                  rows={3}
                  placeholder="Descreva a finalidade, impactos e particularidades técnicas desta cobertura."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs"
              >
                {submitting ? 'Salvando...' : 'Salvar Escopo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Excluir Escopo de Proteção?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja remover o escopo &ldquo;{deletingItem?.nome}&rdquo;? Esta ação
              será registrada na trilha de auditoria da serventia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={submitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {submitting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default BackupEscopoTab
