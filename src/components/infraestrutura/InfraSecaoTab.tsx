import React, { useState } from 'react'
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  FolderGit2,
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  Activity,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PanelHeader } from '@/components/common/PanelHeader'
import { InfraItemModal } from './InfraItemModal'
import { deleteInfraItem, getInfraItemFileUrl } from '@/services/infraestruturaService'
import { getEvidenciaFileUrl } from '@/services/evidenciaService'
import { formatSpDateOnly } from '@/pages/backup/relatorioData'
import { toast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import type { InfraItem, InfraCategoria } from '@/types/cscti'

interface InfraSecaoTabProps {
  orgId: string
  categoria: InfraCategoria
  titulo: string
  subtitulo: string
  itens: InfraItem[]
  canEdit: boolean
  onReload: () => void
  onGerarPlanoAcao?: (item: InfraItem) => void
}

export const InfraSecaoTab: React.FC<InfraSecaoTabProps> = ({
  orgId,
  categoria,
  titulo,
  subtitulo,
  itens,
  canEdit,
  onReload,
  onGerarPlanoAcao,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InfraItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleEdit = (item: InfraItem) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleNew = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleDelete = async (item: InfraItem) => {
    if (!window.confirm(`Deseja realmente remover o registro "${item.titulo}"?`)) {
      return
    }
    setDeletingId(item.id)
    try {
      await deleteInfraItem(item.id, orgId, item.titulo)
      toast({
        title: 'Registro removido',
        description: `O item "${item.titulo}" foi removido do módulo.`,
      })
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : 'Falha na exclusão do item.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'conforme':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            Conforme
          </Badge>
        )
      case 'parcial':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
            Parcial
          </Badge>
        )
      case 'nao_conforme':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">
            Não Conforme
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      <PanelHeader
        title={titulo}
        subtitle={subtitulo}
        badge={
          <Badge
            variant="outline"
            className="text-[10px] bg-slate-50"
          >{`${itens.length} ${itens.length === 1 ? 'registro' : 'registros'}`}</Badge>
        }
        action={
          canEdit && (
            <Button
              onClick={handleNew}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs h-8 gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Registro</span>
            </Button>
          )
        }
      />

      {itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            {categoria === 'energia' ? <Zap className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              Nenhum registro cadastrado nesta seção
            </h3>
            <p className="text-xs text-slate-500">
              Cadastre os equipamentos físicos, laudos ou sistemas para comprovar o ambiente técnico
              real da serventia.
            </p>
          </div>
          {canEdit && (
            <Button
              onClick={handleNew}
              size="sm"
              variant="outline"
              className="text-xs border-slate-300 text-slate-700 mt-2"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Cadastrar primeiro item
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itens.map((it) => {
            const hasFoto = Boolean(
              it.expand?.evidencia_vinculada?.arquivos &&
              it.expand.evidencia_vinculada.arquivos.length > 0,
            )
            const fotoNome = hasFoto ? it.expand?.evidencia_vinculada?.arquivos?.[0] : undefined
            const fotoUrl =
              it.expand?.evidencia_vinculada && fotoNome
                ? getEvidenciaFileUrl(it.expand.evidencia_vinculada, fotoNome, '300x200')
                : ''

            return (
              <div
                key={it.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {it.tipo_item.replace(/_/g, ' ')}
                        </span>
                        {getStatusBadge(it.status)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{it.titulo}</h4>
                      {it.descricao && (
                        <p className="text-xs text-slate-600 line-clamp-2">{it.descricao}</p>
                      )}
                    </div>

                    {/* Ações do Card */}
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-800"
                          onClick={() => handleEdit(it)}
                          title="Editar registro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          disabled={deletingId === it.id}
                          onClick={() => handleDelete(it)}
                          title="Remover registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Detalhes Estruturados */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    {/* Nobreak / Gerador */}
                    {it.modelo && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Modelo:</span>
                        <span className="font-semibold text-slate-800">{it.modelo}</span>
                      </div>
                    )}
                    {typeof it.autonomia_minutos === 'number' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Autonomia:</span>
                        <span className="font-bold text-[#0B2545]">
                          {it.autonomia_minutos} minutos
                        </span>
                      </div>
                    )}
                    {typeof it.potencia_va === 'number' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Potência:</span>
                        <span className="font-semibold text-slate-800">{it.potencia_va} VA</span>
                      </div>
                    )}

                    {/* Aterramento */}
                    {it.art_numero && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ART CREA:</span>
                        <span className="font-mono font-bold text-slate-800">{it.art_numero}</span>
                      </div>
                    )}
                    {it.responsavel_tecnico && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Engenheiro / Resp.:</span>
                        <span className="font-medium text-slate-800">{it.responsavel_tecnico}</span>
                      </div>
                    )}
                    {it.data_validade && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Validade do Laudo:</span>
                        <span className="font-semibold text-slate-800">
                          {formatSpDateOnly(it.data_validade)}
                        </span>
                      </div>
                    )}

                    {/* Extintores */}
                    {it.data_vencimento_extintor && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Vencimento da Carga:</span>
                        <span className="font-bold text-amber-700">
                          {formatSpDateOnly(it.data_vencimento_extintor)}
                        </span>
                      </div>
                    )}

                    {/* Redundância */}
                    {it.redundancia_instalada !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Redundância:</span>
                        <span
                          className={`font-semibold ${it.redundancia_instalada ? 'text-emerald-700' : 'text-slate-500'}`}
                        >
                          {it.redundancia_instalada ? 'Instalada e Ativa' : 'Não possui'}
                        </span>
                      </div>
                    )}

                    {/* Criptografia */}
                    {it.tipo_item === 'criptografia_dados' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Repouso:</span>
                          <span
                            className={
                              it.criptografia_repouso
                                ? 'text-emerald-700 font-bold'
                                : 'text-rose-700 font-bold'
                            }
                          >
                            {it.criptografia_repouso ? 'Cifrado' : 'Sem cifragem'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Trânsito:</span>
                          <span
                            className={
                              it.criptografia_transito
                                ? 'text-emerald-700 font-bold'
                                : 'text-rose-700 font-bold'
                            }
                          >
                            {it.criptografia_transito ? 'TLS 1.2+ Ativo' : 'Não seguro'}
                          </span>
                        </div>
                        {it.algoritmo_criptografia && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Padrão:</span>
                            <span className="font-mono text-slate-700">
                              {it.algoritmo_criptografia}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hash SHA-256 */}
                    {it.hash_sha256 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400 font-mono">SHA-256:</span>
                        <span
                          className="text-[10px] font-mono text-slate-600 truncate max-w-[200px]"
                          title={it.hash_sha256}
                        >
                          {it.hash_sha256}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vínculo com a Central de Evidências */}
                  <div className="p-2.5 rounded-lg border border-blue-200/80 bg-blue-50/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt="Prova Fotográfica"
                          className="w-12 h-10 object-cover rounded border border-blue-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <FolderGit2 className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-blue-800 block">
                          Evidência Visual Vinculada
                        </span>
                        {it.expand?.evidencia_vinculada ? (
                          <span className="font-semibold text-slate-800 truncate block">
                            {it.expand.evidencia_vinculada.titulo}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Pendente de foto/comprovante
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {it.expand?.evidencia_vinculada ? (
                        <Link
                          to="/evidencias"
                          className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>Ver</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          to={`/evidencias?categoria=${encodeURIComponent(
                            it.categoria_evidencia_sugerida || 'Sala de TI',
                          )}`}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-blue-700 text-white hover:bg-blue-800 transition flex items-center gap-1"
                        >
                          <span>Anexar Foto</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card: Responsável e Plano de Ação */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="truncate max-w-[200px]">
                    {it.expand?.responsavel_designado ? (
                      <span title={it.expand.responsavel_designado.name}>
                        Resp: <strong>{it.expand.responsavel_designado.name}</strong>
                      </span>
                    ) : (
                      <span className="italic">Sem responsável vinculado</span>
                    )}
                  </div>

                  {(it.status === 'pendente' || it.status === 'nao_conforme') &&
                    onGerarPlanoAcao && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onGerarPlanoAcao(it)}
                        className="text-[11px] h-7 text-amber-700 hover:text-amber-900 hover:bg-amber-50 gap-1 px-2 font-semibold"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Gerar Plano de Ação</span>
                      </Button>
                    )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <InfraItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onReload}
        orgId={orgId}
        categoriaPadrao={categoria}
        item={editingItem}
      />
    </div>
  )
}

export default InfraSecaoTab
