import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { listInventorySyncRuns, triggerGlpiSync, getIntegrations } from '@/services/csctiService'
import type { InventorySyncRunItem, IntegrationItem } from '@/types/cscti'
import {
  RefreshCw,
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export const GlpiSyncTab: React.FC = () => {
  const { organization, role } = useAuth()
  const { toast } = useToast()
  const orgId = organization?.id || ''

  const [runs, setRuns] = useState<InventorySyncRunItem[]>([])
  const [glpiConfig, setGlpiConfig] = useState<IntegrationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const canOperate = role === 'admin' || role === 'suporte'

  const loadData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [runsData, integData] = await Promise.all([
        listInventorySyncRuns(orgId, 25),
        getIntegrations(orgId),
      ])
      setRuns(runsData)
      setGlpiConfig(integData.glpi)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [orgId])

  const handleSyncNow = async () => {
    if (!orgId) return
    setSyncing(true)
    try {
      const res = await triggerGlpiSync(orgId)
      if (res.status === 'sucesso') {
        toast({
          title: 'Sincronização concluída com sucesso',
          description: res.message,
        })
      } else if (res.status === 'parcial') {
        toast({
          title: 'Sincronização concluída com avisos',
          description: res.message,
        })
      } else {
        toast({
          title: 'Aviso de Sincronização',
          description: res.message || 'Servidor GLPI não respondeu ou conector não configurado.',
          variant: 'destructive',
        })
      }
      await loadData()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao executar sincronização',
        description: err instanceof Error ? err.message : 'Falha interna na execução.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sucesso
          </Badge>
        )
      case 'parcial':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Parcial
          </Badge>
        )
      case 'em_andamento':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 gap-1 font-semibold animate-pulse">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> Em andamento
          </Badge>
        )
      case 'erro':
      default:
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 gap-1 font-semibold">
            <XCircle className="w-3 h-3 text-red-600" /> Falha / Erro
          </Badge>
        )
    }
  }

  const isGlpiConfigured = Boolean(glpiConfig?.glpi_url && glpiConfig?.enabled)

  return (
    <div className="space-y-6">
      {/* Banner de Status do Conector GLPI */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 bg-gradient-to-r from-slate-900 to-[#0B2545] text-white rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-xs text-[#D4AF37]">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg text-white font-bold">
                  Conector GLPI da Serventia
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  A plataforma consome o conector configurado para alimentar o Inventário de Ativos.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/configuracoes?tab=integracoes">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
                >
                  Configurar Conector <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
              {canOperate && (
                <Button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="bg-[#D4AF37] hover:bg-[#b8952b] text-slate-900 font-semibold text-xs gap-1.5 shadow-sm"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">Estado da Integração:</span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isGlpiConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold text-slate-800">
                  {isGlpiConfigured ? 'Conector Habilitado' : 'Conector Pendente ou Desabilitado'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">Servidor GLPI Alvo:</span>
              <span
                className="font-mono text-slate-800 truncate block"
                title={glpiConfig?.glpi_url}
              >
                {glpiConfig?.glpi_url || 'Nenhuma URL cadastrada'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">Última Sincronização:</span>
              <span className="font-semibold text-slate-800">
                {glpiConfig?.last_sync
                  ? new Date(glpiConfig.last_sync).toLocaleString('pt-BR')
                  : 'Nenhuma execução registrada'}
              </span>
            </div>
          </div>

          {!isGlpiConfigured && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Se a sua serventia ainda não implantou o servidor GLPI,
                você pode cadastrar e gerenciar seus ativos normalmente de forma manual na aba{' '}
                <span className="font-semibold underline">Ativos do Inventário</span>. O conector
                GLPI pode ser ativado a qualquer momento em <em>Configurações → Integrações</em>.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Execuções */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Histórico de Sincronizações GLPI
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registro auditável de todas as chamadas à API GLPI para importação e atualização do
              inventário.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0B2545]" />
              Carregando histórico de sincronizações...
            </div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma sincronização executada ainda
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Clique no botão <strong>Sincronizar Agora</strong> acima para buscar computadores e
                equipamentos cadastrados no seu servidor GLPI.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Início</th>
                    <th className="py-2.5 px-4">Término</th>
                    <th className="py-2.5 px-4">Resumo da Execução</th>
                    <th className="py-2.5 px-4">Detalhes / Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {runs.map((run) => {
                    const resumo = run.resumo
                    return (
                      <tr key={run.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(run.status)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                          {run.started_at
                            ? new Date(run.started_at).toLocaleString('pt-BR')
                            : run.created
                              ? new Date(run.created).toLocaleString('pt-BR')
                              : '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                          {run.finished_at
                            ? new Date(run.finished_at).toLocaleString('pt-BR')
                            : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {resumo ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                +{resumo.criados || 0} novos
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                {resumo.atualizados || 0} atualizados
                              </span>
                              {resumo.erros > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold border border-red-200">
                                  {resumo.erros} erros
                                </span>
                              )}
                              <span className="text-slate-400">
                                (Total GLPI: {resumo.total_glpi || 0})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td
                          className="py-3 px-4 text-slate-600 max-w-xs truncate"
                          title={run.error_message || ''}
                        >
                          {run.error_message ? (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {run.error_message}
                            </span>
                          ) : (
                            <span className="text-slate-500">Execução normal</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default GlpiSyncTab
