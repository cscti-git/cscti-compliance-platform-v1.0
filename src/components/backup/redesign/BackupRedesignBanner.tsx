import React from 'react'
import { AlertCircle, ArrowLeft, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const BackupRedesignBanner: React.FC = () => {
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold">
                PRÉVIA DE REDESIGN
              </Badge>
              <span className="text-[11px] font-semibold text-amber-950">
                Protótipo para homologação • O módulo atual permanece inalterado
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
              Uniformização visual do Módulo Backup na linguagem nova do CSCTI - Compliance
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Esta página consome dados 100% reais da serventia logada, sem tocar nos hooks do
              motor, regras de confronto ou no NOC. Apenas o frontend está sendo avaliado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-950 gap-1.5 shadow-xs"
          >
            <Link to="/backup">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Módulo Atual</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BackupRedesignBanner
