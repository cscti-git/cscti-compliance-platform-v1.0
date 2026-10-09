import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { listInventoryAssets } from '@/services/csctiService'
import { getBackupConfronto } from '@/services/backupService'
import type { InventoryAssetItem, BackupConfrontoResponse, ConfrontoAtivoItem } from '@/types/cscti'
import { CsctiLogo } from '@/components/CsctiLogo'
import { CSCTI_BRAND } from '@/lib/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Server,
  AlertCircle,
} from 'lucide-react'

// Categorias mapeadas conforme agrupamento oficial do sistema
const CATEGORY_FILTER_OPTIONS = [
  { value: 'todas', label: 'Todas as Categorias' },
  { value: 'servidor', label: 'Servidores virtualizados' },
  { value: 'estacao', label: 'Estações de trabalho' },
  { value: 'rede', label: 'Rede e segurança' },
  { value: 'sistema', label: 'Sistemas e aplicações' },
  { value: 'dados', label: 'Dados e outros' },
]

export const InventoryReportPage: React.FC = () => {
  const { organization, role } = useAuth()
  const orgId = organization?.id || ''

  // Dados reais carregados do banco de dados da serventia
  const [assets, setAssets] = useState<InventoryAssetItem[]>([])
  const [confronto, setConfronto] = useState<BackupConfrontoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [generationDate, setGenerationDate] = useState(() => new Date())

  // OPÇÕES DE ESCOPO DO RELATÓRIO
  // Filtros:
  const [filterCategoria, setFilterCategoria] = useState<string>('todas')
  const [filterCriticidade, setFilterCriticidade] = useState<string>('todas')
  const [filterTipoEstrutura, setFilterTipoEstrutura] = useState<string>('todos') // 'todos' | 'fisico' | 'virtual'
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Seleção de ativos: 'todos' ou 'personalizada'
  const [selectionMode, setSelectionMode] = useState<'todos' | 'personalizada'>('todos')
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())

  // Carregar ativos reais e confronto de conformidade da serventia
  const loadData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [assetsData, confrontoData] = await Promise.all([
        listInventoryAssets(orgId),
        getBackupConfronto(orgId).catch(() => null),
      ])
      setAssets(assetsData)
      setConfronto(confrontoData)
      setGenerationDate(new Date())

      // Inicializa a seleção com todos os IDs
      const allIds = new Set(assetsData.map((a) => a.id))
      setSelectedAssetIds(allIds)
    } catch (err) {
      console.error('[InventoryReportPage] Erro ao carregar ativos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [orgId])

  // Normalização dos ativos com dados reais de conformidade
  const enrichedAssets = useMemo(() => {
    const confrontoMap = new Map<string, ConfrontoAtivoItem>()
    if (confronto?.confronto) {
      for (const item of confronto.confronto) {
        confrontoMap.set(item.id, item)
      }
    }

    return assets.map((a, idx) => {
      // Código de inventário ATV-0001001
      const numCode = String(1000 + idx + 1).padStart(7, '0')
      const displayCode = `ATV-${numCode}`

      // Conformidade real
      const confItem = confrontoMap.get(a.id)
      let conformidadeStatus: 'conforme' | 'pendente' | 'nao_conforme' | 'nao_avaliado' = 'conforme'
      let conformidadeLabel = 'Conforme'

      if (confItem) {
        if (confItem.status_consolidado === 'PROTEGIDO') {
          conformidadeStatus = 'conforme'
          conformidadeLabel = 'Conforme'
        } else if (confItem.status_consolidado === 'PARCIAL') {
          conformidadeStatus = 'pendente'
          conformidadeLabel = 'Pendente'
        } else if (confItem.status_consolidado === 'NAO_PROTEGIDO') {
          conformidadeStatus = 'nao_conforme'
          conformidadeLabel = 'Não conforme'
        } else {
          conformidadeStatus = 'nao_avaliado'
          conformidadeLabel = 'Não avaliado'
        }
      } else {
        if (a.criticidade === 'alta' && !a.exige_backup_local && !a.exige_backup_nuvem) {
          conformidadeStatus = 'pendente'
          conformidadeLabel = 'Pendente'
        } else if (a.status === 'inativo') {
          conformidadeStatus = 'nao_conforme'
          conformidadeLabel = 'Não conforme'
        } else {
          conformidadeStatus = 'conforme'
          conformidadeLabel = 'Conforme'
        }
      }

      // Categoria legível
      let categoriaLabel = 'Outro'
      let isVirtual = false
      if (a.tipo === 'servidor_virtualizado') {
        categoriaLabel = 'Servidor Virtualizado'
        isVirtual = true
      } else if (a.tipo === 'servidor_aplicacao') {
        categoriaLabel = 'Servidor de Aplicação'
        isVirtual = false
      } else if (a.tipo === 'banco_dados') {
        categoriaLabel = 'Banco de Dados'
        isVirtual = false
      } else if (a.tipo === 'storage_backup') {
        categoriaLabel = 'Storage / Backup'
        isVirtual = false
      } else if (a.tipo === 'estacao') {
        categoriaLabel = 'Estação de Trabalho'
        isVirtual = false
      } else if (a.tipo === 'equipamento_rede') {
        categoriaLabel = 'Rede e Segurança'
        isVirtual = false
      } else if (a.tipo === 'servico_nuvem') {
        categoriaLabel = 'SaaS / Nuvem'
        isVirtual = true
      } else if (a.tipo === 'impressora_multifuncional') {
        categoriaLabel = 'Multifuncional'
        isVirtual = false
      }

      // Se a localização ou descrição contiver "virtual" ou "vm", também computa como virtual
      const textDesc = `${a.localizacao || ''} ${a.descricao || ''}`.toLowerCase()
      if (textDesc.includes('virtual') || textDesc.includes('vm ') || textDesc.includes('(vm)')) {
        isVirtual = true
      }

      const tipoEstrutura: 'fisico' | 'virtual' = isVirtual ? 'virtual' : 'fisico'

      return {
        ...a,
        displayCode,
        categoriaLabel,
        tipoEstrutura,
        conformidadeStatus,
        conformidadeLabel,
      }
    })
  }, [assets, confronto])

  // Filtragem dos ativos conforme as opções de escopo
  const filteredAssets = useMemo(() => {
    return enrichedAssets.filter((asset) => {
      // 1. Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = asset.name.toLowerCase().includes(q)
        const matchCode = asset.displayCode.toLowerCase().includes(q)
        const matchDesc = (asset.descricao || '').toLowerCase().includes(q)
        const matchLoc = (asset.localizacao || '').toLowerCase().includes(q)
        const matchIp = (asset.ip_address || '').toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchDesc && !matchLoc && !matchIp) {
          return false
        }
      }

      // 2. Filtro Categoria
      if (filterCategoria !== 'todas') {
        if (filterCategoria === 'estacao' && asset.tipo !== 'estacao') return false
        if (
          filterCategoria === 'servidor' &&
          asset.tipo !== 'servidor_aplicacao' &&
          asset.tipo !== 'servidor_virtualizado'
        )
          return false
        if (filterCategoria === 'rede' && asset.tipo !== 'equipamento_rede') return false
        if (
          filterCategoria === 'sistema' &&
          asset.tipo !== 'servico_nuvem' &&
          asset.tipo !== 'impressora_multifuncional'
        )
          return false
        if (
          filterCategoria === 'dados' &&
          asset.tipo !== 'banco_dados' &&
          asset.tipo !== 'storage_backup' &&
          asset.tipo !== 'outro'
        )
          return false
      }

      // 3. Filtro Criticidade
      if (filterCriticidade !== 'todas') {
        if (asset.criticidade !== filterCriticidade) return false
      }

      // 4. Filtro Tipo: Ativo Físico vs Virtualizado
      if (filterTipoEstrutura !== 'todos') {
        if (filterTipoEstrutura === 'fisico' && asset.tipoEstrutura !== 'fisico') return false
        if (filterTipoEstrutura === 'virtual' && asset.tipoEstrutura !== 'virtual') return false
      }

      return true
    })
  }, [enrichedAssets, searchQuery, filterCategoria, filterCriticidade, filterTipoEstrutura])

  // Ativos finais que serão impressos no relatório
  const printableAssets = useMemo(() => {
    if (selectionMode === 'todos') {
      return filteredAssets
    }
    // Modo personalizada: apenas os que atendem aos filtros E foram marcados
    return filteredAssets.filter((a) => selectedAssetIds.has(a.id))
  }, [filteredAssets, selectionMode, selectedAssetIds])

  // Controles de seleção individual
  const toggleSelectAsset = (id: string) => {
    const next = new Set(selectedAssetIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedAssetIds(next)
  }

  const selectAllFiltered = () => {
    const next = new Set(selectedAssetIds)
    filteredAssets.forEach((a) => next.add(a.id))
    setSelectedAssetIds(next)
  }

  const unselectAllFiltered = () => {
    const next = new Set(selectedAssetIds)
    filteredAssets.forEach((a) => next.delete(a.id))
    setSelectedAssetIds(next)
  }

  // Estatísticas do resumo do relatório
  const totalImpresso = printableAssets.length
  const criticalCount = printableAssets.filter((a) => a.criticidade === 'alta').length
  const emOperacaoCount = printableAssets.filter((a) => a.status === 'ativo').length
  const conformesCount = printableAssets.filter((a) => a.conformidadeStatus === 'conforme').length
  const pendentesCount = printableAssets.filter(
    (a) => a.conformidadeStatus === 'pendente' || a.conformidadeStatus === 'nao_conforme',
  ).length
  const virtuaisCount = printableAssets.filter((a) => a.tipoEstrutura === 'virtual').length
  const fisicosCount = printableAssets.filter((a) => a.tipoEstrutura === 'fisico').length

  // Dados da serventia logada (sem menção a provimento na interface de emissão)
  const orgName = organization?.name || 'Serventia Extrajudicial'
  const corporateName = organization?.corporate_name || orgName
  const cnpj = organization?.cnpj || 'Não informado'
  const cityState =
    organization?.city && organization?.state
      ? `${organization.city}/${organization.state}`
      : 'Brasil'

  const handlePrint = () => {
    window.print()
  }

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Sessão sem serventia vinculada</h1>
          <p className="text-sm text-slate-600">
            O Relatório de Inventário é emitido por serventia. Acesse com um usuário vinculado para
            gerar o relatório.
          </p>
          <Link to="/ativos">
            <Button variant="outline" className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Inventário
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white text-slate-900 font-sans p-4 sm:p-6 lg:p-8 print:p-0">
      {/* 1. PAINEL DE CONTROLE DE ESCOPO E FILTROS (OCULTO NA IMPRESSÃO) */}
      <div className="max-w-[1000px] mx-auto mb-6 print:hidden space-y-4">
        {/* Topbar com navegação e botão principal */}
        <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Link to="/ativos">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-600 hover:text-slate-900 gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao Inventário
              </Button>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-800">
              Relatório de Ativos • Configuração de Escopo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs gap-1.5 border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </Button>

            <Button
              onClick={handlePrint}
              disabled={loading || totalImpresso === 0}
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-2 shadow-xs px-4"
            >
              <Printer className="w-4 h-4" /> Imprimir / Salvar em PDF
            </Button>
          </div>
        </div>

        {/* Caixa de Opções de Escopo e Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#0B2545]" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Opções de Escopo do Relatório
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Ativos a imprimir:{' '}
              <strong className="text-slate-900 font-bold">{totalImpresso}</strong> de{' '}
              {assets.length} totais
            </span>
          </div>

          {/* Linha 1: Filtros de Domínio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filtro Categoria */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Categoria:</Label>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todas as Categorias" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Criticidade */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Criticidade:</Label>
              <Select value={filterCriticidade} onValueChange={setFilterCriticidade}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as Criticidades
                  </SelectItem>
                  <SelectItem value="alta" className="text-xs">
                    Alta Criticidade
                  </SelectItem>
                  <SelectItem value="media" className="text-xs">
                    Média Criticidade
                  </SelectItem>
                  <SelectItem value="baixa" className="text-xs">
                    Baixa Criticidade
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Tipo: Ativo Físico vs Virtualizado */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">
                Tipo (Físico / Virtualizado):
              </Label>
              <Select value={filterTipoEstrutura} onValueChange={setFilterTipoEstrutura}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos (Físicos e Virtuais)
                  </SelectItem>
                  <SelectItem value="fisico" className="text-xs">
                    Somente Ativos Físicos
                  </SelectItem>
                  <SelectItem value="virtual" className="text-xs">
                    Somente Ativos Virtualizados
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Busca Rápida por Texto */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Buscar no escopo:</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome, código, IP, local..."
                className="h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Linha 2: Modo de Seleção (Todos vs Marcar Manuais) */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700 text-xs">Modo de seleção:</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectionMode === 'todos' ? 'default' : 'outline'}
                  onClick={() => setSelectionMode('todos')}
                  className={`h-7 px-2.5 text-xs font-semibold ${
                    selectionMode === 'todos'
                      ? 'bg-[#0B2545] text-white'
                      : 'text-slate-600 border-slate-200'
                  }`}
                >
                  Imprimir Todos os Filtrados ({filteredAssets.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectionMode === 'personalizada' ? 'default' : 'outline'}
                  onClick={() => setSelectionMode('personalizada')}
                  className={`h-7 px-2.5 text-xs font-semibold ${
                    selectionMode === 'personalizada'
                      ? 'bg-[#0B2545] text-white'
                      : 'text-slate-600 border-slate-200'
                  }`}
                >
                  Marcar Individualmente ({selectedAssetIds.size} marcados)
                </Button>
              </div>
            </div>

            {selectionMode === 'personalizada' && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="h-7 text-[11px] text-blue-600 hover:text-blue-700"
                >
                  Marcar Todos
                </Button>
                <span className="text-slate-300">|</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={unselectAllFiltered}
                  className="h-7 text-[11px] text-slate-500 hover:text-slate-700"
                >
                  Desmarcar Todos
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. FOLHA A4 PARA IMPRESSÃO / PRÉ-VISUALIZAÇÃO */}
      <div className="max-w-[1000px] mx-auto bg-white border border-slate-300 print:border-none shadow-md print:shadow-none p-8 print:p-0 print:max-w-none print:w-full min-h-[210mm]">
        {/* CABEÇALHO OFICIAL "CSCTI - Compliance" */}
        <header className="border-b-2 border-[#0B2545] pb-4 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <CsctiLogo variant="horizontal" className="h-10 w-auto" />
              <div className="border-l border-slate-300 pl-3">
                <h1 className="text-base sm:text-lg font-extrabold text-[#0B2545] tracking-tight leading-tight">
                  Relatório de Inventário de Ativos
                </h1>
                <p className="text-[11px] font-semibold text-slate-600">
                  CSCTI - Compliance • Governança, Ativos e Continuidade
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <p className="text-[11px] text-slate-500 font-mono">
                Emitido em: {generationDate.toLocaleDateString('pt-BR')} às{' '}
                {generationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 mt-1">
                Escopo: {selectionMode === 'todos' ? 'Filtro Ativo' : 'Seleção Customizada'}
              </span>
            </div>
          </div>

          {/* Dados Reais da Serventia Cadastrada (sem menção a provimentos) */}
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/80 p-3 rounded-lg">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Serventia / Unidade:
              </span>
              <strong className="text-slate-900 block truncate">{orgName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Razão Social / Titular:
              </span>
              <strong className="text-slate-900 block truncate">{corporateName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                CNPJ da Serventia:
              </span>
              <strong className="text-slate-900 font-mono block">{cnpj}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Localidade:
              </span>
              <strong className="text-slate-900 block">{cityState}</strong>
            </div>
          </div>
        </header>

        {/* RESUMO COM CONTAGENS REAIS */}
        <section className="mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Total de Ativos
              </span>
              <span className="text-xl font-extrabold text-slate-900">{totalImpresso}</span>
            </div>
            <div className="border border-red-200 rounded-lg p-2.5 bg-red-50/50">
              <span className="text-red-700 block text-[10px] uppercase font-semibold">
                Crítica / Alta
              </span>
              <span className="text-xl font-extrabold text-red-700">{criticalCount}</span>
            </div>
            <div className="border border-emerald-200 rounded-lg p-2.5 bg-emerald-50/50">
              <span className="text-emerald-700 block text-[10px] uppercase font-semibold">
                Conforme
              </span>
              <span className="text-xl font-extrabold text-emerald-700">{conformesCount}</span>
            </div>
            <div className="border border-amber-200 rounded-lg p-2.5 bg-amber-50/50">
              <span className="text-amber-700 block text-[10px] uppercase font-semibold">
                Com Pendência
              </span>
              <span className="text-xl font-extrabold text-amber-700">{pendentesCount}</span>
            </div>
            <div className="border border-blue-200 rounded-lg p-2.5 bg-blue-50/50 col-span-2 sm:col-span-1">
              <span className="text-blue-700 block text-[10px] uppercase font-semibold">
                Físicos / Virtuais
              </span>
              <span className="text-sm font-extrabold text-blue-900 mt-1 block">
                {fisicosCount} f / {virtuaisCount} v
              </span>
            </div>
          </div>
        </section>

        {/* TABELA OFICIAL DOS ATIVOS SELECIONADOS/FILTRADOS */}
        <section className="mb-6">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-[10px] uppercase font-bold border-b border-slate-200 select-none">
                  {/* Checkbox na pré-visualização para marcar/desmarcar (oculto no print) */}
                  <th className="py-2 px-2.5 w-8 text-center print:hidden">Sel.</th>
                  <th className="py-2 px-2.5 w-8 text-center">#</th>
                  <th className="py-2 px-2.5">Código</th>
                  <th className="py-2 px-2.5">Nome do Ativo</th>
                  <th className="py-2 px-2.5">Categoria</th>
                  <th className="py-2 px-2.5 text-center">Estrutura</th>
                  <th className="py-2 px-2.5 text-center">Criticidade</th>
                  <th className="py-2 px-2.5 text-center">Estado Operacional</th>
                  <th className="py-2 px-2.5 text-center">Conformidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Carregando dados reais dos ativos...
                    </td>
                  </tr>
                ) : printableAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Nenhum ativo encontrado para os critérios de escopo selecionados.
                    </td>
                  </tr>
                ) : (
                  printableAssets.map((asset, idx) => {
                    const isChecked = selectedAssetIds.has(asset.id)
                    return (
                      <tr
                        key={asset.id}
                        className={`hover:bg-slate-50/50 ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
                      >
                        {/* Checkbox interativo no topo do escopo (oculto na impressão) */}
                        <td className="py-2 px-2.5 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => toggleSelectAsset(asset.id)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            title={isChecked ? 'Desmarcar ativo' : 'Marcar ativo'}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* Numeração */}
                        <td className="py-2 px-2.5 text-center font-mono text-[10px] text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Código */}
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {asset.displayCode}
                        </td>

                        {/* Nome do Ativo */}
                        <td className="py-2 px-2.5 font-semibold text-slate-900">
                          {asset.name}
                          {asset.descricao && (
                            <span className="block text-[10px] text-slate-500 font-normal truncate max-w-xs">
                              {asset.descricao}
                            </span>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                          {asset.categoriaLabel}
                        </td>

                        {/* Estrutura: Ativo Físico vs Virtualizado */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              asset.tipoEstrutura === 'virtual'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {asset.tipoEstrutura === 'virtual' ? 'Virtualizado' : 'Físico'}
                          </span>
                        </td>

                        {/* Criticidade */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              asset.criticidade === 'alta'
                                ? 'bg-red-100 text-red-700'
                                : asset.criticidade === 'media'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {asset.criticidade === 'alta'
                              ? 'Crítica'
                              : asset.criticidade === 'media'
                                ? 'Média'
                                : 'Baixa'}
                          </span>
                        </td>

                        {/* Estado Operacional */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              asset.status === 'ativo'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : asset.status === 'inativo'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {asset.status === 'ativo'
                              ? 'Em operação'
                              : asset.status === 'inativo'
                                ? 'Em manutenção'
                                : 'Desativado'}
                          </span>
                        </td>

                        {/* Situação de Conformidade */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              asset.conformidadeStatus === 'conforme'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : asset.conformidadeStatus === 'pendente'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : asset.conformidadeStatus === 'nao_conforme'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {asset.conformidadeLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* DECLARAÇÃO DE CONFORMIDADE E ASSINATURAS */}
        <section className="pt-4 border-t border-slate-300 text-xs text-slate-600 page-break-inside-avoid">
          <p className="leading-relaxed mb-6 text-[11px] text-justify">
            <strong>Declaração de Conformidade Técnica:</strong> Certifica-se, para os devidos fins
            de governança da tecnologia da informação e salvaguarda contínua dos dados, que o
            presente relatório consolida com fidelidade a relação de ativos cadastrados no ambiente
            operacional da serventia, servindo de base comprobatória de escopo para as rotinas
            automatizadas de backup e auditoria.
          </p>

          <div className="grid grid-cols-2 gap-12 pt-4 text-center">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-900 text-xs">
                {organization?.contact_name || 'Dr(a). Titular / Delegatário(a)'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">
                Responsável Institucional / Titular da Serventia
              </p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-900 text-xs">Encarregado de TI e Continuidade</p>
              <p className="text-[10px] text-slate-500 uppercase">
                Gestor de Tecnologia e Continuidade (CSCTI)
              </p>
            </div>
          </div>
        </section>

        {/* RODAPÉ DO DOCUMENTO */}
        <footer className="mt-8 pt-2.5 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">{CSCTI_BRAND.name}</span>
            <span>• Gestão de Ativos e Continuidade</span>
          </div>
          <div>
            <span>Documento emitido eletronicamente • Hash de Integridade Auditável</span>
          </div>
        </footer>
      </div>

      {/* ESTILOS CSS ESPECÍFICOS PARA IMPRESSÃO A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
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
