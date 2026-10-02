import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Briefcase, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Email é obrigatório')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Insira um email válido')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      setIsSent(true)
      toast({
        title: 'Email de recuperação enviado',
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao solicitar recuperação'
      setError(msg)
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
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">Recuperar Senha</h1>
          <p className="text-sm text-[#6B7280]">
            Enviaremos um link seguro para você definir uma nova senha.
          </p>
        </div>

        {isSent ? (
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-[#10B981]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm text-[#1F2937] font-medium">
              Link de recuperação enviado com sucesso!
            </p>
            <p className="text-xs text-[#6B7280]">
              Se houver uma conta associada ao e-mail <strong>{email}</strong>, você receberá
              instruções para redefinir a sua senha.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-1.5">
                E-mail cadastrado
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={`w-full h-10 px-3 text-sm rounded-lg border bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15 ${
                  error ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                }`}
              />
              {error && <p className="text-xs text-[#EF4444] mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar link de recuperação</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 text-xs text-[#6B7280] hover:text-[#1F2937] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Lembrei minha senha
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
