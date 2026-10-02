import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserItem } from '@/services/contextService'

interface AuthContextType {
  user: UserItem | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUser = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const rec = pb.authStore.record
      setUser({
        id: rec.id,
        email: rec.email,
        name: rec.name || rec.email.split('@')[0],
        avatar: rec.avatar,
        verified: rec.verified,
      })
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    syncUser()
    const unsubscribe = pb.authStore.onChange(() => {
      syncUser()
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    await pb.collection('users').authWithPassword(email, pass)
    syncUser()
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const refreshUser = () => {
    syncUser()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
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
