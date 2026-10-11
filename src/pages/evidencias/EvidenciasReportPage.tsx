import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  FolderGit2,
  Calendar,
  User,
  Server,
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Image as ImageIcon,
  Building2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { CsctiLogo } from '@/components/CsctiLogo'
import { CSCTI_BRAND } from '@/lib/brand'
import {
  listEvidencias,
  listEvidenciaCategorias,
  getEvidenciaFileUrl,
} from '@/services/evidenciaService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import type { EvidenciaItem, EvidenciaCategoriaItem } from '@/types/cscti'

export const EvidenciasReportPage: React.FC = () => {
  const { organization } = useAuth()
  const orgId = organization?.id || ''

  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([])
  const [categorias, setCategorias] = useState<EvidenciaCategoriaItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [emissao, setEmissao] = useState<Date>(() => new Date())

  // Filtros de Escopo do Relatório
  const [filterCategoria, setFilterCategoria] = useState<string>('todas')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [evids, cats] = await Promise.all([
        listEvidencias(orgId),
        listEvidenciaCategorias(orgId, true),
      ])
      setEvidencias(evids)
      setCategorias(cats)
      setEmissao(new Date())
    } catch (err) {
      console.error('[EvidenciasReportPage] Falha ao carregar evidências:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtragem dos dados a imprimir
  const printableEvidencias = useMemo(() => {
    return evidencias.filter((ev) => {
      if (filterCategoria !== 'todas') {
        if (ev.categoria !== filterCategoria && ev.categoria_nome !== filterCategoria) {
          return false
        }
      }
      if (filterStatus !== 'todos') {
        if (ev.status !== filterStatus) return false
      }
      return true
    })
  }, [evidencias, filterCategoria, filterStatus])

  // Agrupamento por Categoria para emissão formal
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, EvidenciaItem[]>()

    // Ordem das categorias baseada no catálogo cadastrado
    const catOrderMap = new Map<string, number>()
    categorias.forEach((c, idx) => {
      catOrderMap.set(c.name, c.ordem ?? idx * 10)
    })

    for (const ev of printableEvidencias) {
      const cat = ev.categoria_nome || 'Geral'
      if (!map.has(cat)) {
        map.set(cat, [])
      }
      map.get(cat)!.push(ev)
    }

    // Ordenar categorias pelo valor numérico de ordem
    const sortedCategories = Array.from(map.entries()).sort((a, b) => {
      const orderA = catOrderMap.get(a[0]) ?? 999
      const orderB = catOrderMap.get(b[0]) ?? 999
      return orderA - orderB
    })

    return sortedCategories
  }, [printableEvidencias, categorias])

  // Estatísticas do Relatório
  const totalImpresso = printableEvidencias.length
  const totalFotos = printableEvidencias.reduce((acc, ev) => acc + (ev.arquivos?.length || 0), 0)
  const totalCategoriasPreenchidas = groupedByCategory.length

  // Dados da Serventia (Sem menções a provimentos CNJ na interface de emissão)
  const orgName = organization?.name || 'Serventia Extrajudicial'
  const corporateName = organization?.corporate_name || orgName
  const cnpj = organization?.cnpj || 'Não informado'
  const cityState =
    organization?.city && organization?.state
      ? `${organization.city}/${organization.state}`
      : organization?.city || organization?.state || 'Brasil'

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center space-y-3">
          <FolderGit2 className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Sessão sem serventia vinculada</h1>
          <p className="text-sm text-slate-600">
            O Relatório Fotográfico de Evidências é emitido por serventia. Acesse com um usuário
            vinculado para emitir o documento.
          </p>
          <Link to="/evidencias">
            <Button variant="outline" className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar à Central de Evidências
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans">
      {/* 1. BARRA DE CONTROLE SUPERIOR (OCULTA NA IMPRESSÃO) */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 print:hidden shadow-2xs">
        <div className="max-w-[960px] mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/evidencias">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </Button>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-800">
              Relatório Fotográfico de Evidências
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filtro Categoria */}
            <div className="flex items-center gap-1.5">
              <Label className="text-[11px] text-slate-500 font-medium">Categoria:</Label>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="h-8 text-xs w-44 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as Categorias
                  </SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status */}
            <div className="flex items-center gap-1.5">
              <Label className="text-[11px] text-slate-500 font-medium">Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs w-32 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos
                  </SelectItem>
                  <SelectItem value="conforme" className="text-xs">
                    Conforme
                  </SelectItem>
                  <SelectItem value="pendente_revisao" className="text-xs">
                    Pendente
                  </SelectItem>
                  <SelectItem value="arquivado" className="text-xs">
                    Arquivado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs gap-1 h-8"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              size="sm"
              onClick={() => window.print()}
              disabled={loading || totalImpresso === 0}
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 h-8 shadow-xs px-3.5"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / Salvar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 2. FOLHA FORMATO A4 */}
      <div className="max-w-[960px] mx-auto px-4 py-6 print:p-0 print:max-w-none">
        <div
          id="relatorio-evidencias-a4"
          className="bg-white shadow-sm print:shadow-none border border-slate-200 print:border-0 print:w-full px-8 py-8 print:px-0 print:py-0 space-y-6"
        >
          {loading && evidencias.length === 0 ? (
            <div className="space-y-4 p-8">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              {/* CABEÇALHO INSTITUCIONAL CSCTI - COMPLIANCE */}
              <header className="border-b-2 border-[#0B2545] pb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <CsctiLogo variant="horizontal" className="h-12 w-auto" />
                  <div>
                    <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                      Relatório Fotográfico de Evidências
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      {orgName} · {corporateName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      CNPJ: {cnpj} · Localidade: {cityState}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-600 space-y-0.5 shrink-0">
                  <p>
                    <span className="font-bold text-slate-800">Emissão:</span>{' '}
                    {formatSpDateTime(emissao.toISOString())}
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">Total de Evidências:</span>{' '}
                    {totalImpresso} ({totalFotos} imagens/anexos)
                  </p>
                  <p className="text-[10px] text-slate-500">Documento de Comprovação Técnica</p>
                </div>
              </header>

              {/* RESUMO TÉCNICO E METODOLÓGICO */}
              <section className="bg-slate-50 rounded-xl border border-slate-200/90 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-xs font-bold text-[#0B2545] uppercase tracking-wide">
                    1. Resumo Executivo das Evidências Cadastradas
                  </h2>
                  <span className="text-[11px] text-slate-600 font-medium">
                    {totalCategoriasPreenchidas} categorias contempladas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total de Evidências
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 leading-none">
                      {totalImpresso}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total de Fotos e Anexos
                    </span>
                    <span className="text-lg font-extrabold text-blue-700 leading-none">
                      {totalFotos}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Evidências Conformes
                    </span>
                    <span className="text-lg font-extrabold text-emerald-700 leading-none">
                      {printableEvidencias.filter((e) => e.status === 'conforme').length}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Pendentes de Revisão
                    </span>
                    <span className="text-lg font-extrabold text-amber-700 leading-none">
                      {printableEvidencias.filter((e) => e.status === 'pendente_revisao').length}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic pt-1 leading-snug">
                  As fotos e documentos constantes deste relatório compõem a comprovação de
                  infraestrutura da serventia perante autoridades e auditorias técnicas competentes.
                </p>
              </section>

              {/* SEÇÃO 2: EVIDÊNCIAS AGRUPADAS POR CATEGORIA */}
              <section className="space-y-6">
                <h2 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide border-b border-slate-200 pb-1">
                  2. Registro Fotográfico e Documental por Categoria
                </h2>

                {groupedByCategory.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                    Nenhuma evidência corresponde aos critérios do filtro selecionado.
                  </div>
                ) : (
                  groupedByCategory.map(([categoriaNome, itens]) => (
                    <div
                      key={categoriaNome}
                      className="space-y-3 break-inside-avoid print:break-inside-avoid"
                    >
                      {/* Faixa de Seção de Categoria */}
                      <div className="bg-[#0B2545] text-white px-3.5 py-1.5 rounded-md flex items-center justify-between text-xs font-bold">
                        <span>{categoriaNome.toUpperCase()}</span>
                        <span className="text-[10px] font-normal text-blue-200">
                          {itens.length} {itens.length === 1 ? 'registro' : 'registros'}
                        </span>
                      </div>

                      {/* Lista de Evidências da Categoria */}
                      <div className="space-y-4">
                        {itens.map((ev) => {
                          const arquivos = ev.arquivos || []
                          return (
                            <div
                              key={ev.id}
                              className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3 break-inside-avoid"
                            >
                              {/* Metadados e Legenda da Evidência */}
                              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                                <div>
                                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                    {ev.titulo}
                                  </h3>
                                  {ev.descricao && (
                                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                      {ev.descricao}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right text-[10px] shrink-0 space-y-0.5">
                                  <span className="inline-block px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                                    {ev.status === 'conforme'
                                      ? 'Conforme'
                                      : ev.status === 'pendente_revisao'
                                        ? 'Pendente'
                                        : 'Arquivado'}
                                  </span>
                                  <p className="text-slate-500">
                                    Data: {formatSpDateOnly(ev.data_evidencia)}
                                  </p>
                                </div>
                              </div>

                              {/* Linha de Dados de Apoio */}
                              <div className="flex items-center justify-between text-[10px] text-slate-500 gap-2 flex-wrap">
                                <div>
                                  <span className="font-semibold text-slate-700">
                                    Responsável pelo registro:
                                  </span>{' '}
                                  {ev.responsavel_registro}
                                </div>

                                {ev.expand?.ativo_vinculado?.name && (
                                  <div>
                                    <span className="font-semibold text-slate-700">
                                      Ativo vinculado:
                                    </span>{' '}
                                    <span className="text-blue-700 font-bold">
                                      {ev.expand.ativo_vinculado.name}
                                    </span>
                                  </div>
                                )}

                                {ev.tags && ev.tags.length > 0 && (
                                  <div>
                                    <span className="font-semibold text-slate-700">Tags:</span>{' '}
                                    {ev.tags.map((t) => `#${t}`).join(', ')}
                                  </div>
                                )}
                              </div>

                              {/* Grade de Fotos da Evidência com Legenda */}
                              {arquivos.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                                  {arquivos.map((fn, idx) => {
                                    const isPdf = fn.toLowerCase().endsWith('.pdf')
                                    const fileUrl = getEvidenciaFileUrl(ev, fn)
                                    const thumbUrl = getEvidenciaFileUrl(ev, fn, '500x350')

                                    return (
                                      <div
                                        key={fn + idx}
                                        className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex flex-col justify-between"
                                      >
                                        <div className="h-36 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                          {isPdf ? (
                                            <div className="flex flex-col items-center justify-center text-slate-200 p-3 text-center">
                                              <FileText className="w-8 h-8 text-red-400 mb-1" />
                                              <span className="text-[10px] font-mono truncate max-w-[140px]">
                                                {fn}
                                              </span>
                                              <span className="text-[9px] text-slate-400">
                                                Documento PDF
                                              </span>
                                            </div>
                                          ) : (
                                            <img
                                              src={thumbUrl}
                                              alt={`${ev.titulo} - Foto ${idx + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                          )}
                                        </div>

                                        <div className="p-1.5 bg-white border-t border-slate-100 text-[9px] text-slate-600 flex items-center justify-between">
                                          <span className="truncate max-w-[120px] font-mono">
                                            {fn}
                                          </span>
                                          <span className="text-slate-400">
                                            Foto {idx + 1}/{arquivos.length}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-400 italic">
                                  Registro puramente descritivo (sem fotografias anexadas).
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* RODAPÉ DO DOCUMENTO FORMAL COM ASSINATURAS */}
              <footer className="pt-8 border-t-2 border-slate-200 space-y-8 break-inside-avoid print:break-inside-avoid">
                <div className="text-[10px] text-slate-500 leading-relaxed space-y-1">
                  <p>
                    <strong>Declaração de Conformidade Técnica:</strong> As informações e evidências
                    fotográficas constantes deste documento representam a infraestrutura física e
                    lógica real da serventia, auditadas e armazenadas com isolamento multi-cliente e
                    registro de auditoria permanente no sistema CSCTI - Compliance.
                  </p>
                  <p className="text-slate-400">
                    Documento gerado eletronicamente em {formatSpDateTime(emissao.toISOString())}{' '}
                    pelo sistema CSCTI - Compliance Platform v{CSCTI_BRAND.version}.
                  </p>
                </div>

                {/* Campos de Assinatura */}
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center">
                    <div className="border-t border-slate-400 pt-2 text-xs font-semibold text-slate-800">
                      Responsável Técnico / TI
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{corporateName}</div>
                  </div>

                  <div className="text-center">
                    <div className="border-t border-slate-400 pt-2 text-xs font-semibold text-slate-800">
                      Responsável Legal da Serventia
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Tabelião / Oficial Titular / Designado
                    </div>
                  </div>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EvidenciasReportPage
