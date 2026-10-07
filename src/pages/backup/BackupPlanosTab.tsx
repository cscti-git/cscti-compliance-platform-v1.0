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
import {
  Plus,
  Edit2,
  Trash2,
  Sliders,
  CheckCircle2,
  ListPlus,
  X,
  Clock,
  RotateCcw,
  Calendar,
  Cloud,
  HardDrive,
  ExternalLink,
  Layers,
  Server,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import {
  saveBackupPlano,
  deleteBackupPlano,
  listBackupPlanos,
  listBackupPlanoRequisitos,
  saveBackupPlanoRequisito,
  deleteBackupPlanoRequisito,
  listBackupEscopos,
} from '@/services/backupService'
import { listInventoryAssets } from '@/services/csctiService'
import type {
  BackupPlanoItem,
  BackupPlanoRequisitoItem,
  BackupPlanoPeriodicidade,
  BackupPlanoDestino,
  BackupEscopoItem,
  InventoryAssetItem,
} from '@/types/cscti'

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
  const [escopoId, setEscopoId] = useState<string>('')

  // Lista de escopos e inventário para encadeamento
  const [escopos, setEscopos] = useState<BackupEscopoItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])

  useEffect(() => {
    if (orgId) {
      listBackupEscopos(orgId).then(setEscopos).catch(console.error)
      listInventoryAssets(orgId).then(setAssets).catch(console.error)
    }
  }, [orgId])

  // Requisitos Técnicos do Plano
  const [rtoHoras, setRtoHoras] = useState<string>('')
  const [rpoHoras, setRpoHoras] = useState<string>('')
  const [retencaoDias, setRetencaoDias] = useState<string>('')
  const [periodicidade, setPeriodicidade] = useState<BackupPlanoPeriodicidade | ''>('')
  const [intervaloMinutos, setIntervaloMinutos] = useState<number>(30)
  const [janelaHorario, setJanelaHorario] = useState<string>('23:00')
  const [destinos, setDestinos] = useState<BackupPlanoDestino[]>([])

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

  const toggleDestino = (dest: BackupPlanoDestino) => {
    setDestinos((prev) => (prev.includes(dest) ? prev.filter((d) => d !== dest) : [...prev, dest]))
  }

  const openNewPlano = () => {
    setEditingItem(null)
    setNome('')
    setDescricao('')
    setStatus('ativo')
    setEscopoId(escopos.length > 0 ? escopos[0].id : '')
    setRtoHoras('')
    setRpoHoras('')
    setRetencaoDias('')
    setPeriodicidade('')
    setIntervaloMinutos(30)
    setJanelaHorario('23:00')
    setDestinos([])
    setModalOpen(true)
  }

  const openEditPlano = (p: BackupPlanoItem) => {
    setEditingItem(p)
    setNome(p.nome)
    setDescricao(p.descricao || '')
    setStatus(p.status)
    setEscopoId(p.escopo || '')
    setRtoHoras(p.rto_horas !== undefined && p.rto_horas !== null ? String(p.rto_horas) : '')
    setRpoHoras(p.rpo_horas !== undefined && p.rpo_horas !== null ? String(p.rpo_horas) : '')
    setRetencaoDias(
      p.retencao_dias !== undefined && p.retencao_dias !== null ? String(p.retencao_dias) : '',
    )
    setPeriodicidade(p.periodicidade || '')
    setIntervaloMinutos(p.intervalo_minutos && p.intervalo_minutos >= 5 ? p.intervalo_minutos : 30)
    setJanelaHorario(p.janela_horario || (p.periodicidade === 'intervalo_minutos' ? '' : '23:00'))
    setDestinos(Array.isArray(p.destino) ? p.destino : [])
    setModalOpen(true)
  }

  const handleSavePlano = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    // Validações simples opcionais
    if (rtoHoras && Number(rtoHoras) < 0) {
      toast({
        title: 'Valor inválido',
        description: 'O RTO deve ser maior ou igual a 0.',
        variant: 'destructive',
      })
      return
    }
    if (rpoHoras && Number(rpoHoras) < 0) {
      toast({
        title: 'Valor inválido',
        description: 'O RPO deve ser maior ou igual a 0.',
        variant: 'destructive',
      })
      return
    }
    if (retencaoDias && Number(retencaoDias) < 0) {
      toast({
        title: 'Valor inválido',
        description: 'A retenção deve ser maior ou igual a 0.',
        variant: 'destructive',
      })
      return
    }
    if (
      periodicidade === 'intervalo_minutos' &&
      (intervaloMinutos < 5 || intervaloMinutos > 1440)
    ) {
      toast({
        title: 'Intervalo inválido',
        description: 'O intervalo deve estar entre 5 e 1440 minutos.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await saveBackupPlano({
        id: editingItem?.id,
        organization: orgId,
        nome: nome.trim(),
        descricao: descricao.trim(),
        status,
        escopo: escopoId && escopoId !== 'none' ? escopoId : undefined,
        rto_horas: rtoHoras ? Number(rtoHoras) : undefined,
        rpo_horas: rpoHoras ? Number(rpoHoras) : undefined,
        retencao_dias: retencaoDias ? Number(retencaoDias) : undefined,
        periodicidade: periodicidade ? (periodicidade as BackupPlanoPeriodicidade) : undefined,
        intervalo_minutos:
          periodicidade === 'intervalo_minutos' ? Number(intervaloMinutos) : undefined,
        janela_horario:
          periodicidade && periodicidade !== 'intervalo_minutos' ? janelaHorario.trim() : undefined,
        destino: destinos,
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
      {/* Cabeçalho padronizado da aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                2. Planos de Backup e Continuidade
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] font-bold bg-white text-slate-700 border-slate-300"
              >
                {planos.length} {planos.length === 1 ? 'plano' : 'planos'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Estrutura formal das políticas de cópia (estratégia 3-2-1, alvos de RTO/RPO, retenção
              e mídias redundantes).
            </p>
          </div>
        </div>

        {canOperate && (
          <Button
            onClick={openNewPlano}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs shrink-0 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" /> Novo Plano
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planos.length === 0 ? (
          <Card className="col-span-full border-dashed border-amber-300 bg-amber-50/30 p-8 text-center rounded-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-3">
              <Sliders className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Nenhum plano de backup cadastrado</p>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
              Defina a política 3-2-1, com alvos de RTO (tempo de recuperação), RPO (tolerância de
              perda) e períodos de retenção.
            </p>
            {canOperate && (
              <Button
                onClick={openNewPlano}
                size="sm"
                className="mt-4 text-xs bg-[#0B2545] hover:bg-[#124E78] text-white font-semibold gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Cadastre o Primeiro Plano
              </Button>
            )}
          </Card>
        ) : (
          planos.map((plano) => {
            const escopoVinculado =
              plano.expand?.escopo || escopos.find((e) => e.id === plano.escopo)
            const ativosIdsEscopo = Array.isArray(escopoVinculado?.ativos)
              ? escopoVinculado.ativos
              : []
            const qtdAtivosEscopo = ativosIdsEscopo.length

            return (
              <Card
                key={plano.id}
                className="border-slate-200 shadow-2xs hover:shadow-xs transition"
              >
                <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          plano.status === 'ativo'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-slate-600 bg-slate-100'
                        }`}
                      >
                        {plano.status.toUpperCase()}
                      </Badge>
                      {escopoVinculado ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1"
                          title={`Escopo: ${escopoVinculado.nome} (${qtdAtivosEscopo} ativos)`}
                        >
                          <Layers className="w-3 h-3 text-blue-600" />
                          Escopo: {escopoVinculado.nome} ({qtdAtivosEscopo}{' '}
                          {qtdAtivosEscopo === 1 ? 'ativo' : 'ativos'})
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-slate-400 border-dashed"
                        >
                          Sem escopo vinculado
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                      {plano.nome}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 text-xs space-y-3">
                  {/* Linha Informativa do Encadeamento Herdado */}
                  {escopoVinculado && (
                    <div className="p-2 rounded bg-blue-50/60 border border-blue-100 text-[11px] text-blue-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Layers className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>{escopoVinculado.nome}</span>
                      </span>
                      <Badge className="bg-white text-blue-800 border-blue-200 text-[10px] font-bold">
                        {qtdAtivosEscopo} {qtdAtivosEscopo === 1 ? 'ativo' : 'ativos'} vinculados
                      </Badge>
                    </div>
                  )}

                  {plano.descricao && (
                    <p className="text-slate-600 line-clamp-3">{plano.descricao}</p>
                  )}

                  {/* Bloco de Requisitos Técnicos do Plano (quando configurados) */}
                  {((plano.rto_horas !== undefined && plano.rto_horas !== null) ||
                    (plano.rpo_horas !== undefined && plano.rpo_horas !== null) ||
                    (plano.retencao_dias !== undefined && plano.retencao_dias !== null) ||
                    plano.periodicidade ||
                    (Array.isArray(plano.destino) && plano.destino.length > 0)) && (
                    <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Sliders className="w-3 h-3 text-slate-400" />
                        <span>Requisitos Técnicos</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {plano.rpo_horas !== undefined && plano.rpo_horas !== null && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0 font-medium"
                          >
                            RPO: {plano.rpo_horas}h
                          </Badge>
                        )}

                        {plano.rto_horas !== undefined && plano.rto_horas !== null && (
                          <Badge
                            variant="secondary"
                            className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-1.5 py-0 font-medium"
                          >
                            RTO: {plano.rto_horas}h
                          </Badge>
                        )}

                        {plano.retencao_dias !== undefined && plano.retencao_dias !== null && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0 font-medium"
                          >
                            Retenção: {plano.retencao_dias}d
                          </Badge>
                        )}

                        {plano.periodicidade && (
                          <Badge
                            variant="secondary"
                            className="bg-purple-50 text-purple-900 border border-purple-200 px-1.5 py-0 font-medium capitalize"
                          >
                            {plano.periodicidade === 'intervalo_minutos'
                              ? `A cada ${plano.intervalo_minutos || 30} min`
                              : `${plano.periodicidade}${plano.janela_horario ? ` (${plano.janela_horario})` : ''}`}
                          </Badge>
                        )}

                        {Array.isArray(plano.destino) && plano.destino.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0 font-medium capitalize"
                          >
                            Destino: {plano.destino.join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openGerenciarRequisitos(plano)}
                      className="h-8 text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100/50"
                    >
                      <ListPlus className="w-3.5 h-3.5 mr-1" /> Requisitos Detalhados
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
            )
          })
        )}
      </div>

      {/* Modal Criar/Editar Plano */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              {/* Encadeamento: Seleção de Escopo de Proteção */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#0B2545] text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-700" />
                    Escopo Vinculado{' '}
                    <span className="text-slate-400 font-normal">
                      (Encadeamento Escopo &rarr; Planos)
                    </span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold">Passo 2 do Ciclo</span>
                </div>
                <Select
                  value={escopoId || 'none'}
                  onValueChange={(val) => setEscopoId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger className="text-xs bg-white h-9">
                    <SelectValue placeholder="Selecione o escopo que participará deste plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum escopo vinculado</SelectItem>
                    {escopos.map((esc) => {
                      const countAtivos = Array.isArray(esc.ativos) ? esc.ativos.length : 0
                      return (
                        <SelectItem key={esc.id} value={esc.id}>
                          {esc.nome} — ({countAtivos}{' '}
                          {countAtivos === 1 ? 'ativo vinculado' : 'ativos vinculados'})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Ao associar o escopo, este plano passa a proteger formalmente os ativos
                  inventariados selecionados nele.
                </p>

                {/* Exibição read-only dos ativos vinculados ao escopo selecionado */}
                {escopoId &&
                  escopoId !== 'none' &&
                  (() => {
                    const selectedEscopo = escopos.find((e) => e.id === escopoId)
                    const ativosIds = Array.isArray(selectedEscopo?.ativos)
                      ? selectedEscopo.ativos
                      : []
                    const escopoAssets = assets.filter((a) => ativosIds.includes(a.id))

                    return (
                      <div className="mt-2.5 pt-2.5 border-t border-blue-200/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Server className="w-3.5 h-3.5 text-blue-600" />
                            Ativos do Escopo Selecionado ({escopoAssets.length}):
                          </span>
                          <span className="text-[10px] text-slate-500 italic">
                            Somente leitura (definido no Inventário)
                          </span>
                        </div>

                        {escopoAssets.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                            Nenhum ativo vinculado a este escopo ainda. Você pode vincular ativos na
                            aba 1. Escopo.
                          </p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {escopoAssets.map((asset) => {
                              const hasAny =
                                asset.exige_backup_local ||
                                asset.exige_backup_nuvem ||
                                asset.exige_backup_replicacao
                              return (
                                <div
                                  key={asset.id}
                                  className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          hasAny ? 'bg-emerald-500' : 'bg-slate-300'
                                        }`}
                                      />
                                      <span className="font-bold text-slate-900 truncate">
                                        {asset.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({asset.tipo})
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {asset.exige_backup_local && (
                                      <Badge className="text-[9px] bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 px-1 py-0">
                                        Local
                                      </Badge>
                                    )}
                                    {asset.exige_backup_nuvem && (
                                      <Badge className="text-[9px] bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100 px-1 py-0">
                                        Nuvem
                                      </Badge>
                                    )}
                                    {asset.exige_backup_replicacao && (
                                      <Badge className="text-[9px] bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 px-1 py-0">
                                        Replicação
                                      </Badge>
                                    )}
                                    {!hasAny && (
                                      <span className="text-[10px] text-slate-400 italic">
                                        Sem exigência
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })()}
              </div>

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
                  rows={2}
                  placeholder="Descreva a frequência, método de cópia e objetivos de proteção."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              {/* Seção Requisitos Técnicos do Plano */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#0B2545]" />
                  <span className="font-bold text-slate-900 text-xs">
                    Requisitos Técnicos do Plano
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal text-slate-500 py-0 px-1.5"
                  >
                    Opcional
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Defina os alvos de RPO, RTO, retenção, periodicidade e destinos (ex.: Veeam local
                  contínuo vs Acronis noturno em nuvem).
                </p>

                {/* Grid RTO / RPO / Retenção */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                      RTO (horas)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Ex: 4"
                      value={rtoHoras}
                      onChange={(e) => setRtoHoras(e.target.value)}
                      className="text-xs h-8"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Tempo retomada</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                      RPO (horas)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Ex: 24"
                      value={rpoHoras}
                      onChange={(e) => setRpoHoras(e.target.value)}
                      className="text-xs h-8"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Perda máxima</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                      Retenção (dias)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Ex: 30"
                      value={retencaoDias}
                      onChange={(e) => setRetencaoDias(e.target.value)}
                      className="text-xs h-8"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Dias guardados</span>
                  </div>
                </div>

                {/* Periodicidade Geral */}
                <div>
                  <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                    Periodicidade Geral do Plano
                  </label>
                  <Select
                    value={periodicidade || 'none'}
                    onValueChange={(val) => {
                      if (val === 'none') {
                        setPeriodicidade('')
                      } else {
                        const per = val as BackupPlanoPeriodicidade
                        setPeriodicidade(per)
                        if (per === 'intervalo_minutos') {
                          setJanelaHorario('')
                        } else if (!janelaHorario) {
                          setJanelaHorario('23:00')
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Selecione a periodicidade (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não especificada</SelectItem>
                      <SelectItem value="intervalo_minutos">
                        A cada X minutos (contínuo / alta frequência)
                      </SelectItem>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcampo condicional: intervalo_minutos vs janela_horario */}
                {periodicidade === 'intervalo_minutos' && (
                  <div className="p-2.5 rounded-md bg-blue-50/50 border border-blue-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-blue-950 block text-[11px]">
                        Intervalo de Execução (Minutos)
                      </label>
                      <div className="flex items-center gap-1">
                        {[15, 30, 60, 120].map((quickVal) => (
                          <button
                            key={quickVal}
                            type="button"
                            onClick={() => setIntervaloMinutos(quickVal)}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                              Number(intervaloMinutos) === quickVal
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-white border border-blue-200 text-blue-800 hover:bg-blue-100'
                            }`}
                          >
                            {quickVal}m
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={5}
                      max={1440}
                      placeholder="30"
                      value={intervaloMinutos}
                      onChange={(e) =>
                        setIntervaloMinutos(
                          Math.max(5, Math.min(1440, Number(e.target.value) || 5)),
                        )
                      }
                      className="text-xs bg-white h-8"
                    />
                    <p className="text-[10px] text-blue-800/80">
                      Ciclo a cada {intervaloMinutos || 30} minutos (intervalo permitido de 5 a 1440
                      min). Ideal para replicação e snapshots contínuos (ex: Veeam local).
                    </p>
                  </div>
                )}

                {periodicidade && periodicidade !== 'intervalo_minutos' && (
                  <div>
                    <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                      Horário da Janela
                    </label>
                    <Input
                      placeholder="Ex: 23:00 (noturna)"
                      value={janelaHorario}
                      onChange={(e) => setJanelaHorario(e.target.value)}
                      className="text-xs h-8"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Horário de início da janela programada de cópia.
                    </span>
                  </div>
                )}

                {/* Destino: Checkboxes Local / Nuvem / Externo */}
                <div>
                  <label className="font-semibold text-slate-700 block text-[11px] mb-1.5">
                    Destino da Cópia (estratégia de armazenamento)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs transition ${
                        destinos.includes('local')
                          ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        checked={destinos.includes('local')}
                        onCheckedChange={() => toggleDestino('local')}
                      />
                      <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Local</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs transition ${
                        destinos.includes('nuvem')
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        checked={destinos.includes('nuvem')}
                        onCheckedChange={() => toggleDestino('nuvem')}
                      />
                      <Cloud className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Nuvem</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs transition ${
                        destinos.includes('externo')
                          ? 'bg-amber-50/70 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        checked={destinos.includes('externo')}
                        onCheckedChange={() => toggleDestino('externo')}
                      />
                      <ExternalLink className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Externo</span>
                    </label>
                  </div>
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
