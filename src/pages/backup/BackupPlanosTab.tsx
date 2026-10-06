import React, { useState, useEffect } from 'react'
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
import { Plus, Edit2, Trash2, Sliders, CheckCircle2, ListPlus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  saveBackupPlano,
  deleteBackupPlano,
  listBackupPlanoRequisitos,
  saveBackupPlanoRequisito,
  deleteBackupPlanoRequisito,
} from '@/services/backupService'
import type { BackupPlanoItem, BackupPlanoRequisitoItem } from '@/types/cscti'

interface BackupPlanosTabProps {
  planos: BackupPlanoItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupPlanosTab: React.FC<BackupPlanosTabProps> = ({
  planos,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()

  // Modal Plano
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BackupPlanoItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<BackupPlanoItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')

  // Modal Requisitos do Plano
  const [reqModalOpen, setReqModalOpen] = useState(false)
  const [selectedPlanoForReq, setSelectedPlanoForReq] = useState<BackupPlanoItem | null>(null)
  const [planoReqs, setPlanoReqs] = useState<BackupPlanoRequisitoItem[]>([])
  const [reqLoading, setReqLoading] = useState(false)

  // Novo Requisito Form
  const [novoReqNome, setNovoReqNome] = useState('')
  const [novoReqParam, setNovoReqParam] = useState('')
  const [novoReqTipo, setNovoReqTipo] = useState<
    'rpo' | 'rto' | 'retencao' | 'periodicidade' | 'armazenamento' | 'outro'
  >('rpo')

  const openNewPlano = () => {
    setEditingItem(null)
    setNome('')
    setDescricao('')
    setStatus('ativo')
    setModalOpen(true)
  }

  const openEditPlano = (p: BackupPlanoItem) => {
    setEditingItem(p)
    setNome(p.nome)
    setDescricao(p.descricao || '')
    setStatus(p.status)
    setModalOpen(true)
  }

  const handleSavePlano = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSubmitting(true)
    try {
      await saveBackupPlano({
        id: editingItem?.id,
        organization: orgId,
        nome: nome.trim(),
        descricao: descricao.trim(),
        status,
      })
      toast({
        title: editingItem ? 'Plano atualizado' : 'Plano criado',
        description: `O plano de backup "${nome}" foi salvo com sucesso.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar plano',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePlano = async () => {
    if (!deletingItem) return
    setSubmitting(true)
    try {
      await deleteBackupPlano(deletingItem.id, orgId, deletingItem.nome)
      toast({
        title: 'Plano excluído',
        description: `O plano "${deletingItem.nome}" foi removido.`,
      })
      setDeletingItem(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir plano',
        description: err instanceof Error ? err.message : 'Falha na exclusão.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Gestão de Requisitos
  const openGerenciarRequisitos = async (plano: BackupPlanoItem) => {
    setSelectedPlanoForReq(plano)
    setReqModalOpen(true)
    setReqLoading(true)
    try {
      const data = await listBackupPlanoRequisitos(orgId, plano.id)
      setPlanoReqs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setReqLoading(false)
    }
  }

  const handleAddRequisito = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanoForReq || !novoReqNome.trim() || !novoReqParam.trim()) return
    try {
      await saveBackupPlanoRequisito({
        organization: orgId,
        plano: selectedPlanoForReq.id,
        requisito: novoReqNome.trim(),
        parametro: novoReqParam.trim(),
        tipo_requisito: novoReqTipo,
      })
      setNovoReqNome('')
      setNovoReqParam('')
      const updated = await listBackupPlanoRequisitos(orgId, selectedPlanoForReq.id)
      setPlanoReqs(updated)
      toast({
        title: 'Requisito adicionado',
        description: 'Requisito vinculado ao plano.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao adicionar requisito',
        description: err instanceof Error ? err.message : 'Falha ao salvar.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteRequisito = async (id: string) => {
    if (!selectedPlanoForReq) return
    try {
      await deleteBackupPlanoRequisito(id)
      setPlanoReqs(planoReqs.filter((r) => r.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Planos de Backup da Serventia</h2>
          <p className="text-xs text-slate-500">
            Estrutura formal das políticas de cópia (estratégia 3-2-1, alvos de RTO/RPO, retenção e
            mídias redundantes).
          </p>
        </div>
        {canOperate && (
          <Button
            onClick={openNewPlano}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Plano
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planos.length === 0 ? (
          <Card className="col-span-full border-dashed border-slate-300 p-8 text-center">
            <Sliders className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum plano cadastrado</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Crie o plano de backup com seus requisitos técnicos de continuidade.
            </p>
            {canOperate && (
              <Button onClick={openNewPlano} size="sm" variant="outline" className="mt-4 text-xs">
                <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Plano
              </Button>
            )}
          </Card>
        ) : (
          planos.map((plano) => (
            <Card key={plano.id} className="border-slate-200 shadow-2xs hover:shadow-xs transition">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                <div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold mb-1.5 ${
                      plano.status === 'ativo'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-600 bg-slate-100'
                    }`}
                  >
                    {plano.status.toUpperCase()}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                    {plano.nome}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                {plano.descricao && (
                  <p className="text-slate-600 line-clamp-3">{plano.descricao}</p>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openGerenciarRequisitos(plano)}
                    className="h-8 text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100/50"
                  >
                    <ListPlus className="w-3.5 h-3.5 mr-1" /> Requisitos do Plano
                  </Button>

                  {canOperate && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditPlano(plano)}
                        className="h-8 w-8 text-slate-600 hover:text-slate-900"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingItem(plano)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Criar/Editar Plano */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSavePlano}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingItem ? 'Editar Plano de Backup' : 'Novo Plano de Backup'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Defina o nome e escopo conceitual da política de backup da serventia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome do Plano <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Política de Backup 3-2-1 e Nuvem Externa"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status</label>
                <Select value={status} onValueChange={(val: 'ativo' | 'inativo') => setStatus(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Descrição e Diretrizes do Plano
                </label>
                <Textarea
                  rows={3}
                  placeholder="Descreva a frequência, método de cópia e objetivos de proteção."
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
                {submitting ? 'Salvando...' : 'Salvar Plano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Requisitos do Plano (Sub-lista como legado) */}
      <Dialog open={reqModalOpen} onOpenChange={setReqModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0B2545]" />
              Requisitos do Plano: {selectedPlanoForReq?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Metas de RPO, RTO, retenção e parâmetros formais exigidos para conformidade.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Lista de Requisitos Existentes */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                Requisitos Configurados ({planoReqs.length})
              </span>
              {reqLoading ? (
                <p className="text-xs text-slate-400 italic">Carregando requisitos...</p>
              ) : planoReqs.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 border border-dashed rounded bg-slate-50">
                  Nenhum requisito cadastrado para este plano. Adicione abaixo os alvos de RTO, RPO
                  ou retenção.
                </p>
              ) : (
                <div className="space-y-2">
                  {planoReqs.map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-mono px-1.5 py-0 bg-slate-100"
                          >
                            {req.tipo_requisito || 'requisito'}
                          </Badge>
                          <span className="text-xs font-bold text-slate-900">{req.requisito}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 ml-0.5 font-medium">
                          {req.parametro}
                        </p>
                      </div>

                      {canOperate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRequisito(req.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                          title="Remover requisito"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Adicionar Requisito */}
            {canOperate && (
              <form
                onSubmit={handleAddRequisito}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 text-xs"
              >
                <span className="text-xs font-bold text-slate-800 block">
                  Adicionar Novo Requisito ao Plano
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Tipo de Meta
                    </label>
                    <Select
                      value={novoReqTipo}
                      onValueChange={(
                        val:
                          | 'rpo'
                          | 'rto'
                          | 'retencao'
                          | 'periodicidade'
                          | 'armazenamento'
                          | 'outro',
                      ) => setNovoReqTipo(val)}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rpo">RPO (Perda Máx. Tolerada)</SelectItem>
                        <SelectItem value="rto">RTO (Tempo Máx. Restauração)</SelectItem>
                        <SelectItem value="retencao">Retenção de Cópias</SelectItem>
                        <SelectItem value="periodicidade">Periodicidade Mínima</SelectItem>
                        <SelectItem value="armazenamento">Local / Armazenamento</SelectItem>
                        <SelectItem value="outro">Outro Requisito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Nome / Descrição do Requisito
                    </label>
                    <Input
                      placeholder="Ex: RPO Máximo de 24 horas"
                      value={novoReqNome}
                      onChange={(e) => setNovoReqNome(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                    Parâmetro / Valor Exigido
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Ex: Execução diária noturna e cópia externa em até 6h"
                      value={novoReqParam}
                      onChange={(e) => setNovoReqParam(e.target.value)}
                      className="text-xs h-8 flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="text-xs h-8 bg-[#0B2545] hover:bg-[#124E78] text-white shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReqModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Plano */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Excluir Plano de Backup?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja remover o plano &ldquo;{deletingItem?.nome}&rdquo;? Suas
              rotinas e requisitos vinculados também serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={submitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlano}
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
export default BackupPlanosTab
