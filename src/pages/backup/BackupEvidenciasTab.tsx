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
  FileCheck2,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Upload,
  Eye,
  Hash,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { processarEvidenciaBackup, listBackupProcessamentos } from '@/services/backupService'
import type {
  BackupEvidenciaItem,
  BackupRotinaItem,
  BackupProcessamentoItem,
  EvidenciaStatus,
} from '@/types/cscti'

interface BackupEvidenciasTabProps {
  evidencias: BackupEvidenciaItem[]
  rotinas: BackupRotinaItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupEvidenciasTab: React.FC<BackupEvidenciasTabProps> = ({
  evidencias,
  rotinas,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()

  // Modal Registrar Evidência (Upload/Colar HTML ou texto)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [remetente, setRemetente] = useState('sistema-backup@cartorio.local')
  const [assunto, setAssunto] = useState('[SUCESSO] Backup Noturno Base de Dados - Job #442')
  const [rotinaId, setRotinaId] = useState('')
  const [conteudo, setConteudo] = useState(
    `Relatório de Execução de Cópia de Segurança
Trabalho: Job Backup Geral - PostgreSQL Atos
Status: SUCESSO (Job completed successfully)
Data/Hora Início: ${new Date().toISOString()}
Data/Hora Término: ${new Date().toISOString()}
Tamanho transferido: 4.8 GB
Destino: Storage NAS Dedicado e Cópia Nuvem S3
Arquivos verificados: 100% OK, hash SHA-256 verificado.`,
  )

  // Modal Detalhes do Processamento / Evidência
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedEvidencia, setSelectedEvidencia] = useState<BackupEvidenciaItem | null>(null)
  const [processamentos, setProcessamentos] = useState<BackupProcessamentoItem[]>([])
  const [procLoading, setProcLoading] = useState(false)

  const handleOpenRegistrar = () => {
    setRemetente('sistema-backup@cartorio.local')
    setAssunto('[SUCESSO] Backup Noturno Base de Dados - Job #442')
    setRotinaId(rotinas.length > 0 ? rotinas[0].id : '')
    setModalOpen(true)
  }

  const handleProcessarNovaEvidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conteudo.trim()) return
    setSubmitting(true)
    try {
      const res = await processarEvidenciaBackup({
        organizationId: orgId,
        conteudo: conteudo.trim(),
        remetente: remetente.trim(),
        assunto: assunto.trim(),
        rotinaId: rotinaId || undefined,
        tipo: 'upload_manual',
      })

      if (res.success) {
        toast({
          title: 'Evidência processada com sucesso',
          description: `Status detectado: ${res.status.toUpperCase()} • Execução #${res.execucao_id || ''} gerada.`,
        })
      } else {
        toast({
          title: 'Evidência não reconhecida',
          description: res.message,
          variant: 'destructive',
        })
      }
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao processar evidência',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o backend.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Reprocessar evidência existente
  const handleReprocessar = async (item: BackupEvidenciaItem) => {
    if (!item.conteudo) return
    try {
      toast({
        title: 'Reprocessando evidência...',
        description: 'Enviando comprovante para os adaptadores ativos.',
      })
      await processarEvidenciaBackup({
        organizationId: orgId,
        conteudo: item.conteudo,
        remetente: item.remetente,
        assunto: item.assunto,
        rotinaId: item.rotina,
        tipo: item.tipo === 'webhook' ? 'upload_manual' : item.tipo,
      })
      toast({
        title: 'Reprocessamento concluído',
        description: 'Os dados foram atualizados com sucesso.',
      })
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao reprocessar',
        description: err instanceof Error ? err.message : 'Falha no adaptador.',
        variant: 'destructive',
      })
    }
  }

  const handleVerDetalhes = async (item: BackupEvidenciaItem) => {
    setSelectedEvidencia(item)
    setDetailModalOpen(true)
    setProcLoading(true)
    try {
      const procs = await listBackupProcessamentos(orgId)
      setProcessamentos(procs.filter((p) => p.evidencia === item.id))
    } catch (err) {
      console.error(err)
    } finally {
      setProcLoading(false)
    }
  }

  const getStatusBadge = (st: EvidenciaStatus) => {
    switch (st) {
      case 'processada':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Processada
          </Badge>
        )
      case 'pendente':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
            <RefreshCw className="w-3 h-3 mr-1" /> Pendente
          </Badge>
        )
      case 'erro':
        return (
          <Badge className="bg-red-50 text-red-800 border-red-200 text-[10px] font-bold">
            <XCircle className="w-3 h-3 mr-1" /> Erro
          </Badge>
        )
      case 'nao_reconhecida':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
            <HelpCircle className="w-3 h-3 mr-1" /> Não Reconhecida
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Evidências e Comprovantes de Backup
          </h2>
          <p className="text-xs text-slate-500">
            Comprovantes com cálculo automático de HASH SHA-256 (garantia estrita de idempotência) e
            extração via adaptador EMAIL_HTML_GENERICO.
          </p>
        </div>

        {canOperate && (
          <Button
            onClick={handleOpenRegistrar}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Registrar Evidência (Manual / HTML)
          </Button>
        )}
      </div>

      {/* Lista de Evidências */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assunto / Remetente</th>
                  <th className="py-2.5 px-3">Rotina Vinculada</th>
                  <th className="py-2.5 px-3">Data Recebida</th>
                  <th className="py-2.5 px-3">Hash SHA-256</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evidencias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      Nenhuma evidência registrada. Clique em &ldquo;Registrar Evidência&rdquo; para
                      inserir o primeiro comprovante.
                    </td>
                  </tr>
                ) : (
                  evidencias.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3">{getStatusBadge(item.status_processamento)}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block truncate max-w-sm">
                          {item.assunto || 'Sem assunto'}
                        </span>
                        <span className="text-[11px] text-slate-500">{item.remetente}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-700 font-medium">
                          {item.expand?.rotina?.nome || 'Geral / Automático'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.data_recebida
                          ? new Date(item.data_recebida).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                        <span title={item.hash_conteudo}>
                          {item.hash_conteudo.slice(0, 12)}...{item.hash_conteudo.slice(-6)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalhes(item)}
                            className="h-7 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-2"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
                          </Button>
                          {canOperate && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReprocessar(item)}
                              className="h-7 text-[11px] text-slate-700 hover:bg-slate-100 px-2"
                              title="Reprocessar"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" /> Processar
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

      {/* Modal Registrar Nova Evidência */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleProcessarNovaEvidencia} className="flex-1 flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#0B2545]" />
                Registrar Comprovante de Backup
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cole o conteúdo em texto ou HTML enviado pelo software de cópia (Veeam, Bacula,
                scripts locais). O sistema calculará o hash SHA-256 e extrairá os dados de
                conformidade.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Remetente / Origem
                  </label>
                  <Input
                    required
                    value={remetente}
                    onChange={(e) => setRemetente(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rotina Alvo</label>
                  <Select value={rotinaId} onValueChange={setRotinaId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione a rotina..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Automático / Geral</SelectItem>
                      {rotinas.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assunto da Mensagem / Notificação
                </label>
                <Input
                  required
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Conteúdo do Comprovante (Texto ou HTML) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Adaptador: EMAIL_HTML_GENERICO</span>
                </div>
                <Textarea
                  required
                  rows={8}
                  placeholder="Cole aqui o corpo do e-mail de backup ou log de execução..."
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="text-xs font-mono resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
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
                {submitting ? 'Processando Adaptador...' : 'Processar Evidência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Processamento */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#0B2545]" />
              Detalhes da Evidência e Extração
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dados da prova digital e resultado estruturado gerado pelo adaptador de processamento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 text-xs">
            {selectedEvidencia && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Assunto:
                    </span>
                    <strong className="text-slate-900 text-sm">{selectedEvidencia.assunto}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Remetente:
                      </span>
                      <span>{selectedEvidencia.remetente}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Recebido em:
                      </span>
                      <span>
                        {selectedEvidencia.data_recebida
                          ? new Date(selectedEvidencia.data_recebida).toLocaleString('pt-BR')
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Hash SHA-256 (Integridade / Idempotência):
                    </span>
                    <span className="font-mono text-[11px] text-blue-900 break-all select-all">
                      {selectedEvidencia.hash_conteudo}
                    </span>
                  </div>
                </div>

                {/* Resultado do Processamento */}
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Extração do Adaptador
                  </span>
                  {procLoading ? (
                    <p className="text-slate-400 italic">Carregando extração...</p>
                  ) : processamentos.length === 0 ? (
                    <p className="text-slate-500 italic p-3 border rounded bg-slate-50">
                      Nenhum processamento registrado para esta evidência.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {processamentos.map((proc) => (
                        <div
                          key={proc.id}
                          className="p-3 rounded-lg border border-slate-200 bg-white space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              Adaptador: {proc.adaptador_usado} (v{proc.versao_adaptador || '1.0'})
                            </span>
                            <Badge
                              className={`text-[10px] ${
                                proc.resultado?.status_detectado === 'sucesso'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {proc.resultado?.status_detectado?.toUpperCase() || 'PARCIAL'}
                            </Badge>
                          </div>
                          <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                            {JSON.stringify(proc.resultado, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conteúdo Bruto Sanitizado */}
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1">
                    Conteúdo Bruto do Comprovante
                  </span>
                  <pre className="p-3 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedEvidencia.conteudo}
                  </pre>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BackupEvidenciasTab
