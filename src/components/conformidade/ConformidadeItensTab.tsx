import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Edit3,
  Search,
  Filter,
  ShieldCheck,
  Hash,
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
import { formatSpDateOnly } from '@/pages/backup/relatorioData'
import type {
  ConformidadeItemCatalog,
  ConformidadeStatusItem,
  ConformidadeStatusType,
} from '@/types/cscti'

interface ConformidadeItensTabProps {
  itens: Array<ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }>
  canEdit: boolean
  onEditItem: (item: ConformidadeStatusItem & { catalog?: ConformidadeItemCatalog }) => void
}

export const ConformidadeItensTab: React.FC<ConformidadeItensTabProps> = ({
  itens,
  canEdit,
  onEditItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEtapa, setFilterEtapa] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredItens = itens.filter((it) => {
    // Filtro etapa
    if (filterEtapa !== 'all' && it.catalog?.etapa.toString() !== filterEtapa) {
      return false
    }

    // Filtro status
    if (filterStatus !== 'all' && it.status !== filterStatus) {
      return false
    }

    // Busca textual
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const cod = it.item_codigo.toLowerCase()
      const tit = (it.catalog?.titulo || '').toLowerCase()
      const desc = (it.catalog?.descricao || '').toLowerCase()
      const ref = (it.referencia_comprovante || '').toLowerCase()
      const mod = (it.catalog?.modulo_origem || '').toLowerCase()
      return (
        cod.includes(q) || tit.includes(q) || desc.includes(q) || ref.includes(q) || mod.includes(q)
      )
    }

    return true
  })

  const getStatusBadge = (status: ConformidadeStatusType) => {
    switch (status) {
      case 'comprovado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Comprovado</span>
          </span>
        )
      case 'parcial':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Parcial</span>
          </span>
        )
      case 'nao_conforme':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Não Conforme</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Pendente</span>
          </span>
        )
    }
  }

  const getModuloBadge = (modulo?: string) => {
    switch (modulo) {
      case 'designacoes':
        return (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
            Papéis & Responsáveis
          </Badge>
        )
      case 'lgpd':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-purple-50 text-purple-700 border-purple-200"
          >
            LGPD & Governança
          </Badge>
        )
      case 'inventario':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Inventário de Ativos
          </Badge>
        )
      case 'evidencias':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
          >
            Central de Evidências
          </Badge>
        )
      case 'backup':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
          >
            Módulo Backup
          </Badge>
        )
      case 'seguranca':
        return (
          <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
            Segurança do Ambiente
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-slate-50 text-slate-700 border-slate-200"
          >
            Manual / Dossiê
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar por código (ex: 1.1), título, descrição ou evidência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por Etapa */}
          <Select value={filterEtapa} onValueChange={setFilterEtapa}>
            <SelectTrigger className="h-9 w-[170px] text-xs">
              <SelectValue placeholder="Todas as Etapas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Etapas (1 a 6)</SelectItem>
              <SelectItem value="1">Etapa 1 (Governança)</SelectItem>
              <SelectItem value="2">Etapa 2 (Infraestrutura)</SelectItem>
              <SelectItem value="3">Etapa 3 (Proteção)</SelectItem>
              <SelectItem value="4">Etapa 4 (Detecção)</SelectItem>
              <SelectItem value="5">Etapa 5 (Continuidade)</SelectItem>
              <SelectItem value="6">Etapa 6 (Dossiê Final)</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="comprovado">Comprovados</SelectItem>
              <SelectItem value="parcial">Parciais</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="nao_conforme">Não Conforme</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || filterEtapa !== 'all' || filterStatus !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setFilterEtapa('all')
                setFilterStatus('all')
              }}
              className="text-xs text-slate-500 hover:text-slate-800 h-9"
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Tabela de Itens de Conformidade */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Catálogo de Requisitos Declaráveis ({filteredItens.length} de {itens.length} itens)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            A fonte da prova é sempre o ambiente do cliente
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3 w-16">Item</th>
                <th className="py-2.5 px-3">Descrição do Requisito de Domínio</th>
                <th className="py-2.5 px-3 w-36">Módulo / Origem</th>
                <th className="py-2.5 px-3 w-32">Status</th>
                <th className="py-2.5 px-3 min-w-[220px]">Fonte da Prova Real</th>
                <th className="py-2.5 px-3 w-28">Última Comp.</th>
                {canEdit && <th className="py-2.5 px-3 w-20 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItens.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-8 text-center text-slate-500">
                    Nenhum item de conformidade encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItens.map((it) => (
                  <tr key={it.item_codigo} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Código */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {it.item_codigo}
                      </span>
                    </td>

                    {/* Descrição e Título */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {it.catalog?.titulo}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {it.catalog?.descricao}
                      </div>
                      {it.catalog?.tipo_evidencia_esperada && (
                        <div className="text-[10px] text-slate-400 mt-1 italic">
                          Esperado: {it.catalog.tipo_evidencia_esperada}
                        </div>
                      )}
                    </td>

                    {/* Módulo / Origem */}
                    <td className="py-3 px-3">{getModuloBadge(it.catalog?.modulo_origem)}</td>

                    {/* Status */}
                    <td className="py-3 px-3">{getStatusBadge(it.status)}</td>

                    {/* Fonte da Prova Real com link direto */}
                    <td className="py-3 px-3">
                      {it.referencia_comprovante ? (
                        <div className="space-y-1">
                          <div className="text-slate-800 font-medium leading-tight">
                            {it.referencia_comprovante}
                          </div>
                          {it.link_comprovante && (
                            <Link
                              to={it.link_comprovante}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              <span>Ver evidência no módulo</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                          {it.hash_sha256 && (
                            <div
                              className="flex items-center gap-1 font-mono text-[10px] text-slate-400 truncate max-w-[200px]"
                              title={`SHA-256: ${it.hash_sha256}`}
                            >
                              <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{it.hash_sha256}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-slate-400 italic">Pendente de comprovação</span>
                          {it.catalog?.link_modulo && (
                            <div>
                              <Link
                                to={it.catalog.link_modulo}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-700"
                              >
                                <span>Acessar módulo</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Data */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {it.data_comprovacao ? formatSpDateOnly(it.data_comprovacao) : '—'}
                    </td>

                    {/* Ação */}
                    {canEdit && (
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditItem(it)}
                          className="h-8 px-2 text-xs text-slate-600 hover:text-[#0B2545] hover:bg-slate-100"
                          title="Avaliar ou declarar cumprimento"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          <span>Declarar</span>
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ConformidadeItensTab
