import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, BarChart2, Search, ShieldCheck, ScanLine, ChevronDown, ChevronRight, LogOut, User } from 'lucide-react'
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
  const { isAdmin, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showRestricted, setShowRestricted] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

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
          <>
            <div className="py-2 px-1">
              <div className="h-px" style={{ backgroundColor: '#0f2030' }} />
            </div>
            {isAdmin ? (
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
            ) : (
              <button
                onClick={() => setShowRestricted(true)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5 w-full"
                style={{ color: '#4a7a9a' }}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Admin
              </button>
            )}
          </>
        </nav>

        <div className="p-3 text-center font-bold" style={{ color: '#ffffff', fontSize: '11px', letterSpacing: '0.1em' }}>
          BellEVersion-1.0
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#080d18' }}>
        {/* Top bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #1a2d42' }}>
          <User className="h-4 w-4" style={{ color: '#4a7aaa' }} />
          <span className="text-sm font-medium text-white">{profile?.full_name ?? 'User'}</span>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: '#1e3a5a' }} />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-red-900/30"
            style={{ color: '#f87171', border: '1px solid #3a1a1a' }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* Restricted access modal */}
      {showRestricted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm w-full mx-4" style={{ backgroundColor: '#0d1625', border: '1px solid #1e3a5a' }}>
            <ShieldCheck className="h-12 w-12" style={{ color: '#2a6aaa' }} />
            <p className="text-white font-semibold text-lg">Restricted Access</p>
            <p className="text-sm" style={{ color: '#4a7aaa' }}>
              Sorry, this section is restricted.<br />Only Admin accounts. :P
            </p>
            <button
              onClick={() => setShowRestricted(false)}
              className="mt-2 px-6 py-2 rounded-lg text-sm font-bold text-white transition-all"
              style={{ backgroundColor: '#1a4a7a', border: '1px solid #2a6aaa' }}
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
