import { getAuthContext } from '@/src/lib/auth-helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/src/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Database, Search, Zap } from 'lucide-react'

export default async function DashboardPage() {
  const { user, supabase } = await getAuthContext()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch connections count
  const { count: connectionsCount } = await supabase
    .from('n8n_connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.email}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Connections
              </CardTitle>
              <CardDescription>Active n8n instances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{connectionsCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Variable Finder
              </CardTitle>
              <CardDescription>Search workflow variables</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/tools/variable-finder">Open Finder</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Manage your workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/connections">Manage Connections</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Quick guide to using the N8N Workflow Analyzer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Add Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your n8n instance with API credentials
                </p>
                <Button asChild variant="link" className="px-0">
                  <Link href="/connections">Add Connection →</Link>
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Select Workflow</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a workflow to analyze from your connected instance
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Search Variables</h3>
                <p className="text-sm text-muted-foreground">
                  Find variable usage across all nodes with advanced search
                </p>
                <Button asChild variant="link" className="px-0">
                  <Link href="/tools/variable-finder">Start Searching →</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
