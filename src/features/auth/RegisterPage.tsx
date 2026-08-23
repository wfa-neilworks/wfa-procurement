import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { UserPlus, Eye, EyeOff } from 'lucide-react'

export function RegisterPage() {
  const { signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return }

    setLoading(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const { error } = await signUp(email, password, fullName)
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      await signOut()
      navigate('/login?registered=1', { replace: true })
    }
  }

  const inputClass = "w-full rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400"
  const inputStyle = { backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = '#2F575D'
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden py-8"
      style={{ background: 'linear-gradient(135deg, #3d6b73 0%, #4a8090 50%, #2d5a62 100%)' }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 animate-pulse" style={{ background: 'radial-gradient(circle, #5a9ea8, transparent)', animationDuration: '4s' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-30 animate-pulse" style={{ background: 'radial-gradient(circle, #3a8a96, transparent)', animationDuration: '6s' }} />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <img src="/APPLOGO.png" alt="WFA Procurement" className="mx-auto mb-5" style={{ height: 180, width: 'auto', display: 'block' }} />
          <h1 className="text-3xl font-bold text-white tracking-tight">WFA Procurement</h1>
          <p className="text-sm mt-1" style={{ color: '#c8e8ee' }}>Management System</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(47,87,93,0.5)' }}>
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Create Account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#111' }}>First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="John" required autoFocus
                  className={inputClass} style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#111' }}>Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Smith" required
                  className={inputClass} style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7aadbb' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className={inputClass} style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7aadbb' }}>Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className={`${inputClass} pr-10`} style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity">
                  {showPassword ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7aadbb' }}>Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" required
                  className={`${inputClass} pr-10`} style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity">
                  {showConfirm ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, #2F575D, #1f4a52)', boxShadow: '0 4px 15px rgba(47,87,93,0.4)' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: '#5a8a96' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#7aadbb' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
