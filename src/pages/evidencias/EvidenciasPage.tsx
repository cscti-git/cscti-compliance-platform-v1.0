import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderGit2,
  Plus,
  Printer,
  Search,
  Filter,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Edit,
  Eye,
  Server,
  RefreshCw,
  Tag,
  Building2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleHeader } from '@/components/common/ModuleHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { PanelHeader } from '@/components/common/PanelHeader'
import {
  listEvidencias,
  listEvidenciaCategorias,
  deleteEvidencia,
  getEvidenciaFileUrl,
} from '@/services/evidenciaService'
import { listInventoryAssets } from '@/services/csctiService'
import { EvidenciaDetailsModal } from '@/components/evidencias/EvidenciaDetailsModal'
import { EvidenciaFormModal } from '@/components/evidencias/EvidenciaFormModal'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import { toast } from '@/hooks/use-toast'
import type { EvidenciaItem, EvidenciaCategoriaItem, InventoryAssetItem } from '@/types/cscti'

export const EvidenciasPage: React.FC = () => {
  const { organization, user, role, isAdmin } = useAuth()
  const orgId = organization?.id || ''
  const orgName = organization?.name || 'Serventia Conectada'
  const isReadOnly = role === 'usuario'
  const canEdit = !isReadOnly

  // Dados
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([])
  const [categorias, setCategorias] = useState<EvidenciaCategoriaItem[]>([])
  const [ativos, setAtivos] = useState<InventoryAssetItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Filtros e Busca
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modais
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false)
  const [selectedEvidencia, setSelectedEvidencia] = useState<EvidenciaItem | null>(null)

  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingEvidencia, setEditingEvidencia] = useState<EvidenciaItem | null>(null)

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [evidsData, catsData, ativosData] = await Promise.all([
        listEvidencias(orgId),
        listEvidenciaCategorias(orgId, true),
        listInventoryAssets(orgId),
      ])

      setEvidencias(evidsData)
      setCategorias(catsData)
      setAtivos(ativosData)
      setLastUpdated(formatSpDateTime(new Date().toISOString()))
    } catch (err) {
      console.error('[EvidenciasPage] Erro ao carregar evidências:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as evidências da serventia.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // KPIs
  const kpis = useMemo(() => {
    const total = evidencias.length

    // Categorias preenchidas
    const categoriasComEvidencia = new Set(
      evidencias.map((e) => e.categoria_nome || e.categoria).filter(Boolean),
    )
    const totalCategorias = categorias.length || 10
    const catPreenchidas = categoriasComEvidencia.size

    // Evidências do mês atual
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const doMes = evidencias.filter((e) => {
      if (!e.data_evidencia) return false
      const d = new Date(e.data_evidencia)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length

    // Pendentes de revisão
    const pendentes = evidencias.filter((e) => e.status === 'pendente_revisao').length

    return {
      total,
      catPreenchidas,
      totalCategorias,
      doMes,
      pendentes,
    }
  }, [evidencias, categorias])

  // Filtragem
  const filteredEvidencias = useMemo(() => {
    return evidencias.filter((ev) => {
      // Filtro categoria
      if (selectedCategoria !== 'todas') {
        const catMatch =
          ev.categoria === selectedCategoria || ev.categoria_nome === selectedCategoria
        if (!catMatch) return false
      }

      // Filtro status
      if (selectedStatus !== 'todos') {
        if (ev.status !== selectedStatus) return false
      }

      // Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitulo = ev.titulo.toLowerCase().includes(q)
        const matchDesc = (ev.descricao || '').toLowerCase().includes(q)
        const matchResp = (ev.responsavel_registro || '').toLowerCase().includes(q)
        const matchCat = (ev.categoria_nome || '').toLowerCase().includes(q)
        const matchTags = (ev.tags || []).some((t) => t.toLowerCase().includes(q))
        const matchAtivo = (ev.expand?.ativo_vinculado?.name || '').toLowerCase().includes(q)

        if (!matchTitulo && !matchDesc && !matchResp && !matchCat && !matchTags && !matchAtivo) {
          return false
        }
      }

      return true
    })
  }, [evidencias, selectedCategoria, selectedStatus, searchQuery])

  // Ações de CRUD
  const handleOpenNew = () => {
    setEditingEvidencia(null)
    setFormModalOpen(true)
  }

  const handleOpenEdit = (ev: EvidenciaItem) => {
    setEditingEvidencia(ev)
    setFormModalOpen(true)
  }

  const handleOpenDetails = (ev: EvidenciaItem) => {
    setSelectedEvidencia(ev)
    setDetailModalOpen(true)
  }

  const handleDelete = async (ev: EvidenciaItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return

    const confirm = window.confirm(
      `Deseja realmente excluir a evidência "${ev.titulo}"? Esta ação registrará log de auditoria permanente.`,
    )
    if (!confirm) return

    try {
      await deleteEvidencia(ev.id, orgId, ev.titulo)
      toast({
        title: 'Evidência excluída',
        description: `"${ev.titulo}" foi removida com sucesso.`,
      })
      loadData()
      if (selectedEvidencia?.id === ev.id) {
        setDetailModalOpen(false)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao remover evidência.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. ModuleHeader oficial CSCTI */}
      <ModuleHeader
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Evidências', href: '/evidencias' },
          { label: 'Central de Evidências' },
        ]}
        icon={FolderGit2}
        title="Central de Evidências"
        badgeText="Comprovações Técnicas"
        subtitle="Repositório documental e fotográfico de ativos, nobreaks, gerador, racks, switches e infraestrutura da serventia."
        serventiaNome={orgName}
        serventiaAtiva={organization?.status === 'ativa'}
        lastUpdated={lastUpdated}
        loading={loading}
        onReload={loadData}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/relatorios/evidencias">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>Relatório A4</span>
              </Button>
            </Link>

            {canEdit && (
              <Button
                onClick={handleOpenNew}
                size="sm"
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Evidência</span>
              </Button>
            )}
          </div>
        }
      />

      {/* 2. KPIs Padronizados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Evidências"
          value={kpis.total}
          unit="itens"
          icon={FolderGit2}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-700"
          supportText="Evidências ativas e auditadas"
        />

        <KpiCard
          label="Categorias Preenchidas"
          value={`${kpis.catPreenchidas} de ${kpis.totalCategorias}`}
          icon={Layers}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-700"
          supportText={
            kpis.catPreenchidas === kpis.totalCategorias
              ? 'Todas as categorias com registro'
              : `${kpis.totalCategorias - kpis.catPreenchidas} categorias pendentes`
          }
        />

        <KpiCard
          label="Evidências do Mês"
          value={kpis.doMes}
          unit="neste mês"
          icon={Calendar}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-700"
          supportText="Registros com data no mês corrente"
        />

        <KpiCard
          label="Pendentes de Revisão"
          value={kpis.pendentes}
          unit={kpis.pendentes === 1 ? 'pendência' : 'pendências'}
          icon={AlertTriangle}
          iconBgColor={kpis.pendentes > 0 ? 'bg-amber-100' : 'bg-slate-100'}
          iconColor={kpis.pendentes > 0 ? 'text-amber-700' : 'text-slate-500'}
          supportText={
            kpis.pendentes > 0 ? 'Aguardando validação formal' : 'Nenhuma evidência pendente'
          }
        />
      </div>

      {/* 3. Barra de Filtros e Busca */}
      <Card className="border-slate-200/90 shadow-2xs bg-white rounded-xl">
        <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por título, ativo, tag ou responsável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50/70 border-slate-200 focus-visible:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filtros Dropdown */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap justify-end">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Categoria:
              </span>
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-48 bg-slate-50/70 border-slate-200">
                  <SelectValue placeholder="Todas as Categorias" />
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

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Status:
              </span>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-40 bg-slate-50/70 border-slate-200">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os Status
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

            {(selectedCategoria !== 'todas' || selectedStatus !== 'todos' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategoria('todas')
                  setSelectedStatus('todos')
                  setSearchQuery('')
                }}
                className="text-xs text-slate-500 hover:text-slate-800 h-9"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Galeria de Cards com Fotos / Documentos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Galeria de Evidências Comprobatórias
            </h2>
            <span className="text-xs text-slate-500">
              ({filteredEvidencias.length}{' '}
              {filteredEvidencias.length === 1 ? 'registro' : 'registros'})
            </span>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Clique em qualquer evidência para abrir o visualizador de fotos
          </div>
        </div>

        {/* Estado Carregando */}
        {loading && evidencias.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse h-64 border-slate-200 bg-white" />
            ))}
          </div>
        ) : filteredEvidencias.length === 0 ? (
          /* Estado Vazio Honesto */
          <Card className="border-slate-200 bg-white rounded-xl shadow-2xs">
            <CardContent className="p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 mx-auto flex items-center justify-center border border-blue-200/80 shadow-2xs">
                <FolderGit2 className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  {searchQuery || selectedCategoria !== 'todas' || selectedStatus !== 'todos'
                    ? 'Nenhuma evidência encontrada para estes filtros'
                    : 'Nenhuma evidência fotográfica ou documental registrada ainda'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {searchQuery || selectedCategoria !== 'todas' || selectedStatus !== 'todos'
                    ? 'Ajuste os termos da busca ou limpe os filtros para visualizar os demais registros.'
                    : 'Cadastre fotos do gerador de energia, nobreaks, ar-condicionado, sala de servidores, switches e extintores para comprovação documental.'}
                </p>
              </div>

              {canEdit && (
                <div className="pt-2">
                  <Button
                    onClick={handleOpenNew}
                    size="sm"
                    className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Primeira Evidência</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Grid de Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEvidencias.map((ev) => {
              const arquivos = ev.arquivos || []
              const firstFile = arquivos[0] || ''
              const isPdf = firstFile.toLowerCase().endsWith('.pdf')
              const thumbUrl = firstFile ? getEvidenciaFileUrl(ev, firstFile, '400x300') : ''

              return (
                <Card
                  key={ev.id}
                  onClick={() => handleOpenDetails(ev)}
                  className="group relative cursor-pointer border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all bg-white rounded-xl overflow-hidden flex flex-col justify-between"
                >
                  {/* Miniatura / Capa */}
                  <div className="relative h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
                    {firstFile ? (
                      isPdf ? (
                        <div className="flex flex-col items-center justify-center text-slate-300 gap-1.5 p-4 text-center">
                          <FileText className="w-10 h-10 text-red-400" />
                          <span className="text-[11px] font-mono truncate max-w-[180px]">
                            {firstFile}
                          </span>
                          <span className="text-[10px] text-slate-400">Documento PDF</span>
                        </div>
                      ) : (
                        <img
                          src={thumbUrl}
                          alt={ev.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                        <ImageIcon className="w-8 h-8 stroke-1 text-slate-600" />
                        <span className="text-[11px]">Sem arquivo</span>
                      </div>
                    )}

                    {/* Badge da Categoria sobre a foto */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs border border-white/10">
                        {ev.categoria_nome}
                      </span>
                    </div>

                    {/* Contador de fotos se > 1 */}
                    {arquivos.length > 0 && (
                      <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 border border-white/10">
                        <ImageIcon className="w-3 h-3" />
                        <span>{arquivos.length}</span>
                      </div>
                    )}

                    {/* Badge de Status */}
                    <div className="absolute top-2.5 right-2.5">
                      {ev.status === 'conforme' && (
                        <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                          Conforme
                        </span>
                      )}
                      {ev.status === 'pendente_revisao' && (
                        <span className="bg-amber-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                          Pendente
                        </span>
                      )}
                      {ev.status === 'arquivado' && (
                        <span className="bg-slate-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                          Arquivado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalhes do Card */}
                  <CardContent className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <h3
                        className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors"
                        title={ev.titulo}
                      >
                        {ev.titulo}
                      </h3>

                      {ev.descricao && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                          {ev.descricao}
                        </p>
                      )}
                    </div>

                    {/* Metadados: Ativo + Data + Responsável */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      {ev.expand?.ativo_vinculado?.name && (
                        <div className="flex items-center gap-1 text-blue-700 font-semibold truncate">
                          <Server className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ev.expand.ativo_vinculado.name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatSpDateOnly(ev.data_evidencia)}
                        </span>
                        <span className="truncate max-w-[120px]" title={ev.responsavel_registro}>
                          {ev.responsavel_registro}
                        </span>
                      </div>
                    </div>

                    {/* Ações no Rodapé do Card */}
                    {canEdit && (
                      <div
                        className="flex items-center justify-end gap-1 pt-1.5 border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleOpenEdit(ev)}
                          title="Editar evidência"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => handleDelete(ev, e)}
                          title="Excluir evidência"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. Modais: Visualizador Detalhado (Lightbox) e Formulário de Cadastro/Edição */}
      <EvidenciaDetailsModal
        evidencia={selectedEvidencia}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onEdit={handleOpenEdit}
        canEdit={canEdit}
      />

      <EvidenciaFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={loadData}
        orgId={orgId}
        evidencia={editingEvidencia}
        categorias={categorias}
        ativos={ativos}
        defaultResponsavel={user?.name || user?.email || ''}
      />
    </div>
  )
}

export default EvidenciasPage
