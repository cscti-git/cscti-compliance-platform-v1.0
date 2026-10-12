import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  saveInfraItem,
  INFRA_EVIDENCIA_CATEGORIAS_MAP,
  SaveInfraItemPayload,
} from '@/services/infraestruturaService'
import { listEvidencias } from '@/services/evidenciaService'
import { listPeople } from '@/services/csctiService'
import {
  Zap,
  Building,
  UploadCloud,
  FileCheck2,
  FolderGit2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  InfraItem,
  InfraCategoria,
  InfraItemStatus,
  EvidenciaItem,
  PersonItem,
} from '@/types/cscti'

interface InfraItemModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  orgId: string
  categoriaPadrao: InfraCategoria
  item?: InfraItem | null
  tipoItemPadrao?: string
}

export const InfraItemModal: React.FC<InfraItemModalProps> = ({
  open,
  onClose,
  onSaved,
  orgId,
  categoriaPadrao,
  item,
  tipoItemPadrao,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([])
  const [people, setPeople] = useState<PersonItem[]>([])

  // Formulário
  const [categoria, setCategoria] = useState<InfraCategoria>(categoriaPadrao)
  const [tipoItem, setTipoItem] = useState<string>(tipoItemPadrao || 'nobreak')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<InfraItemStatus>('conforme')

  // Nobreak / Gerador
  const [modelo, setModelo] = useState('')
  const [autonomiaMinutos, setAutonomiaMinutos] = useState<string>('')
  const [quantidade, setQuantidade] = useState<string>('1')
  const [potenciaVa, setPotenciaVa] = useState<string>('')

  // Aterramento
  const [artNumero, setArtNumero] = useState('')
  const [responsavelTecnico, setResponsavelTecnico] = useState('')
  const [dataInspecao, setDataInspecao] = useState('')
  const [dataValidade, setDataValidade] = useState('')

  // Climatização / Extintores / Acesso
  const [redundanciaInstalada, setRedundanciaInstalada] = useState(false)
  const [dataRecargaExtintor, setDataRecargaExtintor] = useState('')
  const [dataVencimentoExtintor, setDataVencimentoExtintor] = useState('')
  const [tipoControleAcesso, setTipoControleAcesso] = useState('Biometria / Chave Eletrônica')

  // Criptografia
  const [criptografiaRepouso, setCriptografiaRepouso] = useState(true)
  const [criptografiaTransito, setCriptografiaTransito] = useState(true)
  const [algoritmoCriptografia, setAlgoritmoCriptografia] = useState('AES-256 / TLS 1.3')

  // Evidência Vinculada
  const [evidenciaVinculada, setEvidenciaVinculada] = useState<string>('none')
  const [responsavelDesignado, setResponsavelDesignado] = useState<string>('none')
  const [observacoes, setObservacoes] = useState('')

  // Arquivo anexo
  const [arquivo, setArquivo] = useState<File | null>(null)

  // Categoria de evidência sugerida
  const categoriaEvidenciaSugerida =
    INFRA_EVIDENCIA_CATEGORIAS_MAP[tipoItem] || 'Documentos e Políticas'

  useEffect(() => {
    if (orgId) {
      listEvidencias(orgId).then((res) => setEvidencias(res))
      listPeople(orgId).then((res) => setPeople(res))
    }
  }, [orgId, open])

  useEffect(() => {
    if (item) {
      setCategoria(item.categoria)
      setTipoItem(item.tipo_item)
      setTitulo(item.titulo || '')
      setDescricao(item.descricao || '')
      setStatus(item.status || 'conforme')
      setModelo(item.modelo || '')
      setAutonomiaMinutos(item.autonomia_minutos ? String(item.autonomia_minutos) : '')
      setQuantidade(item.quantidade ? String(item.quantidade) : '1')
      setPotenciaVa(item.potencia_va ? String(item.potencia_va) : '')
      setArtNumero(item.art_numero || '')
      setResponsavelTecnico(item.responsavel_tecnico || '')
      setDataInspecao(item.data_inspecao ? item.data_inspecao.substring(0, 10) : '')
      setDataValidade(item.data_validade ? item.data_validade.substring(0, 10) : '')
      setRedundanciaInstalada(Boolean(item.redundancia_instalada))
      setDataRecargaExtintor(
        item.data_recarga_extintor ? item.data_recarga_extintor.substring(0, 10) : '',
      )
      setDataVencimentoExtintor(
        item.data_vencimento_extintor ? item.data_vencimento_extintor.substring(0, 10) : '',
      )
      setTipoControleAcesso(item.tipo_controle_acesso || '')
      setCriptografiaRepouso(item.criptografia_repouso ?? true)
      setCriptografiaTransito(item.criptografia_transito ?? true)
      setAlgoritmoCriptografia(item.algoritmo_criptografia || 'AES-256 / TLS 1.3')
      setEvidenciaVinculada(item.evidencia_vinculada || 'none')
      setResponsavelDesignado(item.responsavel_designado || 'none')
      setObservacoes(item.observacoes || '')
      setArquivo(null)
    } else {
      setCategoria(categoriaPadrao)
      setTipoItem(tipoItemPadrao || (categoriaPadrao === 'energia' ? 'nobreak' : 'sala_ti'))
      setTitulo('')
      setDescricao('')
      setStatus('conforme')
      setModelo('')
      setAutonomiaMinutos('')
      setQuantidade('1')
      setPotenciaVa('')
      setArtNumero('')
      setResponsavelTecnico('')
      setDataInspecao('')
      setDataValidade('')
      setRedundanciaInstalada(false)
      setDataRecargaExtintor('')
      setDataVencimentoExtintor('')
      setTipoControleAcesso('Biometria / Fechadura Eletrônica')
      setCriptografiaRepouso(true)
      setCriptografiaTransito(true)
      setAlgoritmoCriptografia('AES-256 / TLS 1.3')
      setEvidenciaVinculada('none')
      setResponsavelDesignado('none')
      setObservacoes('')
      setArquivo(null)
    }
  }, [item, open, categoriaPadrao, tipoItemPadrao])

  // Filtrar evidências correspondentes à categoria sugerida
  const evidenciasDaCategoria = evidencias.filter(
    (ev) =>
      ev.categoria_nome?.toLowerCase() === categoriaEvidenciaSugerida.toLowerCase() ||
      ev.expand?.categoria?.name?.toLowerCase() === categoriaEvidenciaSugerida.toLowerCase(),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe uma identificação para o item de infraestrutura.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const payload: SaveInfraItemPayload = {
        id: item?.id,
        categoria,
        tipo_item: tipoItem,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        status,
        modelo: modelo.trim(),
        autonomia_minutos: autonomiaMinutos ? Number(autonomiaMinutos) : undefined,
        quantidade: quantidade ? Number(quantidade) : undefined,
        potencia_va: potenciaVa ? Number(potenciaVa) : undefined,
        art_numero: artNumero.trim(),
        responsavel_tecnico: responsavelTecnico.trim(),
        data_inspecao: dataInspecao || undefined,
        data_validade: dataValidade || undefined,
        redundancia_instalada: redundanciaInstalada,
        data_recarga_extintor: dataRecargaExtintor || undefined,
        data_vencimento_extintor: dataVencimentoExtintor || undefined,
        tipo_controle_acesso: tipoControleAcesso.trim(),
        criptografia_repouso: criptografiaRepouso,
        criptografia_transito: criptografiaTransito,
        algoritmo_criptografia: algoritmoCriptografia.trim(),
        evidencia_vinculada: evidenciaVinculada === 'none' ? undefined : evidenciaVinculada,
        categoria_evidencia_sugerida: categoriaEvidenciaSugerida,
        responsavel_designado: responsavelDesignado === 'none' ? undefined : responsavelDesignado,
        observacoes: observacoes.trim(),
        arquivosNovos: arquivo ? [arquivo] : undefined,
        arquivosExistentes: item?.arquivos,
        hash_sha256: item?.hash_sha256,
      }

      await saveInfraItem(orgId, payload)
      toast({
        title: item ? 'Item atualizado' : 'Item cadastrado',
        description: `O registro "${titulo}" foi gravado com sucesso.`,
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar item',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#0B2545]/10 text-[#0B2545]">
              {categoria === 'energia' ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Building className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {item ? 'Editar Item de Infraestrutura' : 'Novo Item Comprobatório'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Prova documental e vínculo com evidência fotográfica da serventia.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Categoria e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Seção de Infraestrutura
              </Label>
              <Select
                value={categoria}
                onValueChange={(val: InfraCategoria) => {
                  setCategoria(val)
                  if (val === 'energia') setTipoItem('nobreak')
                  else if (val === 'ambiente_fisico') setTipoItem('sala_ti')
                  else setTipoItem('criptografia_dados')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="energia">Energia Elétrica</SelectItem>
                  <SelectItem value="ambiente_fisico">Ambiente Físico</SelectItem>
                  <SelectItem value="camada_logica">Camada Lógica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Tipo de Equipamento / Controle
              </Label>
              <Select value={tipoItem} onValueChange={(val) => setTipoItem(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {categoria === 'energia' && (
                    <>
                      <SelectItem value="nobreak">Nobreak (UPS)</SelectItem>
                      <SelectItem value="gerador">Gerador / Redundância</SelectItem>
                      <SelectItem value="laudo_aterramento">Laudo de Aterramento (ART)</SelectItem>
                      <SelectItem value="plano_contingencia_energia">
                        Plano de Contingência
                      </SelectItem>
                    </>
                  )}
                  {categoria === 'ambiente_fisico' && (
                    <>
                      <SelectItem value="sala_ti">Sala de TI / Servidores</SelectItem>
                      <SelectItem value="racks">Racks e Cabeamento</SelectItem>
                      <SelectItem value="ar_condicionado">
                        Climatização (Ar-condicionado)
                      </SelectItem>
                      <SelectItem value="combate_incendio">
                        Combate a Incêndio (Extintores)
                      </SelectItem>
                      <SelectItem value="controle_acesso_fisico">
                        Controle de Acesso Físico
                      </SelectItem>
                    </>
                  )}
                  {categoria === 'camada_logica' && (
                    <>
                      <SelectItem value="criptografia_dados">
                        Criptografia (Repouso e Trânsito)
                      </SelectItem>
                      <SelectItem value="outros">Outro Controle Lógico</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Título e Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="item-titulo" className="text-xs font-semibold text-slate-700">
                Título / Identificação do Registro <span className="text-red-500">*</span>
              </Label>
              <Input
                id="item-titulo"
                placeholder="Ex: Nobreak Rack Principal 3kVA ou Laudo de Aterramento 2026"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status de Conformidade</Label>
              <Select value={status} onValueChange={(val: InfraItemStatus) => setStatus(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conforme">Conforme</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campos Específicos por Tipo */}
          {(tipoItem === 'nobreak' || tipoItem === 'gerador') && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">Modelo / Fabricante</Label>
                <Input
                  placeholder="Ex: APC Smart-UPS 3000"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">Autonomia (minutos)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 60"
                  value={autonomiaMinutos}
                  onChange={(e) => setAutonomiaMinutos(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">Potência (VA)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 3000"
                  value={potenciaVa}
                  onChange={(e) => setPotenciaVa(e.target.value)}
                />
              </div>
            </div>
          )}

          {tipoItem === 'laudo_aterramento' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">Número da ART</Label>
                <Input
                  placeholder="Ex: ART-CREA-129485"
                  value={artNumero}
                  onChange={(e) => setArtNumero(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">
                  Responsável Técnico (Engenheiro)
                </Label>
                <Input
                  placeholder="Nome completo e CREA"
                  value={responsavelTecnico}
                  onChange={(e) => setResponsavelTecnico(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">Data da Inspeção</Label>
                <Input
                  type="date"
                  value={dataInspecao}
                  onChange={(e) => setDataInspecao(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">Validade do Laudo</Label>
                <Input
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                />
              </div>
            </div>
          )}

          {tipoItem === 'combate_incendio' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">Data da Última Recarga</Label>
                <Input
                  type="date"
                  value={dataRecargaExtintor}
                  onChange={(e) => setDataRecargaExtintor(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">
                  Data de Vencimento da Carga
                </Label>
                <Input
                  type="date"
                  value={dataVencimentoExtintor}
                  onChange={(e) => setDataVencimentoExtintor(e.target.value)}
                />
              </div>
            </div>
          )}

          {(tipoItem === 'ar_condicionado' ||
            tipoItem === 'sala_ti' ||
            tipoItem === 'controle_acesso_fisico') && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="redundancia"
                  checked={redundanciaInstalada}
                  onChange={(e) => setRedundanciaInstalada(e.target.checked)}
                  className="rounded text-[#0B2545]"
                />
                <Label
                  htmlFor="redundancia"
                  className="text-xs font-medium text-slate-800 cursor-pointer"
                >
                  Possui redundância instalada / alternância de equipamentos
                </Label>
              </div>
              {tipoItem === 'controle_acesso_fisico' && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Mecanismo de Controle de Entrada
                  </Label>
                  <Input
                    placeholder="Ex: Fechadura biométrica com log de acessos e chave física sob guarda do titular"
                    value={tipoControleAcesso}
                    onChange={(e) => setTipoControleAcesso(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {tipoItem === 'criptografia_dados' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cripto-repouso"
                    checked={criptografiaRepouso}
                    onChange={(e) => setCriptografiaRepouso(e.target.checked)}
                    className="rounded text-[#0B2545]"
                  />
                  <Label
                    htmlFor="cripto-repouso"
                    className="text-xs font-medium text-slate-800 cursor-pointer"
                  >
                    Criptografia em Repouso (BitLocker / LUKS / Bancos)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cripto-transito"
                    checked={criptografiaTransito}
                    onChange={(e) => setCriptografiaTransito(e.target.checked)}
                    className="rounded text-[#0B2545]"
                  />
                  <Label
                    htmlFor="cripto-transito"
                    className="text-xs font-medium text-slate-800 cursor-pointer"
                  >
                    Criptografia em Trânsito (TLS 1.2+ / VPN / HTTPS)
                  </Label>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">
                  Padrões / Algoritmos Aplicados
                </Label>
                <Input
                  placeholder="Ex: AES-256 no volume do banco e TLS 1.3 nas rotas web"
                  value={algoritmoCriptografia}
                  onChange={(e) => setAlgoritmoCriptografia(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* VÍNCULO OBRIGATÓRIO COM EVIDÊNCIA FOTOGRÁFICA / DOCUMENTAL */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-blue-700" />
                <Label className="text-xs font-bold text-blue-900">
                  Vínculo com a Central de Evidências (Prova Visual)
                </Label>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] bg-white border-blue-300 text-blue-700"
              >
                Categoria: {categoriaEvidenciaSugerida}
              </Badge>
            </div>

            <p className="text-[11px] text-blue-800 leading-tight">
              A foto ou comprovante cadastrado na Central de Evidências serve como prova visual
              definitiva auditada diante de inspeções.
            </p>

            <Select value={evidenciaVinculada} onValueChange={(val) => setEvidenciaVinculada(val)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione a evidência correspondente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma evidência vinculada no momento</SelectItem>
                {evidencias.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.titulo} ({ev.categoria_nome}) •{' '}
                    {ev.data_evidencia ? ev.data_evidencia.substring(0, 10) : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {evidenciasDaCategoria.length === 0 && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>
                    Nenhuma evidência cadastrada na categoria "{categoriaEvidenciaSugerida}".
                  </span>
                </div>
                <Link
                  to={`/evidencias?categoria=${encodeURIComponent(categoriaEvidenciaSugerida)}`}
                  target="_blank"
                  className="font-bold text-blue-700 hover:underline flex items-center gap-1 ml-2"
                >
                  <span>Criar na Central</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Anexo de Arquivo Direto (Laudo PDF, ART, Foto) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Anexar Documento / Laudo / ART (Calcula SHA-256 automaticamente)</span>
              {item?.hash_sha256 && (
                <span className="text-[10px] font-mono text-slate-500">
                  Hash atual: {item.hash_sha256.substring(0, 12)}...
                </span>
              )}
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="text-xs file:text-xs"
              />
            </div>
          </div>

          {/* Responsável de Papéis & Responsáveis */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Responsável Designado (Papéis & Responsáveis)
            </Label>
            <Select
              value={responsavelDesignado}
              onValueChange={(val) => setResponsavelDesignado(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum responsável vinculado</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.role_title ? `(${p.role_title})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Observações Técnicas e Complementares
            </Label>
            <Textarea
              rows={2}
              placeholder="Descreva detalhes de instalação, rotinas de teste ou observações de inspeção..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#0B2545] hover:bg-[#124E78] text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {item ? 'Salvar Alterações' : 'Salvar Registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default InfraItemModal
