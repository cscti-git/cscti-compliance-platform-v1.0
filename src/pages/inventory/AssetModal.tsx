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
import { useToast } from '@/hooks/use-toast'
import { saveInventoryAsset, listPeople } from '@/services/csctiService'
import type {
  InventoryAssetItem,
  AssetType,
  AssetStatus,
  AssetCriticality,
  PersonItem,
} from '@/types/cscti'
import { Server, Loader2 } from 'lucide-react'

interface AssetModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  orgId: string
  asset?: InventoryAssetItem | null
}

export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'servidor_aplicacao', label: 'Servidor de Aplicação' },
  { value: 'banco_dados', label: 'Banco de Dados' },
  { value: 'storage_backup', label: 'Storage / Unidade de Backup' },
  { value: 'servico_nuvem', label: 'Serviço em Nuvem / SaaS' },
  { value: 'estacao', label: 'Estação de Trabalho' },
  { value: 'impressora_multifuncional', label: 'Impressora / Multifuncional' },
  { value: 'equipamento_rede', label: 'Equipamento de Rede (Switch/Roteador/Firewall)' },
  { value: 'outro', label: 'Outro Ativo Tecnológico' },
]

export const AssetModal: React.FC<AssetModalProps> = ({ open, onClose, onSaved, orgId, asset }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [people, setPeople] = useState<PersonItem[]>([])

  const [name, setName] = useState('')
  const [tipo, setTipo] = useState<AssetType>('estacao')
  const [status, setStatus] = useState<AssetStatus>('ativo')
  const [criticidade, setCriticidade] = useState<AssetCriticality>('media')
  const [localizacao, setLocalizacao] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [responsavel, setResponsavel] = useState<string>('none')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    if (orgId) {
      listPeople(orgId).then((res) => setPeople(res))
    }
  }, [orgId])

  useEffect(() => {
    if (asset) {
      setName(asset.name || '')
      setTipo(asset.tipo || 'estacao')
      setStatus(asset.status || 'ativo')
      setCriticidade(asset.criticidade || 'media')
      setLocalizacao(asset.localizacao || '')
      setIpAddress(asset.ip_address || '')
      setSerialNumber(asset.serial_number || '')
      setResponsavel(asset.responsavel || 'none')
      setDescricao(asset.descricao || '')
    } else {
      setName('')
      setTipo('estacao')
      setStatus('ativo')
      setCriticidade('media')
      setLocalizacao('')
      setIpAddress('')
      setSerialNumber('')
      setResponsavel('none')
      setDescricao('')
    }
  }, [asset, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe a identificação ou hostname do ativo.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await saveInventoryAsset(orgId, {
        id: asset?.id,
        name: name.trim(),
        tipo,
        status,
        criticidade,
        origem: asset?.origem || 'manual',
        localizacao: localizacao.trim(),
        ip_address: ipAddress.trim(),
        serial_number: serialNumber.trim(),
        external_id: asset?.external_id || '',
        responsavel: responsavel === 'none' ? undefined : responsavel,
        descricao: descricao.trim(),
      })

      toast({
        title: asset ? 'Ativo atualizado' : 'Ativo cadastrado',
        description: `O ativo ${name} foi salvo no inventário da serventia.`,
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar ativo',
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
              <Server className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {asset ? 'Editar Ativo do Inventário' : 'Novo Ativo Tecnológico'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Mapeamento para controle de continuidade, inventário e rotinas de backup.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nome e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-name" className="text-xs font-semibold text-slate-700">
                Identificação / Hostname <span className="text-red-500">*</span>
              </Label>
              <Input
                id="asset-name"
                placeholder="Ex: SRV-NOTAS-01 ou ESTACAO-RECEPCAO-02"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-tipo" className="text-xs font-semibold text-slate-700">
                Tipo do Ativo <span className="text-red-500">*</span>
              </Label>
              <Select value={tipo} onValueChange={(val: AssetType) => setTipo(val)}>
                <SelectTrigger id="asset-tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status e Criticidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-status" className="text-xs font-semibold text-slate-700">
                Status Operacional <span className="text-red-500">*</span>
              </Label>
              <Select value={status} onValueChange={(val: AssetStatus) => setStatus(val)}>
                <SelectTrigger id="asset-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo (Em produção)</SelectItem>
                  <SelectItem value="inativo">Inativo (Em manutenção/reserva)</SelectItem>
                  <SelectItem value="desativado">Desativado / Baixado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-criticidade" className="text-xs font-semibold text-slate-700">
                Criticidade de Continuidade <span className="text-red-500">*</span>
              </Label>
              <Select
                value={criticidade}
                onValueChange={(val: AssetCriticality) => setCriticidade(val)}
              >
                <SelectTrigger id="asset-criticidade">
                  <SelectValue placeholder="Criticidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">
                    Alta (Essencial ao funcionamento da serventia)
                  </SelectItem>
                  <SelectItem value="media">Média (Apoio operacional / Administrativo)</SelectItem>
                  <SelectItem value="baixa">Baixa (Uso pontual / Não crítico)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Localização e IP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-localizacao" className="text-xs font-semibold text-slate-700">
                Localização Física / Lógica
              </Label>
              <Input
                id="asset-localizacao"
                placeholder="Ex: Sala de Servidores - Rack 01 / Recepção"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-ip" className="text-xs font-semibold text-slate-700">
                Endereço IP / Host
              </Label>
              <Input
                id="asset-ip"
                placeholder="Ex: 192.168.1.50"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Número de Série e Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-serial" className="text-xs font-semibold text-slate-700">
                Número de Série / Tag Patrimonial
              </Label>
              <Input
                id="asset-serial"
                placeholder="Ex: BRG9283471"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-resp" className="text-xs font-semibold text-slate-700">
                Responsável Designado (Pessoa da Serventia)
              </Label>
              <Select value={responsavel} onValueChange={(val) => setResponsavel(val)}>
                <SelectTrigger id="asset-resp">
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
          </div>

          {/* Descrição e Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="asset-desc" className="text-xs font-semibold text-slate-700">
              Descrição Técnica e Finalidade Operacional
            </Label>
            <Textarea
              id="asset-desc"
              rows={3}
              placeholder="Descreva a função do ativo, sistemas instalados e política de backup aplicada..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {asset?.origem === 'glpi' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
              <span>
                <strong>Origem GLPI:</strong> Sincronizado do servidor com ID externo{' '}
                <code>#{asset.external_id}</code>.
              </span>
            </div>
          )}

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
              {asset ? 'Salvar Alterações' : 'Cadastrar Ativo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default AssetModal
