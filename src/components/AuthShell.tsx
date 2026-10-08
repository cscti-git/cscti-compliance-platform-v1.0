import React from 'react'
import { Link } from 'react-router-dom'
import { CsctiLogo, CsctiLogoMark } from '@/components/CsctiLogo'
import { CSCTI_BRAND, CSCTI_FEATURES } from '@/lib/brand'
import { ShieldCheck, Lock, Award, FileCheck2, Building2, CheckCircle2 } from 'lucide-react'

export interface AuthShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  badgeText?: string
  footerLink?: {
    text: string
    linkText: string
    href: string
  }
  extraNotice?: React.ReactNode
  showFeatureList?: boolean
  customProductTitle?: string
  customTagline?: string
}

const FEATURE_ICONS = [Lock, FileCheck2, Building2]

export const AuthShell: React.FC<AuthShellProps> = ({
  children,
  title,
  subtitle,
  badgeText = 'Acesso Seguro',
  footerLink,
  extraNotice,
  showFeatureList = true,
  customProductTitle,
  customTagline,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#061628] selection:bg-[#D4AF37]/30 selection:text-white">
      {/* -------------------------------------------------------- */}
      {/* PAINEL INSTITUCIONAL CSCTI (Esquerda / Topo no mobile)  */}
      {/* -------------------------------------------------------- */}
      <div className="lg:w-[52%] xl:w-[50%] relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 text-white overflow-hidden bg-gradient-to-br from-[#061628] via-[#0B2545] to-[#040D18] border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Padrão Gráfico Tecnológico de Fundo (Grid sutil com nós + radial glow) */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25px 25px, #D4AF37 1.5px, transparent 0),
              linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px, 36px 36px, 36px 36px',
          }}
          aria-hidden="true"
        />

        {/* Glow Superior Dourado & Ciano */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-10 right-0 w-80 h-80 rounded-full bg-[#0EA5E9]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Conteúdo Institucional */}
        <div className="relative z-10">
          {/* Logo Principal e Slogan */}
          <div className="flex items-center justify-between">
            <Link
              to="/login"
              className="group inline-flex items-center gap-3.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] rounded-xl p-1 -m-1 transition-transform active:scale-[0.98]"
              title={CSCTI_BRAND.legalName}
            >
              <CsctiLogo
                variant="horizontal"
                size="md"
                theme="dark"
                productName={customProductTitle || CSCTI_BRAND.name}
                customTagline={customTagline || CSCTI_BRAND.shortTagline}
                versionBadge="V2"
              />
            </Link>

            {/* Selo Institucional CSCTI */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-[11px] font-medium backdrop-blur-md">
              <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>CSCTI - Compliance</span>
            </div>
          </div>

          {/* Destaque Central de Marca */}
          <div className="mt-8 sm:mt-12 lg:mt-14 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F3C969] text-xs font-semibold mb-4 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Plataforma de Governança e Compliance</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {CSCTI_BRAND.tagline}
            </h1>

            <p className="mt-3.5 text-slate-300/90 text-xs sm:text-sm lg:text-base leading-relaxed">
              Ambiente unificado para gestão da conformidade, governança de TI e controles de
              continuidade, com evidências auditáveis em conformidade com as normas vigentes.
            </p>
          </div>

          {/* 3 Diferenciais da Plataforma CSCTI */}
          {showFeatureList && (
            <div className="hidden md:grid grid-cols-1 gap-3.5 mt-8 max-w-xl">
              {CSCTI_FEATURES.map((feature, idx) => {
                const IconComponent = FEATURE_ICONS[idx % FEATURE_ICONS.length]
                return (
                  <div
                    key={feature.id}
                    className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all backdrop-blur-sm group"
                  >
                    <div className="p-2 rounded-lg bg-[#0B2545] border border-[#D4AF37]/25 text-[#D4AF37] shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-2">
                        {feature.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé Institucional com Referência Normativa */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">CSCTI - Compliance</span>
            <span className="text-slate-600">•</span>
            <span>Plataforma Segura</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>Versão {CSCTI_BRAND.version}</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistemas Operacionais
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- */}
      {/* ÁREA DO FORMULÁRIO (Direita / Abaixo no mobile)          */}
      {/* -------------------------------------------------------- */}
      <div className="lg:w-[48%] xl:w-[50%] flex items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          {/* Card Principal */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/90 p-6 sm:p-9 relative overflow-hidden">
            {/* Faixa decorativa superior com gradiente da marca */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0B2545] via-[#D4AF37] to-[#0EA5E9]"
              aria-hidden="true"
            />

            {/* Cabeçalho do Card */}
            <div className="mb-6 pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0B2545] bg-[#0B2545]/5 px-2.5 py-0.5 rounded-full border border-[#0B2545]/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {badgeText}
                </span>

                <span className="text-[11px] text-slate-400 font-mono">CSCTI-AUTH</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
              {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>

            {/* Conteúdo Dinâmico (Formulário) */}
            <div>{children}</div>

            {/* Link de Rodapé Alternativo (ex: "Voltar para Login", "Criar conta") */}
            {footerLink && (
              <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
                <span>{footerLink.text} </span>
                <Link
                  to={footerLink.href}
                  className="font-semibold text-[#0B2545] hover:text-[#D4AF37] underline decoration-[#D4AF37]/50 underline-offset-4 transition-colors"
                >
                  {footerLink.linkText}
                </Link>
              </div>
            )}

            {/* Aviso Extra / Segurança */}
            {extraNotice && <div className="mt-4">{extraNotice}</div>}
          </div>

          {/* Rodapé Externo do Card */}
          <div className="mt-5 text-center text-[11px] text-slate-400">
            <p>Conexão criptografada ponta a ponta (TLS 1.3).</p>
            <p className="mt-0.5">
              CSCTI Tecnologia &copy; {new Date().getFullYear()} — Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthShell
