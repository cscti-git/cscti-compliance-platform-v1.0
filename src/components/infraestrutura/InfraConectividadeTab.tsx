import React, { useState } from 'react'
import {
  Wifi,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Hash,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PanelHeader } from '@/components/common/PanelHeader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  saveInfraLink,
  deleteInfraLink,
  confrontarConectividade,
  SaveInfraLinkPayload,
} from '@/services/infraestruturaService'
import type { InfraLinkItem, OrganizationItem } from '@/types/cscti'

interface InfraConectividadeTabProps {
  orgId: string
  organization?: OrganizationItem | null
  links: InfraLinkItem[]
  canEdit: boolean
  onReload: () => void
  onGerarPlanoAcao?: (detalhe: string) => void
}

export const InfraConectividadeTab: React.FC<InfraConectividadeTabProps> = ({
  orgId,
  organization,
  links,
  canEdit,
  onReload,
  onGerarPlanoAcao,
}) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<InfraLinkItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Formulário
  const [operadora, setOperadora] = useState('')
  const [identificacao, setIdentificacao] = useState('')
  const [velocidadeMbps, setVelocidadeMbps] = useState('50')
  const [tipoLink, setTipoLink] = useState<'dedicado' | 'compartilhado'>('dedicado')
  const [meioTransmissao, setMeioTransmissao] = useState<string>('fibra_optica')
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'em_manutencao'>('ativo')
  const [redundancia, setRedundancia] = useState(false)
  const [ipFixo, setIpFixo] = useState(true)
  const [circuitoId, setCircuitoId] = useState('')
  const [contatoSuporte, setContatoSuporte] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)

  const confronto = confrontarConectividade(organization, links)

  const handleNew = () => {
    setEditingLink(null)
    setOperadora('')
    setIdentificacao('')
    setVelocidadeMbps('50')
    setTipoLink('dedicado')
    setMeioTransmissao('fibra_optica')
    setStatus('ativo')
    setRedundancia(links.length > 0)
    setIpFixo(true)
    setCircuitoId('')
    setContatoSuporte('')
    setObservacoes('')
    setArquivo(null)
    setModalOpen(true)
  }

  const handleEdit = (link: InfraLinkItem) => {
    setEditingLink(link)
    setOperadora(link.operadora)
    setIdentificacao(link.identificacao || '')
    setVelocidadeMbps(String(link.velocidade_mbps || 0))
    setTipoLink(link.tipo_link)
    setMeioTransmissao(link.meio_transmissao || 'fibra_optica')
    setStatus(link.status)
    setRedundancia(Boolean(link.redundancia))
    setIpFixo(Boolean(link.ip_fixo))
    setCircuitoId(link.circuito_id || '')
    setContatoSuporte(link.contato_suporte || '')
    setObservacoes(link.observacoes || '')
    setArquivo(null)
    setModalOpen(true)
  }

  const handleDelete = async (link: InfraLinkItem) => {
    if (!window.confirm(`Deseja realmente remover o link da operadora "${link.operadora}"?`)) {
      return
    }
    setDeletingId(link.id)
    try {
      await deleteInfraLink(link.id, orgId, link.operadora)
      toast({
        title: 'Link removido',
        description: `O link da ${link.operadora} foi removido com sucesso.`,
      })
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : 'Falha na exclusão do link.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!operadora.trim() || !velocidadeMbps) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe a operadora e a velocidade contratada.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const payload: SaveInfraLinkPayload = {
        id: editingLink?.id,
        operadora: operadora.trim(),
        identificacao: identificacao.trim(),
        velocidade_mbps: Number(velocidadeMbps) || 0,
        tipo_link: tipoLink,
        meio_transmissao: meioTransmissao as any,
        status,
        redundancia,
        ip_fixo: ipFixo,
        circuito_id: circuitoId.trim(),
        contato_suporte: contatoSuporte.trim(),
        observacoes: observacoes.trim(),
        arquivoContrato: arquivo || undefined,
        hash_sha256: editingLink?.hash_sha256,
      }

      await saveInfraLink(orgId, payload)
      toast({
        title: editingLink ? 'Link atualizado' : 'Link cadastrado',
        description: `O link da ${operadora} (${velocidadeMbps} Mbps) foi gravado.`,
      })
      setModalOpen(false)
      onReload()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar link',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Confronto Automático por Classe da Serventia */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0B2545]/10 text-[#0B2545]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Confronto de Conectividade por Classe da Serventia
              </h3>
              <p className="text-xs text-slate-500">
                Aferição automática da velocidade contratada e redundância física de
                telecomunicações.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200">
              Classe da Serventia: <strong>Classe {confronto.classeServentia}</strong>
            </Badge>
            {confronto.statusGeral === 'conforme' ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Atende Integralmente</span>
              </Badge>
            ) : confronto.statusGeral === 'parcial' ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Atendimento Parcial</span>
              </Badge>
            ) : (
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Não Atende</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Grade de Confronto de Velocidade e Redundância */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Velocidade Mínima Exigida</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[#0B2545]">
                {confronto.velocidadeExigidaMbps}
              </span>
              <span className="text-slate-600 font-semibold">Mbps</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Definida para Classe {confronto.classeServentia} (C1: 2 Mbps · C2: 10 Mbps · C3: 50
              Mbps)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Velocidade Atual Comprovada</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold font-mono ${confronto.atendeVelocidade ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {confronto.velocidadeTotalAtivaMbps}
              </span>
              <span className="text-slate-600 font-semibold">Mbps</span>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              {confronto.atendeVelocidade ? (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Atende à velocidade mínima
                </span>
              ) : (
                <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Abaixo da capacidade mínima (
                  {confronto.velocidadeExigidaMbps} Mbps)
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Redundância de Telecomunicação</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-lg font-bold ${confronto.possuiRedundancia ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {confronto.possuiRedundancia ? 'Redundância Ativa' : 'Sem Redundância'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {confronto.totalLinksAtivos} link(s) ativo(s) cadastrado(s)
            </p>
            {(!confronto.atendeVelocidade || !confronto.possuiRedundancia) && onGerarPlanoAcao && (
              <Button
                variant="link"
                size="sm"
                onClick={() =>
                  onGerarPlanoAcao(
                    `Adequação de link de internet: Exigido ${confronto.velocidadeExigidaMbps} Mbps, atual ${confronto.velocidadeTotalAtivaMbps} Mbps. Redundância: ${confronto.possuiRedundancia ? 'Sim' : 'Não'}.`,
                  )
                }
                className="text-[11px] p-0 h-auto text-amber-700 hover:text-amber-900 font-bold"
              >
                + Gerar Plano de Ação
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Links Cadastrados */}
      <PanelHeader
        title="Links e Conexões Cadastradas"
        subtitle="Relação de circuitos, operadoras contratadas e evidência documental."
        badge={
          <Badge
            variant="outline"
            className="text-[10px] bg-slate-50"
          >{`${links.length} ${links.length === 1 ? 'link' : 'links'}`}</Badge>
        }
        action={
          canEdit && (
            <Button
              onClick={handleNew}
              size="sm"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white text-xs h-8 gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Link de Conectividade</span>
            </Button>
          )
        }
      />

      {links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Wifi className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Nenhum link de internet cadastrado</h3>
            <p className="text-xs text-slate-500">
              Cadastre o link principal e o link secundário para comprovar a capacidade de banda
              larga da serventia.
            </p>
          </div>
          {canEdit && (
            <Button onClick={handleNew} size="sm" variant="outline" className="text-xs mt-2">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Cadastrar primeiro link
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link) => {
            const atendeMinimo = link.velocidade_mbps >= confronto.velocidadeExigidaMbps

            return (
              <div
                key={link.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Topo */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            link.redundancia
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }
                        >
                          {link.redundancia ? 'Link Redundante' : 'Link Principal'}
                        </Badge>
                        <Badge
                          className={
                            link.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }
                        >
                          {link.status === 'ativo' ? 'Ativo' : link.status}
                        </Badge>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{link.operadora}</h4>
                      {link.identificacao && (
                        <p className="text-xs text-slate-600">{link.identificacao}</p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-800"
                          onClick={() => handleEdit(link)}
                          title="Editar link"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          disabled={deletingId === link.id}
                          onClick={() => handleDelete(link)}
                          title="Remover link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Detalhes Técnicos */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Velocidade Contratada:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-base text-[#0B2545]">
                          {link.velocidade_mbps} Mbps
                        </span>
                        <Badge
                          className={
                            atendeMinimo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                              : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                          }
                        >
                          {atendeMinimo ? 'Atende Mínimo' : 'Abaixo do Mínimo'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tipo de Contrato:</span>
                      <span className="font-semibold text-slate-800 capitalize">
                        Link {link.tipo_link}
                      </span>
                    </div>

                    {link.meio_transmissao && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Meio Físico:</span>
                        <span className="font-medium text-slate-700 capitalize">
                          {link.meio_transmissao.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Endereço IP:</span>
                      <span className="font-medium text-slate-700">
                        {link.ip_fixo ? 'IP Fixo Estático' : 'IP Dinâmico'}
                      </span>
                    </div>

                    {link.circuito_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ID Circuito:</span>
                        <span className="font-mono text-slate-700">{link.circuito_id}</span>
                      </div>
                    )}

                    {link.contato_suporte && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Suporte NOC:</span>
                        <span className="text-slate-700 truncate max-w-[200px]">
                          {link.contato_suporte}
                        </span>
                      </div>
                    )}

                    {link.hash_sha256 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Contrato SHA-256:
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 truncate max-w-[180px]">
                          {link.hash_sha256}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {link.observacoes && (
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                    "{link.observacoes}"
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Cadastro/Edição de Link */}
      <Dialog open={modalOpen} onOpenChange={(val) => !val && setModalOpen(false)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#0B2545]/10 text-[#0B2545]">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {editingLink ? 'Editar Link de Internet' : 'Novo Link de Internet'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cadastro de circuito de telecomunicação da serventia.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Operadora / Provedor <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Ex: Vivo Empresas, Claro, Provedor Local"
                  value={operadora}
                  onChange={(e) => setOperadora(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Identificação do Link
                </Label>
                <Input
                  placeholder="Ex: Link Principal Fibra ou Backup Rádio"
                  value={identificacao}
                  onChange={(e) => setIdentificacao(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Velocidade (Mbps) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={velocidadeMbps}
                  onChange={(e) => setVelocidadeMbps(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de Link</Label>
                <Select
                  value={tipoLink}
                  onValueChange={(val: 'dedicado' | 'compartilhado') => setTipoLink(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dedicado">Dedicado (Garantia 100%)</SelectItem>
                    <SelectItem value="compartilhado">Compartilhado (Banda Larga)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Meio de Transmissão</Label>
                <Select value={meioTransmissao} onValueChange={(val) => setMeioTransmissao(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Meio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fibra_optica">Fibra Óptica</SelectItem>
                    <SelectItem value="radio">Rádio Enlace</SelectItem>
                    <SelectItem value="satelite">Satélite</SelectItem>
                    <SelectItem value="cabo_metalico">Cabo Metálico</SelectItem>
                    <SelectItem value="4g_5g">Móvel 4G/5G</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-redundancia"
                    checked={redundancia}
                    onChange={(e) => setRedundancia(e.target.checked)}
                    className="rounded text-[#0B2545]"
                  />
                  <Label
                    htmlFor="chk-redundancia"
                    className="text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    É o link de redundância / contingência
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-ip"
                    checked={ipFixo}
                    onChange={(e) => setIpFixo(e.target.checked)}
                    className="rounded text-[#0B2545]"
                  />
                  <Label
                    htmlFor="chk-ip"
                    className="text-xs font-medium text-slate-800 cursor-pointer"
                  >
                    Possui Endereço IP Fixo Válido
                  </Label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Status Operacional</Label>
                <Select
                  value={status}
                  onValueChange={(val: 'ativo' | 'inativo' | 'em_manutencao') => setStatus(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo e Operacional</SelectItem>
                    <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                    <SelectItem value="inativo">Inativo / Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Designador / ID de Circuito
                </Label>
                <Input
                  placeholder="Ex: CIR-SP-982314"
                  value={circuitoId}
                  onChange={(e) => setCircuitoId(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Central de Suporte / NOC
                </Label>
                <Input
                  placeholder="Ex: 0800-015-1515 ou noc@operadora.com"
                  value={contatoSuporte}
                  onChange={(e) => setContatoSuporte(e.target.value)}
                />
              </div>
            </div>

            {/* Anexo de Contrato / Fatura com Hash */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Anexar Contrato / Comprovante de Velocidade (PDF)
              </Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="text-xs file:text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Observações</Label>
              <Textarea
                rows={2}
                placeholder="Detalhes do contrato, SLA garantido ou roteamento BGP..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0B2545] hover:bg-[#124E78] text-white"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingLink ? 'Salvar Alterações' : 'Cadastrar Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InfraConectividadeTab
