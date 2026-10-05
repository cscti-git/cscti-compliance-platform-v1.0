import React from 'react'

export interface CsctiLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'mark' | 'horizontal'
  theme?: 'dark' | 'light'
  showTagline?: boolean
  customTagline?: string
  productName?: string
  versionBadge?: string
}

const sizeDimensions = {
  sm: { mark: 32, text: 'text-sm', sub: 'text-[10px]' },
  md: { mark: 40, text: 'text-base', sub: 'text-xs' },
  lg: { mark: 52, text: 'text-xl', sub: 'text-xs' },
  xl: { mark: 64, text: 'text-2xl', sub: 'text-sm' },
}

/**
 * Ícone Marca Gráfica CSCTI (SVG puro):
 * Unifica:
 * 1. O Escudo Institucional (Proteção e Segurança da Informação);
 * 2. A Balança/Eixo Notarial (Equilíbrio Jurídico, Fé Pública e Compliance);
 * 3. O Padrão de Circuitos/Nós Conectados (Tecnologia, Dados e Integridade).
 * Cores: Azul Profundo Petróleo (#0B2545 / #0E3A6E) + Dourado Acetinado (#D4AF37 / #F3C969)
 */
export const CsctiLogoMark: React.FC<{
  size?: number | string
  className?: string
  animated?: boolean
}> = ({ size = 44, className = '', animated = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Símbolo Institucional CSCTI"
    >
      <defs>
        {/* Gradiente Escudo Externo */}
        <linearGradient
          id="cscti-shield-grad"
          x1="10"
          y1="10"
          x2="90"
          y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#124E78" />
          <stop offset="50%" stopColor="#0B2545" />
          <stop offset="100%" stopColor="#051622" />
        </linearGradient>

        {/* Gradiente Dourado Nobre / Fé Pública */}
        <linearGradient
          id="cscti-gold-grad"
          x1="20"
          y1="20"
          x2="80"
          y2="85"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F9E29D" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#997A15" />
        </linearGradient>

        {/* Gradiente de Destaque Ciano Tecnológico sutil */}
        <linearGradient
          id="cscti-tech-glow"
          x1="30"
          y1="20"
          x2="70"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.3" />
        </linearGradient>

        {/* Brilho Superior */}
        <linearGradient
          id="cscti-highlight"
          x1="50"
          y1="12"
          x2="50"
          y2="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id="cscti-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0B2545" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Escudo Base com Borda Lapidada */}
      <path
        d="M50 8L86 22V50C86 71.5 70.8 87.2 50 94C29.2 87.2 14 71.5 14 50V22L50 8Z"
        fill="url(#cscti-shield-grad)"
        stroke="url(#cscti-gold-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
        filter="url(#cscti-shadow)"
      />

      {/* Reflexo Superior Interno */}
      <path
        d="M50 11L82 23.5V48C82 66.5 69.5 80.5 50 88C30.5 80.5 18 66.5 18 48V23.5L50 11Z"
        fill="url(#cscti-highlight)"
      />

      {/* Traçado de Rede/Nós de Segurança (Grid de Governança Tecnológica) */}
      <path d="M50 20V80" stroke="url(#cscti-tech-glow)" strokeWidth="1.5" strokeDasharray="2 3" />
      <path
        d="M26 36L74 36"
        stroke="url(#cscti-tech-glow)"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      <path
        d="M32 60L68 60"
        stroke="url(#cscti-tech-glow)"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />

      {/* Estrutura Central: Balança Notarial + Monograma C/S Estilizado */}
      {/* Prato Esquerdo */}
      <path
        d="M32 38L24 52H40L32 38Z"
        stroke="url(#cscti-gold-grad)"
        strokeWidth="2"
        fill="#0B2545"
        fillOpacity="0.6"
        strokeLinejoin="round"
      />
      {/* Prato Direito */}
      <path
        d="M68 38L60 52H76L68 38Z"
        stroke="url(#cscti-gold-grad)"
        strokeWidth="2"
        fill="#0B2545"
        fillOpacity="0.6"
        strokeLinejoin="round"
      />

      {/* Barra Horizontal Superior da Balança com Acabamento */}
      <path
        d="M22 36C22 35 24 34 26 34H74C76 34 78 35 78 36C78 37 76 38 74 38H26C24 38 22 37 22 36Z"
        fill="url(#cscti-gold-grad)"
      />

      {/* Pilar Central da Justiça & Segurança */}
      <path d="M48 26H52V68H48V26Z" fill="url(#cscti-gold-grad)" />

      {/* Nó Central - Rubi / Selo de Autenticidade Notarial */}
      <circle cx="50" cy="36" r="4.5" fill="#F9E29D" stroke="#0B2545" strokeWidth="1.5" />
      <circle cx="50" cy="36" r="2" fill="#0B2545" />

      {/* Base Notarial / Chevron de Confiabilidade */}
      <path
        d="M36 72L50 63L64 72L50 78L36 72Z"
        fill="url(#cscti-gold-grad)"
        stroke="#F9E29D"
        strokeWidth="0.8"
      />

      {/* Pontos de Conexão Tecnológica (3 Nós da Tríade CIA: Confidencialidade, Integridade, Disponibilidade) */}
      <circle cx="24" cy="52" r="2" fill="#38BDF8" />
      <circle cx="76" cy="52" r="2" fill="#38BDF8" />
      <circle cx="50" cy="78" r="2.2" fill="#38BDF8" />

      {animated && (
        <circle cx="50" cy="36" r="6" stroke="#38BDF8" strokeWidth="1" opacity="0.6">
          <animate attributeName="r" values="5;9;5" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

/**
 * Componente Completo de Identidade CSCTI
 */
export const CsctiLogo: React.FC<CsctiLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'horizontal',
  theme = 'light',
  showTagline = true,
  customTagline,
  productName = 'CSCTI',
  versionBadge = 'V2',
}) => {
  const dims = sizeDimensions[size]
  const isDark = theme === 'dark'

  if (variant === 'mark') {
    return <CsctiLogoMark size={dims.mark} className={className} />
  }

  const isVertical = variant === 'full'

  return (
    <div
      className={`flex ${
        isVertical ? 'flex-col items-center text-center' : 'items-center'
      } gap-3 ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <CsctiLogoMark size={dims.mark} />
        {/* Glow sutil em fundo escuro */}
        {isDark && (
          <div
            className="absolute -inset-1 rounded-full bg-blue-500/20 blur-md pointer-events-none -z-10"
            aria-hidden="true"
          />
        )}
      </div>

      <div className={`flex flex-col ${isVertical ? 'items-center' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight ${dims.text} ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
            style={{ letterSpacing: '-0.03em' }}
          >
            {productName}
          </span>
          {versionBadge && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded tracking-wide uppercase border ${
                isDark
                  ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {versionBadge}
            </span>
          )}
        </div>

        {showTagline && (
          <span
            className={`font-medium tracking-wide ${dims.sub} ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {customTagline || 'Compliance & Governança Notarial'}
          </span>
        )}
      </div>
    </div>
  )
}

export default CsctiLogo
