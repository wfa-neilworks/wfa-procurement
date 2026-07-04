import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Clock } from 'lucide-react'

export function PendingPage() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#28363D' }}>WFA Procurement</h1>
          <p className="text-muted-foreground mt-1 text-sm">Management System</p>
        </div>

        <div className="border rounded-xl p-8 shadow-sm bg-card space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f0f1' }}>
              <Clock className="h-7 w-7" style={{ color: '#2F575D' }} />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Awaiting Access</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your account has been created successfully.
            </p>
          </div>

          <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profile?.full_name ?? user?.email}</span>
          </div>

          <p className="text-sm text-muted-foreground">
            An admin needs to grant you access before you can use the system. Please contact your administrator.
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={async () => { await signOut(); window.location.href = '/login' }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
