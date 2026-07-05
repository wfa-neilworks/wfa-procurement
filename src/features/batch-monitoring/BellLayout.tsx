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
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all hover:bg-white/5"
        style={{ color: isAnyActive ? '#e2f0ff' : '#5a8ab0' }}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold tracking-wide">{name}</span>
        </div>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          : <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
      </button>

      {open && (
        <div className="mt-0.5 ml-3 space-y-px border-l" style={{ borderColor: '#1e3a5a' }}>
          {categories.map(cat => (
            <NavLink
              key={cat.slug}
              to={`${base}/${cat.slug}`}
              className="block pl-3 pr-2 py-1.5 text-xs font-medium transition-all relative"
              style={({ isActive }) => ({
                color: isActive ? '#fff' : '#4a7a9a',
                backgroundColor: isActive ? '#0f2035' : 'transparent',
                borderLeft: isActive ? '2px solid #2a7abf' : '2px solid transparent',
                marginLeft: -1,
              })}
            >
              {({ isActive }) => (
                <span className={isActive ? 'text-white' : 'hover:text-blue-200'}>
                  {cat.name}
                </span>
              )}
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
      <aside className="w-56 shrink-0 flex flex-col h-full" style={{ backgroundColor: '#0a0f1a', borderRight: '1px solid #1a2d42' }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: '#1a2d42' }}>
          <img src="/BellV3.png" alt="BELL" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {/* Batch Entry — primary action */}
          <NavLink
            to="/batch-monitoring/entry"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold w-full transition-all"
            style={({ isActive }) => isActive
              ? { backgroundColor: '#1a4a7a', color: '#fff', boxShadow: '0 0 0 1px #2a6aaa' }
              : { backgroundColor: '#0d1e30', color: '#5a9acf', border: '1px solid #1e3a5a' }
            }
          >
            <ScanLine className="h-4 w-4 shrink-0" />
            Batch Entry
          </NavLink>

          <div className="py-2 px-1">
            <div className="h-px" style={{ backgroundColor: '#0f2030' }} />
          </div>

          {/* Dropdown sections */}
          {dropdownSections.map(s => (
            <DropdownSection key={s.name} {...s} />
          ))}

          {/* Admin */}
          {isAdmin && (
            <>
              <div className="py-2 px-1">
                <div className="h-px" style={{ backgroundColor: '#0f2030' }} />
              </div>
              <NavLink
                to="/batch-monitoring/admin"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
                style={({ isActive }) => ({
                  color: isActive ? '#e2f0ff' : '#4a7a9a',
                  backgroundColor: isActive ? '#0f2035' : 'transparent',
                })}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Admin
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-3 text-center" style={{ color: '#1e3a5a', fontSize: '10px', letterSpacing: '0.1em' }}>
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
