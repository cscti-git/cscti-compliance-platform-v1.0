import React, { useState } from 'react'
import {
  FileCheck,
  Plus,
  Trash2,
  Upload,
  Calendar,
  FileText,
  ShieldCheck,
  Hash,
  Laptop,
  AlertTriangle,
  ExternalLink,
  Flame,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PanelHeader } from '@/components/common/PanelHeader'
import { toast } from '@/hooks/use-toast'
import {
  saveSegComprovante,
  deleteSegComprovante,
  getSegComprovanteFileUrl,
  SaveSegComprovantePayload,
} from '@/services/segurancaService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import type {
  SegComprovanteItem,
  SegSolucaoItem,
  SegComprovanteTipo,
  SegStatusFirewall,
} from '@/types/cscti'

export interface SegurancaComprovantesTabProps {
  orgId: string
  comprovantes: SegComprovanteItem[]
  solucoes: SegSolucaoItem[]
  canEdit: boolean
  currentUserLabel: string
  onReload: () => void
}

export const SegurancaComprovantesTab: React.FC<SegurancaComprovantesTabProps> = ({
  orgId,
  comprovantes,
  solucoes,
  canEdit,
  currentUserLabel,
  onReload,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form states
  const [solucaoId, setSolucaoId] = useState<string>('none')
  const [dataComprovante, setDataComprovante] = useState<string>(
    new Date().toISOString().split('T')[0],
  )
  const [tipo, setTipo] = useState<SegComprovanteTipo>('relatorio_console')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [maquinasProtegidas, setMaquinasProtegidas] = useState<string>('')
  const [maquinasSemAgente, setMaquinasSemAgente] = useState<string>('')
  const [dataDefinicoes, setDataDefinicoes] = useState<string>('')
  const [ameacasBloqueadas, setAmeacasBloqueadas] = useState<string>('')
  const [eventosRelevantes, setEventosRelevantes] = useState<string>('')
  const [statusFirewall, setStatusFirewall] = useState<SegStatusFirewall | 'none'>('none')
  const [dataRevisaoFirewall, setDataRevisaoFirewall] = useState<string>('')
  const [resumoTexto, setResumoTexto] = useState<string>('')

  const handleOpenNew = () => {
    setSolucaoId(solucoes.length > 0 ? solucoes[0].id : 'none')
    setDataComprovante(new Date().toISOString().split('T')[0])
    setTipo('relatorio_console')
    setArquivos([])
    setMaquinasProtegidas('')
    setMaquinasSemAgente('')
    setDataDefinicoes('')
    setAmeacasBloqueadas('')
    setEventosRelevantes('')
    setStatusFirewall('none')
    setDataRevisaoFirewall('')
    setResumoTexto('')
    setModalOpen(true)
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files)
      // Limite 30MB
      const maxSizeBytes = 30 * 1024 * 1024
      const invalid = selected.find((f) => f.size > maxSizeBytes)
      if (invalid) {
        toast({
          title: 'Arquivo muito grande',
          description: `O arquivo ${invalid.name} excede o limite de 30MB permitido.`,
          variant: 'destructive',
        })
        return
      }
      setArquivos(selected)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataComprovante) {
      toast({
        title: 'Data obrigatória',
        description: 'Informe a data real do comprovante/documento.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: SaveSegComprovantePayload = {
        solucao: solucaoId !== 'none' ? solucaoId : undefined,
        data_comprovante: dataComprovante,
        tipo,
        arquivosNovos: arquivos,
        maquinas_protegidas: maquinasProtegidas ? Number(maquinasProtegidas) : undefined,
        maquinas_sem_agente: maquinasSemAgente ? Number(maquinasSemAgente) : undefined,
        data_definicoes_atualizadas: dataDefinicoes || undefined,
        ameacas_bloqueadas: ameacasBloqueadas ? Number(ameacasBloqueadas) : undefined,
        eventos_relevantes: eventosRelevantes || undefined,
        status_firewall: statusFirewall !== 'none' ? statusFirewall : undefined,
        data_revisao_regras_firewall: dataRevisaoFirewall || undefined,
        resumo_texto: resumoTexto || undefined,
        registrado_por: currentUserLabel,
      }

      await saveSegComprovante(orgId, payload)
      toast({
        title: 'Comprovante registrado',
        description: 'O comprovante foi armazenado com hash SHA-256 e auditoria append-only.',
      })
      setModalOpen(false)
      onReload()
    } catch (err: any) {
      console.error('Erro ao registrar comprovante:', err)
      toast({
        title: 'Erro ao gravar comprovante',
        description: err?.message || 'Falha ao processar o arquivo anexado.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este comprovante do histórico?')) return
    setDeletingId(id)
    try {
      await deleteSegComprovante(id, orgId)
      toast({
        title: 'Comprovante excluído',
        description: 'Registro removido com auditoria.',
      })
      onReload()
    } catch (err: any) {
      console.error('Erro ao excluir comprovante:', err)
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível excluir o comprovante.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatTipoLabel = (t: SegComprovanteTipo) => {
    switch (t) {
      case 'relatorio_console':
        return 'Relatório de Console / Painel'
      case 'print':
        return 'Captura de Tela (Print)'
      case 'pdf':
        return 'Laudo / Documento PDF'
      case 'email':
        return 'Mensagem de E-mail / Alerta'
      case 'laudo_auditoria':
        return 'Laudo de Auditoria Externa'
      default:
        return 'Outro Comprovante'
    }
  }

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Ingestão de Comprovantes do Ambiente Real"
        subtitle="Upload de relatórios de console corporativo, laudos em PDF e prints com cálculo de integridade SHA-256 e extração dos indicadores de proteção."
        action={
          canEdit ? (
            <Button
              onClick={handleOpenNew}
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-9 gap-1.5 shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Inserir Comprovante</span>
            </Button>
          ) : undefined
        }
      />

      {comprovantes.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-white">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-bold text-slate-800">
                Nenhum comprovante de segurança inserido
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Faça o upload do relatório da console do antivírus, do firewall ou do laudo de
                auditoria para confrontar as máquinas protegidas e atualizar os indicadores de
                cobertura.
              </p>
            </div>
            {canEdit && (
              <Button onClick={handleOpenNew} size="sm" className="bg-blue-700 text-white text-xs">
                <Upload className="w-4 h-4 mr-1.5" /> Fazer Upload do Primeiro Comprovante
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comprovantes.map((comp) => {
            const solucaoNome = comp.expand?.solucao?.nome || 'Solução Geral / Sem Vínculo'
            const solucaoTipo = comp.expand?.solucao?.tipo

            return (
              <Card
                key={comp.id}
                className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all bg-white"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Bloco de Informações Principais */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        >
                          {formatTipoLabel(comp.tipo)}
                        </Badge>
                        <span className="text-xs font-bold text-slate-900">{solucaoNome}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Data do documento:</span>
                          <strong className="text-slate-800">
                            {formatSpDateOnly(comp.data_comprovante)}
                          </strong>
                        </div>
                      </div>

                      {/* Campos Estruturados Lidos */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                        {comp.maquinas_protegidas !== undefined && (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Protegidas
                            </span>
                            <span className="text-sm font-extrabold text-emerald-700">
                              {comp.maquinas_protegidas} máquinas
                            </span>
                          </div>
                        )}

                        {comp.maquinas_sem_agente !== undefined && (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Sem Agente
                            </span>
                            <span
                              className={`text-sm font-extrabold ${comp.maquinas_sem_agente > 0 ? 'text-rose-600' : 'text-slate-700'}`}
                            >
                              {comp.maquinas_sem_agente} máquinas
                            </span>
                          </div>
                        )}

                        {comp.data_definicoes_atualizadas && (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Assinaturas
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {formatSpDateOnly(comp.data_definicoes_atualizadas)}
                            </span>
                          </div>
                        )}

                        {comp.status_firewall && (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Firewall
                            </span>
                            <span className="text-xs font-bold text-slate-800 capitalize">
                              {comp.status_firewall}
                            </span>
                          </div>
                        )}
                      </div>

                      {comp.resumo_texto && (
                        <p className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 mt-2">
                          {comp.resumo_texto}
                        </p>
                      )}

                      {/* Hash SHA-256 e Anexos */}
                      <div className="pt-2 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                        {comp.hash_sha256 && (
                          <div className="flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[200px]" title={comp.hash_sha256}>
                              SHA-256: {comp.hash_sha256}
                            </span>
                          </div>
                        )}

                        {comp.arquivos && comp.arquivos.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-600">
                              {comp.arquivos.length}{' '}
                              {comp.arquivos.length === 1 ? 'anexo:' : 'anexos:'}
                            </span>
                            {comp.arquivos.map((filename, idx) => {
                              const fileUrl = getSegComprovanteFileUrl(comp, filename)
                              return (
                                <a
                                  key={idx}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-0.5 font-medium"
                                >
                                  <span>{filename}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    {canEdit && (
                      <div className="shrink-0 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === comp.id}
                          onClick={() => handleDelete(comp.id)}
                          className="text-xs text-slate-500 hover:text-red-700 hover:bg-red-50 h-8"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL DE INSERÇÃO DE COMPROVANTE */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Inserir Comprovante de Segurança
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Anexe o print, relatório em PDF ou e-mail recebido e informe os dados extraídos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Solução Vinculada</Label>
                <Select value={solucaoId} onValueChange={setSolucaoId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Selecione a solução" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral / Não vinculada</SelectItem>
                    {solucoes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome} ({s.tipo.replace('_', ' ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Tipo de Documento *</Label>
                <Select value={tipo} onValueChange={(val: any) => setTipo(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relatorio_console">Relatório de Console / Painel</SelectItem>
                    <SelectItem value="print">Captura de Tela (Print)</SelectItem>
                    <SelectItem value="pdf">Laudo / Documento PDF</SelectItem>
                    <SelectItem value="email">Mensagem de E-mail / Alerta</SelectItem>
                    <SelectItem value="laudo_auditoria">Laudo de Auditoria</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Data do Comprovante (Verdade Temporal) *
              </Label>
              <Input
                type="date"
                value={dataComprovante}
                onChange={(e) => setDataComprovante(e.target.value)}
                required
                className="text-xs h-9"
              />
              <span className="text-[11px] text-slate-400 block">
                Data real da extração ou emissão do relatório (nunca a data de processamento).
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Arquivos Anexos (JPG, PNG, PDF, WEBP - até 30MB)
              </Label>
              <Input
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
                onChange={handleFilesChange}
                className="text-xs h-9 cursor-pointer"
              />
              {arquivos.length > 0 && (
                <div className="text-[11px] text-emerald-700 font-medium">
                  {arquivos.length} arquivo(s) selecionado(s). O hash SHA-256 será gerado
                  automaticamente.
                </div>
              )}
            </div>

            {/* Campos estruturados opcionais */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                Campos Estruturados Lidos do Comprovante (Opcionais)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Máquinas Protegidas com Agente
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex.: 24"
                    value={maquinasProtegidas}
                    onChange={(e) => setMaquinasProtegidas(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Máquinas sem Agente / Desprotegidas
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex.: 0"
                    value={maquinasSemAgente}
                    onChange={(e) => setMaquinasSemAgente(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Definições/Assinaturas Atualizadas em
                  </Label>
                  <Input
                    type="date"
                    value={dataDefinicoes}
                    onChange={(e) => setDataDefinicoes(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Ameaças Bloqueadas no Período
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex.: 3"
                    value={ameacasBloqueadas}
                    onChange={(e) => setAmeacasBloqueadas(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Status do Firewall
                  </Label>
                  <Select
                    value={statusFirewall}
                    onValueChange={(val: any) => setStatusFirewall(val)}
                  >
                    <SelectTrigger className="text-xs h-8 bg-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      <SelectItem value="ativo">Ativo e Operacional</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Regras do Firewall Revisadas em
                  </Label>
                  <Input
                    type="date"
                    value={dataRevisaoFirewall}
                    onChange={(e) => setDataRevisaoFirewall(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Resumo / Parecer Técnico
              </Label>
              <Textarea
                rows={2}
                placeholder="Observações do laudo, ocorrências bloqueadas ou recomendações..."
                value={resumoTexto}
                onChange={(e) => setResumoTexto(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
              >
                {saving ? 'Gravando...' : 'Gravar Comprovante'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegurancaComprovantesTab
