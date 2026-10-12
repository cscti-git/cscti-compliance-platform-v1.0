import React, { useState } from 'react'
import {
  Cpu,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Edit2,
  Lock,
  Layers,
  Search,
  ExternalLink,
  Plus,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  analisarAtivosEol,
  atualizarAtivoEol,
  AtivoEolInfo,
} from '@/services/infraestruturaService'
import { InfraSecaoTab } from './InfraSecaoTab'
import { Link } from 'react-router-dom'
import type { InventoryAssetItem, InfraItem } from '@/types/cscti'

interface InfraCamadaLogicaTabProps {
  orgId: string
  assets: InventoryAssetItem[]
  criptografiaItens: InfraItem[]
  canEdit: boolean
  onReload: () => void
  onGerarPlanoAcao?: (detalhe: string) => void
}

export const InfraCamadaLogicaTab: React.FC<InfraCamadaLogicaTabProps> = ({
  orgId,
  assets,
  criptografiaItens,
  canEdit,
  onReload,
  onGerarPlanoAcao,
}) => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [editingAtivo, setEditingAtivo] = useState<AtivoEolInfo | null>(null)
  const [loading, setLoading] = useState(false)

  // Campos de edição EOL do ativo
  const [so, setSo] = useState('')
  const [versaoSo, setVersaoSo] = useState('')
  const [eolStatus, setEolStatus] = useState<
    'suportado' | 'proximo_eol' | 'sem_suporte' | 'mitigado' | 'desconhecido'
  >('suportado')
  const [dataFimSuporte, setDataFimSuporte] = useState('')
  const [observacoesSuporte, setObservacoesSuporte] = useState('')

  const eolAnalisados = analisarAtivosEol(assets)

  const ativosFiltrados = eolAnalisados.filter((item) => {
    const matchSearch =
      item.ativo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sistemaOperacional.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.ativo.tipo && item.ativo.tipo.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchSearch) return false

    if (filtroStatus === 'sem_suporte') return item.eolStatus === 'sem_suporte'
    if (filtroStatus === 'proximo_eol') return item.eolStatus === 'proximo_eol'
    if (filtroStatus === 'suportado') return item.eolStatus === 'suportado'
    if (filtroStatus === 'mitigado') return item.eolStatus === 'mitigado'
    return true
  })

  const totalSemSuporte = eolAnalisados.filter((e) => e.eolStatus === 'sem_suporte').length
  const totalProximoEol = eolAnalisados.filter((e) => e.eolStatus === 'proximo_eol').length
  const totalSuportados = eolAnalisados.filter((e) => e.eolStatus === 'suportado').length

  const handleOpenEditAtivo = (info: AtivoEolInfo) => {
    setEditingAtivo(info)
    setSo(info.sistemaOperacional === 'Não identificado' ? '' : info.sistemaOperacional)
    setVersaoSo(info.versaoSo === '—' ? '' : info.versaoSo)
    setEolStatus(info.eolStatus)
    setDataFimSuporte(info.dataFimSuporte ? info.dataFimSuporte.substring(0, 10) : '')
    setObservacoesSuporte(info.observacoes || '')
  }

  const handleSaveAtivoEol = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAtivo) return

    setLoading(true)
    try {
      await atualizarAtivoEol(editingAtivo.ativo.id, orgId, {
        sistema_operacional: so.trim(),
        versao_so: versaoSo.trim(),
        eol_status: eolStatus,
        data_fim_suporte: dataFimSuporte || undefined,
        observacoes_suporte: observacoesSuporte.trim(),
      })

      toast({
        title: 'Status EOL atualizado',
        description: `O ativo "${editingAtivo.ativo.name}" foi atualizado com sucesso.`,
      })
      setEditingAtivo(null)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar ativo',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getEolBadge = (status: string) => {
    switch (status) {
      case 'sem_suporte':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 gap-1 font-semibold">
            <XCircle className="w-3 h-3 text-rose-600" /> Sem Suporte (EOL)
          </Badge>
        )
      case 'proximo_eol':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Fim de Suporte Próximo
          </Badge>
        )
      case 'suportado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Suporte Oficial Ativo
          </Badge>
        )
      case 'mitigado':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 font-semibold">
            <ShieldAlert className="w-3 h-3 text-blue-600" /> Isolado / Mitigado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-slate-500 bg-slate-50">
            Não Definido
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE CRIPTOGRAFIA EM REPOUSO E TRÂNSITO */}
      <InfraSecaoTab
        orgId={orgId}
        categoria="camada_logica"
        titulo="Criptografia em Repouso e em Trânsito"
        subtitulo="Comprovação técnica de mecanismos de cifragem aplicados aos dados da serventia."
        itens={criptografiaItens}
        canEdit={canEdit}
        onReload={onReload}
      />

      {/* 2. CRUZAMENTO COM O INVENTÁRIO REAL: SISTEMAS OPERACIONAIS E SOFTWARES SEM SUPORTE (EOL) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0B2545]/10 text-[#0B2545]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Inventário Real de Ativos: Análise de Fim de Suporte (EOL)
              </h3>
              <p className="text-xs text-slate-500">
                Cruzamento automático com os ativos físicos e virtuais cadastrados no módulo
                Inventário de Ativos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/ativos"
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
            >
              <span>Abrir Inventário</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPIs de Suporte EOL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1">
            <span className="text-rose-800 font-semibold block">Sem Suporte (EOL Crítico)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-800">{totalSemSuporte}</span>
              <span className="text-rose-700 text-[11px]">ativo(s) vulnerável(is)</span>
            </div>
            {totalSemSuporte > 0 && onGerarPlanoAcao && (
              <Button
                variant="link"
                size="sm"
                onClick={() =>
                  onGerarPlanoAcao(
                    `Eliminação ou migração de ${totalSemSuporte} ativo(s) com sistema operacional sem suporte oficial (EOL).`,
                  )
                }
                className="text-[11px] p-0 h-auto text-rose-800 hover:text-rose-950 font-bold"
              >
                + Gerar Plano de Ação EOL
              </Button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
            <span className="text-amber-800 font-semibold block">Próximo ao Fim de Suporte</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-800">{totalProximoEol}</span>
              <span className="text-amber-700 text-[11px]">ativo(s) em atenção</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <span className="text-emerald-800 font-semibold block">Suporte Oficial Vigente</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-800">
                {totalSuportados}
              </span>
              <span className="text-emerald-700 text-[11px]">ativo(s) em conformidade</span>
            </div>
          </div>
        </div>

        {/* Filtros e Busca de Ativos */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome, SO ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filtroStatus} onValueChange={(val) => setFiltroStatus(val)}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="sem_suporte">Sem Suporte (EOL)</SelectItem>
                <SelectItem value="proximo_eol">Próximo EOL</SelectItem>
                <SelectItem value="suportado">Suporte Ativo</SelectItem>
                <SelectItem value="mitigado">Mitigado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Ativos e SO */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Ativo (Inventário)</th>
                  <th className="py-2.5 px-3">Tipo / Criticidade</th>
                  <th className="py-2.5 px-3">Sistema Operacional</th>
                  <th className="py-2.5 px-3">Status de Suporte (EOL)</th>
                  <th className="py-2.5 px-3">Data Fim de Suporte</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ativosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum ativo encontrado no inventário real.
                    </td>
                  </tr>
                ) : (
                  ativosFiltrados.map((item) => (
                    <tr key={item.ativo.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={item.ativo.name}>
                            {item.ativo.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="capitalize text-slate-600">{item.ativo.tipo}</span>
                          {item.ativo.criticidade === 'alta' && (
                            <Badge className="text-[9px] bg-rose-50 text-rose-700 border-rose-200 px-1 py-0">
                              Crítico
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">
                          {item.sistemaOperacional}
                        </span>
                        {item.versaoSo !== '—' && (
                          <span className="text-slate-500 ml-1">({item.versaoSo})</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{getEolBadge(item.eolStatus)}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.dataFimSuporte ? item.dataFimSuporte.substring(0, 10) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditAtivo(item)}
                            className="h-7 text-xs text-blue-700 hover:text-blue-900 gap-1 px-2"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar SO/EOL</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Edição de SO / EOL do Ativo */}
      <Dialog open={Boolean(editingAtivo)} onOpenChange={(val) => !val && setEditingAtivo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Atualizar Suporte e SO do Ativo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ativo: <strong>{editingAtivo?.ativo.name}</strong> ({editingAtivo?.ativo.tipo})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAtivoEol} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Sistema Operacional</Label>
              <Input
                placeholder="Ex: Windows 11 Pro, Ubuntu 22.04 LTS, Windows Server 2012"
                value={so}
                onChange={(e) => setSo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Versão / Build</Label>
              <Input
                placeholder="Ex: 23H2, 64-bit"
                value={versaoSo}
                onChange={(e) => setVersaoSo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Status de Suporte (EOL)
              </Label>
              <Select value={eolStatus} onValueChange={(val: any) => setEolStatus(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suportado">Suportado pelo Fabricante</SelectItem>
                  <SelectItem value="proximo_eol">Próximo ao Fim de Suporte</SelectItem>
                  <SelectItem value="sem_suporte">Sem Suporte (EOL / Descontinuado)</SelectItem>
                  <SelectItem value="mitigado">Isolado / Medida Mitigatória</SelectItem>
                  <SelectItem value="desconhecido">Desconhecido / Em Análise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Data Oficial de Fim de Suporte
              </Label>
              <Input
                type="date"
                value={dataFimSuporte}
                onChange={(e) => setDataFimSuporte(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações de Mitigação
              </Label>
              <Textarea
                rows={2}
                placeholder="Ex: Máquina isolada de VLAN sem acesso à internet ou migração agendada..."
                value={observacoesSuporte}
                onChange={(e) => setObservacoesSuporte(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAtivo(null)}
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
                Salvar Status EOL
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InfraCamadaLogicaTab
