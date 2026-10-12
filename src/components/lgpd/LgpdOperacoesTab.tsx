import React, { useState } from 'react'
import {
  ShieldCheck,
  Plus,
  Users,
  Database,
  Trash2,
  Edit,
  Power,
  PowerOff,
  Scale,
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
  saveLgpdFinalidade,
  deleteLgpdFinalidade,
  SaveLgpdFinalidadePayload,
} from '@/services/lgpdService'
import type {
  LgpdFinalidadeItem,
  LgpdDadoItem,
  LgpdBaseLegal,
  LgpdCategoriaTitular,
} from '@/types/cscti'

interface LgpdOperacoesTabProps {
  orgId: string
  finalidades: LgpdFinalidadeItem[]
  dados: LgpdDadoItem[]
  canEdit: boolean
  onReload: () => void
}

const TODAS_CATEGORIAS_TITULARES: LgpdCategoriaTitular[] = [
  'titulares de serviços',
  'colaboradores',
  'fornecedores',
  'terceiros',
  'menores',
]

const BASES_LEGAIS: { value: LgpdBaseLegal; label: string }[] = [
  { value: 'obrigação legal', label: 'Cumprimento de Obrigação Legal' },
  { value: 'execução de contrato', label: 'Execução de Contrato ou Diligências Preliminares' },
  { value: 'consentimento', label: 'Consentimento Expresso do Titular' },
  { value: 'legítimo interesse', label: 'Legítimo Interesse da Serventia' },
  { value: 'exercício de direitos', label: 'Exercício Regular de Direitos em Processos' },
  { value: 'proteção de vida', label: 'Proteção da Vida ou Incolumidade Física' },
  { value: 'tutela da saúde', label: 'Tutela da Saúde' },
]

export const LgpdOperacoesTab: React.FC<LgpdOperacoesTabProps> = ({
  orgId,
  finalidades,
  dados,
  canEdit,
  onReload,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LgpdFinalidadeItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [baseLegal, setBaseLegal] = useState<LgpdBaseLegal>('obrigação legal')
  const [categoriasTitulares, setCategoriasTitulares] = useState<LgpdCategoriaTitular[]>([])
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')

  // Contagem de dados pessoais por finalidade
  const dadosCountPorFinalidade = new Map<string, number>()
  dados.forEach((d) => {
    if (d.finalidade) {
      dadosCountPorFinalidade.set(
        d.finalidade,
        (dadosCountPorFinalidade.get(d.finalidade) || 0) + 1,
      )
    }
  })

  const handleOpenNew = () => {
    setEditingItem(null)
    setNome('')
    setDescricao('')
    setBaseLegal('obrigação legal')
    setCategoriasTitulares(['titulares de serviços'])
    setStatus('ativo')
    setModalOpen(true)
  }

  const handleOpenEdit = (item: LgpdFinalidadeItem) => {
    setEditingItem(item)
    setNome(item.nome)
    setDescricao(item.descricao || '')
    setBaseLegal(item.base_legal)
    setCategoriasTitulares(item.categorias_titulares || [])
    setStatus(item.status)
    setModalOpen(true)
  }

  const handleToggleCategoria = (cat: LgpdCategoriaTitular) => {
    if (categoriasTitulares.includes(cat)) {
      setCategoriasTitulares(categoriasTitulares.filter((c) => c !== cat))
    } else {
      setCategoriasTitulares([...categoriasTitulares, cat])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da operação de tratamento.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: SaveLgpdFinalidadePayload = {
        id: editingItem?.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        base_legal: baseLegal,
        categorias_titulares: categoriasTitulares,
        status,
      }

      await saveLgpdFinalidade(orgId, payload)
      toast({
        title: editingItem ? 'Operação atualizada' : 'Operação cadastrada',
        description: `"${nome}" foi salva com sucesso.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar operação',
        description: err?.message || 'Falha ao salvar operação de tratamento.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (item: LgpdFinalidadeItem) => {
    if (!canEdit) return
    const novoStatus = item.status === 'ativo' ? 'inativo' : 'ativo'
    try {
      await saveLgpdFinalidade(orgId, {
        id: item.id,
        nome: item.nome,
        base_legal: item.base_legal,
        categorias_titulares: item.categorias_titulares,
        status: novoStatus,
      })
      toast({
        title: novoStatus === 'ativo' ? 'Operação ativada' : 'Operação desativada',
        description: `"${item.nome}" foi marcada como ${novoStatus}.`,
      })
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err?.message || 'Falha ao atualizar operação.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (item: LgpdFinalidadeItem) => {
    if (!canEdit) return
    const count = dadosCountPorFinalidade.get(item.id) || 0
    if (count > 0) {
      toast({
        title: 'Operação com dados vinculados',
        description: `Existem ${count} dado(s) do inventário vinculado(s) a esta operação. Remova o vínculo antes de excluir.`,
        variant: 'destructive',
      })
      return
    }

    const confirm = window.confirm(
      `Deseja realmente excluir a operação de tratamento "${item.nome}"? Esta ação será registrada no log de auditoria permanente.`,
    )
    if (!confirm) return

    try {
      await deleteLgpdFinalidade(item.id, orgId, item.nome)
      toast({
        title: 'Operação excluída',
        description: `"${item.nome}" foi removida com sucesso.`,
      })
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao excluir operação.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Topo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Registro das Operações de Tratamento (ROPA da Serventia)
          </h2>
          <p className="text-xs text-slate-500">
            Finalidades institucionais, bases legais de sustentação e categorias de titulares
            envolvidos.
          </p>
        </div>

        {canEdit && (
          <Button
            onClick={handleOpenNew}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Operação</span>
          </Button>
        )}
      </div>

      {/* Grid de Cards das Operações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {finalidades.map((item) => {
          const count = dadosCountPorFinalidade.get(item.id) || 0
          const isAtivo = item.status === 'ativo'

          return (
            <Card
              key={item.id}
              className={`border-slate-200/90 shadow-2xs bg-white rounded-xl transition-all ${
                !isAtivo ? 'opacity-70 bg-slate-50/70' : 'hover:border-blue-400'
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {item.nome}
                        </h3>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                          Base: {item.base_legal}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAtivo
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {isAtivo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {item.descricao && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">{item.descricao}</p>
                  )}

                  {/* Categorias de titulares */}
                  <div className="pt-2">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Categorias de Titulares:</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(item.categorias_titulares || []).length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic">Não especificadas</span>
                      ) : (
                        item.categorias_titulares!.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 capitalize"
                          >
                            {cat}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card com Contador de Dados Vinculados e Ações */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Database className="w-3.5 h-3.5 text-blue-700" />
                    <span>
                      <strong className="text-slate-900">{count}</strong> dado(s) pessoal(is)
                      vinculado(s)
                    </span>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-slate-600 hover:text-slate-900"
                        onClick={() => handleToggleStatus(item)}
                        title={isAtivo ? 'Desativar operação' : 'Ativar operação'}
                      >
                        {isAtivo ? (
                          <span className="flex items-center gap-1 text-slate-500">
                            <PowerOff className="w-3.5 h-3.5" /> Desativar
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <Power className="w-3.5 h-3.5" /> Ativar
                          </span>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-blue-700"
                        onClick={() => handleOpenEdit(item)}
                        title="Editar operação"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-rose-700"
                        onClick={() => handleDelete(item)}
                        title="Excluir operação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal de Criação / Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingItem ? 'Editar Operação de Tratamento' : 'Nova Operação de Tratamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Nome da Operação de Tratamento *
              </Label>
              <Input
                type="text"
                placeholder="Ex.: Prestação do serviço registral/notarial"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Base Legal *</Label>
                <Select value={baseLegal} onValueChange={(v: LgpdBaseLegal) => setBaseLegal(v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BASES_LEGAIS.map((b) => (
                      <SelectItem key={b.value} value={b.value} className="text-xs">
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                Categorias de Titulares Envolvidos
              </Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                {TODAS_CATEGORIAS_TITULARES.map((cat) => {
                  const checked = categoriasTitulares.includes(cat)
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleCategoria(cat)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span className="capitalize">{cat}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Descrição da Operação de Tratamento
              </Label>
              <Textarea
                placeholder="Descreva as atividades executadas no tratamento dos dados sob esta operação..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1 text-xs min-h-[70px]"
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
                    : 'Cadastrar Operação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LgpdOperacoesTab
