import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDateTime, formatDate } from '@/lib/dateTime'
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
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  Check,
  X,
  FileCheck2,
  ShieldAlert,
  Trash2,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Server,
  Cloud,
  Layers,
  Info,
} from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import {
  saveBackupOcorrencia,
  resolverBackupOcorrencia,
  deleteBackupOcorrencia,
} from '@/services/backupService'
import type { BackupOcorrenciaItem } from '@/types/cscti'

interface BackupOcorrenciasTabProps {
  ocorrencias: BackupOcorrenciaItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupOcorrenciasTab: React.FC<BackupOcorrenciasTabProps> = ({
  ocorrencias,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()

  // Modal Nova Ocorrência
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<
    | 'falha_de_backup'
    | 'falta_de_evidencia'
    | 'atraso_de_rotina'
    | 'erro_de_processamento'
    | 'teste_sem_sucesso'
    | 'outro'
  >('falha_de_backup')
  const [severidade, setSeveridade] = useState<'baixa' | 'media' | 'alta'>('media')

  // Modal Resolver Ocorrência
  const [resolverModalOpen, setResolverModalOpen] = useState(false)
  const [resolvendoItem, setResolvendoItem] = useState<BackupOcorrenciaItem | null>(null)
  const [resolucaoTexto, setResolucaoTexto] = useState('')

  // Modal Remover Ocorrência
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<BackupOcorrenciaItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openNova = () => {
    setTitulo('')
    setDescricao('')
    setTipo('falha_de_backup')
    setSeveridade('media')
    setModalOpen(true)
  }

  const handleSaveNova = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !descricao.trim()) return
    setSubmitting(true)
    try {
      await saveBackupOcorrencia({
        organization: orgId,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        severidade,
        status: 'aberta',
      })
      toast({
        title: 'Ocorrência aberta',
        description: `Ocorrência "${titulo}" registrada no painel de continuidade.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao abrir ocorrência',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openResolver = (item: BackupOcorrenciaItem) => {
    setResolvendoItem(item)
    setResolucaoTexto(
      'Rotina verificada, cópia secundária executada com êxito e arquivos validados.',
    )
    setResolverModalOpen(true)
  }

  const handleConfirmarResolucao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvendoItem || !resolucaoTexto.trim()) return
    setSubmitting(true)
    try {
      await resolverBackupOcorrencia(resolvendoItem.id, orgId, resolucaoTexto.trim())
      toast({
        title: 'Ocorrência resolvida',
        description: 'Status atualizado para Resolvida e registrado em auditoria.',
      })
      setResolverModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao resolver ocorrência',
        description: err instanceof Error ? err.message : 'Falha ao atualizar.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openDeleteDialog = (item: BackupOcorrenciaItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setDeleting(true)
    try {
      await deleteBackupOcorrencia(deletingItem.id, orgId)
      toast({
        title: 'Ocorrência removida',
        description: 'A ocorrência foi excluída com sucesso.',
      })
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover ocorrência',
        description: err instanceof Error ? err.message : 'Falha ao excluir.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho padronizado da aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-amber-50/20 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                7. Ocorrências e Desvios de Continuidade
              </h2>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  ocorrencias.length > 0
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}
              >
                {ocorrencias.length} {ocorrencias.length === 1 ? 'ocorrência' : 'ocorrências'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de falhas em cópias de segurança, lapsos de evidências periódicas e medidas
              corretivas adotadas.
            </p>
          </div>
        </div>

        {canOperate && (
          <Button
            onClick={openNova}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs shrink-0 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" /> Registrar Ocorrência
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ocorrencias.length === 0 ? (
          <Card className="col-span-full border-dashed border-slate-300 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma ocorrência registrada</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Todas as rotinas e comprovações de backup estão em conformidade e sem apontamentos.
            </p>
          </Card>
        ) : (
          ocorrencias.map((oco) => (
            <Card
              key={oco.id}
              className={`border shadow-2xs transition ${
                oco.status === 'resolvida'
                  ? 'border-slate-200 bg-white opacity-85'
                  : oco.severidade === 'alta'
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-amber-200 bg-amber-50/20'
              }`}
            >
              <CardHeader className="p-4 pb-2.5 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase ${
                        oco.severidade === 'alta'
                          ? 'text-red-700 bg-red-100/70 border-red-300'
                          : oco.severidade === 'media'
                            ? 'text-amber-700 bg-amber-100/70 border-amber-300'
                            : 'text-slate-700 bg-slate-100 border-slate-300'
                      }`}
                    >
                      Severidade {oco.severidade}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{oco.tipo.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                    {oco.titulo}
                  </CardTitle>
                </div>

                <Badge
                  className={`text-[10px] uppercase font-bold ${
                    oco.status === 'resolvida'
                      ? 'bg-slate-100 text-slate-700'
                      : oco.status === 'em_analise'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {oco.status.replace(/_/g, ' ')}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 text-xs space-y-3">
                <p className="text-slate-700">{oco.descricao}</p>

                {/* Badge Resolvida automaticamente na listagem */}
                {oco.status === 'resolvida' && oco.resolvida_automaticamente && (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold gap-1 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-emerald-200" />
                      Resolvida automaticamente
                    </Badge>
                    {oco.resolvida_por_evidencia && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        (Evidência #{oco.resolvida_por_evidencia.slice(0, 8)})
                      </span>
                    )}
                  </div>
                )}

                {oco.resolucao && (
                  <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                        {oco.resolvida_automaticamente ? (
                          <>
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Comprovação de Resolução Automática:
                          </>
                        ) : (
                          'Resolução e Parecer:'
                        )}
                      </span>
                      {oco.resolvida_automaticamente && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          Comprovante Posterior
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{oco.resolucao}</p>
                    {oco.resolvida_em && (
                      <span className="block text-[10px] text-emerald-700 mt-1 font-mono">
                        Resolvido em {formatDateTime(oco.resolvida_em)}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-slate-500">
                  <span className="text-[11px]">
                    Aberta em: {oco.created ? formatDate(oco.created, '—') : '—'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {canOperate && oco.status !== 'resolvida' && (
                      <Button
                        size="sm"
                        onClick={() => openResolver(oco)}
                        className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Resolver Ocorrência
                      </Button>
                    )}

                    {canOperate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(oco)}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remover ocorrência"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sr-only">Remover</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Nova Ocorrência */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveNova}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Registrar Ocorrência de Continuidade
              </DialogTitle>
              <DialogDescription className="text-xs">
                Aponte atrasos de rotina, falhas de integridade ou ausência de cópias externas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Título da Ocorrência <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Falha na replicação externa de sexta-feira"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo</label>
                  <Select
                    value={tipo}
                    onValueChange={(
                      val:
                        | 'falha_de_backup'
                        | 'falta_de_evidencia'
                        | 'atraso_de_rotina'
                        | 'erro_de_processamento'
                        | 'teste_sem_sucesso'
                        | 'outro',
                    ) => setTipo(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="falha_de_backup">Falha de Backup</SelectItem>
                      <SelectItem value="falta_de_evidencia">Falta de Evidência</SelectItem>
                      <SelectItem value="atraso_de_rotina">Atraso de Rotina</SelectItem>
                      <SelectItem value="erro_de_processamento">Erro de Processamento</SelectItem>
                      <SelectItem value="teste_sem_sucesso">Teste sem Sucesso</SelectItem>
                      <SelectItem value="outro">Outro Desvio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Severidade</label>
                  <Select
                    value={severidade}
                    onValueChange={(val: 'baixa' | 'media' | 'alta') => setSeveridade(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta (Crítica)</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Descrição Circunstanciada <span className="text-red-500">*</span>
                </label>
                <Textarea
                  required
                  rows={4}
                  placeholder="Descreva o incidente detectado, horário e sistemas afetados..."
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
                {submitting ? 'Salvando...' : 'Abrir Ocorrência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Resolver Ocorrência */}
      <Dialog open={resolverModalOpen} onOpenChange={setResolverModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleConfirmarResolucao}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Resolver Ocorrência #{resolvendoItem?.id}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registre a medida corretiva adotada para sanar o desvio no ciclo de backup.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* SEÇÃO 1: O QUE OCORREU */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    O que ocorreu
                  </span>
                  {resolvendoItem?.tipo && (
                    <span className="text-[10px] font-mono text-slate-500">
                      #{resolvendoItem.tipo}
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-800">
                  <div className="font-semibold text-slate-900 mb-1">{resolvendoItem?.titulo}</div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {resolvendoItem?.descricao}
                  </p>
                </div>

                {/* Se existir fato_real estruturado, exibir detalhes técnicos completos */}
                {resolvendoItem?.fato_real && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/80">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {resolvendoItem.fato_real.rotina_nome && (
                        <div>
                          <span className="text-slate-500 block">Rotina:</span>
                          <span className="font-semibold text-slate-800">
                            {resolvendoItem.fato_real.rotina_nome}
                          </span>
                        </div>
                      )}
                      {resolvendoItem.fato_real.modalidade && (
                        <div>
                          <span className="text-slate-500 block">Modalidade:</span>
                          <span className="font-semibold text-slate-800">
                            {resolvendoItem.fato_real.modalidade}
                          </span>
                        </div>
                      )}
                      {(resolvendoItem.fato_real.data_hora_sp ||
                        resolvendoItem.fato_real.data_iso) && (
                        <div>
                          <span className="text-slate-500 block">Data/Hora (SP):</span>
                          <span className="font-mono text-slate-800">
                            {resolvendoItem.fato_real.data_hora_sp ||
                              formatDateTime(resolvendoItem.fato_real.data_iso)}
                          </span>
                        </div>
                      )}
                      {resolvendoItem.fato_real.adaptador && (
                        <div>
                          <span className="text-slate-500 block">Adaptador:</span>
                          <span className="font-mono text-slate-800">
                            {resolvendoItem.fato_real.adaptador}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* VMs com falha (badges vermelhas) */}
                    {Array.isArray(resolvendoItem.fato_real.vms_falhas) &&
                      resolvendoItem.fato_real.vms_falhas.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-red-700 uppercase block mb-1">
                            VMs com falha ({resolvendoItem.fato_real.vms_falhas.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {resolvendoItem.fato_real.vms_falhas.map((vm, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-300 font-mono text-[10px] py-0.5"
                              >
                                {vm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* VMs com sucesso (badges verdes) */}
                    {Array.isArray(resolvendoItem.fato_real.vms_sucesso) &&
                      resolvendoItem.fato_real.vms_sucesso.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                            VMs com sucesso ({resolvendoItem.fato_real.vms_sucesso.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {resolvendoItem.fato_real.vms_sucesso.map((vm, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-[10px] py-0.5"
                              >
                                {vm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Ids de Execução e Evidência de origem */}
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono">
                      {resolvendoItem.fato_real.execucao_id && (
                        <span>Execução #{resolvendoItem.fato_real.execucao_id.slice(0, 10)}</span>
                      )}
                      {resolvendoItem.fato_real.evidencia_id && (
                        <span>Evidência #{resolvendoItem.fato_real.evidencia_id.slice(0, 10)}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Se não tem fato_real mas tem execucao/evidencia vinculadas diretamente */}
                {!resolvendoItem?.fato_real &&
                  (resolvendoItem?.execucao || resolvendoItem?.evidencia) && (
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono border-t border-slate-200">
                      {resolvendoItem?.execucao && (
                        <span>Execução #{resolvendoItem.execucao.slice(0, 10)}</span>
                      )}
                      {resolvendoItem?.evidencia && (
                        <span>Evidência #{resolvendoItem.evidencia.slice(0, 10)}</span>
                      )}
                    </div>
                  )}
              </div>

              {/* SEÇÃO 2: COMO RESPONDER */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                  Como responder
                </span>
                <p className="text-xs text-amber-900 leading-relaxed">
                  1. Verifique o job de backup correspondente no console do software (ex.: Veeam /
                  Acronis).
                  <br />
                  2. Reexecute a cópia sobressalente para as máquinas virtuais faltantes.
                  <br />
                  3. Anexe ou processe o comprovante novo na aba <strong>Evidências</strong>. Caso a
                  nova execução conclua com 100% de sucesso, esta ocorrência será resolvida
                  automaticamente, ou informe o parecer manual abaixo.
                </p>
              </div>

              {/* SEÇÃO 3: PARECER DE RESOLUÇÃO */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Parecer de Resolução / Ação Corretiva <span className="text-red-500">*</span>
                </label>
                <Textarea
                  required
                  rows={4}
                  placeholder="Descreva o procedimento técnico realizado (ex: reinício do daemon, cópia sobressalente gerada)..."
                  value={resolucaoTexto}
                  onChange={(e) => setResolucaoTexto(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResolverModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
              >
                {submitting ? 'Gravando...' : 'Concluir Resolução'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação para Remover Ocorrência */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Remover Ocorrência #{deletingItem?.id}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              Deseja remover esta ocorrência? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              {deleting ? 'Removendo...' : 'Sim, remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default BackupOcorrenciasTab
