import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from '@/components/AuthGuards'

import Layout from './components/Layout'
import Index from './pages/Index'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import SettingsPage from './pages/SettingsPage'
import IntegrationsPage from './pages/IntegrationsPage'
import AuditPage from './pages/AuditPage'
import TermoDesignacaoPage from './pages/config/TermoDesignacaoPage'
import AssetsPage from './pages/inventory/AssetsPage'
import InventoryReportPage from './pages/inventory/InventoryReportPage'
import BackupOverviewPage from './pages/backup/BackupOverviewPage'
import BackupOverviewPreviewPage from './pages/backup/BackupOverviewPreviewPage'
import BackupGuiaPage from './pages/backup/BackupGuiaPage'
import BackupReportPage from './pages/backup/BackupReportPage'
import EvidenciasPage from './pages/evidencias/EvidenciasPage'
import EvidenciasReportPage from './pages/evidencias/EvidenciasReportPage'
import LgpdPage from './pages/lgpd/LgpdPage'
import LgpdReportPage from './pages/lgpd/LgpdReportPage'
import SegurancaPage from './pages/seguranca/SegurancaPage'
import SegurancaReportPage from './pages/seguranca/SegurancaReportPage'
import ConformidadePage from './pages/conformidade/ConformidadePage'
import ConformidadeReportPage from './pages/conformidade/ConformidadeReportPage'
import PlaceholderPage from './pages/PlaceholderPage'
import NotFound from './pages/NotFound'

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected App Routes (Dentro do Shell CSCTI) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* 1. Visão Geral (Dashboard) */}
            <Route path="/" element={<Index />} />
            {/* 2. Governança */}
            <Route path="/lgpd" element={<LgpdPage />} />
            <Route path="/conformidade" element={<ConformidadePage />} />
            <Route
              path="/planos-de-acao"
              element={
                <PlaceholderPage
                  moduleTitle="Planos de Ação e Remediação"
                  moduleSection="Governança"
                  description="Gestão de pendências e planos de adequação para itens em desconformidade."
                  featuresPlanned={[
                    'Definição de prazos de remediação e responsáveis',
                    'Status de execução dos planos corretivos',
                    'Histórico de aprovação pelo Responsável Legal',
                    'Alertas de vencimento de prazos',
                  ]}
                />
              }
            />
            {/* 3. Evidências */}
            <Route path="/evidencias" element={<EvidenciasPage />} />
            <Route path="/auditoria" element={<AuditPage />} />
            {/* 4. Ambiente */}
            <Route path="/ativos" element={<AssetsPage />} />
            <Route
              path="/infraestrutura"
              element={
                <PlaceholderPage
                  moduleTitle="Infraestrutura Física e Lógica"
                  moduleSection="Ambiente"
                  description="Controles de nobreak, sala de servidores, links de internet redundantes e cabeamento."
                  featuresPlanned={[
                    'Inspeção periódica de nobreaks e geradores',
                    'Monitoramento de redundância de links de internet',
                    'Controle de acesso físico à sala de servidores',
                  ]}
                />
              }
            />
            {/* 5. Segurança */}
            <Route path="/seguranca" element={<SegurancaPage />} />
            {/* 6. Continuidade e Backup (Fase 3) */}
            <Route path="/backup" element={<BackupOverviewPage />} />
            <Route path="/backup/preview" element={<BackupOverviewPreviewPage />} />
            <Route path="/backup/guia" element={<BackupGuiaPage />} />
            <Route path="/backup/escopo" element={<BackupOverviewPage />} />
            <Route path="/backup/planos" element={<BackupOverviewPage />} />
            <Route path="/backup/rotinas" element={<BackupOverviewPage />} />
            <Route path="/backup/evidencias" element={<BackupOverviewPage />} />
            <Route path="/backup/execucoes" element={<BackupOverviewPage />} />
            <Route path="/backup/ocorrencias" element={<BackupOverviewPage />} />
            <Route path="/backup/testes" element={<BackupOverviewPage />} />
            {/* 7. Administração e Integrações */}
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/integracoes" element={<IntegrationsPage />} />
            <Route path="/configuracoes/designacoes/:id/termo" element={<TermoDesignacaoPage />} />
          </Route>

          {/* Relatórios Comprobatórios Formatados (Visualização limpa e Impressão A4) */}
          <Route
            path="/relatorios/inventario"
            element={
              <ProtectedRoute>
                <InventoryReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios/backup"
            element={
              <ProtectedRoute>
                <BackupReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios/evidencias"
            element={
              <ProtectedRoute>
                <EvidenciasReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios/lgpd"
            element={
              <ProtectedRoute>
                <LgpdReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios/seguranca"
            element={
              <ProtectedRoute>
                <SegurancaReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios/conformidade"
            element={
              <ProtectedRoute>
                <ConformidadeReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/backup/relatorio"
            element={
              <ProtectedRoute>
                <BackupReportPage />
              </ProtectedRoute>
            }
          />
          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
