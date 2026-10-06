import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, ArrowLeft, Shield, Sparkles } from 'lucide-react'

interface PlaceholderPageProps {
  moduleTitle: string
  moduleSection: string
  description: string
  featuresPlanned?: string[]
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  moduleTitle,
  moduleSection,
  description,
  featuresPlanned,
}) => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>{moduleSection}</span>
          <span>/</span>
          <span className="text-slate-800 font-medium">{moduleTitle}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{moduleTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>

      {/* Card Institucional */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">Módulo em preparação</CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-1 max-w-2xl">
            Este módulo estará disponível na próxima etapa do ciclo de conformidade da plataforma.
            Os parâmetros cadastrados no módulo de Configurações serão integrados automaticamente a
            este painel.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {featuresPlanned && featuresPlanned.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Recursos previstos neste módulo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {featuresPlanned.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/70 text-xs text-slate-700 font-medium"
                  >
                    <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              asChild
              variant="default"
              className="bg-blue-700 hover:bg-blue-800 text-xs font-semibold"
            >
              <Link to="/configuracoes">Acessar Configurações da Serventia</Link>
            </Button>
            <Button asChild variant="outline" className="text-xs">
              <Link to="/">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Retornar ao Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default PlaceholderPage
