import React, { useState } from 'react'
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
} from 'lucide-react'
import type { InventoryAssetItem, AssetType } from '@/types/cscti'

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
  onClose,
  onEdit,
  onViewFullSheet,
}) => {
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'protecao' | 'relacionamentos'>(
    'visao_geral',
  )

  if (!asset) return null

  const getCriticidadeBadge = (crit: string) => {
    switch (crit) {
      case 'alta':
      case 'critica':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Crítica
          </span>
        )
      case 'media':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Média
          </span>
        )
      case 'baixa':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
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
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium"
          >
            Em operação
          </Badge>
        )
      case 'inativo':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-medium"
          >
            Em manutenção
          </Badge>
        )
      case 'desativado':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-600 border-slate-300 text-[11px] font-medium"
          >
            Desativado
          </Badge>
        )
    }
  }

  const getConformidadeBadge = (conf: string) => {
    switch (conf) {
      case 'conforme':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Conforme
          </span>
        )
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Pendente
          </span>
        )
      case 'nao_conforme':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
            <XCircle className="w-3 h-3 text-red-600" /> Não conforme
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            <HelpCircle className="w-3 h-3 text-slate-400" /> Não avaliado
          </span>
        )
    }
  }

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm flex flex-col h-full rounded-xl overflow-hidden">
      {/* Header do Card com Botão X */}
      <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <span className="text-sm font-bold text-slate-900">Detalhes do Ativo</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
          title="Fechar painel de detalhes"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* Identificação Superior: Ícone, Nome, Código e Badges */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 shrink-0 mt-0.5">
              {getAssetTypeIcon(asset.tipo, 'w-6 h-6 text-slate-700')}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                {asset.name}
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{asset.displayCode}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {getCriticidadeBadge(asset.criticidade)}
                {getEstadoBadge(asset.status)}
              </div>
            </div>
          </div>

          {/* Abas Internas: Visão Geral / Proteção / Relacionamentos */}
          <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('visao_geral')}
              className={`pb-2 border-b-2 transition-colors ${
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
              className={`pb-2 border-b-2 transition-colors ${
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
              className={`pb-2 border-b-2 transition-colors ${
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
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Categoria
                </span>
                <span className="text-slate-800 font-medium">{asset.subtipoFormatado}</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Descrição
                </span>
                <span className="text-slate-700 leading-relaxed block">
                  {asset.descricao || 'Nenhuma descrição técnica informada.'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Responsável
                </span>
                <span className="text-slate-800 font-medium">
                  {asset.expand?.responsavel?.name || 'Equipe de TI'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Localização
                </span>
                <span className="text-slate-800 font-medium">
                  {asset.localizacao || 'Sala de servidores'}
                  {asset.ip_address ? ` • IP ${asset.ip_address}` : ''}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Classificação da Informação
                </span>
                <span className="text-slate-800 font-medium">
                  {asset.classificacaoInformacao || 'Restrito'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider mb-1">
                  Conformidade
                </span>
                <div>{getConformidadeBadge(asset.conformidadeStatus)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Última Validação
                  </span>
                  <span className="text-slate-800 font-medium font-mono text-[11px]">
                    {asset.ultimaValidacao}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Próxima Revisão
                  </span>
                  <span className="text-slate-800 font-medium font-mono text-[11px]">
                    {asset.proximaRevisao}
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === 'protecao' ? (
            <div className="space-y-3 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Salvaguardas e exigências de continuidade associadas a este ativo:
              </p>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Backup Local</span>
                  <Badge
                    variant="outline"
                    className={
                      asset.exige_backup_local
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }
                  >
                    {asset.exige_backup_local ? 'Exigido' : 'Não exigido'}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Backup em Nuvem</span>
                  <Badge
                    variant="outline"
                    className={
                      asset.exige_backup_nuvem
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }
                  >
                    {asset.exige_backup_nuvem ? 'Exigido' : 'Não exigido'}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Replicação Contínua</span>
                  <Badge
                    variant="outline"
                    className={
                      asset.exige_backup_replicacao
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }
                  >
                    {asset.exige_backup_replicacao ? 'Exigido' : 'Não exigido'}
                  </Badge>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-slate-400">
                Origem:{' '}
                <strong className="text-slate-600">
                  {asset.origem === 'glpi' ? `GLPI #${asset.external_id || ''}` : 'Cadastro Manual'}
                </strong>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Relações deste ativo com outros recursos tecnológicos e sistemas:
              </p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Serviços atendidos:</span>
                  <span className="font-medium text-slate-800">Notas / Protesto / RTD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unidade gestora:</span>
                  <span className="font-medium text-slate-800">Sede Principal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plano de backup:</span>
                  <span className="font-medium text-blue-600">Plano Contínuo 30m</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação na base do painel */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <Button
            onClick={() => onViewFullSheet && onViewFullSheet(asset)}
            className="w-full bg-[#1A56DB] hover:bg-[#1E429F] text-white text-xs font-semibold h-9 gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver ficha completa
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(asset)}
            className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold h-9 gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Editar ativo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
