import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { listAuditLogs } from '@/services/csctiService'
import type { AuditLogItem } from '@/types/cscti'
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  User,
  RefreshCw,
  Download,
  Building2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const AuditPage: React.FC = () => {
  const { organization } = useAuth()
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('todos')

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const data = await listAuditLogs(organization?.id, 100)
      setLogs(data)
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [organization?.id])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.detail && log.detail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesAction =
      actionFilter === 'todos' ||
      (actionFilter === 'config' && log.action.includes('CONFIG')) ||
      log.action.includes('ORG') ||
      log.action.includes('INTEGRATION') ||
      (actionFilter === 'auth' && (log.action === 'LOGIN' || log.action === 'LOGOUT')) ||
      (actionFilter === 'user' && log.action.includes('USER'))

    return matchesSearch && matchesAction
  })

  const exportCSV = () => {
    const headers = ['Data', 'Ação', 'Entidade', 'Usuário', 'E-mail', 'Detalhe']
    const rows = filteredLogs.map((l) => [
      l.created ? new Date(l.created).toLocaleString('pt-BR') : '',
      `"${l.action || ''}"`,
      `"${l.entity || ''}"`,
      `"${l.user_name || ''}"`,
      `"${l.user_email || ''}"`,
      `"${(l.detail || '').replace(/"/g, '""')}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `auditoria_${organization?.name || 'cscti'}_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Evidências</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">Auditoria</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trilha de Auditoria</h1>
          <p className="text-sm text-slate-500 mt-1">
            Rastreabilidade completa de ações administrativas, alterações cadastrais e acessos no
            sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={filteredLogs.length === 0}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por ação, usuário, e-mail ou detalhe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-700 w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="todos">Todas as ações</option>
              <option value="config">Configurações & Integrações</option>
              <option value="auth">Acessos (Login/Logout)</option>
              <option value="user">Usuários & Acessos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Eventos */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Registros da Serventia ({filteredLogs.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Eventos com carimbo de tempo, usuário e detalhes técnicos
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/75 text-xs">
                <TableHead className="w-[180px]">Data / Hora</TableHead>
                <TableHead className="w-[140px]">Ação</TableHead>
                <TableHead className="w-[140px]">Entidade</TableHead>
                <TableHead className="w-[180px]">Usuário</TableHead>
                <TableHead>Detalhe da Operação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                    Carregando registros de auditoria...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                    Nenhum registro encontrado para os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="text-xs hover:bg-slate-50/50">
                    <TableCell className="font-mono text-slate-600">
                      {log.created ? new Date(log.created).toLocaleString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] bg-slate-50 border-slate-300"
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {log.entity || 'Sistema'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {log.user_name || 'Sistema'}
                        </span>
                        <span className="text-[10px] text-slate-400">{log.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-md">{log.detail}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
export default AuditPage
