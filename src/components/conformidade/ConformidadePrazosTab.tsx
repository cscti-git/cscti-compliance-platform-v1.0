import React from 'react'
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { MatrizConformidadeConsolidada } from '@/types/cscti'

interface ConformidadePrazosTabProps {
  consolidada: MatrizConformidadeConsolidada
}

export const ConformidadePrazosTab: React.FC<ConformidadePrazosTabProps> = ({ consolidada }) => {
  const {
    serventiaClasse,
    prazoEtapas1e2Dias,
    diasRestantesEtapas1e2,
    prazoEtapas1a5Meses,
    mesesRestantesEtapas1a5,
    urgenciaPrazo,
    etapas,
  } = consolidada

  const etapa1 = etapas.find((e) => e.numero === 1)
  const etapa2 = etapas.find((e) => e.numero === 2)
  const etapas1e2Comprovadas = (etapa1?.itensComprovados || 0) + (etapa2?.itensComprovados || 0)
  const etapas1e2Total = (etapa1?.itensTotal || 0) + (etapa2?.itensTotal || 0)
  const pctEtapas1e2 =
    etapas1e2Total > 0 ? Math.round((etapas1e2Comprovadas / etapas1e2Total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Quadro Informativo dos Prazos Regimentais por Classe */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Prazos-Alvo da Serventia
              </span>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-300 font-bold"
              >
                Classe {serventiaClasse}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Cronograma de Cumprimento e Contagem Regressiva
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Status do Prazo:</span>
            {urgenciaPrazo === 'critica' ? (
              <span className="px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Prazo Crítico (&lt; 30 dias)
              </span>
            ) : urgenciaPrazo === 'atencao' ? (
              <span className="px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Atenção (&lt; 90 dias)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Regular (Prazo Confortável)
              </span>
            )}
          </div>
        </div>

        {/* Comparativo de Prazos por Classe */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Bloco 1: Etapas 1 e 2 (Exigência Imediata) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-700" />
                Etapas 1 e 2 (Governança & Infraestrutura)
              </span>
              <Badge className="bg-[#0B2545] text-white text-[10px]">Exigível Primeiro</Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0B2545]">
                {diasRestantesEtapas1e2}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                dias restantes de {prazoEtapas1e2Dias} dias previstos
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Progresso das Etapas 1 e 2</span>
                <span className="font-bold text-slate-900">{pctEtapas1e2}%</span>
              </div>
              <Progress value={pctEtapas1e2} className="h-2" />
              <p className="text-[11px] text-slate-500">
                {etapas1e2Comprovadas} de {etapas1e2Total} requisitos comprovados perante o
                ambiente.
              </p>
            </div>
          </div>

          {/* Bloco 2: Etapas 1 a 5 (Ciclo Integral) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-700" />
                Ciclo Completo (Etapas 1 a 5)
              </span>
              <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px]">
                Meta Global
              </Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-900">
                {mesesRestantesEtapas1a5}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                meses restantes de {prazoEtapas1a5Meses} meses previstos
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Progresso Geral</span>
                <span className="font-bold text-slate-900">{consolidada.percentualGeral}%</span>
              </div>
              <Progress value={consolidada.percentualGeral} className="h-2" />
              <p className="text-[11px] text-slate-500">
                {consolidada.totalComprovados} de {consolidada.totalItens} requisitos totais
                comprovados.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de Referência das Classes */}
        <div className="pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Matriz de Prazos Regimentais por Classe da Serventia
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2.5 border-b border-slate-200">Classe da Serventia</th>
                  <th className="p-2.5 border-b border-slate-200">Prazo Etapas 1 e 2</th>
                  <th className="p-2.5 border-b border-slate-200">Prazo Etapas 1 a 5</th>
                  <th className="p-2.5 border-b border-slate-200">Tipo de Dossiê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className={serventiaClasse === 'C1' ? 'bg-blue-50/70 font-semibold' : ''}>
                  <td className="p-2.5 flex items-center gap-1.5">
                    <span>Classe 1</span>
                    {serventiaClasse === 'C1' && (
                      <Badge className="text-[10px] bg-blue-700 text-white">Sua Serventia</Badge>
                    )}
                  </td>
                  <td className="p-2.5">300 dias corridos</td>
                  <td className="p-2.5">36 meses</td>
                  <td className="p-2.5 text-slate-600">Relatório Simplificado</td>
                </tr>
                <tr className={serventiaClasse === 'C2' ? 'bg-blue-50/70 font-semibold' : ''}>
                  <td className="p-2.5 flex items-center gap-1.5">
                    <span>Classe 2</span>
                    {serventiaClasse === 'C2' && (
                      <Badge className="text-[10px] bg-blue-700 text-white">Sua Serventia</Badge>
                    )}
                  </td>
                  <td className="p-2.5">240 dias corridos</td>
                  <td className="p-2.5">30 meses</td>
                  <td className="p-2.5 text-slate-900 font-medium">
                    Dossiê Técnico com Hashes SHA-256
                  </td>
                </tr>
                <tr className={serventiaClasse === 'C3' ? 'bg-blue-50/70 font-semibold' : ''}>
                  <td className="p-2.5 flex items-center gap-1.5">
                    <span>Classe 3</span>
                    {serventiaClasse === 'C3' && (
                      <Badge className="text-[10px] bg-blue-700 text-white">Sua Serventia</Badge>
                    )}
                  </td>
                  <td className="p-2.5">180 dias corridos</td>
                  <td className="p-2.5">24 meses</td>
                  <td className="p-2.5 text-slate-900 font-medium">
                    Dossiê Técnico com Hashes SHA-256
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConformidadePrazosTab
