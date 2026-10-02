import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Briefcase, Loader2, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errs.email = 'Email é obrigatório'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Insira um email válido'
    }

    if (!password) {
      errs.password = 'A senha é obrigatória'
    } else if (password.length < 8) {
      errs.password = 'A senha deve ter pelo menos 8 caracteres'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setErrors({})
    try {
      await login(email.trim(), password)
      toast({
        title: 'Bem-vindo de volta!',
        description: 'Login realizado com sucesso.',
      })
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar'
      setErrors({ general: 'Email ou senha incorretos. Verifique suas credenciais.' })
      toast({
        variant: 'destructive',
        title: 'Erro de autenticação',
        description: msg.includes('Failed to authenticate') ? 'Email ou senha incorretos' : msg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F7F8FA] to-[#F3F4F6] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E4E7EC] p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/20 mb-2">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">Contexto</h1>
          <p className="text-sm text-[#6B7280]">
            Centralize e sincronize seus contextos de trabalho entre ChatGPT, Claude e sua VM.
          </p>
        </div>

        {errors.general && (
          <div className="p-3 text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded-lg">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={`w-full h-10 px-3 text-sm rounded-lg border bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15 ${
                errors.email ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.email && <p className="text-xs text-[#EF4444] mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                Senha
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full h-10 px-3 text-sm rounded-lg border bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15 ${
                errors.password ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
              }`}
            />
            {errors.password && <p className="text-xs text-[#EF4444] mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-[#E4E7EC] text-center">
          <p className="text-sm text-[#6B7280]">
            Não tem conta?{' '}
            <Link
              to="/signup"
              className="font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
            >
              Criar conta
            </Link>
          </p>
          <div className="mt-4 p-2.5 bg-[#EEF2FF] rounded-lg text-xs text-[#4338CA]">
            <span className="font-semibold">Demo pronta:</span> leandro@cscti.com.br / Skip@Pass
          </div>
        </div>
      </div>
    </div>
  )
}
