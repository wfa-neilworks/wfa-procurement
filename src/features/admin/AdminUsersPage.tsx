import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { ShieldCheck, User, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'

const ALL_SECTIONS = [
  { key: 'home', label: 'Home' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'pallets', label: 'Pallets' },
  { key: 'batch-monitoring', label: 'Batch Monitoring' },
  { key: 'sds', label: 'SDS' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'order-forms', label: 'Order Forms' },
  { key: 'purchase-orders', label: 'Purchase Orders' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
]

interface UserProfile {
  id: string
  full_name: string | null
  role: 'admin' | 'user'
  permissions: string[]
  created_at: string
  email?: string
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null)

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: true }) as any
      if (error) throw error
      return ((data ?? []) as UserProfile[]).map((u) => ({
        ...u,
        permissions: u.permissions ?? [],
      }))
    },
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<UserProfile> }) => {
      const { error } = await (supabase.from('user_profiles') as any).update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User updated')
    },
    onError: () => toast.error('Failed to update user'),
  })

  const toggleRole = (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    updateUser.mutate({ id: user.id, patch: { role: newRole } })
  }

  const togglePermission = (user: UserProfile, section: string) => {
    const current = user.permissions ?? []
    const updated = current.includes(section)
      ? current.filter((p) => p !== section)
      : [...current, section]
    updateUser.mutate({ id: user.id, patch: { permissions: updated } })
  }

  const grantAll = (user: UserProfile) => {
    updateUser.mutate({ id: user.id, patch: { permissions: ALL_SECTIONS.map((s) => s.key) } })
  }

  const revokeAll = (user: UserProfile) => {
    updateUser.mutate({ id: user.id, patch: { permissions: [] } })
  }

  const saveName = (id: string) => {
    if (!editingName || editingName.value.trim() === '') return
    updateUser.mutate({ id, patch: { full_name: editingName.value.trim() } })
    setEditingName(null)
  }

  const getInitials = (name: string | null) => {
    if (!name) return null
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading users...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6" style={{ color: '#2F575D' }} />
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage roles and section access for each user</p>
        </div>
      </div>

      <div className="space-y-3">
        {users.map((user) => {
          const isExpanded = expandedUser === user.id
          const isAdmin = user.role === 'admin'
          const initials = getInitials(user.full_name)
          const isEditingThis = editingName?.id === user.id

          return (
            <div key={user.id} className="border rounded-xl overflow-hidden bg-card shadow-sm">
              {/* User row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: isAdmin ? '#2F575D' : '#6D9197' }}
                  >
                    {initials ?? <User className="h-4 w-4" />}
                  </div>
                  <div>
                    {isEditingThis ? (
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-7 text-sm w-48"
                          value={editingName.value}
                          onChange={(e) => setEditingName({ id: user.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveName(user.id)
                            if (e.key === 'Escape') setEditingName(null)
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => saveName(user.id)}
                          className="text-xs font-medium px-2 py-1 rounded"
                          style={{ backgroundColor: '#2F575D', color: 'white' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingName(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {user.full_name ?? (
                            <span className="text-muted-foreground italic">Unnamed User</span>
                          )}
                        </p>
                        <button
                          onClick={() => setEditingName({ id: user.id, value: user.full_name ?? '' })}
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                          {user.full_name ? 'edit' : 'set name'}
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID: {user.id.slice(0, 8)}…
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRole(user)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                      isAdmin
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                    title="Click to toggle role"
                  >
                    {isAdmin ? 'Admin' : 'User'}
                  </button>

                  {!isAdmin && (
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="h-4 w-4" /> Hide</>
                      ) : (
                        <><ChevronDown className="h-4 w-4" /> Manage access</>
                      )}
                    </button>
                  )}

                  {isAdmin && (
                    <span className="text-xs text-muted-foreground italic">Full access</span>
                  )}
                </div>
              </div>

              {/* Permissions grid */}
              {isExpanded && !isAdmin && (
                <div className="border-t px-5 py-4" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Section Access
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => grantAll(user)}>
                        Grant All
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => revokeAll(user)}>
                        Revoke All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_SECTIONS.map((section) => {
                      const granted = user.permissions?.includes(section.key)
                      return (
                        <button
                          key={section.key}
                          onClick={() => togglePermission(user, section.key)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left',
                            granted
                              ? 'border-transparent text-white'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          )}
                          style={granted ? { backgroundColor: '#2F575D' } : {}}
                        >
                          <div className={cn(
                            'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
                            granted ? 'border-white bg-white/20' : 'border-muted-foreground'
                          )}>
                            {granted && (
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {section.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
            No users found.
          </div>
        )}
      </div>
    </div>
  )
}
