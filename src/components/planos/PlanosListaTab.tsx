import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Edit2,
  Check,
  Search,
  Filter,
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
import type {
  PlanoAcaoItem,
  PlanoAcaoOrigem,
  PlanoAcaoPrioridade,
  PlanoAcaoStatus,
} from '@/types/cscti'

export interface PlanosListaTabProps {
  planos: PlanoAcaoItem[]
  canEdit: boolean
  onEditPlano: (plano: PlanoAcaoItem) => void
  onUpdateStatus: (planoId: string, novoStatus: PlanoAcaoStatus) => void
  onOpenNovoPlano: () => void
}

export const PlanosListaTab: React.FC<PlanosListaTabProps> = ({
  planos,
  canEdit,
  onEditPlano,
  onUpdateStatus,
  onOpenNovoPlano,
}) => {
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todas')

  const hojeIso = new Date().toISOString().substring(0, 10)
  const seteDiasDepois = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10)

  // Filtragem local
  const planosFiltrados = planos.filter((p) => {
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    if (filtroPrioridade !== 'todas' && p.prioridade !== filtroPrioridade) return false
    if (filtroOrigem !== 'todas' && p.origem !== filtroOrigem) return false

    if (termoBusca.trim()) {
      const q = termoBusca.toLowerCase().trim()
      const matchTitulo = p.titulo.toLowerCase().includes(q)
      const matchDesc = p.descricao?.toLowerCase().includes(q) || false
      const matchResp = p.responsavel_nome?.toLowerCase().includes(q) || false
      const matchRef = p.referencia_codigo?.toLowerCase().includes(q) || false
      if (!matchTitulo && !matchDesc && !matchResp && !matchRef) return false
    }

    return true
  })

  // Badges e Estilos Padrão Pastel
  const renderStatusBadge = (status: PlanoAcaoStatus) => {
    switch (status) {
      case 'concluido':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80 font-semibold gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Concluído
          </Badge>
        )
      case 'em_andamento':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100/80 font-semibold gap-1 text-[11px]">
            <Clock className="w-3 h-3 text-blue-600" /> Em Andamento
          </Badge>
        )
      case 'cancelado':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/80 font-semibold gap-1 text-[11px]">
            <XCircle className="w-3 h-3 text-slate-500" /> Cancelado
          </Badge>
        )
      case 'aberto':
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/80 font-semibold gap-1 text-[11px]">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Aberto
          </Badge>
        )
    }
  }

  const renderPrioridadeBadge = (prioridade: PlanoAcaoPrioridade) => {
    switch (prioridade) {
      case 'critica':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200/80 font-semibold text-[10px]">
            Crítica
          </Badge>
        )
      case 'alta':
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200/80 font-semibold text-[10px]">
            Alta
          </Badge>
        )
      case 'media':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 font-semibold text-[10px]">
            Média
          </Badge>
        )
      case 'baixa':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-semibold text-[10px]">
            Baixa
          </Badge>
        )
    }
  }

  const renderOrigemLabel = (origem: PlanoAcaoOrigem) => {
    switch (origem) {
      case 'conformidade':
        return 'Matriz de Conformidade'
      case 'seguranca':
        return 'Segurança do Ambiente'
      case 'backup':
        return 'Continuidade & Backup'
      case 'lgpd':
        return 'LGPD & Governança'
      case 'inventario':
        return 'Inventário'
      case 'manual':
      default:
        return 'Manual'
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por título, responsável ou referência..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Status */}
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="text-xs h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="aberto">Abertos</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluídos</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Prioridade */}
          <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
            <SelectTrigger className="text-xs h-9 w-[130px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Prioridades</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Origem */}
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="text-xs h-9 w-[140px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Origens</SelectItem>
              <SelectItem value="conformidade">Conformidade</SelectItem>
              <SelectItem value="seguranca">Segurança</SelectItem>
              <SelectItem value="backup">Backup</SelectItem>
              <SelectItem value="lgpd">LGPD</SelectItem>
              <SelectItem value="inventario">Inventário</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          {canEdit && (
            <Button
              onClick={onOpenNovoPlano}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 shrink-0 gap-1.5 shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Novo Plano</span>
            </Button>
          )}
        </div>
      </div>

      {/* Listagem de Planos */}
      {planosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Nenhum plano de ação encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {termoBusca || filtroStatus !== 'todos' || filtroPrioridade !== 'todas'
              ? 'Tente ajustar os filtros ou o termo de busca para visualizar outros registros.'
              : 'Não há planos de ação cadastrados nesta serventia. Você pode transformar pendências da Matriz de Conformidade na aba ao lado ou cadastrar um plano manual.'}
          </p>
          {canEdit && (
            <Button
              onClick={onOpenNovoPlano}
              size="sm"
              variant="outline"
              className="text-xs font-semibold gap-1.5 border-slate-300"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Cadastrar Primeiro Plano</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {planosFiltrados.map((plano) => {
            const isAtivo = plano.status === 'aberto' || plano.status === 'em_andamento'
            const prazo = plano.data_alvo ? plano.data_alvo.substring(0, 10) : null
            const isVencido = isAtivo && prazo && prazo < hojeIso
            const isVencendoEmBreve =
              isAtivo && prazo && prazo >= hojeIso && prazo <= seteDiasDepois

            return (
              <div
                key={plano.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-2xs hover:shadow-xs ${
                  isVencido
                    ? 'border-rose-300 bg-rose-50/20'
                    : isVencendoEmBreve
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  {/* Bloco Esquerdo: Título, Origem e Descrição */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderStatusBadge(plano.status)}
                      {renderPrioridadeBadge(plano.prioridade)}

                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {renderOrigemLabel(plano.origem)}
                        {plano.referencia_codigo ? ` • Item ${plano.referencia_codigo}` : ''}
                      </span>

                      {/* Destaque visual de prazo */}
                      {isVencido && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full border border-rose-300/80 animate-pulse">
                          Prazo Vencido
                        </span>
                      )}
                      {isVencendoEmBreve && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300/80">
                          Vence em até 7 dias
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                      {plano.titulo}
                    </h4>

                    {plano.descricao && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {plano.descricao}
                      </p>
                    )}

                    {plano.observacoes && (
                      <p className="text-[11px] text-slate-400 italic">Obs: {plano.observacoes}</p>
                    )}
                  </div>

                  {/* Bloco Direito: Metadados e Ações */}
                  <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 w-full md:w-auto justify-between">
                    <div className="text-right text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {plano.responsavel_nome || 'Sem responsável'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Prazo:{' '}
                          <strong
                            className={
                              isVencido
                                ? 'text-rose-600 font-bold'
                                : isVencendoEmBreve
                                  ? 'text-amber-700 font-bold'
                                  : 'text-slate-800'
                            }
                          >
                            {prazo
                              ? new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR')
                              : 'Indefinido'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {/* Botão Ver na Matriz */}
                      {plano.origem === 'conformidade' && (
                        <Link to="/conformidade">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 gap-1 font-semibold"
                            title="Navegar para a Matriz de Conformidade"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver na matriz</span>
                          </Button>
                        </Link>
                      )}

                      {/* Transições rápidas de status para Admin/Suporte */}
                      {canEdit && (
                        <>
                          {plano.status === 'aberto' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onUpdateStatus(plano.id, 'em_andamento')}
                              className="h-7 text-[11px] px-2 text-blue-700 border-blue-200 hover:bg-blue-50 gap-1 font-medium"
                              title="Iniciar execução do plano"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Iniciar</span>
                            </Button>
                          )}

                          {isAtivo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onUpdateStatus(plano.id, 'concluido')}
                              className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 font-medium"
                              title="Marcar como concluído"
                            >
                              <Check className="w-3 h-3" />
                              <span>Concluir</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditPlano(plano)}
                            className="h-7 text-[11px] px-2 text-slate-700 hover:bg-slate-100 gap-1"
                            title="Editar plano, responsável e prazo"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>Editar</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PlanosListaTab
