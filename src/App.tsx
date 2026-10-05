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
import AuditPage from './pages/AuditPage'
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
            <Route
              path="/conformidade"
              element={
                <PlaceholderPage
                  moduleTitle="Conformidade Normativa"
                  moduleSection="Governança"
                  description="Painel de aderência aos 48 requisitos técnicos e diretrizes do Provimento CNJ 243/2026."
                  featuresPlanned={[
                    'Matriz de requisitos por classe (C1, C2 e C3)',
                    'Checklist interativo com pontuação e aderência',
                    'Acompanhamento de prazos de 180, 240 e 300 dias',
                    'Relatório formal de conformidade para o Juiz Corregedor',
                  ]}
                />
              }
            />
            <Route
              path="/planos-de-acao"
              element={
                <PlaceholderPage
                  moduleTitle="Planos de Ação e Remediação"
                  moduleSection="Governança"
                  description="Gestão de pendências e planos de adequação para itens não conformes do Anexo IV."
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
            <Route
              path="/evidencias"
              element={
                <PlaceholderPage
                  moduleTitle="Central de Evidências"
                  moduleSection="Evidências"
                  description="Repositório central de arquivos e comprovações técnicas das políticas da serventia."
                  featuresPlanned={[
                    'Upload e indexação de evidências comprobatórias',
                    'Vinculação direta com os requisitos do Provimento 243',
                    'Assinatura digital e carimbo de tempo nos relatórios',
                    'Exportação de dossiê consolidado para correição',
                  ]}
                />
              }
            />
            <Route path="/auditoria" element={<AuditPage />} />

            {/* 4. Ambiente */}
            <Route
              path="/ativos"
              element={
                <PlaceholderPage
                  moduleTitle="Inventário de Ativos"
                  moduleSection="Ambiente"
                  description="Mapeamento e catalogação de servidores, computadores e equipamentos da serventia via GLPI."
                  featuresPlanned={[
                    'Sincronização bidirecional com a API do servidor GLPI',
                    'Classificação de computadores com acesso a centrais notariais',
                    'Status de antivírus, criptografia e firewall nos endpoints',
                    'Ficha técnica por estação de trabalho',
                  ]}
                />
              }
            />
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
            <Route
              path="/seguranca"
              element={
                <PlaceholderPage
                  moduleTitle="Gestão de Segurança e Riscos"
                  moduleSection="Segurança"
                  description="Políticas de segurança da informação, análise de vulnerabilidades e controle de acessos."
                  featuresPlanned={[
                    'Política de Segurança da Informação (PSI) padronizada',
                    'Gestão de privilégios e senhas seguras',
                    'Relatório de análise de vulnerabilidades periódica',
                  ]}
                />
              }
            />

            {/* 6. Continuidade */}
            <Route
              path="/backup"
              element={
                <PlaceholderPage
                  moduleTitle="Backup e Recuperação de Desastres"
                  moduleSection="Continuidade"
                  description="Monitoramento automático das rotinas de cópia de segurança através dos e-mails comprobatórios."
                  featuresPlanned={[
                    'Leitura automática da caixa IMAP configurada nas integrações',
                    'Processamento de e-mails de backup via adaptador de evidências',
                    'Controle das regras de backup 3-2-1 e cópia externa',
                    'Testes periódicos de restauração com laudo comprobatório',
                  ]}
                />
              }
            />

            {/* 7. Administração */}
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
