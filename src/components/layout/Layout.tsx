import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/button'
import { LogOut, User } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Layout() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-6">
            <div />
            <div className="flex items-center gap-3">
              {user && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{profile?.full_name ?? user.email}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={
                        isAdmin
                          ? { backgroundColor: '#2F575D', color: 'white' }
                          : { backgroundColor: '#e2e8f0', color: '#475569' }
                      }
                    >
                      {isAdmin ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
