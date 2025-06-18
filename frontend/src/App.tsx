import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ToastProvider } from '@/components/ui/toast';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { AuthPage } from '@/components/auth/AuthPage';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { AgentManagement } from '@/components/admin/AgentManagement';
import { UserRole } from '@/types';
import { AgentRegistrationForm } from '@/components/auth/AgentRegistrationForm';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: UserRole }) {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && state.user?.role !== requiredRole) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}

// Admin Layout Component
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
}

function AppContent() {
  const { state } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/auth" 
          element={
            state.isAuthenticated ? <Navigate to="/chat" replace /> : <AuthPage />
          } 
        />

        {/* Protected Routes */}
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
            </ProtectedRoute>
          } 
        />

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ChatProvider>
                <AdminLayout>
                  <AdminPanel />
                </AdminLayout>
              </ChatProvider>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ChatProvider>
                <AdminLayout>
                  <AdminPanel />
                </AdminLayout>
              </ChatProvider>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ChatProvider>
                <AdminLayout>
                  <AdminPanel />
                </AdminLayout>
              </ChatProvider>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/create-agent" 
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ChatProvider>
                <AdminLayout>
                  <AgentRegistrationForm adminSessionId={undefined} onBack={() => window.history.back()} />
                </AdminLayout>
              </ChatProvider>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/settings" 
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ChatProvider>
                <AdminLayout>
                  <AdminPanel />
                </AdminLayout>
              </ChatProvider>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/workload" 
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ChatProvider>
                <AdminLayout>
                  <AdminPanel />
                </AdminLayout>
              </ChatProvider>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/agents" 
          element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <ChatProvider>
                <AdminLayout>
                  <AgentManagement />
                </AdminLayout>
              </ChatProvider>
            </ProtectedRoute>
          } 
        />

        {/* Default Redirects */}
        <Route 
          path="/" 
          element={
            <Navigate to={state.isAuthenticated ? "/chat" : "/auth"} replace />
          } 
        />

        {/* Catch all - redirect to appropriate page */}
        <Route 
          path="*" 
          element={
            <Navigate to={state.isAuthenticated ? "/chat" : "/auth"} replace />
          } 
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
