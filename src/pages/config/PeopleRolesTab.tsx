import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  savePerson,
  deletePerson,
  saveRole,
  deleteRole,
  createAssignment,
  updateAssignmentStatus,
  deleteAssignment,
} from '@/services/csctiService'
import type { PersonItem, RoleItem, AssignmentItem } from '@/types/cscti'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  Shield,
  FileCheck2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PeopleRolesTabProps {
  organizationId: string
  people: PersonItem[]
  roles: RoleItem[]
  assignments: AssignmentItem[]
  onRefresh: () => Promise<void>
  readOnly?: boolean
}

export const PeopleRolesTab: React.FC<PeopleRolesTabProps> = ({
  organizationId,
  people,
  roles,
  assignments,
  onRefresh,
  readOnly = false,
}) => {
  const { toast } = useToast()

  // Modal Person
  const [personDialogOpen, setPersonDialogOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<PersonItem | null>(null)
  const [personName, setPersonName] = useState('')
  const [personRoleTitle, setPersonRoleTitle] = useState('')
  const [personEmail, setPersonEmail] = useState('')
  const [personPhone, setPersonPhone] = useState('')
  const [personStatus, setPersonStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [isSavingPerson, setIsSavingPerson] = useState(false)

  // Modal Role
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [roleMode, setRoleMode] = useState('')
  const [roleStatus, setRoleStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [isSavingRole, setIsSavingRole] = useState(false)

  // Assignment Modal
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState('')
  const [assignEndDate, setAssignEndDate] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)

  // Handlers Person
  const handleOpenPersonDialog = (p?: PersonItem) => {
    if (p) {
      setEditingPerson(p)
      setPersonName(p.name)
      setPersonRoleTitle(p.role_title || '')
      setPersonEmail(p.email)
      setPersonPhone(p.phone || '')
      setPersonStatus(p.status)
    } else {
      setEditingPerson(null)
      setPersonName('')
      setPersonRoleTitle('')
      setPersonEmail('')
      setPersonPhone('')
      setPersonStatus('ativo')
    }
    setPersonDialogOpen(true)
  }

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personName.trim() || !personEmail.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome e E-mail são obrigatórios.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingPerson(true)
    try {
      await savePerson(organizationId, {
        id: editingPerson?.id,
        name: personName.trim(),
        role_title: personRoleTitle.trim(),
        email: personEmail.trim(),
        phone: personPhone.trim(),
        status: personStatus,
      })
      await onRefresh()
      setPersonDialogOpen(false)
      toast({ title: 'Sucesso', description: 'Registro de pessoa salvo com sucesso.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao salvar pessoa.', variant: 'destructive' })
    } finally {
      setIsSavingPerson(false)
    }
  }

  const handleDeletePerson = async (id: string) => {
    if (!confirm('Deseja realmente remover esta pessoa?')) return
    try {
      await deletePerson(id, organizationId)
      await onRefresh()
      toast({ title: 'Removido', description: 'Pessoa removida com sucesso.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' })
    }
  }

  // Handlers Role
  const handleOpenRoleDialog = (r?: RoleItem) => {
    if (r) {
      setEditingRole(r)
      setRoleName(r.name)
      setRoleCode(r.code)
      setRoleDesc(r.description || '')
      setRoleMode(r.suggested_mode || '')
      setRoleStatus(r.status)
    } else {
      setEditingRole(null)
      setRoleName('')
      setRoleCode('')
      setRoleDesc('')
      setRoleMode('')
      setRoleStatus('ativo')
    }
    setRoleDialogOpen(true)
  }

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome do papel é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingRole(true)
    try {
      await saveRole({
        id: editingRole?.id,
        name: roleName.trim(),
        code: roleCode.trim() || undefined,
        description: roleDesc.trim(),
        suggested_mode: roleMode.trim(),
        status: roleStatus,
      })
      await onRefresh()
      setRoleDialogOpen(false)
      toast({ title: 'Sucesso', description: 'Papel de responsabilidade salvo.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao salvar papel.', variant: 'destructive' })
    } finally {
      setIsSavingRole(false)
    }
  }

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Deseja excluir este papel?')) return
    try {
      await deleteRole(id)
      await onRefresh()
      toast({ title: 'Removido', description: 'Papel excluído.' })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o papel.',
        variant: 'destructive',
      })
    }
  }

  // Handlers Assignment
  const handleOpenAssignmentDialog = () => {
    setSelectedPersonId(people[0]?.id || '')
    setSelectedRoleId(roles[0]?.id || '')
    setAssignStartDate('')
    setAssignEndDate('')
    setAssignNotes('')
    setAssignmentDialogOpen(true)
  }

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPersonId || !selectedRoleId) {
      toast({
        title: 'Atenção',
        description: 'Selecione a pessoa e o papel.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingAssignment(true)
    try {
      await createAssignment(organizationId, {
        person: selectedPersonId,
        role: selectedRoleId,
        start_date: assignStartDate ? new Date(assignStartDate).toISOString() : undefined,
        end_date: assignEndDate ? new Date(assignEndDate).toISOString() : undefined,
        notes: assignNotes.trim(),
      })
      await onRefresh()
      setAssignmentDialogOpen(false)
      toast({ title: 'Sucesso', description: 'Atribuição de responsabilidade designada.' })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao atribuir responsabilidade.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingAssignment(false)
    }
  }

  const handleEncerrarAssignment = async (id: string) => {
    try {
      await updateAssignmentStatus(id, 'encerrado', organizationId)
      await onRefresh()
      toast({ title: 'Status Atualizado', description: 'Atribuição encerrada.' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Deseja excluir esta atribuição?')) return
    try {
      await deleteAssignment(id, organizationId)
      await onRefresh()
      toast({ title: 'Removida', description: 'Atribuição excluída com sucesso.' })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-8">
      {/* SEÇÃO 1: ATRIBUIÇÕES DE RESPONSABILIDADE (Ativas na serventia) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Atribuições de Responsabilidade Institucional
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Vínculo entre as pessoas cadastradas e os papéis regulatórios com vigência e
                vigilância legal.
              </CardDescription>
            </div>
          </div>
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenAssignmentDialog}
              disabled={people.length === 0 || roles.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Atribuir Responsabilidade
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs">
                <TableHead>Pessoa Responsável</TableHead>
                <TableHead>Papel Designado</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notas</TableHead>
                {!readOnly && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                    Nenhuma atribuição cadastrada. Clique em "Atribuir Responsabilidade" para
                    vincular um papel a um colaborador.
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((item) => (
                  <TableRow key={item.id} className="text-xs">
                    <TableCell className="font-semibold text-slate-900">
                      {item.expand?.person?.name || 'Pessoa'}
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.expand?.person?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-blue-50 text-blue-700 border-blue-300 font-mono"
                      >
                        {item.expand?.role?.name || 'Papel'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {item.start_date
                        ? `${new Date(item.start_date).toLocaleDateString('pt-BR')} até ${
                            item.end_date
                              ? new Date(item.end_date).toLocaleDateString('pt-BR')
                              : 'Indeterminado'
                          }`
                        : 'Vigência indeterminada'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          item.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : item.status === 'encerrado'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-[200px] truncate">
                      {item.notes || '-'}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right space-x-1">
                        {item.status === 'ativo' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEncerrarAssignment(item.id)}
                            className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            Encerrar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAssignment(item.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SEÇÃO 2 & 3: GRID COM PESSOAS E PAPÉIS (Duas seções na mesma tela) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CRUD Pessoas */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Pessoas e Colaboradores ({people.length})
              </CardTitle>
            </div>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenPersonDialog()}
                className="text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" /> Nova Pessoa
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {people.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Nenhuma pessoa cadastrada.
                </p>
              ) : (
                people.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/60"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.role_title || 'Colaborador'} • {p.email}
                      </p>
                      {p.phone && <p className="text-[10px] text-slate-400">{p.phone}</p>}
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenPersonDialog(p)}
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePerson(p.id)}
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

        {/* CRUD Papéis de Responsabilidade */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Papéis de Responsabilidade ({roles.length})
              </CardTitle>
            </div>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenRoleDialog()}
                className="text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" /> Novo Papel
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {roles.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhum papel cadastrado.</p>
              ) : (
                roles.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/60"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{r.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {r.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{r.description}</p>
                      {r.suggested_mode && (
                        <p className="text-[10px] text-indigo-600 font-medium">
                          Modalidade: {r.suggested_mode}
                        </p>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenRoleDialog(r)}
                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRole(r.id)}
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

      {/* DIALOG PESSOA */}
      <Dialog open={personDialogOpen} onOpenChange={setPersonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingPerson ? 'Editar Pessoa' : 'Cadastrar Nova Pessoa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePerson} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
              <Input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Cargo / Função na Serventia
              </Label>
              <Input
                placeholder="Ex: Tabelião Substituto, Gestor de TI..."
                value={personRoleTitle}
                onChange={(e) => setPersonRoleTitle(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">E-mail Institucional *</Label>
              <Input
                type="email"
                value={personEmail}
                onChange={(e) => setPersonEmail(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Telefone / Ramal</Label>
                <Input
                  value={personPhone}
                  onChange={(e) => setPersonPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <select
                  value={personStatus}
                  onChange={(e) => setPersonStatus(e.target.value as 'ativo' | 'inativo')}
                  className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPersonDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingPerson}
                className="bg-blue-700 text-white text-xs"
              >
                {isSavingPerson ? 'Salvando...' : 'Salvar Pessoa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG PAPEL */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingRole ? 'Editar Papel de Responsabilidade' : 'Novo Papel de Responsabilidade'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRole} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do Papel *</Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Código Técnico (RESP-*)
              </Label>
              <Input
                placeholder="Ex: RESP-NOVO (Automático se vazio)"
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
                className="text-xs h-9 font-mono uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Modalidade Sugerida</Label>
              <Input
                placeholder="Ex: Oficial Registrador, Diretoria..."
                value={roleMode}
                onChange={(e) => setRoleMode(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Descrição e Atribuições
              </Label>
              <textarea
                rows={2}
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                className="w-full text-xs p-2.5 rounded-md border border-slate-200"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRoleDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingRole}
                className="bg-blue-700 text-white text-xs"
              >
                {isSavingRole ? 'Salvando...' : 'Salvar Papel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG ATRIBUIÇÃO */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Atribuir Responsabilidade Regimental
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAssignment} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Selecione a Pessoa *</Label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                required
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role_title || p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Papel de Responsabilidade *
              </Label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                required
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Início da Vigência</Label>
                <Input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Fim (Opcional)</Label>
                <Input
                  type="date"
                  value={assignEndDate}
                  onChange={(e) => setAssignEndDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Notas / Portaria de Designação
              </Label>
              <Input
                placeholder="Ex: Portaria Interna nº 04/2025"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignmentDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingAssignment}
                className="bg-emerald-600 text-white text-xs"
              >
                {isSavingAssignment ? 'Salvando...' : 'Confirmar Atribuição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PeopleRolesTab
