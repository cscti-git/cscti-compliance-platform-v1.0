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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  EquipamentoSimulado,
  CamadaId,
  CAMADAS_TOPOLOGIA,
  TIPOS_EQUIPAMENTO_CATALOGO,
  ILUSTRACOES_PROVISORIAS_SEMEADAS,
  ImagemAnexoEquipamento,
} from './topologiaData'
import { calculateFileSha256 } from '@/services/designacaoService'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Sparkles,
} from 'lucide-react'

export interface EditarNodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSalvar: (node: EquipamentoSimulado) => void
  nodeExistente?: EquipamentoSimulado | null
  camadaSugerida?: CamadaId
}

export const EditarNodeModal: React.FC<EditarNodeModalProps> = ({
  isOpen,
  onClose,
  onSalvar,
  nodeExistente,
  camadaSugerida = 'sala_servidores',
}) => {
  const { toast } = useToast()

  const [nome, setNome] = useState('')
  const [codigoAtivo, setCodigoAtivo] = useState('')
  const [camadaId, setCamadaId] = useState<CamadaId>(camadaSugerida)
  const [tipoEquipamento, setTipoEquipamento] = useState('Servidor Físico')
  const [fabricanteModelo, setFabricanteModelo] = useState('')
  const [ipOuIdentificacao, setIpOuIdentificacao] = useState('')
  const [status, setStatus] = useState<EquipamentoSimulado['status']>('operacional')
  const [criticidade, setCriticidade] = useState<EquipamentoSimulado['criticidade']>('alta')
  const [setor, setSetor] = useState('')
  const [capacidade, setCapacidade] = useState('')
  const [tensaoOuAlimentacao, setTensaoOuAlimentacao] = useState('')
  const [localizacaoFisica, setLocalizacaoFisica] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [iconKey, setIconKey] = useState<EquipamentoSimulado['iconKey']>('server')

  // Imagem anexada
  const [imagemAnexada, setImagemAnexada] = useState<ImagemAnexoEquipamento | undefined>(undefined)
  const [processandoArquivo, setProcessandoArquivo] = useState(false)
  const [tabImagem, setTabImagem] = useState<'upload' | 'provisoria'>('upload')

  useEffect(() => {
    if (nodeExistente) {
      setNome(nodeExistente.nome || '')
      setCodigoAtivo(nodeExistente.codigoAtivo || '')
      setCamadaId(nodeExistente.camadaId || 'sala_servidores')
      setTipoEquipamento(nodeExistente.tipoEquipamento || '')
      setFabricanteModelo(nodeExistente.fabricanteModelo || '')
      setIpOuIdentificacao(nodeExistente.ipOuIdentificacao || '')
      setStatus(nodeExistente.status || 'operacional')
      setCriticidade(nodeExistente.criticidade || 'media')
      setSetor(nodeExistente.setor || '')
      setCapacidade(nodeExistente.detalhesTecnicos?.capacidade || '')
      setTensaoOuAlimentacao(nodeExistente.detalhesTecnicos?.tensaoOuAlimentacao || '')
      setLocalizacaoFisica(nodeExistente.detalhesTecnicos?.localizacaoFisica || '')
      setObservacoes(nodeExistente.detalhesTecnicos?.observacoes || '')
      setIconKey(nodeExistente.iconKey || 'server')
      setImagemAnexada(nodeExistente.imagemAnexada)
    } else {
      const idSugerido = Math.floor(100 + Math.random() * 900)
      setNome('')
      setCodigoAtivo(`EQ-${idSugerido}`)
      setCamadaId(camadaSugerida)
      setTipoEquipamento('Servidor Rack')
      setFabricanteModelo('')
      setIpOuIdentificacao('')
      setStatus('operacional')
      setCriticidade('alta')
      setSetor('Sala de Servidores')
      setCapacidade('')
      setTensaoOuAlimentacao('')
      setLocalizacaoFisica('')
      setObservacoes('')
      setIconKey('server')
      setImagemAnexada(undefined)
    }
  }, [nodeExistente, camadaSugerida, isOpen])

  // Trata upload de imagem até 10MB com hash SHA-256
  const handleUploadArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!tiposPermitidos.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Selecione uma imagem PNG, JPG, WEBP ou SVG.',
        variant: 'destructive',
      })
      return
    }

    const maxBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxBytes) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido para fotos de equipamentos é 10MB.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoArquivo(true)
    try {
      const sha256 = await calculateFileSha256(file)

      // Converte para dataUrl
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const tamanhoFormatado =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(2)} MB`

        const novaImagem: ImagemAnexoEquipamento = {
          id: `img-${Date.now()}`,
          nomeArquivo: file.name,
          tamanhoFormatado,
          tamanhoBytes: file.size,
          mimeType: file.type,
          dataUpload: new Date().toISOString(),
          sha256,
          dataUrl,
          isSvgProvisorio: false,
          titulo: file.name,
        }

        setImagemAnexada(novaImagem)
        setProcessandoArquivo(false)

        toast({
          title: 'Imagem anexada ao nó',
          description: `Hash SHA-256 gerado: ${sha256.substring(0, 12)}...`,
        })
      }

      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Erro ao processar imagem do equipamento:', err)
      setProcessandoArquivo(false)
      toast({
        title: 'Erro ao processar imagem',
        description: 'Não foi possível ler o arquivo enviado.',
        variant: 'destructive',
      })
    }
  }

  // Vincula ilustração SVG pré-semeada provisória
  const handleSelecionarIlustracao = (item: (typeof ILUSTRACOES_PROVISORIAS_SEMEADAS)[0]) => {
    const novaImagem: ImagemAnexoEquipamento = {
      id: `svg-${Date.now()}`,
      nomeArquivo: item.arquivo,
      tamanhoFormatado: 'SVG Provisório',
      dataUpload: new Date().toISOString(),
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      dataUrl: item.url,
      isSvgProvisorio: true,
      titulo: item.titulo,
    }
    setImagemAnexada(novaImagem)
    toast({
      title: 'Ilustração vinculada',
      description: `${item.titulo} anexada provisoriamente ao equipamento.`,
    })
  }

  // Ao trocar o tipo de equipamento no seletor, atualiza ícone e sugestão de camada
  const handleTrocaTipo = (tipoStr: string) => {
    const achado = TIPOS_EQUIPAMENTO_CATALOGO.find((t) => t.tipo === tipoStr)
    setTipoEquipamento(achado ? achado.label : tipoStr)
    if (achado) {
      setIconKey(achado.iconKey)
      if (!nodeExistente) {
        setCamadaId(achado.camadaPadrao)
        const camadaConfig = CAMADAS_TOPOLOGIA.find((c) => c.id === achado.camadaPadrao)
        if (camadaConfig) setSetor(camadaConfig.titulo.replace(/^[0-9]\.\s*/, ''))
      }
    }
  }

  const handleSalvar = () => {
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do equipamento para identificá-lo no diagrama.',
        variant: 'destructive',
      })
      return
    }

    const camadaConfig = CAMADAS_TOPOLOGIA.find((c) => c.id === camadaId)
    const setorFinal = setor.trim() || camadaConfig?.titulo.replace(/^[0-9]\.\s*/, '') || 'Setor TI'

    const nodeFinal: EquipamentoSimulado = {
      id: nodeExistente?.id || `node-manual-${Date.now()}`,
      nome: nome.trim(),
      codigoAtivo: codigoAtivo.trim() || `EQ-${Date.now().toString().slice(-4)}`,
      setor: setorFinal,
      camadaId,
      tipoEquipamento: tipoEquipamento.trim() || 'Equipamento',
      fabricanteModelo: fabricanteModelo.trim() || 'Modelo sob especificação',
      ipOuIdentificacao: ipOuIdentificacao.trim() || undefined,
      status,
      criticidade,
      iconKey,
      isRealData: nodeExistente?.isRealData ?? true,
      isCriadoManualmente: nodeExistente?.isCriadoManualmente ?? true,
      precisaCadastro: false,
      posicaoCanvas: nodeExistente?.posicaoCanvas,
      imagemAnexada,
      assetOrigemId: nodeExistente?.assetOrigemId,
      infraOrigemId: nodeExistente?.infraOrigemId,
      glpiVinculoSimulado: nodeExistente?.glpiVinculoSimulado,
      evidenciaFotoSimulada: nodeExistente?.evidenciaFotoSimulada,
      infraNobreakSimulado: nodeExistente?.infraNobreakSimulado,
      conectividadeLinkSimulado: nodeExistente?.conectividadeLinkSimulado,
      detalhesTecnicos: {
        capacidade: capacidade.trim() || undefined,
        tensaoOuAlimentacao: tensaoOuAlimentacao.trim() || undefined,
        localizacaoFisica: localizacaoFisica.trim() || setorFinal,
        observacoes: observacoes.trim() || 'Componente adicionado/editado no diagrama.',
      },
    }

    onSalvar(nodeFinal)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
            {nodeExistente ? 'Editar Nó do Diagrama' : 'Adicionar Novo Nó ao Mapa'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Defina camada, especificações técnicas e anexe imagem comprobatória com hash SHA-256.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Linha 1: Nome e Código */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nome do Equipamento *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Switch Core 24p L3, Nobreak Central, etc."
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Código / Tag</Label>
              <Input
                value={codigoAtivo}
                onChange={(e) => setCodigoAtivo(e.target.value)}
                placeholder="Ex: SW-CORE-01"
                className="text-xs font-mono h-9"
              />
            </div>
          </div>

          {/* Linha 2: Camada e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Camada / Bloco do Setor *
              </Label>
              <select
                value={camadaId}
                onChange={(e) => setCamadaId(e.target.value as CamadaId)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CAMADAS_TOPOLOGIA.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Tipo de Equipamento (Biblioteca) *
              </Label>
              <select
                onChange={(e) => handleTrocaTipo(e.target.value)}
                defaultValue={
                  TIPOS_EQUIPAMENTO_CATALOGO.find(
                    (t) => t.iconKey === iconKey || t.label === tipoEquipamento,
                  )?.tipo || 'servidor'
                }
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS_EQUIPAMENTO_CATALOGO.map((t) => (
                  <option key={t.tipo} value={t.tipo}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 3: Fabricante/Modelo e IP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Fabricante / Modelo</Label>
              <Input
                value={fabricanteModelo}
                onChange={(e) => setFabricanteModelo(e.target.value)}
                placeholder="Ex: Dell PowerEdge R750 / Aruba 6200F"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Endereço IP / Identificação de Rede
              </Label>
              <Input
                value={ipOuIdentificacao}
                onChange={(e) => setIpOuIdentificacao(e.target.value)}
                placeholder="Ex: 192.168.10.15 ou VLAN 20"
                className="text-xs font-mono h-9"
              />
            </div>
          </div>

          {/* Linha 4: Status e Criticidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status Operacional</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900"
              >
                <option value="operacional">Operacional</option>
                <option value="alerta">Em Alerta</option>
                <option value="manutencao">Em Manutenção</option>
                <option value="critico">Crítico</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Criticidade</Label>
              <select
                value={criticidade}
                onChange={(e) => setCriticidade(e.target.value as any)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900"
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Setor / Local</Label>
              <Input
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                placeholder="Ex: Rack 42U - CPD"
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Linha 5: Capacidade e Alimentação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Capacidade / Potência / Velocidade
              </Label>
              <Input
                value={capacidade}
                onChange={(e) => setCapacidade(e.target.value)}
                placeholder="Ex: 20 kVA, 10 Gbps, 24 TB"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Alimentação Elétrica</Label>
              <Input
                value={tensaoOuAlimentacao}
                onChange={(e) => setTensaoOuAlimentacao(e.target.value)}
                placeholder="Ex: 220V Bifásico / Nobreak Central"
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Observações e Papel na Topologia
            </Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva a finalidade técnica, conexões ou papel de conformidade deste equipamento."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* SEÇÃO DE IMAGEM DO NÓ */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <Label className="text-xs font-bold text-slate-900">
                  Imagem / Foto do Equipamento
                </Label>
              </div>
              {imagemAnexada && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImagemAnexada(undefined)}
                  className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover imagem</span>
                </Button>
              )}
            </div>

            {imagemAnexada ? (
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                  <img
                    src={imagemAnexada.dataUrl}
                    alt={imagemAnexada.nomeArquivo}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 truncate">
                      {imagemAnexada.nomeArquivo}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {imagemAnexada.isSvgProvisorio ? 'SVG Provisório' : 'Upload'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {imagemAnexada.tamanhoFormatado}
                  </p>
                  {imagemAnexada.sha256 && (
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      SHA-256: {imagemAnexada.sha256}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Tabs
                value={tabImagem}
                onValueChange={(v) => setTabImagem(v as any)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 h-8 text-xs">
                  <TabsTrigger value="upload" className="text-xs">
                    Upload de Imagem (até 10MB)
                  </TabsTrigger>
                  <TabsTrigger value="provisoria" className="text-xs">
                    Vincular SVG Provisório
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="pt-2">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors bg-white">
                    <input
                      type="file"
                      id="input-imagem-node"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleUploadArquivo}
                      disabled={processandoArquivo}
                    />
                    <label
                      htmlFor="input-imagem-node"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700">
                        {processandoArquivo
                          ? 'Calculando hash SHA-256...'
                          : 'Clique para selecionar foto/desenho (PNG, JPG, WEBP)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Até 10MB • Hash SHA-256 gerado automaticamente
                      </span>
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="provisoria" className="pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {ILUSTRACOES_PROVISORIAS_SEMEADAS.map((item) => (
                      <button
                        key={item.arquivo}
                        type="button"
                        onClick={() => handleSelecionarIlustracao(item)}
                        className="p-2 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center text-center gap-1.5 transition-colors bg-white group"
                      >
                        <div className="w-12 h-12 flex items-center justify-center">
                          <img
                            src={item.url}
                            alt={item.titulo}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-700 line-clamp-1 group-hover:text-blue-900">
                          {item.titulo.replace('Ilustração — ', '')}
                        </span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSalvar}
            className="text-xs bg-[#0B2545] hover:bg-[#124E78] text-white"
          >
            {nodeExistente ? 'Atualizar Nó' : 'Adicionar ao Mapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditarNodeModal
