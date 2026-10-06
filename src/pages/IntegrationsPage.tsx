import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getIntegrations } from '@/services/csctiService'
import { IntegrationsTab } from '@/pages/config/IntegrationsTab'
import type { IntegrationItem } from '@/types/cscti'
import { Loader2, Puzzle, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export const IntegrationsPage: React.FC = () => {
  const { organization, role, isAdmin } = useAuth()
  const orgId = organization?.id || ''
  const canOperate = isAdmin || role === 'suporte'

  const [loading, setLoading] = useState(true)
  const [glpi, setGlpi] = useState<IntegrationItem | null>(null)
  const [email, setEmail] = useState<IntegrationItem | null>(null)

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await getIntegrations(orgId)
      setGlpi(data.glpi)
      setEmail(data.email)
    } catch (err) {
      console.error('Erro ao carregar integrações:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página de Integrações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Puzzle className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Central de Integrações e Conectores
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure e gerencie os conectores de inventário GLPI e recepção de e-mails de backup da
            serventia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to="/configuracoes">Todas as Configurações</Link>
          </Button>
        </div>
      </div>

      {!canOperate && (
        <Card className="border-amber-200 bg-amber-50/60 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-900">
              <span className="font-semibold">Modo de consulta: </span>
              Seu perfil de acesso permite visualizar o status e parâmetros dos conectores, mas a
              alteração e teste de credenciais são restritos a Administradores e Suporte.
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
          <span>Carregando parâmetros dos conectores...</span>
        </div>
      ) : (
        <IntegrationsTab
          organizationId={orgId}
          glpi={glpi}
          email={email}
          onRefresh={loadData}
          readOnly={!canOperate}
        />
      )}
    </div>
  )
}

export default IntegrationsPage
