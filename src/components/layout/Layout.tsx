import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/button'
import { LogIn, LogOut, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog'
import { Input } from '../ui/input'

export function Layout() {
  const { user, signIn, signOut } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved === 'true'
  })

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
    } else {
      setLoginOpen(false)
      setEmail('')
      setPassword('')
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-6">
            <div></div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {user.email}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLoginOpen(true)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent onClose={() => setLoginOpen(false)}>
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Enter your email and password to access your account
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLoginOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Sign In</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
