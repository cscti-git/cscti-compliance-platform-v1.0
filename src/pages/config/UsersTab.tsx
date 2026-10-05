import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createOrganizationUser,
  updateOrganizationUser,
  deleteOrganizationUser,
} from '@/services/csctiService'
import type { UserItem, SystemRole } from '@/types/cscti'
import { useToast } from '@/hooks/use-toast'
import {
  ShieldAlert,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Loader2,
  CheckCircle,
  XCircle,
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

interface UsersTabProps {
  organizationId: string
  currentUserId: string
  users: UserItem[]
  onRefresh: () => Promise<void>
}

export const UsersTab: React.FC<UsersTabProps> = ({
  organizationId,
  currentUserId,
  users,
  onRefresh,
}) => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [systemRole, setSystemRole] = useState<SystemRole>('usuario')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenModal = (user?: UserItem) => {
    if (user) {
      setEditingUser(user)
      setName(user.name)
      setEmail(user.email)
      setSystemRole(user.system_role)
      setPassword('')
      setPasswordConfirm('')
      setIsActive(user.is_active !== undefined ? user.is_active : true)
    } else {
      setEditingUser(null)
      setName('')
      setEmail('')
      setSystemRole('usuario')
      setPassword('')
      setPasswordConfirm('')
      setIsActive(true)
    }
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome do usuário.', variant: 'destructive' })
      return
    }

    if (!editingUser) {
      if (!email.trim() || !password || password.length < 8) {
        toast({
          title: 'Atenção',
          description: 'E-mail válido e senha de no mínimo 8 caracteres são obrigatórios.',
          variant: 'destructive',
        })
        return
      }
      if (password !== passwordConfirm) {
        toast({
          title: 'Atenção',
          description: 'As senhas informadas não conferem.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSaving(true)
    try {
      if (editingUser) {
        await updateOrganizationUser(
          editingUser.id,
          {
            name: name.trim(),
            system_role: systemRole,
            is_active: isActive,
            password: password.trim() ? password.trim() : undefined,
            passwordConfirm: passwordConfirm.trim() ? passwordConfirm.trim() : undefined,
          },
          organizationId,
        )
        toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso.' })
      } else {
        await createOrganizationUser(organizationId, {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          passwordConfirm: passwordConfirm.trim(),
          system_role: systemRole,
          is_active: isActive,
        })
        toast({ title: 'Sucesso', description: 'Novo usuário criado com sucesso.' })
      }
      await onRefresh()
      setModalOpen(false)
    } catch (err: unknown) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao gravar usuário.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (id === currentUserId) {
      toast({
        title: 'Não permitido',
        description: 'Você não pode excluir sua própria conta.',
        variant: 'destructive',
      })
      return
    }
    if (!confirm('Deseja realmente remover o acesso deste usuário?')) return

    try {
      await deleteOrganizationUser(id, organizationId)
      await onRefresh()
      toast({ title: 'Removido', description: 'Usuário removido da organização.' })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      })
    }
  }

  const getRoleBadge = (role: SystemRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 text-[10px]">
            Administrador
          </Badge>
        )
      case 'suporte':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[10px]">
            Suporte Técnico
          </Badge>
        )
      case 'usuario':
        return (
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0 text-[10px]">
            Usuário (Consulta)
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Usuários e Controle de Acesso ({users.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Apenas Administradores podem gerenciar contas. Não há cadastro público.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenModal()}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-9"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Criar Novo Usuário
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail / Login</TableHead>
                <TableHead>Perfil do Sistema</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="text-xs">
                  <TableCell className="font-semibold text-slate-900">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-[10px] text-blue-600 font-normal">(Você)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 font-mono text-[11px]">{u.email}</TableCell>
                  <TableCell>{getRoleBadge(u.system_role)}</TableCell>
                  <TableCell>
                    {u.is_active !== false ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300"
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-red-50 text-red-700 border-red-300"
                      >
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 text-[11px]">
                    {u.last_access
                      ? new Date(u.last_access).toLocaleString('pt-BR')
                      : 'Nunca acessou'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(u)}
                      className="h-7 w-7 text-slate-500 hover:text-blue-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {u.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(u.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL USUÁRIO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingUser ? 'Editar Usuário da Serventia' : 'Cadastrar Usuário da Serventia'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">E-mail de Acesso *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={Boolean(editingUser)}
                required
                className="text-xs h-9"
              />
              {editingUser && (
                <p className="text-[10px] text-slate-400">
                  O e-mail não pode ser alterado após criação.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Perfil de Acesso</Label>
                <select
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                  className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
                >
                  <option value="admin">Administrador (Total)</option>
                  <option value="suporte">Suporte Técnico (Operacional)</option>
                  <option value="usuario">Usuário (Somente Leitura)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Estado da Conta</Label>
                <select
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                  className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo / Bloqueado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                {editingUser
                  ? 'Nova Senha (deixe em branco para manter)'
                  : 'Senha de Acesso (mínimo 8 caracteres) *'}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? '••••••••' : ''}
                required={!editingUser}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Confirmar Senha</Label>
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={editingUser ? '••••••••' : ''}
                required={!editingUser && Boolean(password)}
                className="text-xs h-9"
              />
            </div>

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
                disabled={isSaving}
                className="bg-blue-700 text-white text-xs"
              >
                {isSaving ? 'Salvando...' : 'Salvar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default UsersTab
