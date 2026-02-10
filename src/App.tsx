import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'

// Import pages
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
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
              </Route>
            </Routes>
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
