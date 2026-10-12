import React from 'react'
import { Link } from 'react-router-dom'
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileCheck2,
  Clock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type {
  EtapaConformidadeResumo,
  ConformidadeItemCatalog,
  ConformidadeStatusItem,
} from '@/types/cscti'

interface ConformidadeEtapasTabProps {
  etapas: EtapaConformidadeResumo[]
  onSelectEtapaItens: (etapaNum: number) => void
  serventiaClasse: string
}

export const ConformidadeEtapasTab: React.FC<ConformidadeEtapasTabProps> = ({
  etapas,
  onSelectEtapaItens,
  serventiaClasse,
}) => {
  return (
    <div className="space-y-6">
      {/* Aviso Metodológico do Sequencial e Cumulativo */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-amber-900">
            Estrutura Sequencial e Cumulativa de Conformidade
          </p>
          <p className="text-amber-800 leading-relaxed">
            As etapas de implantação são cumulativas: uma etapa só é formalmente concluível quando a
            etapa anterior estiver 100% comprovada no ambiente real. As Etapas 1 e 2 são as
            exigíveis com prioridade nos prazos regimentais da serventia (Classe {serventiaClasse}),
            seguidas pelas Etapas 3 a 6 progressivas.
          </p>
        </div>
      </div>

      {/* Grid das 6 Etapas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {etapas.map((etapa) => {
          const isBloqueada = etapa.bloqueada
          const isConcluida = etapa.concluida

          return (
            <div
              key={etapa.numero}
              className={`rounded-xl border transition-all flex flex-col justify-between p-5 bg-white shadow-2xs ${
                isConcluida
                  ? 'border-emerald-300 ring-1 ring-emerald-200/60'
                  : isBloqueada
                    ? 'border-slate-200 opacity-80 bg-slate-50/50'
                    : 'border-blue-200 ring-1 ring-blue-100 hover:border-blue-400'
              }`}
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isConcluida
                          ? 'bg-emerald-100 text-emerald-800'
                          : isBloqueada
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {etapa.numero}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Etapa {etapa.numero}
                    </span>
                  </div>

                  {isConcluida ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      100% Concluída
                    </Badge>
                  ) : isBloqueada ? (
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-medium gap-1"
                    >
                      <Lock className="w-3 h-3 text-slate-400" />
                      Bloqueada
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-300 text-[10px] font-bold gap-1"
                    >
                      <Unlock className="w-3 h-3 text-blue-600" />
                      Em Execução
                    </Badge>
                  )}
                </div>

                {/* Título e Descrição */}
                <h4 className="text-sm font-bold text-slate-900 leading-snug">{etapa.titulo}</h4>
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">
                  {etapa.descricao}
                </p>

                {/* Barra de Progresso Real */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Comprovação Efetiva</span>
                    <span
                      className={
                        isConcluida
                          ? 'text-emerald-700 font-bold'
                          : isBloqueada
                            ? 'text-slate-500'
                            : 'text-[#0B2545] font-bold'
                      }
                    >
                      {etapa.percentual}% ({etapa.itensComprovados}/{etapa.itensTotal} itens)
                    </span>
                  </div>
                  <Progress value={etapa.percentual} className="h-2" />
                </div>

                {/* Detalhamento de Status dos Itens */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-[11px]">
                  <div className="bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
                    <span className="text-slate-500 block text-[10px]">Comprovados</span>
                    <span className="font-bold text-emerald-700">{etapa.itensComprovados}</span>
                  </div>
                  <div className="bg-amber-50/60 p-1.5 rounded border border-amber-100">
                    <span className="text-slate-500 block text-[10px]">Parciais</span>
                    <span className="font-bold text-amber-700">{etapa.itensParciais}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Pendentes</span>
                    <span className="font-bold text-slate-700">{etapa.itensPendentes}</span>
                  </div>
                </div>

                {/* Alerta de bloqueio da etapa anterior */}
                {isBloqueada && (
                  <div className="mt-3 p-2 bg-slate-100/90 rounded text-[11px] text-slate-600 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Aguardando 100% de comprovação da <strong>Etapa {etapa.numero - 1}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Botões de Ação do Card */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectEtapaItens(etapa.numero)}
                  className="text-xs h-8 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                >
                  <span>Ver {etapa.itensTotal} Requisitos</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>

                <Link to={`/relatorios/conformidade?etapa=${etapa.numero}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-blue-700 hover:text-blue-900 hover:bg-blue-50"
                    title="Emitir Dossiê Comprobatório desta Etapa"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                    <span>Dossiê A4</span>
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ConformidadeEtapasTab
