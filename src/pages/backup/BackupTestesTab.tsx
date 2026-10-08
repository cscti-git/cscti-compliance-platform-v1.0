import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDate } from '@/lib/dateTime'
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
  CheckCircle2,
  Plus,
  Clock,
  Trash2,
  Edit2,
  FileCheck,
  ShieldCheck,
  User,
  AlertCircle,
  HardDrive,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveBackupTeste, deleteBackupTeste } from '@/services/backupService'
import { listPeople, listInventoryAssets } from '@/services/csctiService'
import type { BackupTesteRecuperacaoItem, PersonItem, InventoryAssetItem } from '@/types/cscti'

interface BackupTestesTabProps {
  testes: BackupTesteRecuperacaoItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupTestesTab: React.FC<BackupTestesTabProps> = ({
  testes,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BackupTesteRecuperacaoItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<BackupTesteRecuperacaoItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Formulário
  const [dataTeste, setDataTeste] = useState(() => new Date().toISOString().slice(0, 10))
  const [tipo, setTipo] = useState<'restauracao_total' | 'restauracao_parcial' | 'simulacao'>(
    'restauracao_total',
  )
  const [resultado, setResultado] = useState<'sucesso' | 'parcial' | 'falha'>('sucesso')
  const [tempoDecorrido, setTempoDecorrido] = useState<number>(35)
  const [responsavelId, setResponsavelId] = useState('')
  const [ativoId, setAtivoId] = useState('')
  const [escopoTestado, setEscopoTestado] = useState(
    'Restauração de banco de dados notarial e base de arquivos PDF/A em ambiente sandbox isolado.',
  )
  const [observacoes, setObservacoes] = useState(
    'Arquivos restaurados conferidos com integridade referencial 100%. Nenhuma divergência detectada.',
  )
  const [evidenciaComprobatoria, setEvidenciaComprobatoria] = useState(
    'Laudo técnico homologado com logs de restauração e hash SHA-256 verificado.',
  )

  const [people, setPeople] = useState<PersonItem[]>([])
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])

  useEffect(() => {
    if (orgId) {
      listPeople(orgId).then(setPeople).catch(console.error)
      listInventoryAssets(orgId).then(setAssets).catch(console.error)
    }
  }, [orgId])

  const openNovo = () => {
    setEditingItem(null)
    setDataTeste(new Date().toISOString().slice(0, 10))
    setTipo('restauracao_total')
    setResultado('sucesso')
    setTempoDecorrido(35)
    setResponsavelId(people.length > 0 ? people[0].id : '')
    setAtivoId(assets.length > 0 ? assets[0].id : '')
    setEscopoTestado(
      'Restauração de banco de dados notarial e base de arquivos PDF/A em ambiente sandbox isolado.',
    )
    setObservacoes(
      'Arquivos restaurados conferidos com integridade referencial 100%. Nenhuma divergência detectada.',
    )
    setEvidenciaComprobatoria(
      'Laudo técnico homologado com logs de restauração e hash SHA-256 verificado.',
    )
    setModalOpen(true)
  }

  const openEditar = (item: BackupTesteRecuperacaoItem) => {
    setEditingItem(item)
    setDataTeste(
      item.data_teste ? item.data_teste.slice(0, 10) : new Date().toISOString().slice(0, 10),
    )
    setTipo(item.tipo)
    setResultado(item.resultado)
    setTempoDecorrido(item.tempo_decorrido_minutos || 0)
    setResponsavelId(item.responsavel || '')
    setAtivoId(item.ativo || '')
    setEscopoTestado(item.escopo_testado || '')
    setObservacoes(item.observacoes || '')
    setEvidenciaComprobatoria(item.evidencia_comprobatoria || '')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await saveBackupTeste({
        id: editingItem?.id,
        organization: orgId,
        data_teste: new Date(dataTeste).toISOString(),
        tipo,
        resultado,
        tempo_decorrido_minutos: Number(tempoDecorrido) || 0,
        responsavel: responsavelId || undefined,
        ativo: ativoId || undefined,
        escopo_testado: escopoTestado.trim(),
        observacoes: observacoes.trim(),
        evidencia_comprobatoria: evidenciaComprobatoria.trim(),
      })
      toast({
        title: editingItem ? 'Teste atualizado' : 'Teste registrado',
        description: `Teste de recuperação salvo com resultado "${resultado.toUpperCase()}".`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar teste',
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
      await deleteBackupTeste(deletingItem.id, orgId)
      toast({
        title: 'Registro de teste excluído',
        description: 'O teste foi removido do histórico.',
      })
      setDeletingItem(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir teste',
        description: err instanceof Error ? err.message : 'Falha na exclusão.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Testes Periódicos de Recuperação e Restauração
          </h2>
          <p className="text-xs text-slate-500">
            Comprovações práticas e periódicas de recuperação de cópias de segurança exigidas pelas
            diretrizes de continuidade do juízo competente.
          </p>
        </div>

        {canOperate && (
          <Button
            onClick={openNovo}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Registrar Teste de Restauração
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testes.length === 0 ? (
          <Card className="col-span-full border-dashed border-slate-300 p-8 text-center">
            <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhum teste de recuperação homologado
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Registre os laudos de simulação periódica de restauração para atender aos requisitos
              de continuidade.
            </p>
            {canOperate && (
              <Button onClick={openNovo} size="sm" variant="outline" className="mt-4 text-xs">
                <Plus className="w-4 h-4 mr-1" /> Registrar Primeiro Teste
              </Button>
            )}
          </Card>
        ) : (
          testes.map((teste) => (
            <Card key={teste.id} className="border-slate-200 shadow-2xs hover:shadow-xs transition">
              <CardHeader className="p-4 pb-2.5 flex flex-row items-start justify-between border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={`text-[10px] font-bold uppercase ${
                        teste.resultado === 'sucesso'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : teste.resultado === 'parcial'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                      }`}
                    >
                      {teste.resultado === 'sucesso' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      Resultado: {teste.resultado}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {formatDate(teste.data_teste, '—')}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                    {teste.tipo === 'restauracao_total'
                      ? 'Restauração Total de Sistemas'
                      : teste.tipo === 'restauracao_parcial'
                        ? 'Restauração Parcial de Arquivos'
                        : 'Simulação de Continuidade / Desastre'}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{teste.tempo_decorrido_minutos || 0} min</span>
                </div>
              </CardHeader>

              <CardContent className="p-4 text-xs space-y-3">
                {teste.escopo_testado && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Escopo Testado:
                    </span>
                    <p className="text-slate-800">{teste.escopo_testado}</p>
                  </div>
                )}

                {teste.observacoes && (
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                      Laudo / Observações Técnicas:
                    </span>
                    <p className="text-slate-700">{teste.observacoes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-slate-500 text-[11px]">
                  <div>
                    <span className="block text-slate-400">Responsável Homologador:</span>
                    <strong className="text-slate-800">
                      {teste.expand?.responsavel?.name || 'Encarregado de TI'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">Ativo Alvo:</span>
                    <strong className="text-slate-800">
                      {teste.expand?.ativo?.name || 'Ambiente Geral'}
                    </strong>
                  </div>
                </div>

                {canOperate && (
                  <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditar(teste)}
                      className="h-7 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingItem(teste)}
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Criar/Editar Teste */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <form onSubmit={handleSave} className="flex-1 flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#0B2545]" />
                {editingItem ? 'Editar Teste de Recuperação' : 'Registrar Teste de Recuperação'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Formalize a realização de teste prático de restauração para comprovação perante a
                fiscalização.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data do Teste</label>
                  <Input
                    type="date"
                    required
                    value={dataTeste}
                    onChange={(e) => setDataTeste(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tempo Decorrido (minutos)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={tempoDecorrido}
                    onChange={(e) => setTempoDecorrido(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Teste</label>
                  <Select
                    value={tipo}
                    onValueChange={(
                      val: 'restauracao_total' | 'restauracao_parcial' | 'simulacao',
                    ) => setTipo(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restauracao_total">Restauração Total</SelectItem>
                      <SelectItem value="restauracao_parcial">Restauração Parcial</SelectItem>
                      <SelectItem value="simulacao">Simulação de Desastre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Resultado Final</label>
                  <Select
                    value={resultado}
                    onValueChange={(val: 'sucesso' | 'parcial' | 'falha') => setResultado(val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sucesso">Sucesso (100% íntegro)</SelectItem>
                      <SelectItem value="parcial">Parcial (com ressalvas)</SelectItem>
                      <SelectItem value="falha">Falha na Restauração</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Responsável Homologador
                  </label>
                  <Select value={responsavelId} onValueChange={setResponsavelId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum designado</SelectItem>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ativo Testado</label>
                  <Select value={ativoId} onValueChange={setAtivoId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione o ativo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Ambiente Geral</SelectItem>
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Escopo e Metodologia do Teste
                </label>
                <Input
                  value={escopoTestado}
                  onChange={(e) => setEscopoTestado(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Laudo e Observações Técnicas
                </label>
                <Textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Evidência Comprobatória Vinculada
                </label>
                <Input
                  value={evidenciaComprobatoria}
                  onChange={(e) => setEvidenciaComprobatoria(e.target.value)}
                  className="text-xs"
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
                {submitting ? 'Salvando...' : 'Salvar Laudo de Teste'}
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
              Excluir Registro de Teste de Recuperação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja remover este registro de teste? A exclusão ficará gravada no
              log de auditoria.
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
export default BackupTestesTab
