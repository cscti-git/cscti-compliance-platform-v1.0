import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSearch } from '@/contexts/SearchContext'
import { Briefcase, LayoutGrid, Plus, Clock, Search, Bell, LogOut, Menu, X } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const { searchTerm, setSearchTerm } = useSearch()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Meus Contextos', path: '/', icon: LayoutGrid },
    { name: 'Novo Contexto', path: '/novo-contexto', icon: Plus },
    { name: 'Histórico', path: '/historico', icon: Clock },
  ]

  const getSectionTitle = () => {
    if (location.pathname === '/') return 'Meus Contextos'
    if (location.pathname === '/novo-contexto') return 'Novo Contexto'
    if (location.pathname === '/historico') return 'Histórico de Atividades'
    if (location.pathname.startsWith('/contextos/')) return 'Detalhes do Contexto'
    if (location.pathname.startsWith('/editar-contexto/')) return 'Editar Contexto'
    return 'Contexto'
  }

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : 'US'

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1F2937] flex flex-col md:flex-row">
      {/* Sidebar Desktop (fixed 240px) */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-[#E4E7EC] shadow-[1px_0_4px_rgba(0,0,0,0.02)] fixed inset-y-0 left-0 z-30">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-[#E4E7EC]">
          <div className="w-9 h-9 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center shadow-sm">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-base tracking-tight leading-tight text-[#1F2937]">
              Contexto
            </h1>
            <p className="text-[11px] text-[#6B7280]">Ponte de Trabalho & IA</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border-l-4 border-[#4F46E5] shadow-xs'
                    : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#4F46E5]' : 'text-[#6B7280]'}`} />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-[#E4E7EC] bg-white">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#1F2937] truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-[11px] text-[#9CA3AF] truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-[#E4E7EC] sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 -ml-1 text-[#6B7280] hover:text-[#1F2937] rounded-md"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base md:text-lg font-semibold text-[#1F2937] tracking-tight">
              {getSectionTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
            <div className="relative w-full max-w-xs md:max-w-sm">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar em contextos..."
                className="w-full h-9 pl-9 pr-3 text-xs md:text-sm rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] focus:bg-white text-[#1F2937] placeholder-[#9CA3AF] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-[#1F2937]"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                className="p-2 text-[#6B7280] hover:text-[#1F2937] rounded-lg hover:bg-[#F3F4F6] transition-colors relative"
                title="Notificações"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4F46E5] ring-2 ring-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 md:p-8 max-w-[1200px] w-full mx-auto pb-24 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#E4E7EC] flex items-center justify-around px-2 z-30">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-[#4F46E5]' : 'text-[#6B7280]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#4F46E5]' : 'text-[#6B7280]'}`}
                />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-50">
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#E4E7EC]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="font-semibold text-base text-[#1F2937]">Contexto</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 text-[#6B7280] hover:text-[#1F2937]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </nav>

            <div className="p-4 border-t border-[#E4E7EC]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#1F2937] truncate">{user?.name}</p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-[#EF4444] hover:bg-red-50 rounded-md"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
