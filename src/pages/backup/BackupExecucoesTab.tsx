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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveBackupExecucao } from '@/services/backupService'
import type { BackupExecucaoItem, BackupRotinaItem, BackupExecucaoStatus } from '@/types/cscti'

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Histórico de Execuções e Avaliações
          </h2>
          <p className="text-xs text-slate-500">
            Registro consolidado das cópias realizadas (vindas de evidências processadas ou
            lançamentos manuais) com parecer de conformidade técnica.
          </p>
        </div>

        {canOperate && (
          <Button
            onClick={handleOpenNova}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Lançar Execução Manual
          </Button>
        )}
      </div>

      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Rotina de Origem</th>
                  <th className="py-2.5 px-3">Início / Término</th>
                  <th className="py-2.5 px-3">Tamanho</th>
                  <th className="py-2.5 px-3">Destino</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3">Observações / Parecer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {execucoes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      Nenhuma execução registrada no histórico da serventia.
                    </td>
                  </tr>
                ) : (
                  execucoes.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-50/70 transition">
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
                      <td
                        className="py-2.5 px-3 text-slate-600 max-w-xs truncate"
                        title={exec.observacao}
                      >
                        {exec.observacao || 'Concluído em conformidade com o plano.'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                    {rotinas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nome}
                      </SelectItem>
                    ))}
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
    </div>
  )
}
export default BackupExecucoesTab
