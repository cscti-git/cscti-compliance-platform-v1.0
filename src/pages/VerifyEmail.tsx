import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Briefcase, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de confirmação não fornecido.')
      return
    }

    pb.collection('users')
      .confirmVerification(token)
      .then(() => {
        setStatus('success')
        setMessage(
          'Seu e-mail foi verificado com sucesso! Você já pode acessar todas as funcionalidades da sua conta.',
        )
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.message || 'Token expirado ou inválido.')
      })
  }, [token])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F7F8FA] to-[#F3F4F6] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E4E7EC] p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/20 mb-2">
          <Briefcase className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">Verificação de E-mail</h1>

        {status === 'loading' && (
          <div className="py-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5] mx-auto" />
            <p className="text-sm text-[#6B7280]">Validando seu token de confirmação...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-[#10B981]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm text-[#1F2937] font-medium">{message}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg shadow-sm transition-all"
              >
                <span>Ir para login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-[#EF4444]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-sm text-[#EF4444] font-medium">{message}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full h-10 border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#1F2937] text-sm font-medium rounded-lg transition-all"
              >
                <span>Ir para login</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
