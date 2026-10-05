import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  saveOrganizationType,
  deleteOrganizationType,
  saveInstitutionalService,
  deleteInstitutionalService,
} from '@/services/csctiService'
import type { OrganizationTypeItem, InstitutionalServiceItem } from '@/types/cscti'
import { useToast } from '@/hooks/use-toast'
import { FolderTree, Building, Briefcase, Plus, Trash2, Edit2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface CatalogsTabProps {
  types: OrganizationTypeItem[]
  services: InstitutionalServiceItem[]
  onRefresh: () => Promise<void>
  readOnly?: boolean
}

export const CatalogsTab: React.FC<CatalogsTabProps> = ({
  types,
  services,
  onRefresh,
  readOnly = false,
}) => {
  const { toast } = useToast()

  // Type Modal
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<OrganizationTypeItem | null>(null)
  const [typeName, setTypeName] = useState('')
  const [typeCode, setTypeCode] = useState('')
  const [typeDesc, setTypeDesc] = useState('')
  const [typeStatus, setTypeStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [isSavingType, setIsSavingType] = useState(false)

  // Service Modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<InstitutionalServiceItem | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [serviceCode, setServiceCode] = useState('')
  const [serviceDesc, setServiceDesc] = useState('')
  const [serviceStatus, setServiceStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [isSavingService, setIsSavingService] = useState(false)

  // Type Handlers
  const handleOpenTypeModal = (item?: OrganizationTypeItem) => {
    if (item) {
      setEditingType(item)
      setTypeName(item.name)
      setTypeCode(item.code)
      setTypeDesc(item.description || '')
      setTypeStatus(item.status)
    } else {
      setEditingType(null)
      setTypeName('')
      setTypeCode('')
      setTypeDesc('')
      setTypeStatus('ativo')
    }
    setTypeModalOpen(true)
  }

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!typeName.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome do tipo é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingType(true)
    try {
      await saveOrganizationType({
        id: editingType?.id,
        name: typeName.trim(),
        code: typeCode.trim() || undefined,
        description: typeDesc.trim(),
        status: typeStatus,
      })
      await onRefresh()
      setTypeModalOpen(false)
      toast({ title: 'Sucesso', description: 'Tipo de organização salvo com sucesso.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao salvar tipo.', variant: 'destructive' })
    } finally {
      setIsSavingType(false)
    }
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm('Deseja excluir este tipo de organização?')) return
    try {
      await deleteOrganizationType(id)
      await onRefresh()
      toast({ title: 'Removido', description: 'Tipo excluído com sucesso.' })
    } catch (err) {
      console.error(err)
    }
  }

  // Service Handlers
  const handleOpenServiceModal = (item?: InstitutionalServiceItem) => {
    if (item) {
      setEditingService(item)
      setServiceName(item.name)
      setServiceCode(item.code)
      setServiceDesc(item.description || '')
      setServiceStatus(item.status)
    } else {
      setEditingService(null)
      setServiceName('')
      setServiceCode('')
      setServiceDesc('')
      setServiceStatus('ativo')
    }
    setServiceModalOpen(true)
  }

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceName.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome do serviço é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingService(true)
    try {
      await saveInstitutionalService({
        id: editingService?.id,
        name: serviceName.trim(),
        code: serviceCode.trim() || undefined,
        description: serviceDesc.trim(),
        status: serviceStatus,
      })
      await onRefresh()
      setServiceModalOpen(false)
      toast({ title: 'Sucesso', description: 'Serviço institucional salvo com sucesso.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao salvar serviço.', variant: 'destructive' })
    } finally {
      setIsSavingService(false)
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm('Deseja excluir este serviço institucional?')) return
    try {
      await deleteInstitutionalService(id)
      await onRefresh()
      toast({ title: 'Removido', description: 'Serviço excluído com sucesso.' })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Catálogo 1: Tipos de Organização */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Tipos de Organização ({types.length})
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Natureza cartorial e tipos de serventias extrajudiciais
                </CardDescription>
              </div>
            </div>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenTypeModal()}
                className="text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" /> Novo Tipo
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {types.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhum tipo cadastrado.</p>
              ) : (
                types.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-start justify-between hover:bg-slate-50/60"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {item.code}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ${
                            item.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-100'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{item.description}</p>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenTypeModal(item)}
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteType(item.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Catálogo 2: Serviços Institucionais */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Serviços Institucionais ({services.length})
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Atos notariais e registrais operados na serventia
                </CardDescription>
              </div>
            </div>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenServiceModal()}
                className="text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" /> Novo Serviço
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {services.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Nenhum serviço cadastrado.
                </p>
              ) : (
                services.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-start justify-between hover:bg-slate-50/60"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {item.code}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ${
                            item.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-100'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{item.description}</p>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenServiceModal(item)}
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteService(item.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL TIPO */}
      <Dialog open={typeModalOpen} onOpenChange={setTypeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingType ? 'Editar Tipo de Organização' : 'Novo Tipo de Organização'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveType} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do Tipo *</Label>
              <Input
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Código Técnico (TIPO-*)
              </Label>
              <Input
                placeholder="Ex: TAB-NOTAS (Automático se vazio)"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                className="text-xs h-9 font-mono uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
              <textarea
                rows={2}
                value={typeDesc}
                onChange={(e) => setTypeDesc(e.target.value)}
                className="w-full text-xs p-2.5 rounded-md border border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <select
                value={typeStatus}
                onChange={(e) => setTypeStatus(e.target.value as 'ativo' | 'inativo')}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTypeModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingType}
                className="bg-blue-700 text-white text-xs"
              >
                {isSavingType ? 'Salvando...' : 'Salvar Tipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SERVIÇO */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingService ? 'Editar Serviço Institucional' : 'Novo Serviço Institucional'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveService} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do Serviço *</Label>
              <Input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Código Técnico (SERV-*)
              </Label>
              <Input
                placeholder="Ex: SERV-NOTAS (Automático se vazio)"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                className="text-xs h-9 font-mono uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Descrição do Serviço</Label>
              <textarea
                rows={2}
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                className="w-full text-xs p-2.5 rounded-md border border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <select
                value={serviceStatus}
                onChange={(e) => setServiceStatus(e.target.value as 'ativo' | 'inativo')}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setServiceModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingService}
                className="bg-indigo-700 text-white text-xs"
              >
                {isSavingService ? 'Salvando...' : 'Salvar Serviço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default CatalogsTab
