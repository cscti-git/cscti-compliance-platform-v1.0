import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Award,
  FileCheck2,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      setErrorMsg('Informe o usuário/e-mail e a senha.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      await login(usernameOrEmail, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      console.error('Falha no login:', err)
      setErrorMsg('Credenciais inválidas. Verifique o usuário e senha.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B132B]">
      {/* Coluna Esquerda - Painel Escuro Institucional CSCTI */}
      <div className="lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 text-white bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          {/* Topo / Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-white">CSCTI</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  V2
                </span>
              </div>
              <p className="text-xs text-slate-400 tracking-wide uppercase font-medium">
                Compliance Platform
              </p>
            </div>
          </div>

          {/* Chamada Principal */}
          <div className="mt-14 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-700/40 text-blue-300 text-xs font-medium mb-4">
              <Award className="w-3.5 h-3.5 text-blue-400" />
              Provimento CNJ 243/2026 & 213/2026
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 leading-tight">
              Governança, conformidade e gestão institucional
            </h1>
            <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
              Plataforma especializada para serventias extrajudiciais (cartórios). Gestão
              centralizada de conformidade, inventário de ativos, evidências de segurança e
              comprovações perante juízos corregedores.
            </p>
          </div>

          {/* Destaques / Features */}
          <div className="mt-10 space-y-4 max-w-lg">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Acesso protegido</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Isolamento total multi-tenant por serventia com rastreabilidade integral em trilha
                  de auditoria.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Controle de acesso por perfis
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Perfis dedicados (Administrador, Suporte e Usuário) com permissões granulares e
                  conformidade formal.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Ambiente institucional</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enquadramento automático por classes semestrais (C1, C2 e C3) e subclasses (A–J)
                  do CNJ.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé da Coluna Esquerda */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>© {new Date().getFullYear()} CSCTI Compliance</span>
          <span>Versão 2.4.0-cnj</span>
        </div>
      </div>

      {/* Coluna Direita - Formulário de Login */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          {/* Card de Login */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Acesso ao Sistema
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Entre com seu usuário ou e-mail corporativo cadastrado pelo Administrador.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="loginUser"
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Usuário ou E-mail
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="loginUser"
                    type="text"
                    required
                    placeholder="leandro@cscti.com.br"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="pl-10 h-11 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="loginPass"
                    className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Senha de Acesso
                  </Label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    id="loginPass"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 text-sm font-semibold bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-md shadow-blue-500/15 transition-all mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando credenciais...
                  </>
                ) : (
                  'Entrar na Plataforma'
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
              <p>Acesso restrito a colaboradores autorizados.</p>
              <p className="mt-1">
                Contas são criadas exclusivamente pelo Administrador da Serventia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default Login
