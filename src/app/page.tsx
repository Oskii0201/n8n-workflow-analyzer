import Link from 'next/link';
import { Search, Shield, Zap, BarChart3, Code, Database, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="relative z-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
              <Star className="w-4 h-4 mr-2" />
              N8N Workflow Analyzer
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Find Variables in Your
              <span className="text-primary block">N8N Workflows</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Securely search and analyze variable usage across your n8n automations.
              Manage multiple environments, track dependencies, and optimize your workflows.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/tools/variable-finder">
                  Open Variable Finder
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="https://github.com/Oskii0201/n8n-workflow-analyzer">
                  View on GitHub
                  <Code className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Powerful Features for N8N Developers
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to understand and optimize your n8n workflow variables
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Variable Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Search for variables across all nodes in your workflows with powerful regex support
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Secure Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Server-side encrypted storage with Supabase authentication and row-level security
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Workflow Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor active workflows, track execution status, and analyze performance
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Multi-Environment</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage multiple n8n instances (dev, staging, production) from one interface
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle>Real-time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Live monitoring with automatic refresh and real-time workflow status
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle>Real-time Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Instant variable detection and dependency mapping across your entire workflow structure
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-primary-foreground text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Connect Your N8N</h3>
              <p className="text-muted-foreground">
                Add your n8n instance with API key and URL. Your credentials are encrypted and stored securely.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-primary-foreground text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Select Workflow</h3>
              <p className="text-muted-foreground">
                Choose from your available workflows and let our system analyze the structure and variables.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-primary-foreground text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Search & Monitor</h3>
              <p className="text-muted-foreground">
                Search for variables, monitor workflow activity, and optimize your automations with insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Built with Modern Technologies
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Leveraging the latest web technologies for performance and security
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-foreground rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-background font-bold text-lg">N</span>
              </div>
              <h3 className="font-semibold text-foreground">Next.js 15</h3>
              <p className="text-sm text-muted-foreground">React Framework</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <h3 className="font-semibold text-foreground">React 19</h3>
              <p className="text-sm text-muted-foreground">UI Library</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h3 className="font-semibold text-foreground">Tailwind CSS</h3>
              <p className="text-sm text-muted-foreground">Styling</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <h3 className="font-semibold text-foreground">Supabase</h3>
              <p className="text-sm text-muted-foreground">Backend & Auth</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to Search Your N8N Variables?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Start analyzing your workflow variables and optimize your automations today
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/tools/variable-finder">
              Open Variable Finder
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">N8N Workflow Analyzer</h3>
              <p className="text-muted-foreground">
                Secure workflow variable search and monitoring for n8n automations.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Links</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/tools/variable-finder" className="hover:text-foreground transition-colors">Variable Finder</Link></li>
                <li><Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link href="https://github.com/Oskii0201/n8n-workflow-analyzer" className="hover:text-foreground transition-colors">GitHub</Link></li>
                <li><Link href="https://n8n.io" className="hover:text-foreground transition-colors">N8N</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Technologies</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Next.js 15</li>
                <li>React 19</li>
                <li>Supabase</li>
                <li>shadcn/ui</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} N8N Workflow Analyzer. MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}