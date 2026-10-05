import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserItem, OrganizationItem, SystemRole } from '@/types/cscti'
import { getCurrentUserOrganization, logAudit } from '@/services/csctiService'

interface AuthContextType {
  user: UserItem | null
  organization: OrganizationItem | null
  isLoading: boolean
  isAdmin: boolean
  isSuporte: boolean
  isUsuario: boolean
  role: SystemRole
  login: (emailOrUser: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshOrganization: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserItem | null>(null)
  const [organization, setOrganization] = useState<OrganizationItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncState = useCallback(async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const rec = pb.authStore.record
      const systemRole = (rec.system_role as SystemRole) || 'admin'
      const currentUser: UserItem = {
        id: rec.id,
        email: rec.email,
        name: rec.name || rec.email.split('@')[0],
        avatar: rec.avatar,
        verified: rec.verified,
        system_role: systemRole,
        organization: rec.organization,
        is_active: rec.is_active !== undefined ? rec.is_active : true,
        last_access: rec.last_access,
      }
      setUser(currentUser)

      // Fetch user's organization
      try {
        const org = await getCurrentUserOrganization()
        setOrganization(org)
      } catch (err) {
        console.warn('Erro ao carregar organização do usuário:', err)
        setOrganization(null)
      }
    } else {
      setUser(null)
      setOrganization(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    syncState()
    const unsubscribe = pb.authStore.onChange(() => {
      syncState()
    })
    return () => {
      unsubscribe()
    }
  }, [syncState])

  const login = async (emailOrUser: string, pass: string) => {
    // Allows login with email or username
    await pb.collection('users').authWithPassword(emailOrUser.trim(), pass)
    // Update last_access timestamp
    if (pb.authStore.record?.id) {
      try {
        await pb.collection('users').update(pb.authStore.record.id, {
          last_access: new Date().toISOString(),
        })
      } catch {
        // ignore error
      }
    }
    await logAudit({
      action: 'LOGIN',
      entity: 'Autenticação',
      detail: `Usuário realizou login com sucesso: ${emailOrUser}`,
    })
    await syncState()
  }

  const logout = () => {
    if (user) {
      logAudit({
        action: 'LOGOUT',
        entity: 'Autenticação',
        detail: `Usuário efetuou logout: ${user.email}`,
      }).catch(() => {})
    }
    pb.authStore.clear()
    setUser(null)
    setOrganization(null)
  }

  const refreshUser = async () => {
    await syncState()
  }

  const refreshOrganization = async () => {
    try {
      const org = await getCurrentUserOrganization()
      setOrganization(org)
    } catch {
      // ignore
    }
  }

  const role: SystemRole = user?.system_role || 'usuario'
  const isAdmin = role === 'admin'
  const isSuporte = role === 'suporte' || role === 'admin'
  const isUsuario = role === 'usuario'

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        isAdmin,
        isSuporte,
        isUsuario,
        role,
        login,
        logout,
        refreshUser,
        refreshOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}
