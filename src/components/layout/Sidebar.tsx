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
  ScanBarcode,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
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
          'fixed left-0 top-0 h-screen flex flex-col z-30 shadow-xl transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64'
        )}
        style={{ backgroundColor: '#1a2535', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo Header */}
        <div
          className={cn(
            'flex items-center shrink-0 transition-all duration-300',
            isCollapsed ? 'justify-center px-3 py-4' : 'justify-between px-5 py-4'
          )}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {!isCollapsed && (
            <div className="flex-1 mr-2 overflow-hidden">
              <img
                src="/APPLOGO.png"
                alt="VENO Procurement"
                className="w-full h-auto block"
                style={{ filter: 'brightness(0) invert(1)', maxHeight: '36px', objectFit: 'contain', objectPosition: 'left' }}
              />
            </div>
          )}
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center justify-center rounded-lg transition-all duration-200 shrink-0',
              'text-white/50 hover:text-white hover:bg-white/10',
              isCollapsed ? 'w-9 h-9' : 'w-8 h-8'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {navigation.map((item) => {
            const hasChildren = 'children' in item && item.children
            const accessible = can(item.section)

            if (!hasChildren && 'to' in item && item.to) {
              if (accessible) {
                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    end={item.to === '/'}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                        isCollapsed && 'justify-center',
                        isActive
                          ? 'bg-[#2d9da8]/20 text-[#4dbdca]'
                          : 'text-white/60 hover:text-white hover:bg-white/8'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !isCollapsed && (
                          <span className="absolute left-0 w-0.5 h-5 rounded-r-full bg-[#4dbdca]" style={{ marginLeft: '-8px' }} />
                        )}
                        {item.icon && (
                          <item.icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              isActive ? 'text-[#4dbdca]' : 'text-white/40 group-hover:text-white/80'
                            )}
                          />
                        )}
                        {!isCollapsed && (
                          <span className="truncate">{item.name}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              } else {
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.to!, item.section)}
                    title={isCollapsed ? item.name : undefined}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      'text-white/25 hover:text-white/40 cursor-not-allowed',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                    {!isCollapsed && <span className="line-through truncate">{item.name}</span>}
                  </button>
                )
              }
            }

            // Inventory group
            if (hasChildren) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => accessible ? setInventoryOpen(o => !o) : setShowRestricted(true)}
                    title={isCollapsed ? item.name : undefined}
                    className={cn(
                      'group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isCollapsed ? 'justify-center' : 'justify-between',
                      accessible
                        ? 'text-white/60 hover:text-white hover:bg-white/8'
                        : 'text-white/25 cursor-not-allowed'
                    )}
                  >
                    <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
                      {item.icon && (
                        <item.icon className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          accessible ? 'text-white/40 group-hover:text-white/80' : 'text-white/25'
                        )} />
                      )}
                      {!isCollapsed && (
                        accessible
                          ? <span className="truncate">{item.name}</span>
                          : <span className="line-through truncate">{item.name}</span>
                      )}
                    </div>
                    {!isCollapsed && accessible && (
                      <span className="text-white/30">
                        {inventoryOpen
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />
                        }
                      </span>
                    )}
                  </button>

                  {inventoryOpen && !isCollapsed && accessible && (
                    <div className="ml-3 mt-0.5 pl-4 space-y-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                      {item.children?.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            cn(
                              'block px-3 py-2 rounded-lg text-sm transition-all duration-150',
                              isActive
                                ? 'bg-[#2d9da8]/20 text-[#4dbdca] font-medium'
                                : 'text-white/50 hover:text-white hover:bg-white/8'
                            )
                          }
                        >
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return null
          })}
        </nav>

        {/* Bottom padding */}
        <div className="shrink-0 h-3" />
      </aside>

      {/* Restricted access modal */}
      {showRestricted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowRestricted(false)}
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm w-full mx-4 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-lg">Access Restricted</p>
              <p className="text-sm text-gray-500 mt-1">
                You don't have permission to access this section. Please contact Neil.
              </p>
            </div>
            <button
              onClick={() => setShowRestricted(false)}
              className="mt-1 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: '#1a2535' }}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  )
}
