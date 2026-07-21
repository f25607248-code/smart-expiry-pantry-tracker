import * as React from 'react'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, silentRefresh, setAccessToken, setUnauthorizedHandler } from '@/lib/axios'
import { useTheme } from '@/context/ThemeContext'
import type { User } from '@/types'

type LoginResult = { requiresTwoFactor: true; pendingToken: string } | { requiresTwoFactor: false }

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  loginWithGoogle: (idToken: string) => Promise<LoginResult>
  completeTwoFactorLogin: (pendingToken: string, code: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { applyPreference } = useTheme()

  const bootstrap = useCallback(async () => {
    const result = await silentRefresh()
    setUser(result?.user ?? null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    bootstrap()
    return () => setUnauthorizedHandler(null)
  }, [bootstrap])

  // Apply the account's saved theme whenever the logged-in user loads or changes -
  // otherwise a "Dark" preference only "sticks" via the localStorage cache from the
  // browser/device that saved it, and silently fails to follow the account elsewhere.
  useEffect(() => {
    if (user) applyPreference(user.theme)
  }, [user?.theme, applyPreference])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true, pendingToken: data.pendingToken }
    }
    setAccessToken(data.accessToken)
    setUser(data.user)
    return { requiresTwoFactor: false }
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string): Promise<LoginResult> => {
    const { data } = await api.post('/auth/google', { idToken })
    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true, pendingToken: data.pendingToken }
    }
    setAccessToken(data.accessToken)
    setUser(data.user)
    return { requiresTwoFactor: false }
  }, [])

  const completeTwoFactorLogin = useCallback(async (pendingToken: string, code: string) => {
    const { data } = await api.post('/auth/2fa/login', { pendingToken, code })
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me')
    setUser(data.user)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, completeTwoFactorLogin, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
