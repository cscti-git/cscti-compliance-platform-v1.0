import React, { useState } from 'react'
import { AlertTriangle, Loader2, UserCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { registrarAvaliacaoNocManual } from '@/services/backupService'
import type { BackupNocClienteStatusItem } from '@/types/cscti'

interface NocAvaliacaoManualModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/**
 * Modal "Registrar Avaliação Manual" — Validação Externa (NOC).
 * Usado quando a equipe (admin/suporte) conecta-se ao servidor e valida as
 * rotinas de backup manualmente, sem o e-mail do NOC (origem_tipo='manual').
 */
export const NocAvaliacaoManualModal: React.FC<NocAvaliacaoManualModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [dataAvaliacao, setDataAvaliacao] = useState('')
  const [statusGeral, setStatusGeral] = useState<'ok' | 'falha' | 'atencao'>('ok')
  const [clientesTexto, setClientesTexto] = useState('')
  const [acoesRealizadas, setAcoesRealizadas] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [conteudo, setConteudo] = useState('')

  // Linhas no formato "Cliente | Status | Ações" (Status: OK, SUCCESS, Falha, Erro...)
  const parseClientes = (texto: string): BackupNocClienteStatusItem[] => {
    return texto
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0)
      .map((linha) => {
        const partes = linha.split('|').map((p) => p.trim())
        const cliente = partes[0] || ''
        const status = partes[1] || 'OK'
        const acoes = partes[2] || ''
        return { cliente, status, acoes }
      })
      .filter((c) => c.cliente.length > 0)
  }

  const clientesPreview = parseClientes(clientesTexto)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await registrarAvaliacaoNocManual({
        status_geral: statusGeral,
        clientes_status: clientesPreview,
        acoes_realizadas: acoesRealizadas.trim(),
        observacoes: observacoes.trim(),
        data_avaliacao: dataAvaliacao || undefined,
        conteudo:
          conteudo.trim() ||
          `Validação Externa (NOC) registrada manualmente. Status geral: ${statusGeral}. Clientes avaliados: ${
            clientesPreview.map((c) => `${c.cliente}=${c.status}`).join('; ') || 'nenhum'
          }.${acoesRealizadas.trim() ? ' Ações: ' + acoesRealizadas.trim() : ''}${
            observacoes.trim() ? ' Observações: ' + observacoes.trim() : ''
          }`,
      })
      toast({
        title: 'Validação Externa (NOC) registrada',
        description:
          res.message ||
          'A avaliação manual do NOC foi arquivada no Monitoramento Externo com auditoria.',
      })
      onOpenChange(false)
      setClientesTexto('')
      setAcoesRealizadas('')
      setObservacoes('')
      setConteudo('')
      setDataAvaliacao('')
      setStatusGeral('ok')
      onSuccess()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar atestado',
        description:
          err instanceof Error ? err.message : 'Não foi possível registrar a avaliação manual.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-700" />
              Registrar Avaliação Manual do NOC (Validação Externa)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre manualmente o resultado da conexão diária do NOC ao servidor e da verificação
              das rotinas do Veeam/Acronis. Fica arquivado com seu login e carimbo de tempo
              auditável.
            </DialogDescription>{' '}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Data/Hora da Conexão</Label>
                <Input
                  type="datetime-local"
                  value={dataAvaliacao}
                  onChange={(e) => setDataAvaliacao(e.target.value)}
                  className="text-xs"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Vazio = agora. Deve refletir o momento real da conexão/validação externa.
                </span>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Status Geral do Ambiente <span className="text-red-500">*</span>
                </Label>
                <select
                  value={statusGeral}
                  onChange={(e) => setStatusGeral(e.target.value as 'ok' | 'falha' | 'atencao')}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ok">OK — todos os backups conformes</option>
                  <option value="atencao">Atenção — alertas sem falha crítica</option>
                  <option value="falha">Falha — backups com erro</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                VMs / Clientes Verificados (um por linha)
              </Label>
              <Textarea
                rows={4}
                value={clientesTexto}
                onChange={(e) => setClientesTexto(e.target.value)}
                placeholder={
                  'SRV-PRODUCAO-01 | OK\nSRV-ATOS-DB | Falha | Reexecutado às 09h\nSPCM-PROTESTO | OK'
                }
                className="text-xs font-mono resize-none"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Formato: <strong>Cliente | Status | Ações (opcional)</strong>. Os itens com falha
                alimentam o fato real da ocorrência, como no relatório por e-mail.
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Ações Realizadas pelo Técnico
              </Label>
              <Input
                value={acoesRealizadas}
                onChange={(e) => setAcoesRealizadas(e.target.value)}
                placeholder="Ex.: Job reexecutado manualmente com sucesso; alerta Veeam silenciado."
                className="text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Observações</Label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Contexto adicional desta Validação Externa (NOC) (opcional)."
                className="text-xs"
              />
            </div>

            {clientesPreview.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                  Prévia dos itens verificados ({clientesPreview.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {clientesPreview.map((c, i) => {
                    const isOk = ['OK', 'SUCCESS', 'SUCESSO'].includes(c.status.toUpperCase())
                    return (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {c.cliente}: {c.status}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/60 text-[11px] text-purple-900 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
              <span>
                Se o status geral for <strong>Falha</strong>, uma ocorrência de backup com o fato
                real por VM será aberta automaticamente — e o relatório do NOC com status OK de um
                dia posterior encerrará essa ocorrência automaticamente.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 mr-1" /> Registrar Atestado
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
