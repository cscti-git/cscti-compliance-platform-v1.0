import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  User,
  Database,
  Link as LinkIcon,
  Server,
  X,
  FileCode,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  saveBackupRotina,
  deleteBackupRotina,
  listBackupFontes,
  saveBackupFonte,
  deleteBackupFonte,
} from '@/services/backupService'
import { listPeople, listInventoryAssets } from '@/services/csctiService'
import type {
  BackupRotinaItem,
  BackupPlanoItem,
  BackupFonteItem,
  PersonItem,
  InventoryAssetItem,
} from '@/types/cscti'

interface BackupRotinasTabProps {
  rotinas: BackupRotinaItem[]
  planos: BackupPlanoItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupRotinasTab: React.FC<BackupRotinasTabProps> = ({
  rotinas,
  planos,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()

  // Modais de Rotina
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BackupRotinaItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<BackupRotinaItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Formulário de Rotina
  const [planoId, setPlanoId] = useState('')
  const [nome, setNome] = useState('')
  const [periodicidade, setPeriodicidade] = useState<
    'diaria' | 'semanal' | 'mensal' | 'personalizada'
  >('diaria')
  const [horario, setHorario] = useState('23:00')
  const [responsavelId, setResponsavelId] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')

  // Pessoas e Ativos para vínculos
  const [people, setPeople] = useState<PersonItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])

  // Modal de Fontes da Rotina
  const [fontesModalOpen, setFontesModalOpen] = useState(false)
  const [selectedRotinaForFontes, setSelectedRotinaForFontes] = useState<BackupRotinaItem | null>(
    null,
  )
  const [fontesList, setFontesList] = useState<BackupFonteItem[]>([])
  const [fontesLoading, setFontesLoading] = useState(false)

  // Formulário Nova Fonte
  const [novaFonteTipo, setNovaFonteTipo] = useState<
    'banco_de_dados' | 'arquivos' | 'sistema' | 'e_mail' | 'maquina_virtual' | 'outro'
  >('banco_de_dados')
  const [novaFonteCaminho, setNovaFonteCaminho] = useState('')
  const [novaFonteAssetId, setNovaFonteAssetId] = useState('')

  useEffect(() => {
    if (orgId) {
      listPeople(orgId).then(setPeople).catch(console.error)
      listInventoryAssets(orgId).then(setAssets).catch(console.error)
    }
  }, [orgId])

  const openNewRotina = () => {
    setEditingItem(null)
    setPlanoId(planos.length > 0 ? planos[0].id : '')
    setNome('')
    setPeriodicidade('diaria')
    setHorario('23:00')
    setResponsavelId('')
    setStatus('ativo')
    setModalOpen(true)
  }

  const openEditRotina = (r: BackupRotinaItem) => {
    setEditingItem(r)
    setPlanoId(r.plano)
    setNome(r.nome)
    setPeriodicidade(r.periodicidade)
    setHorario(r.horario || '23:00')
    setResponsavelId(r.responsavel || '')
    setStatus(r.status)
    setModalOpen(true)
  }

  const handleSaveRotina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !planoId) return
    setSubmitting(true)
    try {
      await saveBackupRotina({
        id: editingItem?.id,
        organization: orgId,
        plano: planoId,
        nome: nome.trim(),
        periodicidade,
        horario,
        responsavel: responsavelId || undefined,
        status,
      })
      toast({
        title: editingItem ? 'Rotina atualizada' : 'Rotina criada',
        description: `A rotina "${nome}" foi salva com sucesso.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar rotina',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRotina = async () => {
    if (!deletingItem) return
    setSubmitting(true)
    try {
      await deleteBackupRotina(deletingItem.id, orgId, deletingItem.nome)
      toast({
        title: 'Rotina excluída',
        description: `A rotina "${deletingItem.nome}" foi removida.`,
      })
      setDeletingItem(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir rotina',
        description: err instanceof Error ? err.message : 'Falha na exclusão.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Gestão de Fontes vinculadas à rotina
  const openGerenciarFontes = async (rotina: BackupRotinaItem) => {
    setSelectedRotinaForFontes(rotina)
    setFontesModalOpen(true)
    setFontesLoading(true)
    try {
      const allFontes = await listBackupFontes(orgId)
      setFontesList(allFontes.filter((f) => f.rotina === rotina.id))
    } catch (err) {
      console.error(err)
    } finally {
      setFontesLoading(false)
    }
  }

  const handleAddFonte = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRotinaForFontes || !novaFonteCaminho.trim()) return
    try {
      await saveBackupFonte({
        organization: orgId,
        rotina: selectedRotinaForFontes.id,
        tipo_fonte: novaFonteTipo,
        caminho_identificacao: novaFonteCaminho.trim(),
        ativo_inventario: novaFonteAssetId || undefined,
        ativo: true,
      })
      setNovaFonteCaminho('')
      setNovaFonteAssetId('')
      const allFontes = await listBackupFontes(orgId)
      setFontesList(allFontes.filter((f) => f.rotina === selectedRotinaForFontes.id))
      toast({
        title: 'Fonte vinculada',
        description: 'Origem de dados associada com sucesso à rotina.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao vincular fonte',
        description: err instanceof Error ? err.message : 'Falha ao salvar.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteFonte = async (id: string) => {
    try {
      await deleteBackupFonte(id)
      setFontesList(fontesList.filter((f) => f.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Rotinas de Execução e Fontes Protegidas
          </h2>
          <p className="text-xs text-slate-500">
            Cronograma de disparo (diário, semanal, mensal) associado aos ativos e bancos de dados
            da serventia.
          </p>
        </div>
        {canOperate && (
          <Button
            onClick={openNewRotina}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova Rotina
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rotinas.length === 0 ? (
          <Card className="col-span-full border-dashed border-slate-300 p-8 text-center">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma rotina cadastrada</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Cadastre horários e periodicidades para vincular as fontes e ativos de TI.
            </p>
            {canOperate && (
              <Button onClick={openNewRotina} size="sm" variant="outline" className="mt-4 text-xs">
                <Plus className="w-4 h-4 mr-1" /> Criar Primeira Rotina
              </Button>
            )}
          </Card>
        ) : (
          rotinas.map((rotina) => (
            <Card
              key={rotina.id}
              className="border-slate-200 shadow-2xs hover:shadow-xs transition"
            >
              <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                <div>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold mb-1.5 text-blue-700 bg-blue-50 border-blue-200"
                  >
                    Plano: {rotina.expand?.plano?.nome || 'Geral'}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                    {rotina.nome}
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    rotina.status === 'ativo'
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-500 bg-slate-100'
                  }`}
                >
                  {rotina.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                <div className="grid grid-cols-2 gap-2 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="capitalize">{rotina.periodicidade}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rotina.horario ? `${rotina.horario}h` : 'Manual'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-slate-200/50">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">
                      Resp: {rotina.expand?.responsavel?.name || 'Não designado'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openGerenciarFontes(rotina)}
                    className="h-8 text-xs text-emerald-800 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50"
                  >
                    <Server className="w-3.5 h-3.5 mr-1" /> Fontes & Ativos
                  </Button>

                  {canOperate && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditRotina(rotina)}
                        className="h-8 w-8 text-slate-600 hover:text-slate-900"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingItem(rotina)}
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

      {/* Modal Criar/Editar Rotina */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveRotina}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingItem ? 'Editar Rotina de Backup' : 'Nova Rotina de Backup'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure a periodicidade, horário previsto e responsável pela execução.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Plano Vinculado <span className="text-red-500">*</span>
                </label>
                <Select value={planoId} onValueChange={setPlanoId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome da Rotina <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Cópia Diária Noturna - Banco de Dados"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Periodicidade</label>
                  <Select
                    value={periodicidade}
                    onValueChange={(val: 'diaria' | 'semanal' | 'mensal' | 'personalizada') =>
                      setPeriodicidade(val)
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="personalizada">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Horário Previsto
                  </label>
                  <Input
                    placeholder="Ex: 23:00"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Responsável</label>
                  <Select value={responsavelId} onValueChange={setResponsavelId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione a pessoa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum designar</SelectItem>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <Select
                    value={status}
                    onValueChange={(val: 'ativo' | 'inativo') => setStatus(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                {submitting ? 'Salvando...' : 'Salvar Rotina'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Fontes da Rotina */}
      <Dialog open={fontesModalOpen} onOpenChange={setFontesModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-[#0B2545]" />
              Fontes da Rotina: {selectedRotinaForFontes?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mapeamento de origens (bancos de dados, arquivos, máquinas virtuais) vinculadas a
              ativos do inventário.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                Fontes Associadas ({fontesList.length})
              </span>
              {fontesLoading ? (
                <p className="text-xs text-slate-400 italic">Carregando fontes...</p>
              ) : fontesList.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 border border-dashed rounded bg-slate-50">
                  Nenhuma fonte vinculada a esta rotina. Adicione abaixo o banco, diretório ou ativo
                  de inventário.
                </p>
              ) : (
                <div className="space-y-2">
                  {fontesList.map((f) => (
                    <div
                      key={f.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-mono px-1.5 py-0 bg-slate-100"
                          >
                            {f.tipo_fonte}
                          </Badge>
                          <span className="text-xs font-bold text-slate-900">
                            {f.caminho_identificacao}
                          </span>
                        </div>
                        {f.expand?.ativo_inventario && (
                          <p className="text-[11px] text-blue-700 mt-0.5 ml-0.5 flex items-center gap-1 font-medium">
                            <Server className="w-3 h-3" /> Ativo: {f.expand.ativo_inventario.name} (
                            {f.expand.ativo_inventario.tipo})
                          </p>
                        )}
                      </div>

                      {canOperate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFonte(f.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                          title="Remover fonte"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Nova Fonte */}
            {canOperate && (
              <form
                onSubmit={handleAddFonte}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 text-xs"
              >
                <span className="text-xs font-bold text-slate-800 block">
                  Adicionar Nova Fonte à Rotina
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Tipo de Fonte
                    </label>
                    <Select
                      value={novaFonteTipo}
                      onValueChange={(
                        val:
                          | 'banco_de_dados'
                          | 'arquivos'
                          | 'sistema'
                          | 'e_mail'
                          | 'maquina_virtual'
                          | 'outro',
                      ) => setNovaFonteTipo(val)}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banco_de_dados">
                          Banco de Dados (SQL/PostgreSQL)
                        </SelectItem>
                        <SelectItem value="arquivos">Repositório de Arquivos / PDF/A</SelectItem>
                        <SelectItem value="maquina_virtual">Máquina Virtual / Snapshot</SelectItem>
                        <SelectItem value="sistema">Sistema / Aplicação</SelectItem>
                        <SelectItem value="e_mail">Caixas Postais / E-mail</SelectItem>
                        <SelectItem value="outro">Outra Fonte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Vincular Ativo de Inventário (Opcional)
                    </label>
                    <Select value={novaFonteAssetId} onValueChange={setNovaFonteAssetId}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Selecione um ativo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum ativo associado</SelectItem>
                        {assets.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.tipo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                    Caminho / Identificação da Fonte
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Ex: /var/lib/postgresql/data (Dump Full)"
                      value={novaFonteCaminho}
                      onChange={(e) => setNovaFonteCaminho(e.target.value)}
                      className="text-xs h-8 flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="text-xs h-8 bg-[#0B2545] hover:bg-[#124E78] text-white shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Vincular
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
              onClick={() => setFontesModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Excluir Rotina de Backup?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja remover a rotina &ldquo;{deletingItem?.nome}&rdquo;? Esta ação
              será registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={submitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRotina}
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
export default BackupRotinasTab
