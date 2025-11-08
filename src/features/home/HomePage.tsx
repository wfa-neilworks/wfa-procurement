import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Plus } from 'lucide-react'

export function HomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Forms</h1>
          <p className="text-muted-foreground">
            Manage your saved deduction forms
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* TODO: Implement saved forms list */}
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              Saved forms feature will be implemented here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page will display your saved deduction forms with options to open, edit, and delete them.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
