import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'

// Auth pages
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { PendingPage } from './features/auth/PendingPage'

// App pages
import { HomePage } from './features/home/HomePage'
import { InventoryPage } from './features/inventory/InventoryPage'
import { SuppliersPage } from './features/suppliers/SuppliersPage'
import { SDSPage } from './features/sds/SDSPage'
import { PalletsPage } from './features/pallets/PalletsPage'
import { BatchMonitoringPage } from './features/batch-monitoring/BatchMonitoringPage'
import { OrderFormsPage } from './features/order-forms/OrderFormsPage'
import { PurchaseOrdersPage } from './features/purchase-orders/PurchaseOrdersPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { AdminUsersPage } from './features/admin/AdminUsersPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-transparent animate-spin mx-auto"
          style={{ borderTopColor: '#2F575D' }} />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin && profile && (profile.permissions ?? []).length === 0) {
    return <Navigate to="/pending" replace />
  }
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending" element={<PendingPage />} />

      {/* Protected app routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="inventory/:category" element={<InventoryPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="sds" element={<SDSPage />} />
        <Route path="pallets" element={<PalletsPage />} />
        <Route path="batch-monitoring" element={<BatchMonitoringPage />} />
        <Route path="order-forms" element={<OrderFormsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Admin-only routes */}
        <Route path="admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          duration={4000}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
