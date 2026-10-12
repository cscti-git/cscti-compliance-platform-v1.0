import React, { useState } from 'react'
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Laptop,
  Server,
  Network,
  HelpCircle,
  ExternalLink,
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
  saveSegSolucao,
  deleteSegSolucao,
  SaveSegSolucaoPayload,
} from '@/services/segurancaService'
import type { SegSolucaoItem, SegSolucaoTipo } from '@/types/cscti'

export interface SegurancaSolucoesTabProps {
  orgId: string
  solucoes: SegSolucaoItem[]
  canEdit: boolean
  onReload: () => void
}

export const SegurancaSolucoesTab: React.FC<SegurancaSolucoesTabProps> = ({
  orgId,
  solucoes,
  canEdit,
  onReload,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SegSolucaoItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form states
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<SegSolucaoTipo>('endpoint_antivirus')
  const [fornecedor, setFornecedor] = useState('')
  const [versao, setVersao] = useState('')
  const [status, setStatus] = useState<'ativa' | 'inativa' | 'em_avaliacao'>('ativa')
  const [escopo, setEscopo] = useState<
    'todas_estacoes_servidores' | 'somente_servidores' | 'somente_estacoes' | 'especifico'
  >('todas_estacoes_servidores')
  const [observacoes, setObservacoes] = useState('')

  const handleOpenNew = () => {
    setEditingItem(null)
    setNome('')
    setTipo('endpoint_antivirus')
    setFornecedor('')
    setVersao('')
    setStatus('ativa')
    setEscopo('todas_estacoes_servidores')
    setObservacoes('')
    setModalOpen(true)
  }

  const handleOpenEdit = (item: SegSolucaoItem) => {
    setEditingItem(item)
    setNome(item.nome)
    setTipo(item.tipo)
    setFornecedor(item.fornecedor || '')
    setVersao(item.versao || '')
    setStatus(item.status)
    setEscopo(item.escopo || 'todas_estacoes_servidores')
    setObservacoes(item.observacoes || '')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da solução de segurança.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: SaveSegSolucaoPayload = {
        id: editingItem?.id,
        nome,
        tipo,
        fornecedor,
        versao,
        status,
        escopo,
        observacoes,
      }
      await saveSegSolucao(orgId, payload)
      toast({
        title: editingItem ? 'Solução atualizada' : 'Solução cadastrada',
        description: `A solução "${nome}" foi gravada com sucesso.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: any) {
      console.error('Erro ao salvar solução:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível gravar a solução de segurança.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, nomeSol: string) => {
    if (!confirm(`Tem certeza que deseja excluir a solução "${nomeSol}"?`)) return
    setDeletingId(id)
    try {
      await deleteSegSolucao(id, orgId, nomeSol)
      toast({
        title: 'Solução excluída',
        description: `A solução "${nomeSol}" foi removida do catálogo.`,
      })
      onReload()
    } catch (err: any) {
      console.error('Erro ao excluir solução:', err)
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível excluir a solução.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatTipoLabel = (t: SegSolucaoTipo) => {
    switch (t) {
      case 'endpoint_antivirus':
        return 'Endpoint Security / Antivírus'
      case 'firewall':
        return 'Firewall de Borda / Perímetro'
      case 'monitoramento_soc_noc':
        return 'Monitoramento Contínuo (SOC / NOC)'
      case 'backup_seguranca':
        return 'Backup de Segurança'
      default:
        return 'Outras Soluções'
    }
  }

  const formatEscopoLabel = (e?: string) => {
    switch (e) {
      case 'todas_estacoes_servidores':
        return 'Todas as Estações e Servidores'
      case 'somente_servidores':
        return 'Somente Servidores'
      case 'somente_estacoes':
        return 'Somente Estações de Trabalho'
      case 'especifico':
        return 'Escopo Específico'
      default:
        return 'Geral'
    }
  }

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Catálogo de Soluções de Segurança do Cliente"
        subtitle="Registro de antivírus corporativo, firewalls físicos/virtuais e serviços externos de monitoramento ativo homologados no ambiente da serventia."
        action={
          canEdit ? (
            <Button
              onClick={handleOpenNew}
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-9 gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Solução</span>
            </Button>
          ) : undefined
        }
      />

      {solucoes.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-white">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-bold text-slate-800">
                Nenhuma solução de segurança cadastrada
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre os softwares de proteção de endpoint, antivírus corporativo, firewall ou
                serviço de monitoramento (SOC/NOC) contratados pela serventia.
              </p>
            </div>
            {canEdit && (
              <Button onClick={handleOpenNew} size="sm" className="bg-blue-700 text-white text-xs">
                <Plus className="w-4 h-4 mr-1.5" /> Cadastrar Primeira Solução
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {solucoes.map((item) => {
            const isAtiva = item.status === 'ativa'
            const isAvaliacao = item.status === 'em_avaliacao'

            return (
              <Card
                key={item.id}
                className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all bg-white flex flex-col justify-between"
              >
                <CardContent className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            item.tipo === 'endpoint_antivirus'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.tipo === 'firewall'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.tipo === 'monitoramento_soc_noc'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {item.nome}
                          </h4>
                          <span className="text-[11px] text-slate-500 block">
                            {formatTipoLabel(item.tipo)}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          isAtiva
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isAvaliacao
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          Fabricante
                        </span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {item.fornecedor || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          Versão
                        </span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {item.versao || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Escopo de Aplicação
                      </span>
                      <span className="text-slate-700 font-medium text-[11px]">
                        {formatEscopoLabel(item.escopo)}
                      </span>
                    </div>

                    {item.observacoes && (
                      <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                        {item.observacoes}
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="text-xs h-7 text-slate-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id, item.nome)}
                        className="text-xs h-7 text-slate-600 hover:text-red-700 hover:bg-red-50 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingItem ? 'Editar Solução de Segurança' : 'Nova Solução de Segurança'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Identifique o software, fabricante e escopo de atuação no parque de máquinas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome da Solução *</Label>
              <Input
                placeholder="Ex.: Kaspersky Endpoint Security, FortiGate 60F, NOC 24/7"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Tipo de Proteção *</Label>
                <Select value={tipo} onValueChange={(val: any) => setTipo(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="endpoint_antivirus">Endpoint / Antivírus</SelectItem>
                    <SelectItem value="firewall">Firewall de Perímetro</SelectItem>
                    <SelectItem value="monitoramento_soc_noc">Monitoramento (SOC/NOC)</SelectItem>
                    <SelectItem value="backup_seguranca">Backup de Segurança</SelectItem>
                    <SelectItem value="outros">Outros Controles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Status Operacional *</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="em_avaliacao">Em Avaliação</SelectItem>
                    <SelectItem value="inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Fornecedor / Fabricante
                </Label>
                <Input
                  placeholder="Ex.: Kaspersky, Sophos, Fortinet"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Versão Homologada</Label>
                <Input
                  placeholder="Ex.: 12.4.0, v7.2.5"
                  value={versao}
                  onChange={(e) => setVersao(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Escopo da Solução</Label>
              <Select value={escopo} onValueChange={(val: any) => setEscopo(val)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas_estacoes_servidores">
                    Todas as Estações e Servidores
                  </SelectItem>
                  <SelectItem value="somente_servidores">Somente Servidores</SelectItem>
                  <SelectItem value="somente_estacoes">Somente Estações de Trabalho</SelectItem>
                  <SelectItem value="especifico">Escopo Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Observações Técnicas</Label>
              <Textarea
                rows={2}
                placeholder="Detalhes adicionais de console, gerência centralizada ou links de documentação..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
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
                {saving ? 'Gravando...' : 'Salvar Solução'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegurancaSolucoesTab
