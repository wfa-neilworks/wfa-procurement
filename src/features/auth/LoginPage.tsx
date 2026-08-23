import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LogIn, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const { signIn, user, profile, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

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
    if (error) setError(error.message)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a2830 0%, #28363D 50%, #1f4a52 100%)' }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, #2F575D, transparent)', animationDuration: '4s' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, #3a7a82, transparent)', animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, #2F575D, transparent)', animationDuration: '5s' }} />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo + title */}
        <div className="text-center mb-8 animate-fade-in">
          <img src="/APPLOGO.png" alt="WFA Procurement" className="mx-auto mb-4" style={{ height: 80, width: 'auto' }} />
          <h1 className="text-3xl font-bold text-white tracking-tight">WFA Procurement</h1>
          <p className="text-sm mt-1" style={{ color: '#7aadbb' }}>Management System</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(47,87,93,0.5)' }}>
              <LogIn className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7aadbb' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:opacity-40"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                onFocus={e => e.currentTarget.style.borderColor = '#2F575D'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7aadbb' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm text-white outline-none transition-all placeholder:opacity-40"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#2F575D'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>

            {justRegistered && (
              <div className="text-xs rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>
                Account created! An admin will grant you access once you sign in.
              </div>
            )}

            {error && (
              <div className="text-xs rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn || loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, #2F575D, #1f4a52)', boxShadow: '0 4px 15px rgba(47,87,93,0.4)' }}
            >
              {signingIn || (loading && user) ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: '#5a8a96' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#7aadbb' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
