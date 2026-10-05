import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de confirmação de e-mail não fornecido ou inválido.')
      return
    }

    pb.collection('users')
      .confirmVerification(token)
      .then(() => {
        setStatus('success')
        setMessage(
          'Seu endereço de e-mail foi validado com sucesso! Sua conta institucional está ativa para autenticação.',
        )
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.message || 'Token de verificação expirado ou já utilizado.')
      })
  }, [token])

  return (
    <AuthShell
      title="Validação de E-mail"
      subtitle="Confirmação de autenticidade da conta institucional."
      badgeText="Verificação de Identidade"
      footerLink={{
        text: 'Precisa de suporte?',
        linkText: 'Voltar ao login institucional',
        href: '/login',
      }}
    >
      {status === 'loading' && (
        <div className="py-8 text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-[#0B2545] mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            Validando token de confirmação institucional perante a base de dados...
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="py-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">E-mail Validado</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          </div>

          <Button
            asChild
            className="w-full h-11 text-sm font-semibold bg-[#0B2545] hover:bg-[#07192F] text-white shadow-md rounded-lg"
          >
            <Link to="/login">
              <span>Ir para a tela de Login</span>
              <ArrowRight className="w-4 h-4 ml-2 text-[#D4AF37]" />
            </Link>
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="py-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Falha na Verificação</h3>
            <p className="text-xs text-red-600 leading-relaxed">{message}</p>
          </div>

          <div className="pt-2">
            <Button
              asChild
              variant="outline"
              className="w-full h-11 text-sm font-semibold text-[#0B2545] border-slate-300 hover:bg-slate-50"
            >
              <Link to="/login">
                <span>Retornar ao Login</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </AuthShell>
  )
}

export default VerifyEmail
