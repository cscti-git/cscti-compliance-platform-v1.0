import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
  FolderGit2,
  Server,
  ShieldAlert,
  HardDriveDownload,
  Settings,
  Puzzle,
  FileText,
  LogOut,
  Building2,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CsctiLogo, CsctiLogoMark } from '@/components/CsctiLogo'
import { CSCTI_BRAND } from '@/lib/brand'

import { Outlet } from 'react-router-dom'

interface LayoutProps {
  children?: React.ReactNode
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  adminOnly?: boolean
  suporteOrAdmin?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Visão Geral',
    items: [{ title: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Governança',
    items: [
      { title: 'Conformidade', href: '/conformidade', icon: ShieldCheck },
      { title: 'Planos de Ação', href: '/planos-de-acao', icon: CheckCircle2 },
    ],
  },
  {
    title: 'Evidências',
    items: [
      { title: 'Central de Evidências', href: '/evidencias', icon: FolderGit2 },
      { title: 'Auditoria', href: '/auditoria', icon: FileText },
    ],
  },
  {
    title: 'Inventário e Ativos',
    items: [
      { title: 'Ativos do Cartório', href: '/ativos', icon: Server },
      { title: 'Sincronização GLPI', href: '/ativos?tab=glpi', icon: RefreshCw },
      { title: 'Infraestrutura', href: '/infraestrutura', icon: Building2 },
    ],
  },
  {
    title: 'Segurança',
    items: [{ title: 'Gestão de Riscos', href: '/seguranca', icon: ShieldAlert }],
  },
  {
    title: 'Continuidade',
    items: [{ title: 'Backup e Recuperação', href: '/backup', icon: HardDriveDownload }],
  },
  {
    title: 'Administração',
    items: [
      { title: 'Configurações', href: '/configuracoes', icon: Settings },
      {
        title: 'Integrações',
        href: '/integracoes',
        icon: Puzzle,
        suporteOrAdmin: true,
      },
    ],
  },
]

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, organization, logout, role, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const orgName = organization?.name || 'Serventia Conectada'
  const productName = organization?.app_product_name || CSCTI_BRAND.name
  const headerTitle = organization?.app_header_title || CSCTI_BRAND.tagline

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'suporte':
        return 'Suporte Técnico'
      case 'usuario':
        return 'Usuário (Consulta)'
      default:
        return 'Colaborador'
    }
  }

  const isItemActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    if (href.includes('?')) {
      const [path, query] = href.split('?')
      return location.pathname === path && location.search.includes(query)
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Header Barra Institucional */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-600 hover:text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <Link to="/" className="flex items-center gap-3 group">
            <CsctiLogoMark size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight tracking-tight group-hover:text-[#0B2545] transition-colors">
                  {productName || 'CSCTI - Compliance'}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate max-w-md">
                {headerTitle || CSCTI_BRAND.tagline}
              </p>
            </div>
          </Link>
        </div>

        {/* Informações da Serventia e Usuário Logado */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Badge Organização Ativa */}
          <div className="hidden md:flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-600 font-medium">Cliente:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={orgName}>
              {orgName}
            </span>
            {organization?.provimento_class && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 bg-white text-blue-700 border-blue-300"
              >
                Classe {organization.provimento_class}
                {organization?.provimento_subclass ? ` • ${organization.provimento_subclass}` : ''}
              </Badge>
            )}
          </div>

          {/* Perfil do Usuário */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[150px]">
                {user?.name || user?.email}
              </p>
              <p className="text-[11px] text-slate-500 capitalize">{getRoleLabel()}</p>
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0B2545] to-[#124E78] border border-[#D4AF37]/50 flex items-center justify-center text-white text-xs font-bold uppercase shadow-xs">
              {(user?.name || user?.email || 'U').substring(0, 2)}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 ml-1"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Corpo com Sidebar e Conteúdo */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
          {/* Resumo da Serventia na Sidebar */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Ambiente do Cartório
            </p>
            <p className="text-sm font-semibold text-white truncate mt-0.5" title={orgName}>
              {orgName}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Online • {getRoleLabel()}</span>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <h4 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  {section.title}
                </h4>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const active = isItemActive(item.href)
                    return (
                      <li key={item.title}>
                        <Link
                          to={item.href}
                          className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            active
                              ? 'bg-gradient-to-r from-[#124E78] to-[#0B2545] text-white shadow-xs font-semibold border-l-2 border-[#D4AF37]'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <item.icon
                              className={`w-4 h-4 shrink-0 ${active ? 'text-[#D4AF37]' : 'text-slate-400 group-hover:text-slate-200'}`}
                            />
                            <span className="truncate">{item.title}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F3C969] font-semibold border border-[#D4AF37]/30">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Rodapé da Sidebar */}
          <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <CsctiLogoMark size={16} />
              <span className="truncate">CSCTI - Compliance</span>
            </div>
            <span className="text-[10px] font-mono text-[#D4AF37] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              v{CSCTI_BRAND.version}
            </span>
          </div>
        </aside>

        {/* Sidebar Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative w-72 bg-slate-900 text-slate-300 flex flex-col z-10 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <span className="font-bold text-white text-sm">Navegação do Sistema</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 border-b border-slate-800 bg-slate-950/40">
                <p className="text-xs text-slate-400">Serventia</p>
                <p className="text-sm font-semibold text-white truncate">{orgName}</p>
                <p className="text-xs text-emerald-400 mt-1">Conectado como {getRoleLabel()}</p>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {navSections.map((section) => (
                  <div key={section.title}>
                    <h4 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {section.title}
                    </h4>
                    <ul className="space-y-1">
                      {section.items.map((item) => {
                        const active = isItemActive(item.href)
                        return (
                          <li key={item.title}>
                            <Link
                              to={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                                active
                                  ? 'bg-gradient-to-r from-[#124E78] to-[#0B2545] text-white font-semibold border-l-2 border-[#D4AF37]'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <item.icon
                                  className={`w-4 h-4 shrink-0 ${active ? 'text-[#D4AF37]' : ''}`}
                                />
                                <span>{item.title}</span>
                              </div>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="w-full text-red-400 border-red-900/50 hover:bg-red-950/40 text-xs"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" /> Encerrar Sessão
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Área Principal de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children || <Outlet />}</div>
        </main>
      </div>
    </div>
  )
}
export default Layout
