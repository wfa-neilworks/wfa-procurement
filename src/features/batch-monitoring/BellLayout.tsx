import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, BarChart2, Search, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

const nav = [
  { name: "Today's Batch", to: '/batch-monitoring', icon: CalendarDays, end: true },
  { name: 'Average Usage', to: '/batch-monitoring/average-usage', icon: BarChart2 },
  { name: 'Batch Lookup', to: '/batch-monitoring/batch-lookup', icon: Search },
  { name: 'Admin', to: '/batch-monitoring/admin', icon: ShieldCheck },
]

export function BellLayout() {
  const { isAdmin } = useAuth()
  const visibleNav = nav.filter(item => item.name !== 'Admin' || isAdmin)

  return (
    <div className="flex h-full">
      {/* BELL Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col h-full" style={{ backgroundColor: '#0a0f1a', borderRight: '1px solid #1e2d4a' }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: '#1e2d4a' }}>
          <img src="/Bell.png" alt="BELL" className="w-full object-contain" style={{ maxHeight: 48 }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {visibleNav.map(item => (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'text-white'
                    : 'text-blue-300/70 hover:text-blue-100 hover:bg-white/5'
                )
              }
              style={({ isActive }) => isActive ? { backgroundColor: '#1a3a5c', color: 'white' } : {}}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 text-xs text-center" style={{ color: '#2a4a6a' }}>
          BELL v1.0
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background">
        <Outlet />
      </div>
    </div>
  )
}
