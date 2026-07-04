import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { UserPlus } from 'lucide-react'

export function RegisterPage() {
  const { signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }

    setLoading(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const { error } = await signUp(email, password, fullName)
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      // Sign out to clear any auto-session, then go to pending
      await signOut()
      navigate('/login?registered=1', { replace: true })
    }
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
            <UserPlus className="h-5 w-5" style={{ color: '#2F575D' }} />
            <h2 className="text-xl font-semibold">Create Account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name</label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name</label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
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

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1">Confirm Password</label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ backgroundColor: '#28363D' }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: '#2F575D' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
