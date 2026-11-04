import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays, BarChart2, Search, ShieldCheck, ScanLine,
  ChevronDown, ChevronRight, LogOut, User,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const categories = [
  { name: 'Shrink Bag',  slug: 'shrink-bag' },
  { name: 'Carton',      slug: 'carton' },
  { name: 'Liners',      slug: 'liners' },
  { name: 'Soakerpad',   slug: 'soakerpad' },
  { name: 'Poly Label',  slug: 'poly-label' },
]

const dropdownSections = [
  { name: "Today's Batch", base: '/batch-monitoring/today',         icon: CalendarDays },
  { name: 'Average Usage', base: '/batch-monitoring/average-usage', icon: BarChart2    },
  { name: 'Batch Lookup',  base: '/batch-monitoring/batch-lookup',  icon: Search       },
]

function DropdownSection({ name, base, icon: Icon }: { name: string; base: string; icon: React.ElementType }) {
  const location = useLocation()
  const isAnyActive = location.pathname.startsWith(base)
  const [open, setOpen] = useState(isAnyActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all"
        style={{
          color: '#ffffff',
          backgroundColor: isAnyActive ? '#0f2035' : 'transparent',
        }}
        onMouseEnter={e => { if (!isAnyActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!isAnyActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{name}</span>
        </div>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        }
      </button>

      {open && (
        <div className="mt-0.5 ml-3 pl-3 space-y-px" style={{ borderLeft: '1px solid #1e3a5a' }}>
          {categories.map(cat => (
            <NavLink
              key={cat.slug}
              to={`${base}/${cat.slug}`}
              className="block px-2 py-2 rounded-md text-xs font-medium transition-all"
              style={({ isActive }) => ({
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                backgroundColor: isActive ? '#0f2035' : 'transparent',
                borderLeft: isActive ? '2px solid #2a7abf' : '2px solid transparent',
                marginLeft: -1,
              })}
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
  const { isAdmin, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showRestricted, setShowRestricted] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = profile?.full_name ?? 'User'

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── BELL Sidebar ── */}
      <aside
        className="w-56 shrink-0 flex flex-col h-full"
        style={{ backgroundColor: '#0a0f1a', borderRight: '1px solid #1a2d42' }}
      >
        {/* Logo */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #1a2d42' }}>
          <img src="/BellV3.png" alt="BELL" className="w-full h-auto block" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {/* Batch Entry — primary */}
          <NavLink
            to="/batch-monitoring/entry"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold w-full transition-all"
            style={({ isActive }) => isActive
              ? { backgroundColor: '#1a4a7a', color: '#fff', boxShadow: '0 0 0 1px #2a6aaa' }
              : { backgroundColor: '#0d1e30', color: '#ffffff', border: '1px solid #1e3a5a' }
            }
          >
            <ScanLine className="h-4 w-4 shrink-0" />
            Batch Entry
          </NavLink>

          <div className="py-2 px-1">
            <div className="h-px" style={{ backgroundColor: '#0f2030' }} />
          </div>

          {dropdownSections.map(s => (
            <DropdownSection key={s.name} {...s} />
          ))}

          <div className="py-2 px-1">
            <div className="h-px" style={{ backgroundColor: '#0f2030' }} />
          </div>

          {isAdmin ? (
            <NavLink
              to="/batch-monitoring/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={({ isActive }) => ({
                color: isActive ? '#ffffff' : '#ffffff',
                backgroundColor: isActive ? '#0f2035' : 'transparent',
              })}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Admin
            </NavLink>
          ) : (
            <button
              onClick={() => setShowRestricted(true)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-all"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Admin
            </button>
          )}
        </nav>

        {/* Footer */}
        <div
          className="shrink-0 px-4 py-3 text-center text-[10px] font-bold tracking-widest"
          style={{ color: 'rgba(255,255,255,0.3)', borderTop: '1px solid #0f2030' }}
        >
          BellEVersion-1.0
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#080d18' }}>

        {/* Top header */}
        <header
          className="shrink-0 flex items-center justify-end gap-3 px-6 py-3"
          style={{ borderBottom: '1px solid #1a2d42' }}
        >
          <User className="h-4 w-4" style={{ color: '#4a7aaa' }} />
          <span className="text-sm font-medium text-white">{displayName}</span>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: '#1e3a5a' }} />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-red-900/30"
            style={{ color: '#f87171', border: '1px solid #3a1a1a' }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* Restricted access modal */}
      {showRestricted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowRestricted(false)}
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm w-full mx-4 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
              <ShieldCheck className="h-7 w-7" style={{ color: '#1677E8' }} />
            </div>
            <div>
              <p className="font-semibold text-lg text-slate-800">Restricted Access</p>
              <p className="text-sm text-slate-500 mt-1">This section is for Admin accounts only.</p>
            </div>
            <button
              onClick={() => setShowRestricted(false)}
              className="mt-1 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: '#1677E8' }}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
