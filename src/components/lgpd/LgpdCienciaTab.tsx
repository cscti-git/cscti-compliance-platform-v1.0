import React, { useState } from 'react'
import {
  FileCheck,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Download,
  Trash2,
  Edit,
  ShieldCheck,
  KeyRound,
  FileSignature,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import {
  saveLgpdCiencia,
  deleteLgpdCiencia,
  getLgpdCienciaFileUrl,
  SaveLgpdCienciaPayload,
} from '@/services/lgpdService'
import { formatSpDateOnly } from '@/pages/backup/relatorioData'
import type { LgpdCienciaItem, PersonItem, LgpdCienciaStatus } from '@/types/cscti'

interface LgpdCienciaTabProps {
  orgId: string
  ciencias: LgpdCienciaItem[]
  colaboradores: PersonItem[]
  canEdit: boolean
  onReload: () => void
}

export const LgpdCienciaTab: React.FC<LgpdCienciaTabProps> = ({
  orgId,
  ciencias,
  colaboradores,
  canEdit,
  onReload,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LgpdCienciaItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [colaboradorId, setColaboradorId] = useState('')
  const [nomeColaborador, setNomeColaborador] = useState('')
  const [emailColaborador, setEmailColaborador] = useState('')
  const [cargoColaborador, setCargoColaborador] = useState('')
  const [politicaVersao, setPoliticaVersao] = useState('1.0')
  const [dataCiencia, setDataCiencia] = useState(new Date().toISOString().substring(0, 10))
  const [tipoAssinatura, setTipoAssinatura] = useState<'fisica' | 'digital'>('fisica')
  const [status, setStatus] = useState<LgpdCienciaStatus>('concedida')
  const [plataformaDigital, setPlataformaDigital] = useState('')
  const [protocoloDigital, setProtocoloDigital] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [documentoAssinadoFile, setDocumentoAssinadoFile] = useState<File | null>(null)

  // Raio-X de completude real
  const totalColaboradoresServentia = Math.max(colaboradores.length, ciencias.length)
  const totalConcedidas = ciencias.filter((c) => c.status === 'concedida').length
  const totalPendentes = ciencias.filter((c) => c.status === 'pendente').length
  const totalRevogadas = ciencias.filter((c) => c.status === 'revogada').length
  const percentualConcedida =
    totalColaboradoresServentia > 0
      ? Math.round((totalConcedidas / totalColaboradoresServentia) * 100)
      : 0

  const handleOpenNew = () => {
    setEditingItem(null)
    setColaboradorId('')
    setNomeColaborador('')
    setEmailColaborador('')
    setCargoColaborador('')
    setPoliticaVersao('1.0')
    setDataCiencia(new Date().toISOString().substring(0, 10))
    setTipoAssinatura('fisica')
    setStatus('concedida')
    setPlataformaDigital('')
    setProtocoloDigital('')
    setObservacoes('')
    setDocumentoAssinadoFile(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: LgpdCienciaItem) => {
    setEditingItem(item)
    setColaboradorId(item.colaborador || '')
    setNomeColaborador(item.nome_colaborador)
    setEmailColaborador(item.email_colaborador || '')
    setCargoColaborador(item.cargo_colaborador || '')
    setPoliticaVersao(item.politica_versao || '1.0')
    setDataCiencia(item.data_ciencia ? item.data_ciencia.substring(0, 10) : '')
    setTipoAssinatura(item.tipo_assinatura || 'fisica')
    setStatus(item.status)
    setPlataformaDigital(item.plataforma_digital || '')
    setProtocoloDigital(item.protocolo_digital || '')
    setObservacoes(item.observacoes || '')
    setDocumentoAssinadoFile(null)
    setModalOpen(true)
  }

  const handleSelectColaborador = (id: string) => {
    setColaboradorId(id)
    const person = colaboradores.find((c) => c.id === id)
    if (person) {
      setNomeColaborador(person.name)
      setEmailColaborador(person.email || '')
      setCargoColaborador(person.role_title || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeColaborador.trim()) {
      toast({
        title: 'Colaborador obrigatório',
        description: 'Informe o nome do colaborador da serventia.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: SaveLgpdCienciaPayload = {
        id: editingItem?.id,
        colaborador: colaboradorId || undefined,
        nome_colaborador: nomeColaborador.trim(),
        email_colaborador: emailColaborador.trim(),
        cargo_colaborador: cargoColaborador.trim(),
        politica_versao: politicaVersao.trim(),
        data_ciencia: dataCiencia || undefined,
        tipo_assinatura: tipoAssinatura,
        status,
        plataforma_digital: plataformaDigital.trim(),
        protocolo_digital: protocoloDigital.trim(),
        observacoes: observacoes.trim(),
        documentoAssinadoFile: documentoAssinadoFile || undefined,
      }

      await saveLgpdCiencia(orgId, payload)
      toast({
        title: editingItem ? 'Ciência atualizada' : 'Ciência registrada',
        description: `Ciência da PSI para "${nomeColaborador}" salva com sucesso.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar ciência',
        description: err?.message || 'Falha ao registrar ciência da política.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: LgpdCienciaItem) => {
    if (!canEdit) return
    const confirm = window.confirm(
      `Deseja realmente remover o registro de ciência de "${item.nome_colaborador}"? Esta ação será registrada no log de auditoria permanente.`,
    )
    if (!confirm) return

    try {
      await deleteLgpdCiencia(item.id, orgId, item.nome_colaborador)
      toast({
        title: 'Registro removido',
        description: `Ciência de "${item.nome_colaborador}" foi excluída.`,
      })
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao excluir registro.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Raio-X de Adesão à PSI da Serventia */}
      <Card className="border-slate-200/90 shadow-2xs bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  Raio-X da Ciência da Política de Segurança da Informação (PSI)
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Adesão formal dos prepostos e colaboradores da serventia com guarda de evidência
                física assinada (hash SHA-256) ou assinatura eletrônica protocolada.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-2xl font-extrabold text-[#0B2545] leading-none">
                  {percentualConcedida}%
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Aderência Geral
                </span>
              </div>

              {canEdit && (
                <Button
                  onClick={handleOpenNew}
                  size="sm"
                  className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Ciência</span>
                </Button>
              )}
            </div>
          </div>

          {/* Barra de Progresso Real */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
              <span>
                <strong>{totalConcedidas}</strong> de <strong>{totalColaboradoresServentia}</strong>{' '}
                colaboradores com ciência concedida
              </span>
              <span>
                {totalPendentes > 0 && (
                  <span className="text-amber-700 mr-2">{totalPendentes} pendente(s)</span>
                )}
                {totalRevogadas > 0 && (
                  <span className="text-rose-700">{totalRevogadas} revogada(s)</span>
                )}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: `${percentualConcedida}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tabela de Registros de Ciência */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Lista de Prepostos e Termos de Ciência da Serventia
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-mono">{ciencias.length} registro(s)</span>
        </div>

        {ciencias.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              Nenhuma ciência de política registrada ainda
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cadastre a lista de ciência dos colaboradores da serventia anexando a folha assinada
              ou o protocolo da assinatura digital.
            </p>
            {canEdit && (
              <Button
                onClick={handleOpenNew}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Primeira Ciência
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Colaborador / Cargo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Versão PSI & Data</th>
                  <th className="px-4 py-3">Modalidade de Assinatura</th>
                  <th className="px-4 py-3">Comprovante / Hash</th>
                  {canEdit && <th className="px-4 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ciencias.map((item) => {
                  const arquivos = item.documento_assinado || []
                  const firstFile = arquivos[0]
                  const fileUrl = firstFile ? getLgpdCienciaFileUrl(item, firstFile) : ''

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>{item.nome_colaborador}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {item.cargo_colaborador || 'Colaborador da Serventia'}
                          {item.email_colaborador ? ` • ${item.email_colaborador}` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {item.status === 'concedida' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Concedida
                          </span>
                        )}
                        {item.status === 'pendente' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-2.5 h-2.5" /> Pendente
                          </span>
                        )}
                        {item.status === 'revogada' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-2.5 h-2.5" /> Revogada
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">
                          PSI v{item.politica_versao || '1.0'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.data_ciencia
                            ? formatSpDateOnly(item.data_ciencia)
                            : 'Data pendente'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {item.tipo_assinatura === 'digital' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700">
                              <KeyRound className="w-2.5 h-2.5" /> Assinatura Digital
                            </span>
                            {item.plataforma_digital && (
                              <div className="text-[10px] text-slate-500">
                                {item.plataforma_digital}
                                {item.protocolo_digital ? ` • Prot: ${item.protocolo_digital}` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700">
                              <FileText className="w-2.5 h-2.5" /> Assinatura Física
                            </span>
                            <div className="text-[10px] text-slate-400">Termo digitalizado</div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {firstFile ? (
                          <div className="space-y-0.5">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:underline font-semibold"
                            >
                              <Download className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{firstFile}</span>
                            </a>
                            {item.hash_sha256 && (
                              <div
                                className="text-[9px] font-mono text-slate-400 truncate max-w-[160px]"
                                title={`Hash SHA-256: ${item.hash_sha256}`}
                              >
                                SHA-256: {item.hash_sha256.substring(0, 16)}...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sem anexo</span>
                        )}
                      </td>

                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-blue-700"
                              onClick={() => handleOpenEdit(item)}
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-rose-700"
                              onClick={() => handleDelete(item)}
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição da Ciência */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingItem ? 'Editar Ciência da PSI' : 'Registrar Ciência da Política de Segurança'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Vincular Colaborador Cadastrado (Opcional)
              </Label>
              <Select value={colaboradorId} onValueChange={handleSelectColaborador}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Selecione um colaborador da lista oficial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-slate-500">
                    Digitar manualmente
                  </SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} {c.role_title ? `(${c.role_title})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Nome do Colaborador *
                </Label>
                <Input
                  type="text"
                  placeholder="Nome completo"
                  value={nomeColaborador}
                  onChange={(e) => setNomeColaborador(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Cargo / Função</Label>
                <Input
                  type="text"
                  placeholder="Ex.: Escrevente, Substituto"
                  value={cargoColaborador}
                  onChange={(e) => setCargoColaborador(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Versão da PSI</Label>
                <Input
                  type="text"
                  placeholder="Ex.: 1.0"
                  value={politicaVersao}
                  onChange={(e) => setPoliticaVersao(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Data da Ciência</Label>
                <Input
                  type="date"
                  value={dataCiencia}
                  onChange={(e) => setDataCiencia(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <Select value={status} onValueChange={(v: LgpdCienciaStatus) => setStatus(v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concedida" className="text-xs">
                      Concedida
                    </SelectItem>
                    <SelectItem value="pendente" className="text-xs">
                      Pendente
                    </SelectItem>
                    <SelectItem value="revogada" className="text-xs">
                      Revogada
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Modalidade de Assinatura
              </Label>
              <Select
                value={tipoAssinatura}
                onValueChange={(v: 'fisica' | 'digital') => setTipoAssinatura(v)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica" className="text-xs">
                    Assinatura Física (Folha impressa, assinada a punho e digitalizada)
                  </SelectItem>
                  <SelectItem value="digital" className="text-xs">
                    Assinatura Digital / Eletrônica (Plataforma Gov.br, ICP-Brasil, Docusign, etc.)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoAssinatura === 'digital' && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Plataforma Digital</Label>
                  <Input
                    type="text"
                    placeholder="Ex.: Assinador Gov.br, ICP-Brasil"
                    value={plataformaDigital}
                    onChange={(e) => setPlataformaDigital(e.target.value)}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Número / Código de Protocolo
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex.: PROTO-2026-9988"
                    value={protocoloDigital}
                    onChange={(e) => setProtocoloDigital(e.target.value)}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Anexo do Comprovante Assinado (PDF ou Imagem)
              </Label>
              <Input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => setDocumentoAssinadoFile(e.target.files?.[0] || null)}
                className="mt-1 text-xs cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ao salvar, o hash SHA-256 do arquivo é calculado automaticamente para prova pericial
                de integridade.
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Observações</Label>
              <Textarea
                placeholder="Observações pertinentes à concessão da ciência..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="mt-1 text-xs min-h-[60px]"
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
                disabled={submitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold"
              >
                {submitting
                  ? 'Salvando...'
                  : editingItem
                    ? 'Salvar Alterações'
                    : 'Registrar Ciência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LgpdCienciaTab
