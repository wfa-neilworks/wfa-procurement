import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, BarChart2, Search, ShieldCheck, ScanLine, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

const categories = [
  { name: 'Shrink Bag', slug: 'shrink-bag' },
  { name: 'Carton', slug: 'carton' },
  { name: 'Liners', slug: 'liners' },
  { name: 'Soakerpad', slug: 'soakerpad' },
  { name: 'Poly Label', slug: 'poly-label' },
]

const dropdownSections = [
  { name: "Today's Batch", base: '/batch-monitoring/today', icon: CalendarDays },
  { name: 'Average Usage', base: '/batch-monitoring/average-usage', icon: BarChart2 },
  { name: 'Batch Lookup', base: '/batch-monitoring/batch-lookup', icon: Search },
]

function DropdownSection({ name, base, icon: Icon }: { name: string; base: string; icon: any }) {
  const location = useLocation()
  const isAnyActive = location.pathname.startsWith(base)
  const [open, setOpen] = useState(isAnyActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          isAnyActive ? 'text-white' : 'text-blue-300/70 hover:text-blue-100 hover:bg-white/5'
        )}
        style={isAnyActive ? { backgroundColor: '#122a42' } : {}}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {name}
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
      </button>

      {open && (
        <div className="mt-1 ml-4 space-y-0.5 border-l pl-3" style={{ borderColor: '#1e3a5a' }}>
          {categories.map(cat => (
            <NavLink
              key={cat.slug}
              to={`${base}/${cat.slug}`}
              className={({ isActive }) =>
                cn(
                  'block px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                  isActive ? 'text-white' : 'text-blue-300/60 hover:text-blue-100 hover:bg-white/5'
                )
              }
              style={({ isActive }) => isActive ? { backgroundColor: '#1a3a5c' } : {}}
            >
              {cat.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function BellLayout() {
  const { isAdmin } = useAuth()

  return (
    <div className="flex h-screen w-screen">
      {/* BELL Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col h-full" style={{ backgroundColor: '#0a0f1a', borderRight: '1px solid #1e2d4a' }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: '#1e2d4a' }}>
          <img src="/Bellv2.png" alt="BELL" className="w-full object-contain" style={{ maxHeight: 48 }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {/* Batch Entry — top, no dropdown */}
          <NavLink
            to="/batch-monitoring/entry"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive ? 'text-white' : 'text-blue-300/70 hover:text-blue-100 hover:bg-white/5'
              )
            }
            style={({ isActive }) => isActive ? { backgroundColor: '#1a3a5c' } : {}}
          >
            <ScanLine className="h-4 w-4 shrink-0" />
            Batch Entry
          </NavLink>

          <div className="pt-1 pb-0.5 px-3">
            <div className="h-px" style={{ backgroundColor: '#1e2d4a' }} />
          </div>

          {/* Dropdown sections */}
          {dropdownSections.map(s => (
            <DropdownSection key={s.name} {...s} />
          ))}

          {/* Admin */}
          {isAdmin && (
            <>
              <div className="pt-1 pb-0.5 px-3">
                <div className="h-px" style={{ backgroundColor: '#1e2d4a' }} />
              </div>
              <NavLink
                to="/batch-monitoring/admin"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive ? 'text-white' : 'text-blue-300/70 hover:text-blue-100 hover:bg-white/5'
                  )
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#1a3a5c' } : {}}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Admin
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-3 text-xs text-center" style={{ color: '#2a4a6a' }}>
          BELL v1.0
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ backgroundColor: '#080d18' }}>
        <Outlet />
      </div>
    </div>
  )
}
