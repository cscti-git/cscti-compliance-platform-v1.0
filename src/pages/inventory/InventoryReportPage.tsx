import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { listInventoryAssets } from '@/services/csctiService'
import type { InventoryAssetItem } from '@/types/cscti'
import { CsctiLogoMark } from '@/components/CsctiLogo'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react'

export const InventoryReportPage: React.FC = () => {
  const { organization } = useAuth()
  const orgId = organization?.id || ''

  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generationDate] = useState(() => new Date())

  useEffect(() => {
    if (orgId) {
      listInventoryAssets(orgId).then((res) => {
        setAssets(res)
        setLoading(false)
      })
    }
  }, [orgId])

  const handlePrint = () => {
    window.print()
  }

  const getTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'servidor_aplicacao':
        return 'Servidor de Aplicação'
      case 'banco_dados':
        return 'Banco de Dados'
      case 'storage_backup':
        return 'Storage / Backup'
      case 'servico_nuvem':
        return 'Serviço em Nuvem'
      case 'estacao':
        return 'Estação de Trabalho'
      case 'impressora_multifuncional':
        return 'Multifuncional'
      case 'equipamento_rede':
        return 'Equipamento de Rede'
      default:
        return 'Outro'
    }
  }

  const getCriticidadeLabel = (crit: string) => {
    switch (crit) {
      case 'alta':
        return 'ALTA'
      case 'media':
        return 'MÉDIA'
      case 'baixa':
        return 'BAIXA'
      default:
        return crit
    }
  }

  const orgName = organization?.name || 'Serventia Extrajudicial'
  const corporateName = organization?.corporate_name || orgName
  const cnpj = organization?.cnpj || 'Não informado'
  const provimentoClass = organization?.provimento_class || 'C2'
  const cityState =
    organization?.city && organization?.state
      ? `${organization.city}/${organization.state}`
      : 'Brasil'

  const totalAssets = assets.length
  const criticalCount = assets.filter((a) => a.criticidade === 'alta').length
  const activeCount = assets.filter((a) => a.status === 'ativo').length
  const glpiCount = assets.filter((a) => a.origem === 'glpi').length

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans p-4 sm:p-8 print:p-0">
      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link to="/ativos">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Inventário
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="bg-[#0B2545] hover:bg-[#124E78] text-white gap-2 text-xs font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir Relatório / Salvar em PDF
          </Button>
        </div>
      </div>

      {/* Folha do Relatório A4 Paisagem */}
      <div className="max-w-6xl mx-auto bg-white border border-slate-300 print:border-none shadow-lg print:shadow-none p-8 print:p-6 print:max-w-none print:w-full min-h-[210mm]">
        {/* Cabeçalho Oficial do Relatório Comprobatório */}
        <header className="border-b-2 border-[#0B2545] pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <CsctiLogoMark size={44} />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#0B2545] uppercase">
                  Relatório Comprobatório de Inventário de Ativos
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  CSCTI - Compliance • Gestão de Continuidade e Segurança da Informação
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-300 font-bold mb-1">
                Classe {provimentoClass} • Fase 2
              </span>
              <p className="text-slate-500 font-mono text-[11px]">
                Emitido em: {generationDate.toLocaleDateString('pt-BR')} às{' '}
                {generationDate.toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Dados Institucionais da Serventia */}
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Serventia / Cartório:
              </span>
              <strong className="text-slate-900">{orgName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Razão Social / Titularidade:
              </span>
              <strong className="text-slate-900">{corporateName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                CNPJ da Unidade:
              </span>
              <strong className="text-slate-900 font-mono">{cnpj}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Localidade:
              </span>
              <strong className="text-slate-900">{cityState}</strong>
            </div>
          </div>
        </header>

        {/* Resumo Quantitativo / Auditoria */}
        <section className="mb-6">
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Total de Ativos
              </span>
              <span className="text-lg font-bold text-slate-900">{totalAssets}</span>
            </div>
            <div className="border border-emerald-200 rounded p-2.5 bg-emerald-50">
              <span className="text-emerald-700 block text-[10px] uppercase font-semibold">
                Ativos em Operação
              </span>
              <span className="text-lg font-bold text-emerald-800">{activeCount}</span>
            </div>
            <div className="border border-red-200 rounded p-2.5 bg-red-50">
              <span className="text-red-700 block text-[10px] uppercase font-semibold">
                Alta Criticidade (Backup Obrigatório)
              </span>
              <span className="text-lg font-bold text-red-800">{criticalCount}</span>
            </div>
            <div className="border border-blue-200 rounded p-2.5 bg-blue-50">
              <span className="text-blue-700 block text-[10px] uppercase font-semibold">
                Origem Conector GLPI
              </span>
              <span className="text-lg font-bold text-blue-800">{glpiCount}</span>
            </div>
          </div>
        </section>

        {/* Tabela Oficial de Ativos */}
        <section className="mb-8">
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 uppercase font-semibold border-b border-slate-300">
                <th className="py-2 px-2.5 border-r border-slate-300 w-8 text-center">#</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Identificação / Hostname</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Tipo de Equipamento</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center">Status</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center">Criticidade</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Localização / IP</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Nº de Série</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Origem</th>
                <th className="py-2 px-2.5">Responsável Designado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    Carregando dados do inventário da serventia...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                    Nenhum ativo catalogado no momento da emissão deste relatório.
                  </td>
                </tr>
              ) : (
                assets.map((asset, index) => (
                  <tr
                    key={asset.id}
                    className={`border-b border-slate-200 ${
                      index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-bold text-slate-900">
                      {asset.name}
                      {asset.descricao && (
                        <span className="block text-[10px] text-slate-500 font-normal truncate max-w-xs">
                          {asset.descricao}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-800">
                      {getTypeLabel(asset.tipo)}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-center uppercase font-semibold text-[10px]">
                      <span
                        className={
                          asset.status === 'ativo'
                            ? 'text-emerald-700'
                            : asset.status === 'inativo'
                              ? 'text-amber-700'
                              : 'text-slate-400'
                        }
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-bold text-[10px]">
                      <span
                        className={
                          asset.criticidade === 'alta'
                            ? 'text-red-700'
                            : asset.criticidade === 'media'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                        }
                      >
                        {getCriticidadeLabel(asset.criticidade)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                      {asset.localizacao || '—'}
                      {asset.ip_address && (
                        <span className="block font-mono text-[10px] text-slate-500">
                          IP: {asset.ip_address}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono text-slate-600">
                      {asset.serial_number || '—'}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-[10px] uppercase font-semibold text-slate-600">
                      {asset.origem === 'glpi' ? `GLPI #${asset.external_id || ''}` : 'MANUAL'}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-700">
                      {asset.expand?.responsavel?.name || 'Não designado'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Termo de Encerramento e Assinaturas */}
        <section className="pt-4 border-t border-slate-300 text-xs text-slate-600 page-break-inside-avoid">
          <div className="mb-8">
            <p className="leading-relaxed">
              <strong>Declaração de Conformidade Técnica:</strong> Certifica-se, para os devidos
              fins de fiscalização, governança e cumprimento das diretrizes de segurança da
              informação perante o juízo competente, que a relação de ativos acima descrita reflete
              integralmente o ambiente tecnológico em operação nesta serventia, servindo de base de
              escopo para as rotinas automáticas de backup, recuperação e auditoria contínua.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-6 text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-900">
                {organization?.contact_name || 'Dr(a). Titular / Delegatário(a)'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">
                Responsável Institucional / Titular da Serventia
              </p>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-900">Encarregado de TI e Continuidade</p>
              <p className="text-[10px] text-slate-500 uppercase">
                Gestor de Segurança da Informação (GSI / CSCTI)
              </p>
            </div>
          </div>
        </section>

        {/* Rodapé Padrão do Shell CSCTI */}
        <footer className="mt-12 pt-3 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CsctiLogoMark size={14} />
            <span>CSCTI - Compliance • Gestão de Continuidade e Ativos</span>
          </div>
          <div>
            <span>Documento emitido eletronicamente • Hash de Integridade Auditável</span>
          </div>
        </footer>
      </div>

      {/* Estilos CSS específicos de Impressão @media print */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
export default InventoryReportPage
