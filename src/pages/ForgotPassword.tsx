import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Loader2, ArrowLeft, CheckCircle2, Mail, AlertCircle, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('O e-mail cadastrado é obrigatório.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Informe um endereço de e-mail institucional válido.')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      setIsSent(true)
      toast({
        title: 'Instruções enviadas',
        description: 'Verifique sua caixa de entrada institucional para redefinir a credencial.',
      })
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao solicitar link de redefinição. Contate o Administrador.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Recuperação de Senha"
      subtitle="Enviaremos um link assinado digitalmente para você cadastrar uma nova credencial segura."
      badgeText="Segurança Institucional"
      footerLink={{
        text: 'Lembrou de sua senha?',
        linkText: 'Retornar ao login',
        href: '/login',
      }}
    >
      {isSent ? (
        <div className="py-2 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">Link Despachado com Sucesso</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Caso haja uma conta ativa para <strong>{email}</strong>, o link com prazo de expiração
              de segurança foi enviado para a sua caixa postal.
            </p>
          </div>

          <div className="pt-3">
            <Button
              asChild
              className="w-full h-11 text-sm font-semibold bg-[#0B2545] hover:bg-[#07192F] text-white shadow-md rounded-lg"
            >
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Voltar para a tela de Login</span>
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              E-mail Institucional Cadastrado
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.nome@cartorio.com.br"
                className="pl-10 h-11 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/15"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-sm font-semibold bg-[#0B2545] hover:bg-[#07192F] text-white shadow-md shadow-[#0B2545]/20 hover:shadow-lg transition-all rounded-lg mt-2 flex items-center justify-center gap-2 group cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Despachando link...</span>
              </>
            ) : (
              <>
                <span>Enviar link de recuperação</span>
                <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
