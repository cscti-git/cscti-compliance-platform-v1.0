import React, { useState } from 'react'
import {
  AlertOctagon,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Trash2,
  Edit,
  Send,
  Building,
  ShieldCheck,
  Paperclip,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import {
  saveLgpdIncidente,
  deleteLgpdIncidente,
  getLgpdIncidenteFileUrl,
  getLgpdPrazo72hInfo,
  SaveLgpdIncidentePayload,
} from '@/services/lgpdService'
import { formatSpDateOnly, formatSpDateTime } from '@/pages/backup/relatorioData'
import type {
  LgpdIncidenteItem,
  LgpdDadoItem,
  LgpdIncidenteGravidade,
  LgpdIncidenteStatusFluxo,
} from '@/types/cscti'

interface LgpdIncidentesTabProps {
  orgId: string
  incidentes: LgpdIncidenteItem[]
  dados: LgpdDadoItem[]
  defaultResponsavel: string
  canEdit: boolean
  onReload: () => void
}

export const LgpdIncidentesTab: React.FC<LgpdIncidentesTabProps> = ({
  orgId,
  incidentes,
  dados,
  defaultResponsavel,
  canEdit,
  onReload,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LgpdIncidenteItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Drawer / Detalhes do Incidente Selecionado
  const [selectedIncidente, setSelectedIncidente] = useState<LgpdIncidenteItem | null>(
    incidentes[0] || null,
  )

  // Form fields
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataDeteccao, setDataDeteccao] = useState(new Date().toISOString().substring(0, 16))
  const [dataOcorrencia, setDataOcorrencia] = useState('')
  const [gravidade, setGravidade] = useState<LgpdIncidenteGravidade>('media')
  const [dadosAfetadosTexto, setDadosAfetadosTexto] = useState('')
  const [dadosAfetadosRel, setDadosAfetadosRel] = useState<string[]>([])
  const [titularesAfetadosEstimativa, setTitularesAfetadosEstimativa] = useState<
    number | undefined
  >(undefined)
  const [statusFluxo, setStatusFluxo] = useState<LgpdIncidenteStatusFluxo>('detectado')
  const [dataComunicacaoTitular, setDataComunicacaoTitular] = useState('')
  const [protocoloComunicacaoTitular, setProtocoloComunicacaoTitular] = useState('')
  const [dataComunicacaoOrgao, setDataComunicacaoOrgao] = useState('')
  const [protocoloComunicacaoOrgao, setProtocoloComunicacaoOrgao] = useState('')
  const [responsavelRegistro, setResponsavelRegistro] = useState(defaultResponsavel)
  const [medidasTomadas, setMedidasTomadas] = useState('')
  const [licoesAprendidas, setLicoesAprendidas] = useState('')
  const [dataEncerramento, setDataEncerramento] = useState('')
  const [anexosFiles, setAnexosFiles] = useState<File[]>([])

  // Modal rápido de comunicação
  const [comunicacaoModalOpen, setComunicacaoModalOpen] = useState(false)
  const [tipoComunicacao, setTipoComunicacao] = useState<'orgao' | 'titular'>('orgao')
  const [dataComunicacaoRapida, setDataComunicacaoRapida] = useState(
    new Date().toISOString().substring(0, 16),
  )
  const [protocoloRapido, setProtocoloRapido] = useState('')

  const handleOpenNew = () => {
    setEditingItem(null)
    setTitulo('')
    setDescricao('')
    setDataDeteccao(new Date().toISOString().substring(0, 16))
    setDataOcorrencia('')
    setGravidade('media')
    setDadosAfetadosTexto('')
    setDadosAfetadosRel([])
    setTitularesAfetadosEstimativa(undefined)
    setStatusFluxo('detectado')
    setDataComunicacaoTitular('')
    setProtocoloComunicacaoTitular('')
    setDataComunicacaoOrgao('')
    setProtocoloComunicacaoOrgao('')
    setResponsavelRegistro(defaultResponsavel)
    setMedidasTomadas('')
    setLicoesAprendidas('')
    setDataEncerramento('')
    setAnexosFiles([])
    setModalOpen(true)
  }

  const handleOpenEdit = (item: LgpdIncidenteItem) => {
    setEditingItem(item)
    setTitulo(item.titulo)
    setDescricao(item.descricao)
    setDataDeteccao(item.data_deteccao ? item.data_deteccao.substring(0, 16) : '')
    setDataOcorrencia(item.data_ocorrencia ? item.data_ocorrencia.substring(0, 16) : '')
    setGravidade(item.gravidade)
    setDadosAfetadosTexto(item.dados_afetados_texto || '')
    setDadosAfetadosRel(item.dados_afetados_rel || [])
    setTitularesAfetadosEstimativa(item.titulares_afetados_estimativa)
    setStatusFluxo(item.status_fluxo)
    setDataComunicacaoTitular(
      item.data_comunicacao_titular ? item.data_comunicacao_titular.substring(0, 16) : '',
    )
    setProtocoloComunicacaoTitular(item.protocolo_comunicacao_titular || '')
    setDataComunicacaoOrgao(
      item.data_comunicacao_orgao ? item.data_comunicacao_orgao.substring(0, 16) : '',
    )
    setProtocoloComunicacaoOrgao(item.protocolo_comunicacao_orgao || '')
    setResponsavelRegistro(item.responsavel_registro)
    setMedidasTomadas(item.medidas_tomadas || '')
    setLicoesAprendidas(item.licoes_aprendidas || '')
    setDataEncerramento(item.data_encerramento ? item.data_encerramento.substring(0, 10) : '')
    setAnexosFiles([])
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !descricao.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o título e a descrição do incidente.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: SaveLgpdIncidentePayload = {
        id: editingItem?.id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_deteccao: dataDeteccao,
        data_ocorrencia: dataOcorrencia || undefined,
        gravidade,
        dados_afetados_texto: dadosAfetadosTexto.trim(),
        dados_afetados_rel: dadosAfetadosRel,
        titulares_afetados_estimativa: titularesAfetadosEstimativa,
        status_fluxo: statusFluxo,
        data_comunicacao_titular: dataComunicacaoTitular || undefined,
        protocolo_comunicacao_titular: protocoloComunicacaoTitular.trim() || undefined,
        data_comunicacao_orgao: dataComunicacaoOrgao || undefined,
        protocolo_comunicacao_orgao: protocoloComunicacaoOrgao.trim() || undefined,
        responsavel_registro: responsavelRegistro.trim(),
        medidas_tomadas: medidasTomadas.trim(),
        licoes_aprendidas: licoesAprendidas.trim(),
        data_encerramento: dataEncerramento || undefined,
        anexosFiles: anexosFiles.length > 0 ? anexosFiles : undefined,
      }

      const saved = await saveLgpdIncidente(orgId, payload)
      toast({
        title: editingItem ? 'Incidente atualizado' : 'Incidente registrado',
        description: `"${titulo}" foi salvo com sucesso.`,
      })
      setModalOpen(false)
      setSelectedIncidente(saved)
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar incidente',
        description: err?.message || 'Falha ao registrar incidente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenComunicacaoRapida = (tipo: 'orgao' | 'titular') => {
    if (!selectedIncidente) return
    setTipoComunicacao(tipo)
    setDataComunicacaoRapida(new Date().toISOString().substring(0, 16))
    setProtocoloRapido('')
    setComunicacaoModalOpen(true)
  }

  const handleSaveComunicacaoRapida = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIncidente) return

    setSubmitting(true)
    try {
      const payload: SaveLgpdIncidentePayload = {
        id: selectedIncidente.id,
        titulo: selectedIncidente.titulo,
        descricao: selectedIncidente.descricao,
        data_deteccao: selectedIncidente.data_deteccao,
        gravidade: selectedIncidente.gravidade,
        responsavel_registro: selectedIncidente.responsavel_registro,
        status_fluxo:
          tipoComunicacao === 'titular' ? 'comunicados_titulares' : selectedIncidente.status_fluxo,
        data_comunicacao_titular:
          tipoComunicacao === 'titular'
            ? dataComunicacaoRapida
            : selectedIncidente.data_comunicacao_titular,
        protocolo_comunicacao_titular:
          tipoComunicacao === 'titular'
            ? protocoloRapido
            : selectedIncidente.protocolo_comunicacao_titular,
        data_comunicacao_orgao:
          tipoComunicacao === 'orgao'
            ? dataComunicacaoRapida
            : selectedIncidente.data_comunicacao_orgao,
        protocolo_comunicacao_orgao:
          tipoComunicacao === 'orgao'
            ? protocoloRapido
            : selectedIncidente.protocolo_comunicacao_orgao,
      }

      const updated = await saveLgpdIncidente(orgId, payload)
      toast({
        title: 'Comunicação registrada',
        description:
          tipoComunicacao === 'orgao'
            ? 'Comunicação ao órgão fiscalizador registrada com sucesso.'
            : 'Comunicação aos titulares afetados registrada com sucesso.',
      })
      setSelectedIncidente(updated)
      setComunicacaoModalOpen(false)
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar comunicação',
        description: err?.message || 'Falha ao salvar comunicação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: LgpdIncidenteItem) => {
    if (!canEdit) return
    const confirm = window.confirm(
      `Deseja realmente excluir o incidente "${item.titulo}"? Esta ação será registrada no log de auditoria permanente.`,
    )
    if (!confirm) return

    try {
      await deleteLgpdIncidente(item.id, orgId, item.titulo)
      toast({
        title: 'Incidente excluído',
        description: `"${item.titulo}" foi removido do registro.`,
      })
      if (selectedIncidente?.id === item.id) {
        setSelectedIncidente(null)
      }
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao excluir incidente.',
        variant: 'destructive',
      })
    }
  }

  const renderGravidadeBadge = (g: LgpdIncidenteGravidade) => {
    switch (g) {
      case 'critica':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            Crítica
          </span>
        )
      case 'alta':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            Alta
          </span>
        )
      case 'media':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
            Média
          </span>
        )
      case 'baixa':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Baixa
          </span>
        )
    }
  }

  const renderStatusBadge = (s: LgpdIncidenteStatusFluxo) => {
    switch (s) {
      case 'detectado':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Detectado
          </span>
        )
      case 'em_investigacao':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            Em Investigação
          </span>
        )
      case 'contido':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Contido
          </span>
        )
      case 'comunicados_titulares':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Titulares Comunicados
          </span>
        )
      case 'encerrado':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Encerrado
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Topo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Gestão de Incidentes com Dados Pessoais
          </h2>
          <p className="text-xs text-slate-500">
            Controle do fluxo de resposta, mitigação e contagem das 72 horas para notificação
            regulatória.
          </p>
        </div>

        {canEdit && (
          <Button
            onClick={handleOpenNew}
            size="sm"
            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Incidente</span>
          </Button>
        )}
      </div>

      {incidentes.length === 0 ? (
        <Card className="border-slate-200 bg-white rounded-xl shadow-2xs">
          <CardContent className="p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Nenhum incidente de segurança registrado na serventia
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Excelente! Não há ocorrências de violação, vazamento ou acesso indevido cadastradas.
              Caso ocorra qualquer suspeita, o registro imediato dispara a contagem das 72h
              regulatórias.
            </p>
            {canEdit && (
              <Button
                onClick={handleOpenNew}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Incidente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Layout em 2 Colunas: Lista à Esquerda + Painel de Detalhes com Cronômetro à Direita */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Coluna 1: Lista de Incidentes (5 colunas) */}
          <div className="lg:col-span-5 space-y-3">
            {incidentes.map((item) => {
              const isSelected = selectedIncidente?.id === item.id
              const prazoInfo = getLgpdPrazo72hInfo(item.data_deteccao, item.data_comunicacao_orgao)

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedIncidente(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white text-left ${
                    isSelected
                      ? 'border-[#1A56DB] ring-2 ring-[#1A56DB]/15 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {renderGravidadeBadge(item.gravidade)}
                      {renderStatusBadge(item.status_fluxo)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatSpDateOnly(item.data_deteccao)}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                    {item.titulo}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.descricao}
                  </p>

                  {/* Status do Prazo de 72h */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {prazoInfo.statusPrazo === 'cumprido_no_prazo' ? (
                        <span className="text-emerald-700 font-semibold">72h cumprido</span>
                      ) : prazoInfo.statusPrazo === 'vencido' ? (
                        <span className="text-rose-700 font-semibold">72h vencido</span>
                      ) : prazoInfo.statusPrazo === 'atencao' ? (
                        <span className="text-amber-700 font-semibold">Restam &lt;24h</span>
                      ) : (
                        <span className="text-blue-700 font-semibold">Dentro das 72h</span>
                      )}
                    </span>

                    <span className="text-slate-400 text-[10px]">
                      {item.titulares_afetados_estimativa !== undefined
                        ? `~${item.titulares_afetados_estimativa} titulares`
                        : 'Titulares a apurar'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Coluna 2: Painel de Fluxo e Detalhes do Incidente Selecionado (7 colunas) */}
          <div className="lg:col-span-7">
            {selectedIncidente ? (
              <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden sticky top-20">
                <div className="bg-[#0B2545] text-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                        Gravidade {selectedIncidente.gravidade}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/30 text-blue-100">
                        Fluxo: {selectedIncidente.status_fluxo.replace('_', ' ')}
                      </span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(selectedIncidente)}
                          className="text-xs text-white hover:bg-white/10 h-7 px-2"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(selectedIncidente)}
                          className="text-xs text-rose-300 hover:bg-rose-950/50 h-7 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                        </Button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    {selectedIncidente.titulo}
                  </h3>
                  <div className="text-xs text-blue-200 mt-1 flex items-center gap-3">
                    <span>Detecção: {formatSpDateTime(selectedIncidente.data_deteccao)}</span>
                    <span>•</span>
                    <span>Registrado por: {selectedIncidente.responsavel_registro}</span>
                  </div>
                </div>

                <CardContent className="p-5 space-y-5">
                  {/* Cronômetro do Prazo de 72h */}
                  {(() => {
                    const prazo = getLgpdPrazo72hInfo(
                      selectedIncidente.data_deteccao,
                      selectedIncidente.data_comunicacao_orgao,
                    )

                    const isNoPrazo =
                      prazo.statusPrazo === 'no_prazo' || prazo.statusPrazo === 'cumprido_no_prazo'
                    const isAtencao = prazo.statusPrazo === 'atencao'
                    const isVencido =
                      prazo.statusPrazo === 'vencido' || prazo.statusPrazo === 'cumprido_fora_prazo'

                    return (
                      <div
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isNoPrazo
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : isAtencao
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : 'bg-rose-50/70 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isNoPrazo
                                ? 'bg-emerald-200/80 text-emerald-800'
                                : isAtencao
                                  ? 'bg-amber-200/80 text-amber-800'
                                  : 'bg-rose-200/80 text-rose-800'
                            }`}
                          >
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider">
                              Prazo Regulatório de Comunicação (72h)
                            </div>
                            <div className="text-sm font-extrabold mt-0.5">{prazo.label}</div>
                          </div>
                        </div>

                        {canEdit && !selectedIncidente.data_comunicacao_orgao && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenComunicacaoRapida('orgao')}
                            className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold shrink-0 gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" /> Registrar Comunicação
                          </Button>
                        )}
                      </div>
                    )
                  })()}

                  {/* Descrição e Medidas */}
                  <div className="space-y-3 text-xs text-slate-700">
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                        Descrição do Incidente
                      </h4>
                      <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {selectedIncidente.descricao}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Dados Pessoais Afetados
                        </span>
                        <div className="font-medium text-slate-800">
                          {selectedIncidente.dados_afetados_texto || 'Não discriminado'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Estimativa de Titulares
                        </span>
                        <div className="font-medium text-slate-800">
                          {selectedIncidente.titulares_afetados_estimativa !== undefined
                            ? `${selectedIncidente.titulares_afetados_estimativa} titulares afetados`
                            : 'Em apuração pericial'}
                        </div>
                      </div>
                    </div>

                    {/* Comunicações Efetuadas */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                        Comunicações Institucionais
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Órgão Fiscalizador
                          </span>
                          {selectedIncidente.data_comunicacao_orgao ? (
                            <div className="mt-1 text-slate-900 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {formatSpDateTime(selectedIncidente.data_comunicacao_orgao)}
                              </span>
                              {selectedIncidente.protocolo_comunicacao_orgao && (
                                <div className="text-[10px] text-slate-500 font-normal">
                                  Prot: {selectedIncidente.protocolo_comunicacao_orgao}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-slate-400 italic">Pendente de notificação</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenComunicacaoRapida('orgao')}
                                  className="text-blue-700 hover:underline font-semibold text-[11px]"
                                >
                                  Registrar
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Titulares Afetados
                          </span>
                          {selectedIncidente.data_comunicacao_titular ? (
                            <div className="mt-1 text-slate-900 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {formatSpDateTime(selectedIncidente.data_comunicacao_titular)}
                              </span>
                              {selectedIncidente.protocolo_comunicacao_titular && (
                                <div className="text-[10px] text-slate-500 font-normal">
                                  Ref: {selectedIncidente.protocolo_comunicacao_titular}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-slate-400 italic">Não notificados</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenComunicacaoRapida('titular')}
                                  className="text-blue-700 hover:underline font-semibold text-[11px]"
                                >
                                  Registrar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Medidas e Lições */}
                    {(selectedIncidente.medidas_tomadas || selectedIncidente.licoes_aprendidas) && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        {selectedIncidente.medidas_tomadas && (
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                              Medidas de Contenção Adotadas
                            </span>
                            <p className="bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                              {selectedIncidente.medidas_tomadas}
                            </p>
                          </div>
                        )}

                        {selectedIncidente.licoes_aprendidas && (
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                              Lições Aprendidas no Encerramento
                            </span>
                            <p className="bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                              {selectedIncidente.licoes_aprendidas}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Anexos */}
                    {selectedIncidente.anexos && selectedIncidente.anexos.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          <span>Anexos Comprobatórios ({selectedIncidente.anexos.length}):</span>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {selectedIncidente.anexos.map((fn) => {
                            const url = getLgpdIncidenteFileUrl(selectedIncidente, fn)
                            return (
                              <a
                                key={fn}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md font-medium hover:bg-blue-100"
                              >
                                <Download className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{fn}</span>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                Selecione um incidente na lista para visualizar o painel do fluxo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Completo de Cadastro / Edição do Incidente */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingItem
                ? 'Editar Incidente de Segurança'
                : 'Registrar Novo Incidente de Segurança'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Título do Incidente *</Label>
              <Input
                type="text"
                placeholder="Ex.: Tentativa de acesso não autorizado ao banco registral"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Data e Hora da Detecção *
                </Label>
                <Input
                  type="datetime-local"
                  value={dataDeteccao}
                  onChange={(e) => setDataDeteccao(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Início do cômputo das 72h regulatórias
                </span>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Data da Ocorrência Estimada
                </Label>
                <Input
                  type="datetime-local"
                  value={dataOcorrencia}
                  onChange={(e) => setDataOcorrencia(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Gravidade *</Label>
                <Select
                  value={gravidade}
                  onValueChange={(v: LgpdIncidenteGravidade) => setGravidade(v)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa" className="text-xs">
                      Baixa
                    </SelectItem>
                    <SelectItem value="media" className="text-xs">
                      Média
                    </SelectItem>
                    <SelectItem value="alta" className="text-xs">
                      Alta
                    </SelectItem>
                    <SelectItem value="critica" className="text-xs">
                      Crítica
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Status do Fluxo *</Label>
                <Select
                  value={statusFluxo}
                  onValueChange={(v: LgpdIncidenteStatusFluxo) => setStatusFluxo(v)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detectado" className="text-xs">
                      Detectado
                    </SelectItem>
                    <SelectItem value="em_investigacao" className="text-xs">
                      Em Investigação
                    </SelectItem>
                    <SelectItem value="contido" className="text-xs">
                      Contido
                    </SelectItem>
                    <SelectItem value="comunicados_titulares" className="text-xs">
                      Comunicados Titulares
                    </SelectItem>
                    <SelectItem value="encerrado" className="text-xs">
                      Encerrado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Dados Pessoais Afetados
                </Label>
                <Input
                  type="text"
                  placeholder="Ex.: CPF, nomes completos, telefones"
                  value={dadosAfetadosTexto}
                  onChange={(e) => setDadosAfetadosTexto(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Estimativa de Titulares Afetados
                </Label>
                <Input
                  type="number"
                  placeholder="Ex.: 25"
                  value={titularesAfetadosEstimativa ?? ''}
                  onChange={(e) =>
                    setTitularesAfetadosEstimativa(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Descrição Detalhada dos Fatos *
              </Label>
              <Textarea
                placeholder="Descreva a natureza do incidente, ativos envolvidos e causa provável..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1 text-xs min-h-[70px]"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Medidas de Contenção e Remediação
              </Label>
              <Textarea
                placeholder="Ações adotadas para cessar a vulnerabilidade e conter o impacto..."
                value={medidasTomadas}
                onChange={(e) => setMedidasTomadas(e.target.value)}
                className="mt-1 text-xs min-h-[60px]"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Responsável pelo Registro *
              </Label>
              <Input
                type="text"
                value={responsavelRegistro}
                onChange={(e) => setResponsavelRegistro(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Anexar Relatórios Técnicos / Evidências (Até 30MB cada)
              </Label>
              <Input
                type="file"
                multiple
                onChange={(e) => setAnexosFiles(Array.from(e.target.files || []))}
                className="mt-1 text-xs cursor-pointer"
              />
            </div>

            {statusFluxo === 'encerrado' && (
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-3">
                <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Encerramento Formal do Incidente
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Data de Encerramento
                  </Label>
                  <Input
                    type="date"
                    value={dataEncerramento}
                    onChange={(e) => setDataEncerramento(e.target.value)}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Lições Aprendidas</Label>
                  <Textarea
                    placeholder="Melhorias processuais, ajustes de firewall, treinamento da equipe..."
                    value={licoesAprendidas}
                    onChange={(e) => setLicoesAprendidas(e.target.value)}
                    className="mt-1 text-xs min-h-[60px] bg-white"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold"
              >
                {submitting
                  ? 'Salvando...'
                  : editingItem
                    ? 'Salvar Alterações'
                    : 'Registrar Incidente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido de Notificação Institucional */}
      <Dialog open={comunicacaoModalOpen} onOpenChange={setComunicacaoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {tipoComunicacao === 'orgao'
                ? 'Registrar Comunicação ao Órgão Fiscalizador'
                : 'Registrar Comunicação aos Titulares de Dados'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveComunicacaoRapida} className="space-y-3.5 pt-2">
            <p className="text-xs text-slate-500">
              {tipoComunicacao === 'orgao'
                ? 'Registre a data/hora e o número de protocolo do relatório enviado à autoridade fiscalizadora para comprovação do cumprimento do prazo regulatório de 72h.'
                : 'Registre a data e canal oficial de comunicação individual ou pública aos titulares afetados.'}
            </p>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Data e Hora do Envio *</Label>
              <Input
                type="datetime-local"
                value={dataComunicacaoRapida}
                onChange={(e) => setDataComunicacaoRapida(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Número do Protocolo / Código de Rastreamento (Opcional)
              </Label>
              <Input
                type="text"
                placeholder="Ex.: SEI-00192837/2026, E-mail com hash"
                value={protocoloRapido}
                onChange={(e) => setProtocoloRapido(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComunicacaoModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs font-semibold"
              >
                {submitting ? 'Salvando...' : 'Confirmar Registro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LgpdIncidentesTab
