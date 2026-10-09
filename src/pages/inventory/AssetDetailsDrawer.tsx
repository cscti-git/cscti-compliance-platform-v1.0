import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  ExternalLink,
  Edit2,
  Server,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  HardDrive,
  Cpu,
  Database,
  Cloud,
  Monitor,
  Wifi,
  Printer,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
  FileCheck,
  RefreshCw,
} from 'lucide-react'
import type {
  InventoryAssetItem,
  AssetType,
  ConfrontoAtivoItem,
  BackupEscopoItem,
  BackupPlanoItem,
  BackupFonteItem,
} from '@/types/cscti'
import { listBackupEscopos, listBackupPlanos, listBackupFontes } from '@/services/backupService'

export interface AssetDisplayItem extends InventoryAssetItem {
  displayCode: string
  conformidadeStatus: 'conforme' | 'pendente' | 'nao_conforme' | 'nao_avaliado'
  ultimaValidacao: string
  proximaRevisao: string
  subtipoFormatado: string
  classificacaoInformacao: string
}

interface AssetDetailsDrawerProps {
  asset: AssetDisplayItem | null
  confrontoAtivo?: ConfrontoAtivoItem | null
  orgId?: string
  onClose: () => void
  onEdit: (asset: InventoryAssetItem) => void
  onViewFullSheet?: (asset: AssetDisplayItem) => void
}

export const getAssetTypeIcon = (tipo: AssetType, className = 'w-5 h-5') => {
  switch (tipo) {
    case 'servidor_aplicacao':
      return <Server className={className} />
    case 'servidor_virtualizado':
      return <Cpu className={className} />
    case 'banco_dados':
      return <Database className={className} />
    case 'storage_backup':
      return <HardDrive className={className} />
    case 'servico_nuvem':
      return <Cloud className={className} />
    case 'estacao':
      return <Monitor className={className} />
    case 'equipamento_rede':
      return <Wifi className={className} />
    case 'impressora_multifuncional':
      return <Printer className={className} />
    default:
      return <Boxes className={className} />
  }
}

export const AssetDetailsDrawer: React.FC<AssetDetailsDrawerProps> = ({
  asset,
  confrontoAtivo,
  orgId,
  onClose,
  onEdit,
  onViewFullSheet,
}) => {
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'protecao' | 'relacionamentos'>(
    'visao_geral',
  )

  // Estado para relacionamentos reais
  const [escopos, setEscopos] = useState<BackupEscopoItem[]>([])
  const [planos, setPlanos] = useState<BackupPlanoItem[]>([])
  const [fontes, setFontes] = useState<BackupFonteItem[]>([])
  const [loadingRelations, setLoadingRelations] = useState(false)

  // Carregar dados reais de relacionamento quando o ativo mudar
  useEffect(() => {
    if (!asset || !orgId) return
    let isCancelled = false
    setLoadingRelations(true)

    Promise.all([
      listBackupEscopos(orgId).catch(() => []),
      listBackupPlanos(orgId).catch(() => []),
      listBackupFontes(orgId).catch(() => []),
    ])
      .then(([escoposData, planosData, fontesData]) => {
        if (!isCancelled) {
          // Filtrar apenas o que referencia este ativo
          const matchedEscopos = escoposData.filter(
            (e) => Array.isArray(e.ativos) && e.ativos.includes(asset.id),
          )
          const matchedFontes = fontesData.filter(
            (f) => f.ativo_inventario === asset.id || f.caminho_identificacao === asset.name,
          )
          const matchedEscopoIds = new Set(matchedEscopos.map((e) => e.id))
          const matchedPlanos = planosData.filter((p) => p.escopo && matchedEscopoIds.has(p.escopo))

          setEscopos(matchedEscopos)
          setPlanos(matchedPlanos)
          setFontes(matchedFontes)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingRelations(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [asset?.id, orgId])

  if (!asset) return null

  const getCriticidadeBadge = (crit: string) => {
    switch (crit) {
      case 'alta':
      case 'critica':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100/90 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Crítica
          </span>
        )
      case 'media':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/90 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Média
          </span>
        )
      case 'baixa':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/90 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Baixa
          </span>
        )
    }
  }

  const getEstadoBadge = (st: string) => {
    switch (st) {
      case 'ativo':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/90">
            Em operação
          </span>
        )
      case 'inativo':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/90">
            Em manutenção
          </span>
        )
      case 'desativado':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
            Desativado
          </span>
        )
    }
  }

  const getConformidadeBadge = (conf: string) => {
    switch (conf) {
      case 'conforme':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Conforme
          </span>
        )
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pendente
          </span>
        )
      case 'nao_conforme':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> Não conforme
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Não avaliado
          </span>
        )
    }
  }

  const formatComprovacaoData = (isoDate: string | null | undefined) => {
    if (!isoDate) return 'Sem comprovação recente'
    try {
      const d = new Date(isoDate)
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    } catch {
      return isoDate
    }
  }

  return (
    <Card className="bg-white border-slate-200/90 shadow-2xs flex flex-col h-full rounded-xl overflow-hidden">
      {/* Header do Card com Botão X */}
      <CardHeader className="p-3.5 sm:p-4 pb-2.5 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <span className="text-xs sm:text-sm font-bold text-slate-900">Detalhes do Ativo</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
          title="Fechar painel de detalhes"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-3">
          {/* Identificação Superior: Ícone, Nome, Código e Badges */}
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 shrink-0 mt-0.5">
              {getAssetTypeIcon(asset.tipo, 'w-5 h-5 text-slate-700')}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                {asset.name}
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{asset.displayCode}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {getCriticidadeBadge(asset.criticidade)}
                {getEstadoBadge(asset.status)}
              </div>
            </div>
          </div>

          {/* Abas Internas: Visão Geral / Proteção / Relacionamentos */}
          <div className="border-b border-slate-200 flex items-center gap-3 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('visao_geral')}
              className={`pb-1.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'visao_geral'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('protecao')}
              className={`pb-1.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'protecao'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Proteção
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('relacionamentos')}
              className={`pb-1.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'relacionamentos'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Relacionamentos
            </button>
          </div>

          {/* Conteúdo da Aba */}
          {activeTab === 'visao_geral' ? (
            <div className="space-y-2 text-[11px] leading-relaxed">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block tracking-wider">
                  Categoria
                </span>
                <span className="text-slate-800 font-medium block truncate">
                  {asset.subtipoFormatado}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 block tracking-wider">
                  Descrição
                </span>
                <span className="text-slate-700 leading-snug block line-clamp-2">
                  {asset.descricao?.trim() ? asset.descricao : 'Não informada'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 block tracking-wider">
                  Responsável
                </span>
                <span className="text-slate-800 font-medium block truncate">
                  {asset.expand?.responsavel?.name || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 block tracking-wider">
                  Localização
                </span>
                <span className="text-slate-800 font-medium block truncate">
                  {asset.localizacao || 'Não informada'}
                  {asset.ip_address ? ` • IP ${asset.ip_address}` : ''}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 block tracking-wider">
                  Classificação da Informação
                </span>
                <span className="text-slate-800 font-medium block truncate">
                  {asset.classificacaoInformacao}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 block tracking-wider mb-0.5">
                  Conformidade
                </span>
                <div>{getConformidadeBadge(asset.conformidadeStatus)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block tracking-wider">
                    Última Validação
                  </span>
                  <span className="text-slate-800 font-medium font-mono text-[11px]">
                    {asset.ultimaValidacao}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block tracking-wider">
                    Próxima Revisão
                  </span>
                  <span className="text-slate-800 font-medium font-mono text-[11px]">
                    {asset.proximaRevisao}
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === 'protecao' ? (
            <div className="space-y-2.5 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Salvaguardas e comprovações reais de continuidade vinculadas a este ativo:
              </p>

              {/* Modalidades de Backup configuradas e comprovadas */}
              <div className="space-y-1.5">
                {/* 1. Backup Local */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 font-semibold text-[11px]">Backup Local</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        asset.exige_backup_local
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {asset.exige_backup_local ? 'Exigido' : 'Não exigido'}
                    </Badge>
                  </div>
                  {confrontoAtivo?.modalidades?.local?.ultima_comprovacao && (
                    <div className="mt-1 pt-1 border-t border-slate-200/60 text-[10px] text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>
                        Comprovado:{' '}
                        {formatComprovacaoData(confrontoAtivo.modalidades.local.ultima_comprovacao)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Backup em Nuvem */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 font-semibold text-[11px]">
                      Backup em Nuvem
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        asset.exige_backup_nuvem
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {asset.exige_backup_nuvem ? 'Exigido' : 'Não exigido'}
                    </Badge>
                  </div>
                  {confrontoAtivo?.modalidades?.nuvem?.ultima_comprovacao && (
                    <div className="mt-1 pt-1 border-t border-slate-200/60 text-[10px] text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>
                        Comprovado:{' '}
                        {formatComprovacaoData(confrontoAtivo.modalidades.nuvem.ultima_comprovacao)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Replicação Contínua */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 font-semibold text-[11px]">
                      Replicação Contínua
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        asset.exige_backup_replicacao
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {asset.exige_backup_replicacao ? 'Exigido' : 'Não exigido'}
                    </Badge>
                  </div>
                  {confrontoAtivo?.modalidades?.replicacao?.ultima_comprovacao && (
                    <div className="mt-1 pt-1 border-t border-slate-200/60 text-[10px] text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>
                        Comprovado:{' '}
                        {formatComprovacaoData(
                          confrontoAtivo.modalidades.replicacao.ultima_comprovacao,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status consolidado do confronto */}
              {confrontoAtivo && (
                <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                  <span>Proteção atendida:</span>
                  <strong className="font-semibold">
                    {confrontoAtivo.total_atendidas} de {confrontoAtivo.exigencias.total_exigidas}{' '}
                    exigência(s)
                  </strong>
                </div>
              )}

              <div className="pt-1 text-[11px] text-slate-400">
                Origem do ativo:{' '}
                <strong className="text-slate-600">
                  {asset.origem === 'glpi' ? `GLPI #${asset.external_id || ''}` : 'Cadastro Manual'}
                </strong>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Vínculos reais deste ativo com escopos e planos de backup cadastrados:
              </p>

              {loadingRelations ? (
                <div className="py-4 text-center text-slate-400 text-[11px]">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-1" />
                  Carregando relacionamentos...
                </div>
              ) : escopos.length === 0 && planos.length === 0 && fontes.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-500">
                  Nenhum vínculo ou plano de proteção associado a este ativo no momento.
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 space-y-2 text-[11px]">
                  {escopos.length > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Escopo de Proteção:
                      </span>
                      {escopos.map((e) => (
                        <div key={e.id} className="font-medium text-slate-800">
                          {e.nome}
                        </div>
                      ))}
                    </div>
                  )}

                  {planos.length > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Plano de Backup:
                      </span>
                      {planos.map((p) => (
                        <div key={p.id} className="font-medium text-blue-600">
                          {p.nome}
                        </div>
                      ))}
                    </div>
                  )}

                  {fontes.length > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Fontes / Rotinas vinculadas:
                      </span>
                      <div className="text-slate-700 font-mono text-[10px]">
                        {fontes.length} fonte(s) mapeada(s) no motor
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação na base do painel */}
        <div className="space-y-2 pt-2 border-t border-slate-100 shrink-0">
          <Button
            onClick={() => onViewFullSheet && onViewFullSheet(asset)}
            className="w-full bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-semibold h-8 sm:h-9 gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver ficha completa
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(asset)}
            className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium h-8 sm:h-9 gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Editar ativo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
