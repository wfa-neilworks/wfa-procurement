import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'

import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { PendingPage } from './features/auth/PendingPage'

import { HomePage } from './features/home/HomePage'
import { InventoryPage } from './features/inventory/InventoryPage'
import { SuppliersPage } from './features/suppliers/SuppliersPage'
import { SDSPage } from './features/sds/SDSPage'
import { PalletsPage } from './features/pallets/PalletsPage'
import { BellLayout } from './features/batch-monitoring/BellLayout'
import { BatchEntryPage } from './features/batch-monitoring/BatchEntryPage'
import { TodaysBatchPage } from './features/batch-monitoring/TodaysBatchPage'
import { AverageUsagePage } from './features/batch-monitoring/AverageUsagePage'
import { BatchLookupPage } from './features/batch-monitoring/BatchLookupPage'
import { BellAdminPage } from './features/batch-monitoring/BellAdminPage'
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
        <div
          className="h-8 w-8 rounded-full border-4 border-muted animate-spin mx-auto"
          style={{ borderTopColor: '#2F575D' }}
        />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

const SECTION_ROUTES: Record<string, string> = {
  'home': '/',
  'inventory': '/inventory/cartons-and-lids',
  'pallets': '/pallets',
  'batch-monitoring': '/batch-monitoring/entry',
  'sds': '/sds',
  'suppliers': '/suppliers',
  'order-forms': '/order-forms',
  'purchase-orders': '/purchase-orders',
  'reports': '/reports',
  'settings': '/settings',
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading, can } = useAuth()

  // loading is only false after BOTH session + profile are resolved
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  // No profile row OR no permissions and not admin → pending
  if (!isAdmin && (!profile || profile.permissions.length === 0)) {
    return <Navigate to="/pending" replace />
  }

  // If user lands on a route they can't access, redirect to their first allowed section
  if (!isAdmin) {
    const currentPath = window.location.pathname
    const matchedSection = Object.entries(SECTION_ROUTES).find(([, route]) =>
      currentPath === route || currentPath.startsWith(route === '/' ? '/_never_' : route)
    )
    if (matchedSection) {
      const [section] = matchedSection
      if (!can(section)) {
        const firstAllowed = Object.entries(SECTION_ROUTES).find(([s]) => can(s))
        if (firstAllowed) return <Navigate to={firstAllowed[1]} replace />
      }
    }
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending" element={<PendingPage />} />

      <Route path="/batch-monitoring" element={<ProtectedRoute><BellLayout /></ProtectedRoute>}>
        <Route path="entry" element={<BatchEntryPage />} />
        <Route path="today/:category" element={<TodaysBatchPage />} />
        <Route path="average-usage/:category" element={<AverageUsagePage />} />
        <Route path="batch-lookup/:category" element={<BatchLookupPage />} />
        <Route path="admin" element={<AdminRoute><BellAdminPage /></AdminRoute>} />
      </Route>

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="inventory/:category" element={<InventoryPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="sds" element={<SDSPage />} />
        <Route path="pallets" element={<PalletsPage />} />
        <Route path="order-forms" element={<OrderFormsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
        <Toaster position="top-right" expand richColors closeButton duration={4000} />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
