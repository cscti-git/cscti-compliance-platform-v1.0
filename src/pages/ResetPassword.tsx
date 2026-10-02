import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Briefcase, Loader2, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{
    password?: string
    passwordConfirm?: string
    general?: string
  }>({})

  const navigate = useNavigate()
  const { toast } = useToast()

  const validate = () => {
    const errs: typeof errors = {}
    if (!password) {
      errs.password = 'A senha é obrigatória'
    } else if (password.length < 8) {
      errs.password = 'A senha deve ter pelo menos 8 caracteres'
    }
    if (passwordConfirm !== password) {
      errs.passwordConfirm = 'As senhas não coincidem'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setErrors({ general: 'Token de recuperação inválido ou ausente.' })
      return
    }
    if (!validate()) return

    setIsLoading(true)
    setErrors({})
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi redefinida com sucesso. Faça login.',
      })
      navigate('/login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao redefinir senha'
      setErrors({ general: msg })
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir',
        description: msg,
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
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">Nova Senha</h1>
          <p className="text-sm text-[#6B7280]">Defina sua nova credencial de acesso.</p>
        </div>

        {!token ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-center space-y-3">
            <p>O link de recuperação não possui um token válido.</p>
            <Link
              to="/forgot-password"
              className="inline-block text-xs font-semibold text-[#4F46E5] hover:underline"
            >
              Solicitar nova recuperação
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 text-sm text-[#EF4444] bg-red-50 border border-red-200 rounded-lg">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                Nova Senha (mínimo 8 caracteres)
              </label>
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

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                Confirme a Nova Senha
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className={`w-full h-10 px-3 text-sm rounded-lg border bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15 ${
                  errors.passwordConfirm ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                }`}
              />
              {errors.passwordConfirm && (
                <p className="text-xs text-[#EF4444] mt-1">{errors.passwordConfirm}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redefinindo...</span>
                </>
              ) : (
                <>
                  <span>Redefinir senha</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
