import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Home,
  Package,
  Users,
  FileText,
  Boxes,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Menu,
  X,
  ScanBarcode,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

const navigation = [
  { name: 'Home', to: '/', icon: Home, section: 'home' },
  {
    name: 'Inventory',
    icon: Package,
    section: 'inventory',
    children: [
      { name: 'Cartons and Lids', to: '/inventory/cartons-and-lids' },
      { name: 'Shrinkbags', to: '/inventory/shrinkbags' },
      { name: 'Carcass Bags', to: '/inventory/carcass-bags' },
      { name: 'Soakerpads, Liner, Strapping', to: '/inventory/soakerpads-liner-strapping' },
      { name: 'Other', to: '/inventory/other' },
    ],
  },
  { name: 'Pallets', to: '/pallets', icon: Boxes, section: 'pallets' },
  { name: 'Batch Monitoring', to: '/batch-monitoring', icon: ScanBarcode, section: 'batch-monitoring' },
  { name: 'SDS', to: '/sds', icon: FileText, section: 'sds' },
  { name: 'Suppliers', to: '/suppliers', icon: Users, section: 'suppliers' },
  { name: 'Order Forms', to: '/order-forms', icon: FileCheck, section: 'order-forms' },
  { name: 'Purchase Orders', to: '/purchase-orders', icon: ShoppingCart, section: 'purchase-orders' },
  { name: 'Reports', to: '/reports', icon: BarChart3, section: 'reports' },
  { name: 'Settings', to: '/settings', icon: Settings, section: 'settings' },
  { name: 'Manage Users', to: '/admin/users', icon: ShieldCheck, section: 'admin' },
]


interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const [inventoryOpen, setInventoryOpen] = useState(true)
  const [showRestricted, setShowRestricted] = useState(false)
  const { can } = useAuth()
  const navigate = useNavigate()

  const handleNavClick = (to: string, section: string) => {
    if (can(section)) {
      navigate(to)
    } else {
      setShowRestricted(true)
    }
  }

  return (
    <>
    <aside
      className={cn(
        'fixed left-0 top-0 h-full text-white border-r overflow-y-auto shadow-lg transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      style={{ backgroundColor: '#28363D', borderColor: '#2F575D' }}
    >
      <div
        className={cn('border-b flex items-center justify-between', isCollapsed ? 'p-3' : 'p-6')}
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        {!isCollapsed && (
          <img src="/APPLOGO.png" alt="WFA Procurement" style={{ height: 48, width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }} />
        )}
        <button
          onClick={onToggle}
          className={cn('p-2 rounded-lg hover:bg-white/10 transition-colors', isCollapsed && 'mx-auto')}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
      </div>

      <nav className="px-3 pb-6 pt-2">
        {navigation.map((item) => (
          <div key={item.name} className="mb-1">
            {'to' in item && item.to ? (
              can(item.section) ? (
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive ? 'shadow-sm' : 'opacity-80 hover:opacity-100',
                      isCollapsed && 'justify-center'
                    )
                  }
                  style={({ isActive }) => (isActive ? { backgroundColor: '#6D9197', color: 'white' } : {})}
                  title={isCollapsed ? item.name : undefined}
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                  {!isCollapsed && item.name}
                </NavLink>
              ) : (
                <button
                  onClick={() => handleNavClick(item.to!, item.section)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all opacity-80 hover:opacity-100 w-full',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                  {!isCollapsed && item.name}
                </button>
              )
            ) : (
              <>
                <button
                  onClick={() => can(item.section) ? setInventoryOpen(!inventoryOpen) : setShowRestricted(true)}
                  className={cn(
                    'flex items-center w-full gap-3 px-3 py-2 text-sm font-medium text-white hover:opacity-100 opacity-80 transition-all rounded-lg',
                    isCollapsed ? 'justify-center' : 'justify-between'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
                    {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                    {!isCollapsed && item.name}
                  </div>
                  {!isCollapsed &&
                    (inventoryOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    ))}
                </button>
                {inventoryOpen && !isCollapsed && can(item.section) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          cn(
                            'block px-3 py-1.5 rounded-lg text-sm transition-all',
                            isActive ? 'font-medium shadow-sm' : 'opacity-70 hover:opacity-100'
                          )
                        }
                        style={({ isActive }) => (isActive ? { backgroundColor: '#6D9197', color: 'white' } : {})}
                      >
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

    </aside>

    {/* Restricted access modal */}
    {showRestricted && (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm w-full mx-4 bg-white shadow-xl">
          <ShieldCheck className="h-12 w-12 text-gray-400" />
          <p className="text-gray-900 font-semibold text-lg">Access Restricted</p>
          <p className="text-sm text-gray-500">
            Sorry, you don't have access to this part of the system.<br />Please contact Neil.
          </p>
          <button
            onClick={() => setShowRestricted(false)}
            className="mt-2 px-6 py-2 rounded-lg text-sm font-bold text-white bg-gray-700 hover:bg-gray-600 transition-all"
          >
            Okay
          </button>
        </div>
      </div>
    )}
    </>
  )
}
