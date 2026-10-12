import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  Hash,
  Loader2,
  AlertCircle,
  FileSignature,
  Stamp,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CsctiLogo } from '@/components/CsctiLogo'
import { useAuth } from '@/contexts/AuthContext'
import {
  getDesignacaoById,
  registrarGeracaoTermo,
  calculateTextSha256,
} from '@/services/designacaoService'
import { formatDateTime, formatDate } from '@/lib/dateTime'
import type { DesignacaoItem } from '@/types/cscti'

export const TermoDesignacaoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { organization, user } = useAuth()
  const [designacao, setDesignacao] = useState<DesignacaoItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hashDocumento, setHashDocumento] = useState<string>('')
  const [dataEmissao] = useState<Date>(() => new Date())

  useEffect(() => {
    async function carregar() {
      if (!id) return
      setIsLoading(true)
      setError(null)
      try {
        const item = await getDesignacaoById(id)
        if (!item) {
          setError('Designação não encontrada.')
          return
        }
        setDesignacao(item)

        // Snapshot do texto completo para cálculo de hash SHA-256 e auditoria
        const textoTermo = montarTextoTermo(item, organization)
        const hash = await calculateTextSha256(textoTermo)
        setHashDocumento(hash)

        // Registrar a geração do documento no banco se ainda não gerado
        if (organization?.id && user?.name) {
          try {
            await registrarGeracaoTermo(
              organization.id,
              item,
              organization,
              textoTermo,
              '',
              user.name || user.email || 'Usuário do Sistema',
            )
          } catch (e) {
            console.warn('Falha silenciosa ao registrar documento gerado:', e)
          }
        }
      } catch (err: any) {
        console.error(err)
        setError('Falha ao carregar os dados da designação.')
      } finally {
        setIsLoading(false)
      }
    }
    carregar()
  }, [id, organization, user])

  const papel = designacao?.expand?.papel_designado
  const org = organization

  // Atribuições formatadas (prioriza as customizadas se existirem, senão as detalhadas do papel)
  const atribuicoesTexto = useMemo(() => {
    return (
      designacao?.atribuicoes_customizadas ||
      papel?.atribuicoes_detalhadas ||
      'Atribuições regimentais nos termos das diretrizes institucionais vigentes.'
    )
  }, [designacao, papel])

  const listaAtribuicoes = useMemo(() => {
    return atribuicoesTexto
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  }, [atribuicoesTexto])

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
          <span>Carregando Termo Oficial de Designação...</span>
        </div>
      </div>
    )
  }

  if (error || !designacao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Termo não disponível</h2>
          <p className="text-xs text-slate-600">{error || 'Designação não encontrada.'}</p>
          <Link to="/configuracoes?tab=papeis">
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar para Configurações
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900">
      {/* BARRA SUPERIOR DE AÇÕES (Oculta na impressão A4) */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/configuracoes?tab=papeis">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Papéis e Responsáveis
              </Button>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Termo de Designação de Responsabilidade
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  designacao.status === 'assinada_fisica' ||
                  designacao.status === 'assinada_digital'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : designacao.status === 'pendente_assinatura'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {designacao.status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Gerar PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* FOLHA A4 INSTITUCIONAL */}
      <div className="max-w-[850px] mx-auto my-6 print:my-0 px-4 sm:px-0 print:p-0">
        <div
          id="termo-a4"
          className="bg-white rounded-xl print:rounded-none shadow-md print:shadow-none border border-slate-200 print:border-0 p-8 sm:p-12 print:p-8 space-y-8"
        >
          {/* 1. CABEÇALHO INSTITUCIONAL */}
          <header className="border-b-2 border-[#0B2545] pb-5 flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <CsctiLogo variant="horizontal" className="h-12 w-auto" />
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#124E78]">
                  Governança & Conformidade
                </span>
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  TERMO DE DESIGNAÇÃO FORMAL
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Atribuição de Responsabilidade Institucional e Técnica
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500 space-y-0.5 shrink-0 font-mono">
              <p>
                <span className="text-slate-400">Emissão:</span>{' '}
                {formatDateTime(dataEmissao.toISOString())}
              </p>
              <p>
                <span className="text-slate-400">Designação:</span>{' '}
                {formatDate(designacao.data_designacao)}
              </p>
              <p>
                <span className="text-slate-400">ID:</span> {designacao.id}
              </p>
            </div>
          </header>

          {/* 2. IDENTIFICAÇÃO DA SERVENTIA E DO TITULAR */}
          <section className="bg-slate-50/70 rounded-lg border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Identificação da Serventia Outorgante</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
              <div>
                <span className="text-slate-500 font-medium">Denominação:</span>{' '}
                <span className="font-bold text-slate-900">
                  {org?.name || 'Serventia Notarial/Registral'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">CNPJ:</span>{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {org?.cnpj || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Razão Social:</span>{' '}
                <span className="font-medium text-slate-900">
                  {org?.corporate_name || org?.name || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Sede / Comarca:</span>{' '}
                <span className="font-medium text-slate-900">
                  {[org?.city, org?.state].filter(Boolean).join('/') || 'Não informado'}
                </span>
              </div>
              {org?.street && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-medium">Endereço:</span>{' '}
                  <span className="text-slate-800">
                    {org.street}, {org.number || 's/n'}{' '}
                    {org.complement ? `· ${org.complement}` : ''} — {org.neighborhood || ''},{' '}
                    {org.city}/{org.state} — CEP: {org.zip_code || ''}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* 3. QUALIFICAÇÃO COMPLETA DO DESIGNADO */}
          <section className="bg-slate-50/70 rounded-lg border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <User className="w-3.5 h-3.5 text-indigo-700" />
              <span>Qualificação da Pessoa Designada</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
              <div>
                <span className="text-slate-500 font-medium">Nome Completo:</span>{' '}
                <span className="font-bold text-slate-900 text-sm">
                  {designacao.nome_designado}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">CPF:</span>{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {designacao.cpf_designado || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Função na Serventia:</span>{' '}
                <span className="font-medium text-slate-900">
                  {designacao.cargo_designado || 'Colaborador Designado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">E-mail:</span>{' '}
                <span className="font-mono text-slate-800">
                  {designacao.email_designado || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Telefone / Contato:</span>{' '}
                <span className="text-slate-800">
                  {designacao.telefone_designado || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Data da Designação:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {formatDate(designacao.data_designacao)}
                </span>
              </div>
            </div>
          </section>

          {/* 4. PAPEL INSTITUCIONAL E ATRIBUIÇÕES DETALHADAS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs sm:text-sm font-bold text-[#0B2545] uppercase tracking-wide">
                  Papel Atribuído: {papel?.papel || 'Responsável Institucional'}
                </h2>
              </div>
              {papel?.codigo && (
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {papel.codigo}
                </span>
              )}
            </div>

            {papel?.descricao_curta && (
              <p className="text-xs text-slate-600 italic bg-blue-50/50 border-l-2 border-blue-500 p-2 rounded-r">
                {papel.descricao_curta}
              </p>
            )}

            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Atribuições e Obrigações Detalhadas:
              </h3>
              <div className="space-y-2 text-xs text-slate-700 leading-relaxed pl-1">
                {listaAtribuicoes.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="text-[#124E78] font-bold shrink-0">•</span>
                    <span>{item.replace(/^[0-9]+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {designacao.observacoes && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                <span className="font-bold text-slate-700">Observações adicionais:</span>{' '}
                {designacao.observacoes}
              </div>
            )}
          </section>

          {/* 5. DECLARAÇÃO DE CIÊNCIA E COMPROMISSO FORMAL */}
          <section className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 leading-relaxed text-justify space-y-2">
            <p>
              Pelo presente instrumento, a Serventia outorgante, no exercício de sua governança e
              gestão técnica, <strong>DESIGNA</strong> formalmente a pessoa acima qualificada para o
              desempenho fiel e tempestivo de todas as atribuições inerentes ao encargo,
              conferindo-lhe as prerrogativas necessárias ao fiel cumprimento de suas obrigações
              operacionais e regulatórias.
            </p>
            <p>
              O(A) designado(a) declara que aceita a presente designação, assumindo o compromisso de
              zelar pela confidencialidade, integridade, disponibilidade e conformidade dos serviços
              e dos dados tratados pela serventia, ciente das responsabilidades civis,
              administrativas e disciplinares aplicáveis ao exercício de suas funções.
            </p>
          </section>

          {/* 6. BLOCO DE ASSINATURAS (DUAS VIAS: DESIGNADO E TITULAR DA SERVENTIA) */}
          <section className="pt-6 space-y-12">
            <div className="text-center text-xs text-slate-600">
              <p>
                {org?.city || 'Localidade'}, {formatDate(designacao.data_designacao)}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              {/* Via 1: Designado */}
              <div className="text-center space-y-2">
                <div className="border-t-2 border-slate-900 pt-2 mx-auto max-w-[280px]">
                  <p className="font-bold text-xs text-slate-900 uppercase">
                    {designacao.nome_designado}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {designacao.cargo_designado || 'Designado'}
                  </p>
                  {designacao.cpf_designado && (
                    <p className="text-[10px] text-slate-400 font-mono">
                      CPF: {designacao.cpf_designado}
                    </p>
                  )}
                  <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    Pessoa Designada
                  </span>
                </div>
              </div>

              {/* Via 2: Titular da Serventia */}
              <div className="text-center space-y-2">
                <div className="border-t-2 border-slate-900 pt-2 mx-auto max-w-[280px]">
                  <p className="font-bold text-xs text-slate-900 uppercase">
                    {org?.contact_name || org?.name || 'Titular / Delegatário'}
                  </p>
                  <p className="text-[11px] text-slate-600">Titular / Responsável pela Serventia</p>
                  {org?.cnpj && (
                    <p className="text-[10px] text-slate-400 font-mono">CNPJ: {org.cnpj}</p>
                  )}
                  <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    Serventia Outorgante
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 7. METADADOS DE VALIDADE JURÍDICA E HASH DE AUDITORIA */}
          <footer className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 space-y-1.5 font-mono">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Lock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span className="font-bold">Validação e Autenticidade Institucional</span>
              </div>
              <span>Sistema CSCTI - Compliance Platform</span>
            </div>

            <p className="text-slate-600 break-all leading-tight">
              <span className="font-semibold text-slate-700">Hash SHA-256 do Documento:</span>{' '}
              {hashDocumento || 'Calculando integridade...'}
            </p>

            {designacao.hash_sha256 && (
              <p className="text-emerald-700 break-all leading-tight font-semibold">
                <span>Hash SHA-256 do Anexo Comprobatório Assinado:</span> {designacao.hash_sha256}
              </p>
            )}

            {designacao.plataforma_assinatura && (
              <p className="text-slate-600">
                <span>Método/Plataforma de Assinatura:</span> {designacao.plataforma_assinatura}
                {designacao.metodo_assinatura_detalhes
                  ? ` (${designacao.metodo_assinatura_detalhes})`
                  : ''}
              </p>
            )}

            <p className="text-[9px] text-slate-400 italic pt-1">
              Documento emitido eletronicamente para fins de comprovação da governança e
              responsabilidades regimentais, auditado com registro append-only de data, hora e
              identidade do emissor.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

/**
 * Monta o texto canônico do termo para cálculo do Hash SHA-256
 */
function montarTextoTermo(item: DesignacaoItem, org?: any): string {
  const papel = item.expand?.papel_designado
  return [
    'TERMO DE DESIGNAÇÃO FORMAL - CSCTI COMPLIANCE',
    `SERVENTIA: ${org?.name || ''} - CNPJ: ${org?.cnpj || ''}`,
    `DESIGNADO: ${item.nome_designado} - CPF: ${item.cpf_designado || ''} - CARGO: ${item.cargo_designado || ''}`,
    `PAPEL: ${papel?.papel || ''} (${papel?.codigo || ''})`,
    `DATA: ${item.data_designacao}`,
    `ATRIBUIÇÕES: ${item.atribuicoes_customizadas || papel?.atribuicoes_detalhadas || ''}`,
    `OBSERVACOES: ${item.observacoes || ''}`,
  ].join('\n')
}

export default TermoDesignacaoPage
