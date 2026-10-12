import React from 'react'
import { Link } from 'react-router-dom'
import {
  FileCheck2,
  Printer,
  ShieldCheck,
  Hash,
  Download,
  AlertTriangle,
  Lock,
  ExternalLink,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MatrizConformidadeConsolidada, EtapaConformidadeResumo } from '@/types/cscti'

interface ConformidadeDossieTabProps {
  consolidada: MatrizConformidadeConsolidada
}

export const ConformidadeDossieTab: React.FC<ConformidadeDossieTabProps> = ({ consolidada }) => {
  const { serventiaClasse, serventiaNome, etapas, percentualGeral } = consolidada

  const isDossieCompleto = serventiaClasse === 'C2' || serventiaClasse === 'C3'

  return (
    <div className="space-y-6">
      {/* Apresentação do Dossiê */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dossiê Comprobatório de Conformidade
              </span>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-300 font-bold"
              >
                {isDossieCompleto
                  ? 'Dossiê Técnico Integral (Classes 2 e 3)'
                  : 'Relatório Executivo Simplificado (Classe 1)'}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Geração de Peça Comprobatória Oficial por Etapa
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Instrumento documental em padrão A4, com cabeçalho institucional "CSCTI - Compliance",
              tabela de requisitos, fontes de prova, hashes SHA-256 e termo de subscrição do
              Titular.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/relatorios/conformidade">
              <Button
                size="sm"
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Emitir Dossiê Geral A4</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Informações da Norma Interna e Proporcionalidade */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
              Estrutura Comprobatória
            </span>
            <div className="font-semibold text-slate-900">
              {isDossieCompleto
                ? 'Dossiê Técnico Completo com Hash SHA-256'
                : 'Relatório Executivo Simplificado'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Atende à exigência estrita proporcional à Classe {serventiaClasse} da serventia.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
              Integridade Criptográfica
            </span>
            <div className="font-semibold text-slate-900 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-blue-700" />
              <span>Resumo SHA-256 Verificado</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Arquivos de evidências auditáveis perante autoridades fiscalizadoras.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
              Termo de Subscrição
            </span>
            <div className="font-semibold text-slate-900">Assinatura do Titular da Serventia</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Bloco formal com dados e declaração de autenticidade do acervo.
            </p>
          </div>
        </div>
      </div>

      {/* Dossiês por Etapa */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Dossiês Individuais por Etapa de Implantação
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {etapas.map((etapa) => {
            const isConcluida = etapa.concluida
            const isBloqueada = etapa.bloqueada

            return (
              <div
                key={etapa.numero}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      Etapa {etapa.numero}
                    </span>
                    {isConcluida ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        100% Comprovada
                      </span>
                    ) : isBloqueada ? (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        Bloqueada
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        {etapa.percentual}% pronta
                      </span>
                    )}
                  </div>

                  <h5 className="text-xs font-bold text-slate-900 leading-snug">{etapa.titulo}</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {etapa.itensComprovados} de {etapa.itensTotal} requisitos comprovados
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Formato A4 Oficial</span>
                  <Link to={`/relatorios/conformidade?etapa=${etapa.numero}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 text-[#0B2545] font-semibold border-slate-300 hover:bg-slate-50"
                    >
                      <Printer className="w-3 h-3 mr-1" />
                      <span>Ver Dossiê</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ConformidadeDossieTab
