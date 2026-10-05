import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F8FAFC]">
      <Card className="max-w-md w-full border-slate-200 shadow-md bg-white text-center p-6">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">Página Não Encontrada</CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-2">
          O caminho solicitado não existe ou você não possui autorização para este recurso
          institucional.
        </CardDescription>
        <div className="mt-6">
          <Button asChild className="bg-blue-700 hover:bg-blue-800 text-xs w-full">
            <Link to="/">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Retornar ao Dashboard
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
export default NotFound
