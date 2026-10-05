import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Lock, User, AlertCircle, Loader2, ArrowRight, ShieldCheck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/AuthShell'

export const Login: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'

  const [usernameOrEmail, setUsernameOrEmail] = useState('leandro@cscti.com.br')
  const [password, setPassword] = useState('Skip@Pass')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usernameOrEmail.trim() || !password) {
      setErrorMsg('Informe o usuário/e-mail e a senha institucional.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      await login(usernameOrEmail.trim(), password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      console.error('Falha no login:', err)
      setErrorMsg('Credenciais inválidas. Verifique o usuário ou e-mail e a senha informados.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Acesso à Plataforma"
      subtitle="Informe suas credenciais corporativas autorizadas pelo Administrador da Serventia."
      badgeText="Portal Autenticado"
      footerLink={{
        text: 'Primeiro acesso ou nova serventia?',
        linkText: 'Criar conta ou solicitar adesão',
        href: '/signup',
      }}
      extraNotice={
        <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Info className="w-3.5 h-3.5 text-[#0B2545]" />
            <span>Acesso Seguro para Serventias</span>
          </div>
          <p>
            O acesso a relatórios e evidências do Provimento CNJ é restrito a operadores cadastrados
            com perfis Administrador, Suporte e Usuário.
          </p>
        </div>
      }
    >
      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Falha na Autenticação</span>
            <span className="text-xs text-red-600 leading-normal">{errorMsg}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Usuário / E-mail */}
        <div className="space-y-1.5">
          <Label
            htmlFor="loginUser"
            className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between"
          >
            <span>Usuário ou E-mail Institucional</span>
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <Input
              id="loginUser"
              type="text"
              autoComplete="username"
              required
              placeholder="leandro@cscti.com.br"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="pl-10 h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/15 transition-all rounded-lg"
            />
          </div>
        </div>

        {/* Campo Senha */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="loginPass"
              className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Senha de Acesso
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#0B2545] hover:text-[#D4AF37] transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              id="loginPass"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/15 transition-all rounded-lg"
            />
          </div>
        </div>

        {/* Botão de Envio com Destaque CSCTI */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 text-sm font-semibold bg-[#0B2545] hover:bg-[#07192F] text-white shadow-md shadow-[#0B2545]/20 hover:shadow-lg transition-all rounded-lg mt-3 flex items-center justify-center gap-2 group cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
              <span>Validando credenciais...</span>
            </>
          ) : (
            <>
              <span>Entrar na Plataforma</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  )
}

export default Login
