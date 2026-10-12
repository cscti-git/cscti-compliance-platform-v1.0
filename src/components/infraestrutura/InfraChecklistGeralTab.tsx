import React, { useState } from 'react'
import {
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  Link as LinkIcon,
  FolderGit2,
  ExternalLink,
  Edit2,
  Loader2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PanelHeader } from '@/components/common/PanelHeader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { updateInfraChecklistItem } from '@/services/infraestruturaService'
import { listEvidencias } from '@/services/evidenciaService'
import { formatSpDateOnly } from '@/pages/backup/relatorioData'
import { Link } from 'react-router-dom'
import type {
  InfraChecklistItem,
  InfraItem,
  InfraLinkItem,
  EvidenciaItem,
  InfraItemStatus,
} from '@/types/cscti'

interface InfraChecklistGeralTabProps {
  orgId: string
  checklist: InfraChecklistItem[]
  itensInfra: InfraItem[]
  links: InfraLinkItem[]
  canEdit: boolean
  onReload: () => void
  onGerarPlanoAcao?: (item: InfraChecklistItem) => void
}

export const InfraChecklistGeralTab: React.FC<InfraChecklistGeralTabProps> = ({
  orgId,
  checklist,
  itensInfra,
  links,
  canEdit,
  onReload,
  onGerarPlanoAcao,
}) => {
  const { toast } = useToast()
  const [editingItem, setEditingItem] = useState<InfraChecklistItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([])

  // Campos de edição
  const [status, setStatus] = useState<InfraItemStatus>('pendente')
  const [prazo, setPrazo] = useState('')
  const [registroVinculado, setRegistroVinculado] = useState<string>('none')
  const [linkVinculado, setLinkVinculado] = useState<string>('none')
  const [evidenciaVinculada, setEvidenciaVinculada] = useState<string>('none')
  const [observacoes, setObservacoes] = useState('')

  const handleOpenEdit = async (item: InfraChecklistItem) => {
    setEditingItem(item)
    setStatus(item.status)
    setPrazo(item.prazo ? item.prazo.substring(0, 10) : '')
    setRegistroVinculado(item.registro_vinculado || 'none')
    setLinkVinculado(item.link_vinculado || 'none')
    setEvidenciaVinculada(item.evidencia_vinculada || 'none')
    setObservacoes(item.observacoes || '')

    try {
      const evs = await listEvidencias(orgId)
      setEvidencias(evs)
    } catch {
      /* intentionally ignored */
    }
  }

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setLoading(true)
    try {
      await updateInfraChecklistItem(editingItem.id, orgId, {
        status,
        prazo: prazo || undefined,
        registro_vinculado: registroVinculado === 'none' ? undefined : registroVinculado,
        link_vinculado: linkVinculado === 'none' ? undefined : linkVinculado,
        evidencia_vinculada: evidenciaVinculada === 'none' ? undefined : evidenciaVinculada,
        observacoes: observacoes.trim(),
      })

      toast({
        title: 'Checklist atualizado',
        description: `Item "${editingItem.item_nome}" salvo com sucesso.`,
      })
      setEditingItem(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar item',
        description: err instanceof Error ? err.message : 'Falha na atualização.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'conforme':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Conforme
          </Badge>
        )
      case 'parcial':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Parcial
          </Badge>
        )
      case 'nao_conforme':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1 font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Não Conforme
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1 font-semibold">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Pendente
          </Badge>
        )
    }
  }

  const getSecaoBadge = (secao: string) => {
    switch (secao) {
      case 'energia':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-50 border-amber-200 text-amber-800"
          >
            Energia Elétrica
          </Badge>
        )
      case 'ambiente_fisico':
        return (
          <Badge variant="outline" className="text-[10px] bg-blue-50 border-blue-200 text-blue-800">
            Ambiente Físico
          </Badge>
        )
      case 'conectividade':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-purple-50 border-purple-200 text-purple-800"
          >
            Conectividade
          </Badge>
        )
      case 'camada_logica':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-50 border-emerald-200 text-emerald-800"
          >
            Camada Lógica
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Checklist Geral do Ambiente de Infraestrutura"
        subtitle="Requisitos neutros de domínio do ambiente físico e lógico com vínculo probatório."
        badge={
          <Badge
            variant="outline"
            className="text-[10px] bg-slate-50"
          >{`${checklist.length} ${checklist.length === 1 ? 'item' : 'itens'}`}</Badge>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-3 w-16">Código</th>
                <th className="py-3 px-3">Item / Requisito do Ambiente</th>
                <th className="py-3 px-3 w-28">Seção</th>
                <th className="py-3 px-3 w-32">Status</th>
                <th className="py-3 px-3">Comprovação Vinculada</th>
                <th className="py-3 px-3 w-28">Prazo</th>
                <th className="py-3 px-3 text-right w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checklist.map((item) => {
                const comprovacaoItem = item.expand?.registro_vinculado
                const comprovacaoLink = item.expand?.link_vinculado
                const comprovacaoEvid = item.expand?.evidencia_vinculada

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">{item.codigo}</td>
                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-bold text-slate-900">{item.item_nome}</div>
                      {item.descricao && (
                        <div className="text-slate-500 text-[11px] line-clamp-1">
                          {item.descricao}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">{getSecaoBadge(item.secao)}</td>
                    <td className="py-3 px-3">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <div className="space-y-1">
                        {comprovacaoItem && (
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <LinkIcon className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[200px]" title={comprovacaoItem.titulo}>
                              {comprovacaoItem.titulo}
                            </span>
                          </div>
                        )}
                        {comprovacaoLink && (
                          <div className="flex items-center gap-1 font-semibold text-purple-800">
                            <LinkIcon className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>
                              {comprovacaoLink.operadora} ({comprovacaoLink.velocidade_mbps} Mbps)
                            </span>
                          </div>
                        )}
                        {comprovacaoEvid && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-700">
                            <FolderGit2 className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[200px]" title={comprovacaoEvid.titulo}>
                              Foto: {comprovacaoEvid.titulo}
                            </span>
                          </div>
                        )}
                        {!comprovacaoItem && !comprovacaoLink && !comprovacaoEvid && (
                          <span className="text-slate-400 italic text-[11px]">
                            Sem comprovação vinculada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {item.prazo ? formatSpDateOnly(item.prazo) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(item.status === 'pendente' || item.status === 'nao_conforme') &&
                          onGerarPlanoAcao && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                              onClick={() => onGerarPlanoAcao(item)}
                              title="Gerar Plano de Ação"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-800"
                            onClick={() => handleOpenEdit(item)}
                            title="Editar avaliação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Avaliação do Item do Checklist */}
      <Dialog open={Boolean(editingItem)} onOpenChange={(val) => !val && setEditingItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Avaliar Requisito: {editingItem?.codigo}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              {editingItem?.item_nome}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveChecklist} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Status de Conformidade
                </Label>
                <Select value={status} onValueChange={(val: InfraItemStatus) => setStatus(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Prazo de Adequação</Label>
                <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
            </div>

            {/* Vínculo com Item de Infraestrutura */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Vincular Registro Documental de Infraestrutura
              </Label>
              <Select value={registroVinculado} onValueChange={(val) => setRegistroVinculado(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o registro comprobante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum registro selecionado</SelectItem>
                  {itensInfra.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.titulo} ({it.tipo_item})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vínculo com Link de Internet */}
            {editingItem?.secao === 'conectividade' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Vincular Link de Conectividade
                </Label>
                <Select value={linkVinculado} onValueChange={(val) => setLinkVinculado(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o link" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum link selecionado</SelectItem>
                    {links.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.operadora} ({l.velocidade_mbps} Mbps - {l.tipo_link})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Vínculo com Evidência da Central */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Vincular Foto / Evidência da Central de Evidências
              </Label>
              <Select
                value={evidenciaVinculada}
                onValueChange={(val) => setEvidenciaVinculada(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a evidência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma evidência vinculada</SelectItem>
                  {evidencias.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.titulo} ({ev.categoria_nome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações e Aferições
              </Label>
              <Textarea
                rows={2}
                placeholder="Insira anotações da inspeção técnica..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0B2545] hover:bg-[#124E78] text-white"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Avaliação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InfraChecklistGeralTab
