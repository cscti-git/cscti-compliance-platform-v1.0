import React, { useState } from 'react'
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
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Edit,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { saveBackupRegra, deleteBackupRegra } from '@/services/backupService'
import type { BackupRegraIdentificacaoItem, BackupFonteItem, BackupAdaptador } from '@/types/cscti'

interface BackupRegrasTabProps {
  regras: BackupRegraIdentificacaoItem[]
  fontes: BackupFonteItem[]
  canOperate: boolean
  orgId: string
  onReload: () => void
}

export const BackupRegrasTab: React.FC<BackupRegrasTabProps> = ({
  regras,
  fontes,
  canOperate,
  orgId,
  onReload,
}) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [fonteId, setFonteId] = useState('')
  const [remetenteFiltro, setRemetenteFiltro] = useState('')
  const [assuntoContem, setAssuntoContem] = useState('')
  const [padraoConteudo, setPadraoConteudo] = useState('')
  const [adaptador, setAdaptador] = useState<BackupAdaptador>('VEEAM_HTML')
  const [ativo, setAtivo] = useState(true)

  const handleOpenNova = () => {
    setEditingId(null)
    setNome('')
    setFonteId('')
    setRemetenteFiltro('')
    setAssuntoContem('')
    setPadraoConteudo('')
    setAdaptador('VEEAM_HTML')
    setAtivo(true)
    setModalOpen(true)
  }

  const handleOpenEdit = (regra: BackupRegraIdentificacaoItem) => {
    setEditingId(regra.id)
    setNome(regra.nome)
    setFonteId(regra.fonte || '')
    setRemetenteFiltro(regra.remetente_filtro || '')
    setAssuntoContem(regra.assunto_contem || '')
    setPadraoConteudo(regra.padrao_conteudo || '')
    setAdaptador(regra.adaptador)
    setAtivo(regra.ativo)
    setModalOpen(true)
  }

  const handleDuplicar = (regra: BackupRegraIdentificacaoItem) => {
    setEditingId(null)
    setNome(`${regra.nome} (Cópia)`)
    setFonteId(regra.fonte || '')
    setRemetenteFiltro(regra.remetente_filtro || '')
    setAssuntoContem(regra.assunto_contem || '')
    setPadraoConteudo(regra.padrao_conteudo || '')
    setAdaptador(regra.adaptador)
    setAtivo(true)
    setModalOpen(true)
  }

  const handlePredefinirRegra = (tipo: 'backup' | 'copy' | 'replication' | 'acronis' | 'noc') => {
    if (tipo === 'backup') {
      setNome('Veeam Backup Job — Notificação HTML')
      setAssuntoContem('Backup')
      setPadraoConteudo('Backup job:')
      setAdaptador('VEEAM_HTML')
      setRemetenteFiltro('')
    } else if (tipo === 'copy') {
      setNome('Veeam Backup Copy Job — Notificação HTML')
      setAssuntoContem('Backup Copy')
      setPadraoConteudo('Backup Copy job:')
      setAdaptador('VEEAM_HTML')
      setRemetenteFiltro('')
    } else if (tipo === 'replication') {
      setNome('Veeam Replication Job — Notificação HTML')
      setAssuntoContem('Replication')
      setPadraoConteudo('Replication job:')
      setAdaptador('VEEAM_HTML')
      setRemetenteFiltro('')
    } else if (tipo === 'acronis') {
      setNome('Acronis Cloud Backup — Relatório PDF Diário')
      setAssuntoContem('RELATÓRIO DIÁRIO')
      setPadraoConteudo('Atividades diárias - SocNoc')
      setRemetenteFiltro('noreply@cloud.acronis.com')
      setAdaptador('ACRONIS_PDF')
    } else if (tipo === 'noc') {
      setNome('NOC — Análise Preventiva Diária de Backup')
      setAssuntoContem('ANALISE PREVENTIVA DIARIA DE BACKUP')
      setPadraoConteudo('Informações do Ambiente')
      setRemetenteFiltro('')
      setAdaptador('NOC_DIARIO')
    }
    setAtivo(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome descritivo para a regra de identificação.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await saveBackupRegra({
        id: editingId || undefined,
        organization: orgId,
        nome: nome.trim(),
        fonte: fonteId || undefined,
        remetente_filtro: remetenteFiltro.trim(),
        assunto_contem: assuntoContem.trim(),
        padrao_conteudo: padraoConteudo.trim(),
        adaptador,
        ativo,
      })

      toast({
        title: editingId ? 'Regra atualizada' : 'Regra cadastrada',
        description: `Regra de identificação salva com adaptador ${adaptador}.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar regra',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, rNome: string) => {
    if (!window.confirm(`Deseja realmente remover a regra "${rNome}"?`)) return
    try {
      await deleteBackupRegra(id)
      toast({
        title: 'Regra removida',
        description: 'A regra foi excluída da organização.',
      })
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Não foi possível excluir.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-[#0B2545]" />
            Regras de Identificação e Roteamento de Adaptadores
          </h2>
          <p className="text-xs text-slate-500">
            Associação automática de e-mails/comprovantes de backup com os adaptadores de extração
            (VEEAM_HTML, EMAIL_HTML_GENERICO) e rotinas da serventia.
          </p>
        </div>

        {canOperate && (
          <Button
            onClick={handleOpenNova}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Nova Regra
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
                  <th className="py-2.5 px-3">Nome da Regra</th>
                  <th className="py-2.5 px-3">Adaptador</th>
                  <th className="py-2.5 px-3">Filtro Remetente</th>
                  <th className="py-2.5 px-3">Filtro Assunto</th>
                  <th className="py-2.5 px-3">Padrão Conteúdo</th>
                  <th className="py-2.5 px-3">Fonte / Rotina</th>
                  {canOperate && <th className="py-2.5 px-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regras.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canOperate ? 8 : 7}
                      className="py-8 text-center text-slate-500 italic"
                    >
                      Nenhuma regra de identificação cadastrada. O sistema utilizará os padrões
                      automáticos do Veeam e Email Genérico.
                    </td>
                  </tr>
                ) : (
                  regras.map((regra) => (
                    <tr key={regra.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3">
                        {regra.ativo ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> ATIVA
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold">
                            <XCircle className="w-3 h-3 mr-1" /> INATIVA
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{regra.nome}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            regra.adaptador === 'VEEAM_HTML'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : regra.adaptador === 'ACRONIS_PDF'
                                ? 'bg-sky-100 text-sky-800 border-sky-300'
                                : regra.adaptador === 'NOC_DIARIO'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {regra.adaptador === 'ACRONIS_PDF'
                            ? 'Acronis (PDF)'
                            : regra.adaptador === 'NOC_DIARIO'
                              ? 'NOC Diário'
                              : regra.adaptador}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                        {regra.remetente_filtro || (
                          <span className="text-slate-400 italic">Qualquer</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                        {regra.assunto_contem ? (
                          <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                            {regra.assunto_contem}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Qualquer</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                        {regra.padrao_conteudo ? (
                          <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                            {regra.padrao_conteudo}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Qualquer</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {regra.expand?.fonte?.caminho_identificacao || (
                          <span className="text-slate-400 italic">Auto-detectada</span>
                        )}
                      </td>
                      {canOperate && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicar(regra)}
                              title="Duplicar regra"
                              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(regra)}
                              title="Editar regra"
                              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(regra.id, regra.nome)}
                              title="Excluir regra"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Criar/Editar Regra */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#0B2545]" />
                {editingId ? 'Editar Regra de Identificação' : 'Nova Regra de Identificação'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure os critérios de reconhecimento do e-mail de backup e escolha o adaptador
                de extração.
              </DialogDescription>
            </DialogHeader>

            {/* Modelos pré-definidos */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 my-2">
              <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" /> Modelos Rápidos de Identificação:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePredefinirRegra('backup')}
                  className="px-2 py-1 rounded bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 text-[10px] font-semibold"
                >
                  Veeam Backup Job
                </button>
                <button
                  type="button"
                  onClick={() => handlePredefinirRegra('copy')}
                  className="px-2 py-1 rounded bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 text-[10px] font-semibold"
                >
                  Veeam Copy Job
                </button>
                <button
                  type="button"
                  onClick={() => handlePredefinirRegra('acronis')}
                  className="px-2 py-1 rounded bg-white text-blue-800 border border-blue-300 hover:bg-blue-50 text-[10px] font-semibold"
                >
                  Acronis (PDF SocNoc)
                </button>
                <button
                  type="button"
                  onClick={() => handlePredefinirRegra('noc')}
                  className="px-2 py-1 rounded bg-white text-purple-800 border border-purple-300 hover:bg-purple-50 text-[10px] font-semibold"
                >
                  NOC Diário
                </button>
              </div>
            </div>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nome da Regra <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ex: Veeam Backup VMs GOLD - Notificação HTML"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Adaptador de Extração <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={adaptador}
                    onValueChange={(val: BackupAdaptador) => setAdaptador(val)}
                  >
                    <SelectTrigger className="text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VEEAM_HTML">
                        VEEAM_HTML (Veeam B&R 12.x com tabela de VMs)
                      </SelectItem>
                      <SelectItem value="ACRONIS_PDF">
                        ACRONIS_PDF (Anexo PDF &quot;Atividades diárias - SocNoc&quot;)
                      </SelectItem>
                      <SelectItem value="NOC_DIARIO">
                        NOC_DIARIO (Análise Preventiva Diária por Humano/NOC)
                      </SelectItem>
                      <SelectItem value="EMAIL_HTML_GENERICO">
                        EMAIL_HTML_GENERICO (Texto / HTML Genérico)
                      </SelectItem>
                      <SelectItem value="LOG_BRUTO_TEXTO">
                        LOG_BRUTO_TEXTO (Arquivo / Log puro)
                      </SelectItem>
                      <SelectItem value="JSON_WEBHOOK">
                        JSON_WEBHOOK (Payload estruturado)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status da Regra</label>
                  <Select
                    value={ativo ? 'ativo' : 'inativo'}
                    onValueChange={(val) => setAtivo(val === 'ativo')}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativa (Processando)</SelectItem>
                      <SelectItem value="inativo">Inativa (Pausada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Remetente Contém (Opcional)
                </label>
                <Input
                  placeholder="Ex: newsletter@proitcs.com.br ou veeam@"
                  value={remetenteFiltro}
                  onChange={(e) => setRemetenteFiltro(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assunto Contém</label>
                  <Input
                    placeholder="Ex: Backup VMs ou Backup"
                    value={assuntoContem}
                    onChange={(e) => setAssuntoContem(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Padrão no Conteúdo
                  </label>
                  <Input
                    placeholder="Ex: Backup job: ou Veeam"
                    value={padraoConteudo}
                    onChange={(e) => setPadraoConteudo(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Vincular a Fonte Específica (Opcional)
                </label>
                <Select value={fonteId} onValueChange={setFonteId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Deixar em branco para detecção automática" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">(Auto-detectar pelo nome do Job ou VM)</SelectItem>
                    {fontes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.caminho_identificacao} ({f.tipo_fonte})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold"
              >
                {submitting ? 'Salvando...' : editingId ? 'Atualizar Regra' : 'Criar Regra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BackupRegrasTab
