import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { LogOut, User, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your inventory and tasks' },
  '/inventory/cartons-and-lids': { title: 'Cartons & Lids', subtitle: 'Manage carton and lid inventory' },
  '/inventory/shrinkbags': { title: 'Shrinkbags', subtitle: 'Manage shrinkbag inventory' },
  '/inventory/carcass-bags': { title: 'Carcass Bags', subtitle: 'Manage carcass bag inventory' },
  '/inventory/soakerpads-liner-strapping': { title: 'Soakerpads, Liner & Strapping', subtitle: 'Manage soakerpads, liner and strapping inventory' },
  '/inventory/other': { title: 'Other Inventory', subtitle: 'Manage other inventory items' },
  '/pallets': { title: 'Pallets', subtitle: 'Manage pallet inventory' },
  '/batch-monitoring': { title: 'Batch Monitoring', subtitle: 'Monitor production batches' },
  '/sds': { title: 'SDS', subtitle: 'Safety Data Sheets management' },
  '/suppliers': { title: 'Suppliers', subtitle: 'Manage supplier information' },
  '/order-forms': { title: 'Order Forms', subtitle: 'View and manage order forms' },
  '/purchase-orders': { title: 'Purchase Orders', subtitle: 'Track purchase orders' },
  '/reports': { title: 'Reports', subtitle: 'View and export reports' },
  '/settings': { title: 'Settings', subtitle: 'Configure system preferences' },
  '/admin/users': { title: 'Manage Users', subtitle: 'Manage system users and permissions' },
}

export function Layout() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const pageInfo = routeTitles[location.pathname] ?? { title: 'VENO Procurement', subtitle: '' }
  const displayName = profile?.full_name ?? user?.email ?? ''
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />

      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '256px' }}
      >
        {/* Header */}
        <header className="shrink-0 bg-white border-b border-slate-200/80 z-20">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Page title */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>VENO</span>
                <ChevronRight className="h-3 w-3" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-slate-800 truncate leading-tight">
                  {pageInfo.title}
                </h1>
                {pageInfo.subtitle && (
                  <p className="text-xs text-slate-400 truncate leading-tight hidden sm:block">
                    {pageInfo.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* User area */}
            {user && (
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {/* User info */}
                <div className="hidden md:flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: '#2d9da8' }}
                  >
                    {initials || <User className="h-4 w-4" />}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">
                      {displayName}
                    </span>
                    <span
                      className="text-xs font-semibold mt-0.5 px-1.5 py-0.5 rounded self-start"
                      style={
                        isAdmin
                          ? { backgroundColor: '#e0f5f7', color: '#1a7a85' }
                          : { backgroundColor: '#f1f5f9', color: '#64748b' }
                      }
                    >
                      {isAdmin ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>

                {/* Mobile user avatar */}
                <div
                  className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: '#2d9da8' }}
                >
                  {initials || <User className="h-4 w-4" />}
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-6 bg-slate-200" />

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
