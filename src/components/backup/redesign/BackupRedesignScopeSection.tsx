import React from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Database,
  Search,
  Filter,
  FileCheck2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PanelHeader } from '@/components/common/PanelHeader'
import type { InventoryAssetItem, BackupEscopoItem, BackupConfrontoResponse } from '@/types/cscti'
import { formatRelativeTimeSp } from '@/lib/dateTime'

export interface BackupRedesignScopeSectionProps {
  assets: InventoryAssetItem[]
  escopos: BackupEscopoItem[]
  confrontoData: BackupConfrontoResponse | null
  loading?: boolean
  onNavigateTab: (tab: string) => void
}

export const BackupRedesignScopeSection: React.FC<BackupRedesignScopeSectionProps> = ({
  assets,
  escopos,
  confrontoData,
  loading = false,
  onNavigateTab,
}) => {
  const [busca, setBusca] = React.useState('')
  const [filtroStatus, setFiltroStatus] = React.useState<'todos' | 'protegido' | 'pendente'>(
    'todos',
  )

  // Universo de ativos com exigência de backup
  const ativosRelevantes = React.useMemo(() => {
    return assets.filter((a) => {
      if (a.status === 'inativo' || a.status === 'desativado') return false
      return true
    })
  }, [assets])

  const itensConfrontados = React.useMemo(() => {
    return ativosRelevantes.map((ativo) => {
      const conf = confrontoData?.confronto?.find(
        (c) => c.id === ativo.id || c.nome.toLowerCase() === ativo.name.toLowerCase(),
      )

      const modLocal = conf?.modalidades?.local
      const modNuvem = conf?.modalidades?.nuvem
      const modReplica = conf?.modalidades?.replicacao

      const exigeLocal = Boolean(ativo.exige_backup_local)
      const exigeNuvem = Boolean(ativo.exige_backup_nuvem)
      const exigeReplica = Boolean(ativo.exige_backup_replicacao)

      const localOk = !exigeLocal || Boolean(modLocal?.ultima_comprovacao)
      const nuvemOk = !exigeNuvem || Boolean(modNuvem?.ultima_comprovacao)
      const replicaOk = !exigeReplica || Boolean(modReplica?.ultima_comprovacao)

      const totalExigidas = (exigeLocal ? 1 : 0) + (exigeNuvem ? 1 : 0) + (exigeReplica ? 1 : 0)
      const totalAtendidas =
        (exigeLocal && modLocal?.ultima_comprovacao ? 1 : 0) +
        (exigeNuvem && modNuvem?.ultima_comprovacao ? 1 : 0) +
        (exigeReplica && modReplica?.ultima_comprovacao ? 1 : 0)

      const integral = totalExigidas > 0 ? totalAtendidas === totalExigidas : true
      const parcial = totalAtendidas > 0

      return {
        ativo,
        exigeLocal,
        exigeNuvem,
        exigeReplica,
        modLocal,
        modNuvem,
        modReplica,
        totalExigidas,
        totalAtendidas,
        integral,
        parcial,
      }
    })
  }, [ativosRelevantes, confrontoData])

  const itensFiltrados = React.useMemo(() => {
    return itensConfrontados.filter((item) => {
      if (busca.trim()) {
        const query = busca.toLowerCase()
        const matchName = item.ativo.name.toLowerCase().includes(query)
        const matchTipo = (item.ativo.tipo || '').toLowerCase().includes(query)
        const matchIp = (item.ativo.ip_address || '').toLowerCase().includes(query)
        if (!matchName && !matchTipo && !matchIp) return false
      }

      if (filtroStatus === 'protegido' && !item.integral) return false
      if (filtroStatus === 'pendente' && item.integral) return false

      return true
    })
  }, [itensConfrontados, busca, filtroStatus])

  return (
    <Card className="border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors bg-white rounded-xl overflow-hidden">
      <PanelHeader
        title="Escopo & Ativos de Salvaguarda"
        subtitle="Confronto direto entre os ativos cadastrados no inventário e as modalidades de backup exigidas"
        icon={Layers}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-700"
        badge={
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold"
          >
            {itensConfrontados.length} ativos no universo
          </Badge>
        }
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('escopo')}
            className="text-xs text-slate-700 border-slate-200 h-8"
          >
            Gerenciar no Escopo
          </Button>
        }
      />

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar ativo por nome, tipo ou IP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <Button
              variant={filtroStatus === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('todos')}
              className={`text-xs h-8 ${filtroStatus === 'todos' ? 'bg-[#0B2545]' : ''}`}
            >
              Todos ({itensConfrontados.length})
            </Button>
            <Button
              variant={filtroStatus === 'protegido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('protegido')}
              className={`text-xs h-8 ${filtroStatus === 'protegido' ? 'bg-emerald-700' : ''}`}
            >
              Proteção Integral ({itensConfrontados.filter((i) => i.integral).length})
            </Button>
            <Button
              variant={filtroStatus === 'pendente' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('pendente')}
              className={`text-xs h-8 ${filtroStatus === 'pendente' ? 'bg-amber-700' : ''}`}
            >
              Com Pendência ({itensConfrontados.filter((i) => !i.integral).length})
            </Button>
          </div>
        </div>

        {/* Tabela Padronizada na Nova Linguagem Visual */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/90 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ativo / Identificação</th>
                  <th className="py-3 px-3">Tipo / IP</th>
                  <th className="py-3 px-3 text-center">Local</th>
                  <th className="py-3 px-3 text-center">Nuvem</th>
                  <th className="py-3 px-3 text-center">Replicação</th>
                  <th className="py-3 px-4 text-right">Status do Confronto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum ativo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  itensFiltrados.map((item) => (
                    <tr key={item.ativo.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Ativo */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.ativo.name}</div>
                        {item.ativo.criticidade && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            Criticidade:{' '}
                            <span className="capitalize">{item.ativo.criticidade}</span>
                          </div>
                        )}
                      </td>

                      {/* Tipo / IP */}
                      <td className="py-3 px-3">
                        <div className="text-slate-700 capitalize">
                          {item.ativo.tipo ? item.ativo.tipo.replace(/_/g, ' ') : 'Ativo'}
                        </div>
                        {item.ativo.ip_address && (
                          <div className="font-mono text-[10px] text-slate-400">
                            {item.ativo.ip_address}
                          </div>
                        )}
                      </td>

                      {/* Modalidade Local */}
                      <td className="py-3 px-3 text-center">
                        {item.exigeLocal ? (
                          item.modLocal?.ultima_comprovacao ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold"
                              title={`Comprovado: ${item.modLocal.ultima_comprovacao}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Comprovado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 gap-1 font-semibold"
                            >
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Pendente
                            </Badge>
                          )
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Modalidade Nuvem */}
                      <td className="py-3 px-3 text-center">
                        {item.exigeNuvem ? (
                          item.modNuvem?.ultima_comprovacao ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold"
                              title={`Comprovado: ${item.modNuvem.ultima_comprovacao}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Comprovado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 gap-1 font-semibold"
                            >
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Pendente
                            </Badge>
                          )
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Modalidade Replicação */}
                      <td className="py-3 px-3 text-center">
                        {item.exigeReplica ? (
                          item.modReplica?.ultima_comprovacao ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold"
                              title={`Comprovado: ${item.modReplica.ultima_comprovacao}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Comprovado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 gap-1 font-semibold"
                            >
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Pendente
                            </Badge>
                          )
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status Geral */}
                      <td className="py-3 px-4 text-right">
                        {item.integral ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 text-[11px] font-bold">
                            Proteção Integral
                          </Badge>
                        ) : item.parcial ? (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 text-[11px] font-bold">
                            Parcial ({item.totalAtendidas}/{item.totalExigidas})
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 text-[11px] font-bold">
                            Não Comprovado
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BackupRedesignScopeSection
