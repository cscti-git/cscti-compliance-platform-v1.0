import React, { useState } from 'react'
import {
  Database,
  Plus,
  Search,
  Filter,
  Server,
  Trash2,
  Edit,
  ShieldAlert,
  Clock,
  Archive,
  Eye,
  CheckCircle2,
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
import { saveLgpdDado, deleteLgpdDado, SaveLgpdDadoPayload } from '@/services/lgpdService'
import type {
  LgpdDadoItem,
  LgpdFinalidadeItem,
  InventoryAssetItem,
  LgpdSensibilidade,
  LgpdFormaDescarte,
} from '@/types/cscti'

interface LgpdInventarioTabProps {
  orgId: string
  dados: LgpdDadoItem[]
  finalidades: LgpdFinalidadeItem[]
  ativos: InventoryAssetItem[]
  canEdit: boolean
  onReload: () => void
}

export const LgpdInventarioTab: React.FC<LgpdInventarioTabProps> = ({
  orgId,
  dados,
  finalidades,
  ativos,
  canEdit,
  onReload,
}) => {
  const [search, setSearch] = useState('')
  const [filterSensibilidade, setFilterSensibilidade] = useState<string>('todas')
  const [filterFinalidade, setFilterFinalidade] = useState<string>('todas')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LgpdDadoItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [nome, setNome] = useState('')
  const [categoriaSensibilidade, setCategoriaSensibilidade] = useState<LgpdSensibilidade>('comum')
  const [finalidadeId, setFinalidadeId] = useState<string>('')
  const [sistemaOrigem, setSistemaOrigem] = useState('')
  const [ativoVinculadoId, setAtivoVinculadoId] = useState<string>('')
  const [tempoRetencao, setTempoRetencao] = useState('')
  const [justificativaRetencao, setJustificativaRetencao] = useState('')
  const [formaDescarte, setFormaDescarte] = useState<LgpdFormaDescarte>('eliminação')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [observacoes, setObservacoes] = useState('')

  const handleOpenNew = () => {
    setEditingItem(null)
    setNome('')
    setCategoriaSensibilidade('comum')
    setFinalidadeId(finalidades[0]?.id || '')
    setSistemaOrigem('')
    setAtivoVinculadoId('')
    setTempoRetencao('')
    setJustificativaRetencao('')
    setFormaDescarte('eliminação')
    setStatus('ativo')
    setObservacoes('')
    setModalOpen(true)
  }

  const handleOpenEdit = (item: LgpdDadoItem) => {
    setEditingItem(item)
    setNome(item.nome)
    setCategoriaSensibilidade(item.categoria_sensibilidade)
    setFinalidadeId(item.finalidade || '')
    setSistemaOrigem(item.sistema_origem || '')
    setAtivoVinculadoId(item.ativo_vinculado || '')
    setTempoRetencao(item.tempo_retencao || '')
    setJustificativaRetencao(item.justificativa_retencao || '')
    setFormaDescarte(item.forma_descarte)
    setStatus(item.status)
    setObservacoes(item.observacoes || '')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe a denominação do dado pessoal inventariado.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: SaveLgpdDadoPayload = {
        id: editingItem?.id,
        nome: nome.trim(),
        categoria_sensibilidade: categoriaSensibilidade,
        finalidade: finalidadeId || undefined,
        sistema_origem: sistemaOrigem.trim(),
        ativo_vinculado: ativoVinculadoId || undefined,
        tempo_retencao: tempoRetencao.trim(),
        justificativa_retencao: justificativaRetencao.trim(),
        forma_descarte: formaDescarte,
        status,
        observacoes: observacoes.trim(),
      }

      await saveLgpdDado(orgId, payload)
      toast({
        title: editingItem ? 'Dado pessoal atualizado' : 'Dado pessoal cadastrado',
        description: `"${nome}" foi salvo com sucesso no inventário da serventia.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar dado pessoal',
        description: err?.message || 'Falha ao persistir no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: LgpdDadoItem) => {
    if (!canEdit) return
    const confirm = window.confirm(
      `Deseja realmente excluir o dado "${item.nome}" do inventário? Esta ação será registrada no log de auditoria permanente.`,
    )
    if (!confirm) return

    try {
      await deleteLgpdDado(item.id, orgId, item.nome)
      toast({
        title: 'Dado excluído',
        description: `"${item.nome}" foi removido do inventário.`,
      })
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao excluir dado pessoal.',
        variant: 'destructive',
      })
    }
  }

  // Filtragem
  const filteredDados = dados.filter((d) => {
    if (filterSensibilidade !== 'todas' && d.categoria_sensibilidade !== filterSensibilidade) {
      return false
    }
    if (filterFinalidade !== 'todas' && d.finalidade !== filterFinalidade) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNome = d.nome.toLowerCase().includes(q)
      const matchOrigem = (d.sistema_origem || '').toLowerCase().includes(q)
      const matchRetencao = (d.tempo_retencao || '').toLowerCase().includes(q)
      const matchFin = (d.expand?.finalidade?.nome || '').toLowerCase().includes(q)
      if (!matchNome && !matchOrigem && !matchRetencao && !matchFin) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <Card className="border-slate-200/90 shadow-2xs bg-white rounded-xl">
        <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar dado, sistema ou retenção..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50/70 border-slate-200 focus-visible:bg-white"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap justify-end">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Sensibilidade:
              </span>
              <Select value={filterSensibilidade} onValueChange={setFilterSensibilidade}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-36 bg-slate-50/70 border-slate-200">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas
                  </SelectItem>
                  <SelectItem value="comum" className="text-xs">
                    Comum
                  </SelectItem>
                  <SelectItem value="sensivel" className="text-xs">
                    Sensível
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Finalidade:
              </span>
              <Select value={filterFinalidade} onValueChange={setFilterFinalidade}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-52 bg-slate-50/70 border-slate-200">
                  <SelectValue placeholder="Todas as finalidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as Operações
                  </SelectItem>
                  {finalidades.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs truncate">
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canEdit && (
              <Button
                onClick={handleOpenNew}
                size="sm"
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Mapear Dado</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista / Tabela do Inventário */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredDados.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <Database className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Nenhum dado pessoal inventariado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {search || filterSensibilidade !== 'todas' || filterFinalidade !== 'todas'
                ? 'Nenhum resultado corresponde aos filtros selecionados.'
                : 'Mapeie os dados pessoais tratados na serventia (CPF, RG, biometria, certidões) vinculando à finalidade e tempo de retenção.'}
            </p>
            {canEdit && (
              <Button
                onClick={handleOpenNew}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Primeiro Dado
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Dado Pessoal</th>
                  <th className="px-4 py-3">Sensibilidade</th>
                  <th className="px-4 py-3">Operação / Finalidade</th>
                  <th className="px-4 py-3">Origem / Ativo</th>
                  <th className="px-4 py-3">Retenção & Descarte</th>
                  <th className="px-4 py-3">Status</th>
                  {canEdit && <th className="px-4 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDados.map((item) => {
                  const isSensivel = item.categoria_sensibilidade === 'sensivel'
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>{item.nome}</div>
                        {item.observacoes && (
                          <div className="text-[10px] text-slate-500 font-normal line-clamp-1">
                            {item.observacoes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSensivel ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <ShieldAlert className="w-2.5 h-2.5" /> Sensível
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Comum
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.expand?.finalidade?.nome ? (
                          <div className="text-slate-800 font-medium">
                            {item.expand.finalidade.nome}
                            <div className="text-[10px] text-slate-500 capitalize">
                              Base: {item.expand.finalidade.base_legal}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não vinculada</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">
                          {item.sistema_origem || '—'}
                          {item.expand?.ativo_vinculado?.name && (
                            <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium mt-0.5">
                              <Server className="w-2.5 h-2.5" />
                              <span>{item.expand.ativo_vinculado.name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{item.tempo_retencao || 'Conforme a lei'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 capitalize">
                            Descarte: {item.forma_descarte}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'ativo' ? (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            Inativo
                          </span>
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

      {/* Modal de Criação / Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingItem ? 'Editar Dado Pessoal' : 'Mapear Novo Dado Pessoal'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Nome do Dado Pessoal *</Label>
              <Input
                type="text"
                placeholder="Ex.: CPF, RG, Certidão de Nascimento, Biometria facial"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Sensibilidade *</Label>
                <Select
                  value={categoriaSensibilidade}
                  onValueChange={(v: LgpdSensibilidade) => setCategoriaSensibilidade(v)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comum" className="text-xs">
                      Comum
                    </SelectItem>
                    <SelectItem value="sensivel" className="text-xs">
                      Sensível (Biometria, Saúde, Menores)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Forma de Descarte *</Label>
                <Select
                  value={formaDescarte}
                  onValueChange={(v: LgpdFormaDescarte) => setFormaDescarte(v)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eliminação" className="text-xs">
                      Eliminação
                    </SelectItem>
                    <SelectItem value="anonimização" className="text-xs">
                      Anonimização
                    </SelectItem>
                    <SelectItem value="bloqueio" className="text-xs">
                      Bloqueio
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Operação de Tratamento Vinculada
              </Label>
              <Select value={finalidadeId} onValueChange={setFinalidadeId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Selecione a finalidade correspondente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-slate-500">
                    Nenhuma vinculada
                  </SelectItem>
                  {finalidades.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.nome} ({f.base_legal})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Sistema / Base de Origem
                </Label>
                <Input
                  type="text"
                  placeholder="Ex.: Sistema Registral, Folha, Siga"
                  value={sistemaOrigem}
                  onChange={(e) => setSistemaOrigem(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Ativo do Inventário (Opcional)
                </Label>
                <Select value={ativoVinculadoId} onValueChange={setAtivoVinculadoId}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Selecione um ativo físico/virtual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-xs text-slate-500">
                      Nenhum ativo vinculado
                    </SelectItem>
                    {ativos.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs truncate">
                        {a.name} ({a.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Tempo de Retenção</Label>
                <Input
                  type="text"
                  placeholder="Ex.: 5 anos, Permanente, Contratual"
                  value={tempoRetencao}
                  onChange={(e) => setTempoRetencao(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <Select value={status} onValueChange={(v: 'ativo' | 'inativo') => setStatus(v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo" className="text-xs">
                      Ativo
                    </SelectItem>
                    <SelectItem value="inativo" className="text-xs">
                      Inativo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Justificativa da Retenção
              </Label>
              <Input
                type="text"
                placeholder="Ex.: Prazo legal prescricional e regulatório da atividade notarial"
                value={justificativaRetencao}
                onChange={(e) => setJustificativaRetencao(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Observações Gerais</Label>
              <Textarea
                placeholder="Detalhes adicionais de proteção, criptografia em repouso, privilégios de acesso..."
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
                {submitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar Dado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LgpdInventarioTab
