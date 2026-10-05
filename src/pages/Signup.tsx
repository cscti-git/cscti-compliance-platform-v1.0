import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Building2,
  User,
  Mail,
  Lock,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export const Signup: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [cartorioName, setCartorioName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('A senha precisa ter no mínimo 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMsg('A confirmação da senha não confere.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      // Criar usuário no PocketBase
      await pb.collection('users').create({
        email: email.trim().toLowerCase(),
        password,
        passwordConfirm,
        name: name.trim(),
        role: 'usuario',
      })

      // Solicitar verificação por e-mail opcional
      try {
        await pb.collection('users').requestVerification(email.trim().toLowerCase())
      } catch {
        // Ignorar se o envio de e-mail de verificação não estiver configurado
      }

      setIsSuccess(true)
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Sua solicitação de acesso foi registrada na plataforma CSCTI.',
      })
    } catch (err: unknown) {
      console.error('Falha no cadastro:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao criar conta institucional'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthShell
        title="Conta Registrada"
        subtitle="Seu cadastro inicial foi concluído no padrão CSCTI."
        badgeText="Cadastro Concluído"
        footerLink={{
          text: 'Deseja prosseguir?',
          linkText: 'Acessar tela de login',
          href: '/login',
        }}
      >
        <div className="py-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Solicitação Recebida</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Sua conta vinculada a <strong>{email}</strong> foi cadastrada. O Administrador da
              serventia fará a vinculação e liberação dos módulos normativos do Provimento 243/2026.
            </p>
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
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Criar Conta Institucional"
      subtitle="Cadastre seu acesso para adesão de nova serventia ou operador notarial."
      badgeText="Novo Credenciamento"
      footerLink={{
        text: 'Já possui cadastro ativo?',
        linkText: 'Entrar na plataforma',
        href: '/login',
      }}
    >
      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Erro no Cadastro</span>
            <span className="text-xs text-red-600 leading-normal">{errorMsg}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Nome Completo
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <Input
              type="text"
              required
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            E-mail Institucional
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <Input
              type="email"
              required
              placeholder="seu.nome@cartorio.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Nome da Serventia / Cartório
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building2 className="w-4 h-4" />
            </div>
            <Input
              type="text"
              placeholder="Ex: 1º Ofício de Registro de Imóveis"
              value={cartorioName}
              onChange={(e) => setCartorioName(e.target.value)}
              className="pl-10 h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Senha (mín. 8)
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Confirmar
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="pl-10 h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white focus:border-[#0B2545]"
              />
            </div>
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
              <span>Registrando conta...</span>
            </>
          ) : (
            <>
              <span>Concluir Credenciamento</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  )
}

export default Signup
