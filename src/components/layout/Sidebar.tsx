import { NavLink } from 'react-router-dom'
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
  FileCheck
} from 'lucide-react'
import { cn } from '../../lib/utils'

const navigation = [
  { name: 'Home', to: '/', icon: Home },
  {
    name: 'Inventory',
    icon: Package,
    children: [
      { name: 'Cartons and Lids', to: '/inventory/cartons-and-lids' },
      { name: 'Shrinkbags', to: '/inventory/shrinkbags' },
      { name: 'Carcass Bags', to: '/inventory/carcass-bags' },
      { name: 'Soakerpads, Liner, Strapping', to: '/inventory/soakerpads-liner-strapping' },
      { name: 'Other', to: '/inventory/other' },
    ]
  },
  { name: 'Pallets', to: '/pallets', icon: Boxes },
  { name: 'SDS', to: '/sds', icon: FileText },
  { name: 'Suppliers', to: '/suppliers', icon: Users },
  { name: 'Order Forms', to: '/order-forms', icon: FileCheck },
  { name: 'Purchase Orders', to: '/purchase-orders', icon: ShoppingCart },
  { name: 'Reports', to: '/reports', icon: BarChart3 },
  { name: 'Settings', to: '/settings', icon: Settings },
]

export function Sidebar() {
  const [inventoryOpen, setInventoryOpen] = useState(true)

  return (
    <aside className="fixed left-0 top-0 h-full w-64 text-white border-r overflow-y-auto shadow-lg" style={{backgroundColor: '#28363D', borderColor: '#2F575D'}}>
      <div className="p-6 border-b" style={{borderColor: 'rgba(255,255,255,0.1)'}}>
        <h1 className="text-2xl font-bold">WFA Procurement</h1>
        <p className="text-xs opacity-80 mt-1">Management System</p>
      </div>

      <nav className="px-3 pb-6">
        {navigation.map((item) => (
          <div key={item.name} className="mb-1">
            {item.to ? (
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "shadow-sm"
                      : "opacity-80 hover:opacity-100"
                  )
                }
                style={({ isActive }: { isActive: boolean }) =>
                  isActive
                    ? { backgroundColor: '#6D9197', color: 'white' }
                    : {}
                }
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.name}
              </NavLink>
            ) : (
              <>
                <button
                  onClick={() => setInventoryOpen(!inventoryOpen)}
                  className="flex items-center justify-between w-full gap-3 px-3 py-2 text-sm font-medium text-white hover:opacity-100 opacity-80 transition-all rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.name}
                  </div>
                  {inventoryOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {inventoryOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          cn(
                            "block px-3 py-1.5 rounded-lg text-sm transition-all",
                            isActive
                              ? "font-medium shadow-sm"
                              : "opacity-70 hover:opacity-100"
                          )
                        }
                        style={({ isActive }: { isActive: boolean }) =>
                          isActive
                            ? { backgroundColor: '#6D9197', color: 'white' }
                            : {}
                        }
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
  )
}
