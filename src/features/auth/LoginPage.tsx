import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { LogIn } from 'lucide-react'

export function LoginPage() {
  const { signIn, user, profile, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  // Once auth + profile are loaded, route the user to the right place
  useEffect(() => {
    if (loading || !user || !profile) return
    if (isAdmin || profile.permissions.length > 0) {
      navigate('/', { replace: true })
    } else {
      navigate('/pending', { replace: true })
    }
  }, [loading, user, profile, isAdmin, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSigningIn(true)
    const { error } = await signIn(email, password)
    setSigningIn(false)
    if (error) {
      setError(error.message)
    }
    // Navigation is handled by the useEffect above once profile loads
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#28363D' }}>WFA Procurement</h1>
          <p className="text-muted-foreground mt-1 text-sm">Management System</p>
        </div>

        <div className="border rounded-xl p-8 shadow-sm bg-card">
          <div className="flex items-center gap-2 mb-6">
            <LogIn className="h-5 w-5" style={{ color: '#2F575D' }} />
            <h2 className="text-xl font-semibold">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {justRegistered && (
              <div className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-md">
                Account created! Sign in to continue. An admin will grant you access.
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={signingIn || loading}
              style={{ backgroundColor: '#28363D' }}
            >
              {signingIn || (loading && user) ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: '#2F575D' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
