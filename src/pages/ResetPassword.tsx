import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Loader2, ArrowRight, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ResetPassword: React.FC = () => {
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
      errs.password = 'A senha deve conter no mínimo 8 caracteres'
    }
    if (passwordConfirm !== password) {
      errs.passwordConfirm = 'As senhas informadas não coincidem'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setErrors({ general: 'Token de recuperação inválido ou ausente no endereço.' })
      return
    }
    if (!validate()) return

    setIsLoading(true)
    setErrors({})
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'Sua nova credencial institucional foi atualizada. Faça o login.',
      })
      navigate('/login')
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao redefinir senha. O token pode ter expirado.'
      setErrors({ general: msg })
      toast({
        variant: 'destructive',
        title: 'Erro na redefinição',
        description: msg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Definir Nova Senha"
      subtitle="Cadastre uma credencial segura em conformidade com as diretrizes de segurança."
      badgeText="Redefinição de Acesso"
      footerLink={{
        text: 'Não precisa redefinir?',
        linkText: 'Voltar ao login',
        href: '/login',
      }}
    >
      {!token ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-3">
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            O link de recuperação não possui um código/token de validação válido ou este já expirou.
          </p>
          <div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-[#0B2545] border-[#0B2545]/30 hover:bg-[#0B2545]/5"
            >
              <Link to="/forgot-password">Solicitar novo link de recuperação</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span>{errors.general}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Nova Senha (mín. 8 caracteres)
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`pl-10 h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545] ${
                  errors.password ? 'border-red-400 ring-1 ring-red-400' : ''
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Confirmar Nova Senha
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className={`pl-10 h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545] ${
                  errors.passwordConfirm ? 'border-red-400 ring-1 ring-red-400' : ''
                }`}
              />
            </div>
            {errors.passwordConfirm && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.passwordConfirm}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-sm font-semibold bg-[#0B2545] hover:bg-[#07192F] text-white shadow-md shadow-[#0B2545]/20 hover:shadow-lg transition-all rounded-lg mt-2 flex items-center justify-center gap-2 group cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Atualizando credencial...</span>
              </>
            ) : (
              <>
                <span>Confirmar Nova Senha</span>
                <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

export default ResetPassword
