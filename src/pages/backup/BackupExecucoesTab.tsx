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
  PlayCircle,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  FileCheck,
  Layers,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  saveBackupExecucao,
  getBackupAvaliacaoByExecucao,
  excluirBackupExecucoes,
} from '@/services/backupService'
import { BackupLaudoCard } from '@/components/backup/BackupLaudoCard'
import type {
  BackupExecucaoItem,
  BackupRotinaItem,
  BackupExecucaoStatus,
  BackupAvaliacaoItem,
} from '@/types/cscti'

interface BackupExecucoesTabProps {
  execucoes: BackupExecucaoItem[]
  rotinas: BackupRotinaItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupExecucoesTab: React.FC<BackupExecucoesTabProps> = ({
  execucoes,
  rotinas,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [vmsModalOpen, setVmsModalOpen] = useState(false)
  const [selectedVms, setSelectedVms] = useState<{
    jobName: string
    vms: NonNullable<BackupExecucaoItem['detalhes_vms']>
  } | null>(null)

  // Seleção e Exclusão de Execuções
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [execucoesParaExcluir, setExecucoesParaExcluir] = useState<BackupExecucaoItem[]>([])
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [confirmacaoCiencia, setConfirmacaoCiencia] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(execucoes.map((e) => e.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleOpenDeleteSingle = (exec: BackupExecucaoItem) => {
    setExecucoesParaExcluir([exec])
    setMotivoExclusao('')
    setConfirmacaoCiencia(false)
    setDeleteModalOpen(true)
  }

  const handleOpenDeleteBatch = () => {
    const itens = execucoes.filter((e) => selectedIds.includes(e.id))
    setExecucoesParaExcluir(itens)
    setMotivoExclusao('')
    setConfirmacaoCiencia(false)
    setDeleteModalOpen(true)
  }

  const handleConfirmExclusao = async () => {
    if (!motivoExclusao.trim() || motivoExclusao.trim().length < 10) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe uma justificativa com no mínimo 10 caracteres para auditoria.',
        variant: 'destructive',
      })
      return
    }
    if (!confirmacaoCiencia) {
      toast({
        title: 'Confirmação necessária',
        description: 'Confirme a ciência da exclusão permanente e registro na trilha de auditoria.',
        variant: 'destructive',
      })
      return
    }

    setDeleting(true)
    try {
      const ids = execucoesParaExcluir.map((e) => e.id)
      const payload =
        ids.length === 1
          ? { execucaoId: ids[0], motivo: motivoExclusao.trim(), confirmacao: true }
          : { execucaoIds: ids, motivo: motivoExclusao.trim(), confirmacao: true }

      const res = await excluirBackupExecucoes(payload)
      toast({
        title: 'Execução(ões) excluída(s)',
        description: res.message || `${res.removidos} execução(ões) removida(s) com sucesso.`,
      })
      setSelectedIds([])
      setExecucoesParaExcluir([])
      setDeleteModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Falha ao excluir execução',
        description: err instanceof Error ? err.message : 'Erro ao processar exclusão no backend.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Modal Laudo Técnico da Execução
  const [laudoModalOpen, setLaudoModalOpen] = useState(false)
  const [selectedExecucaoParaLaudo, setSelectedExecucaoParaLaudo] =
    useState<BackupExecucaoItem | null>(null)
  const [laudoCarregado, setLaudoCarregado] = useState<BackupAvaliacaoItem | null>(null)
  const [laudoLoading, setLaudoLoading] = useState(false)

  const handleOpenLaudo = async (exec: BackupExecucaoItem) => {
    setSelectedExecucaoParaLaudo(exec)
    setLaudoCarregado(null)
    setLaudoModalOpen(true)
    setLaudoLoading(true)
    try {
      const aval = await getBackupAvaliacaoByExecucao(exec.id, orgId)
      setLaudoCarregado(aval)
    } catch (err) {
      console.error(err)
    } finally {
      setLaudoLoading(false)
    }
  }

  // Formulário de lançamento manual de execução
  const [rotinaId, setRotinaId] = useState('')
  const [status, setStatus] = useState<BackupExecucaoStatus>('sucesso')
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 16))
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 16))
  const [tamanhoFormatado, setTamanhoFormatado] = useState('3.2 GB')
  const [destino, setDestino] = useState('Storage NAS Local + Nuvem Externa')
  const [observacao, setObservacao] = useState(
    'Execução manual conferida pelo encarregado de TI da serventia.',
  )

  const handleOpenNova = () => {
    setRotinaId(rotinas.length > 0 ? rotinas[0].id : '')
    setStatus('sucesso')
    setDataInicio(new Date().toISOString().slice(0, 16))
    setDataFim(new Date().toISOString().slice(0, 16))
    setTamanhoFormatado('3.2 GB')
    setDestino('Storage NAS Local + Nuvem Externa')
    setObservacao('Execução manual conferida pelo encarregado de TI da serventia.')
    setModalOpen(true)
  }

  const handleSaveExecucao = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await saveBackupExecucao({
        organization: orgId,
        rotina: rotinaId || undefined,
        status,
        origem_registro: 'manual',
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        tamanho_formatado: tamanhoFormatado,
        destino,
        observacao,
      })
      toast({
        title: 'Execução registrada',
        description: 'Lançamento manual computado e avaliado com sucesso.',
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar execução',
        description: err instanceof Error ? err.message : 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (st: BackupExecucaoStatus) => {
    switch (st) {
      case 'sucesso':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> SUCESSO
          </Badge>
        )
      case 'erro':
        return (
          <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px] font-bold">
            <XCircle className="w-3 h-3 mr-1" /> ERRO
          </Badge>
        )
      case 'parcial':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 mr-1" /> PARCIAL
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold">NÃO EXECUTADA</Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho padronizado da aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shrink-0 mt-0.5">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                6. Execuções e Pareceres Técnicos
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] font-bold bg-white text-slate-700 border-slate-300"
              >
                {execucoes.length} {execucoes.length === 1 ? 'execução' : 'execuções'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Histórico consolidado com laudos técnicos passo a passo de conformidade (RTO, RPO,
              retenção e integridade).
            </p>
          </div>
        </div>

        {canOperate && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleOpenDeleteBatch}
                className="text-xs font-semibold gap-1.5 shadow-xs bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Selecionadas ({selectedIds.length})
              </Button>
            )}
            <Button
              onClick={handleOpenNova}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Lançar Execução Manual
            </Button>
          </div>
        )}
      </div>

      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  {canOperate && (
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545] h-3.5 w-3.5 cursor-pointer align-middle"
                        title="Selecionar todas as execuções"
                        checked={execucoes.length > 0 && selectedIds.length === execucoes.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Rotina de Origem</th>
                  <th className="py-2.5 px-3">Início / Término</th>
                  <th className="py-2.5 px-3">Tamanho</th>
                  <th className="py-2.5 px-3">Destino</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3">Observações / Parecer</th>
                  <th className="py-2.5 px-3 text-right">Laudo / Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {execucoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canOperate ? 9 : 8}
                      className="py-8 text-center text-slate-500 italic"
                    >
                      Nenhuma execução registrada no histórico da serventia.
                    </td>
                  </tr>
                ) : (
                  execucoes.map((exec) => (
                    <tr
                      key={exec.id}
                      className={`hover:bg-slate-50/70 transition ${
                        selectedIds.includes(exec.id) ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {canOperate && (
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545] h-3.5 w-3.5 cursor-pointer align-middle"
                            checked={selectedIds.includes(exec.id)}
                            onChange={() => handleToggleSelect(exec.id)}
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-3">{getStatusBadge(exec.status)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {exec.expand?.rotina?.nome || 'Rotina Geral'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {exec.data_inicio
                          ? new Date(exec.data_inicio).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800">
                        {exec.tamanho_formatado || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{exec.destino || '—'}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-mono px-1.5 py-0 bg-slate-50"
                        >
                          {exec.origem_registro}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs" title={exec.observacao}>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">
                            {exec.observacao || 'Concluído em conformidade com o plano.'}
                          </span>
                          {exec.detalhes_vms && exec.detalhes_vms.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedVms({
                                  jobName: exec.observacao || 'Execução de Backup Veeam',
                                  vms: exec.detalhes_vms!,
                                })
                                setVmsModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex-shrink-0"
                            >
                              <Layers className="h-3 w-3" />
                              {exec.detalhes_vms.length} VMs
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLaudo(exec)}
                            className="h-7 px-2.5 text-xs text-[#0B2545] border-slate-300 hover:bg-slate-100 font-semibold gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0B2545]" />
                            Ver Laudo
                          </Button>
                          {canOperate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDeleteSingle(exec)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Excluir execução do histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Ver Laudo Técnico de Avaliação */}
      <Dialog open={laudoModalOpen} onOpenChange={setLaudoModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-[#0B2545]" />
              Laudo Técnico de Conformidade da Execução
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedExecucaoParaLaudo?.expand?.rotina?.nome
                ? `Rotina: ${selectedExecucaoParaLaudo.expand.rotina.nome} • Registrada em ${
                    selectedExecucaoParaLaudo.data_inicio
                      ? new Date(selectedExecucaoParaLaudo.data_inicio).toLocaleString('pt-BR')
                      : '—'
                  }`
                : 'Parecer técnico automatizado baseado nas políticas e planos cadastrados.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-4">
            {laudoLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">
                Carregando laudo de conformidade...
              </div>
            ) : laudoCarregado?.laudo_tecnico ? (
              <BackupLaudoCard
                laudo={laudoCarregado.laudo_tecnico}
                titulo="Laudo Técnico de Conformidade"
                rotinaId={selectedExecucaoParaLaudo?.rotina || undefined}
                evidenciaId={selectedExecucaoParaLaudo?.evidencia || undefined}
                onFontesCadastradas={() => {
                  onReload()
                }}
              />
            ) : (
              <div className="p-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-600 space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />
                <div className="font-semibold text-slate-800">
                  Nenhum laudo técnico detalhado registrado para esta execução.
                </div>
                <p className="text-slate-500 max-w-md mx-auto">
                  {selectedExecucaoParaLaudo?.origem_registro === 'manual'
                    ? 'Execuções manuais registram observações diretas do operador. O laudo com verificações individuais de adaptadores é emitido automaticamente a partir de comprovantes e e-mails.'
                    : 'A avaliação automatizada ainda não foi gerada para esta execução.'}
                </p>
                {selectedExecucaoParaLaudo?.observacao && (
                  <div className="p-3 bg-white border border-slate-200 rounded text-left mt-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Parecer Registrado na Execução
                    </span>
                    <span className="text-slate-700">{selectedExecucaoParaLaudo.observacao}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLaudoModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhamento de VMs do Veeam */}
      <Dialog open={vmsModalOpen} onOpenChange={setVmsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Layers className="h-5 w-5 text-blue-600" />
              Detalhamento de Objetos / VMs — Veeam Backup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedVms?.jobName || 'Execução registrada por comprovante de backup.'}
            </DialogDescription>
          </DialogHeader>

          {selectedVms?.vms && (
            <div className="space-y-3 pt-2">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Nome VM</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Horário</th>
                      <th className="py-2.5 px-3">Tamanho</th>
                      <th className="py-2.5 px-3">Lido</th>
                      <th className="py-2.5 px-3">Transferido</th>
                      <th className="py-2.5 px-3">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVms.vms.map((vm, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {vm.nome}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              vm.status.toLowerCase().includes('success')
                                ? 'bg-emerald-100 text-emerald-800'
                                : vm.status.toLowerCase().includes('warning')
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {vm.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          {vm.start_time || '—'}
                          {vm.end_time ? ` → ${vm.end_time}` : ''}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                          {vm.size || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{vm.read || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {vm.transferred || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          {vm.duration || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVmsModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Lançar Execução Manual */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveExecucao}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#0B2545]" />
                Lançar Execução Manual de Backup
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registre uma cópia executada localmente para alimentar a auditoria de continuidade.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rotina Associada</label>
                <Select value={rotinaId} onValueChange={setRotinaId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione a rotina..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Execução Avulsa / Geral</SelectItem>
                    {rotinas.map((r) => {
                      const freq =
                        r.periodicidade === 'intervalo_minutos'
                          ? `A cada ${r.intervalo_minutos || 30} min`
                          : r.periodicidade
                      const tipo = r.tipo_execucao || 'incremental'
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome} ({freq} · {tipo})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Resultado / Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={(val: BackupExecucaoStatus) => setStatus(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sucesso">Sucesso (Conforme)</SelectItem>
                      <SelectItem value="parcial">Parcial (Alerta)</SelectItem>
                      <SelectItem value="erro">Erro (Não Conforme)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tamanho da Cópia
                  </label>
                  <Input
                    placeholder="Ex: 5.2 GB"
                    value={tamanhoFormatado}
                    onChange={(e) => setTamanhoFormatado(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Data / Hora Início
                  </label>
                  <Input
                    type="datetime-local"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data / Hora Fim</label>
                  <Input
                    type="datetime-local"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Destino do Backup</label>
                <Input
                  placeholder="Ex: Storage NAS Synology + Nuvem S3"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Observações e Laudo Técnico
                </label>
                <Textarea
                  rows={2}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
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
                {submitting ? 'Salvando...' : 'Registrar Execução'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão de Execuções */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-700">
              <Trash2 className="w-5 h-5 text-red-600" />
              Confirmar Exclusão de Execução de Backup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Esta ação removerá o registro de execução, suas avaliações automatizadas em cascata e
              desvinculará eventuais ocorrências. Todos os passos serão auditados de forma
              permanente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Resumo do que será excluído */}
            <div className="p-3 rounded-lg border border-red-100 bg-red-50/50 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center justify-between">
                <span>
                  Resumo ({execucoesParaExcluir.length}{' '}
                  {execucoesParaExcluir.length === 1 ? 'registro' : 'registros'})
                </span>
                <span className="text-[11px] font-mono text-red-700">Ação irreversível</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-red-100/60">
                {execucoesParaExcluir.map((e) => (
                  <div
                    key={e.id}
                    className="pt-1.5 first:pt-0 text-[11px] text-slate-700 space-y-0.5"
                  >
                    <div className="font-medium text-slate-900 flex items-center justify-between">
                      <span>{e.expand?.rotina?.nome || 'Rotina Geral'}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {e.tamanho_formatado || 'Tamanho n/d'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>
                        Data:{' '}
                        {e.data_inicio
                          ? new Date(e.data_inicio).toLocaleString('pt-BR')
                          : 'Data n/d'}
                      </span>
                      <span>•</span>
                      <span>Origem: {e.origem_registro}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Justificativa obrigatória */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  Justificativa da Exclusão <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    motivoExclusao.trim().length >= 10 ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {motivoExclusao.trim().length}/10 caracteres mín.
                </span>
              </div>
              <Textarea
                rows={3}
                placeholder="Descreva o motivo técnico ou operacional para remoção deste(s) registro(s)..."
                value={motivoExclusao}
                onChange={(e) => setMotivoExclusao(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            {/* Checkbox de ciência */}
            <label className="flex items-start gap-2 p-2.5 rounded border border-slate-200 bg-slate-50/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmacaoCiencia}
                onChange={(e) => setConfirmacaoCiencia(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
              />
              <span className="text-[11px] text-slate-700 leading-tight">
                Estou ciente de que esta exclusão é permanente, remove laudos técnicos associados e
                será registrada com meu usuário e justificativa na trilha de auditoria do sistema.
              </span>
            </label>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmExclusao}
              disabled={deleting || motivoExclusao.trim().length < 10 || !confirmacaoCiencia}
              className="text-xs bg-red-600 hover:bg-red-700 font-semibold"
            >
              {deleting ? 'Excluindo...' : 'Confirmar e Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BackupExecucoesTab
