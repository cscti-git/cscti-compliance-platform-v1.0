import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { CsctiLogoMark } from '@/components/CsctiLogo'

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#061628]">
      <Card className="max-w-md w-full border-slate-800 shadow-xl bg-slate-900 text-center p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B2545] via-[#D4AF37] to-[#0EA5E9]" />
        <div className="flex justify-center mb-4">
          <CsctiLogoMark size={48} />
        </div>
        <CardTitle className="text-xl font-bold text-white">Recurso Não Encontrado (404)</CardTitle>
        <CardDescription className="text-xs text-slate-400 mt-2 leading-relaxed">
          O endereço solicitado não existe ou não está liberado para o perfil ativo da serventia na
          plataforma CSCTI.
        </CardDescription>
        <div className="mt-6">
          <Button
            asChild
            className="bg-[#D4AF37] hover:bg-[#b8952b] text-slate-950 font-bold text-xs w-full"
          >
            <Link to="/">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Retornar ao Painel Institucional
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
export default NotFound
