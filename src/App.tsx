/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { SearchProvider } from '@/contexts/SearchContext'
import { ProtectedRoute, PublicRoute } from '@/components/AuthGuards'

import Layout from './components/Layout'
import Index from './pages/Index'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import CreateContext from './pages/CreateContext'
import ContextDetail from './pages/ContextDetail'
import EditContext from './pages/EditContext'
import History from './pages/History'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SearchProvider>
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

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/novo-contexto" element={<CreateContext />} />
              <Route path="/contextos/:id" element={<ContextDetail />} />
              <Route path="/editar-contexto/:id" element={<EditContext />} />
              <Route path="/historico" element={<History />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </SearchProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
