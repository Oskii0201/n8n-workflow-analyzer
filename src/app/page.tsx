import Link from 'next/link';
import { Search, Shield, Zap, BarChart3, Code, Database, ArrowRight, Star, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="relative z-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-8">
              <Star className="w-4 h-4 mr-2" />
              N8N Workflow Analyzer
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Find Variables in Your
              <span className="text-blue-600 block">N8N Workflows</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Securely search and analyze variable usage across your n8n automations. 
              Manage multiple environments, track dependencies, and optimize your workflows.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/workflows" 
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Open Variable Finder
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                href="https://github.com/Oskii0201/n8n-workflow-analyzer" 
                className="inline-flex items-center px-8 py-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                View on GitHub
                <Code className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features for N8N Developers
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to understand and optimize your n8n workflow variables
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Variable Search</h3>
              <p className="text-gray-600">
                Search for variables across all nodes in your workflows with powerful regex support
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Sessions</h3>
              <p className="text-gray-600">
                Encrypted storage for multiple n8n environments with password protection
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Workflow Monitoring</h3>
              <p className="text-gray-600">
                Monitor active workflows, track execution status, and analyze performance
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Database className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Environment</h3>
              <p className="text-gray-600">
                Manage multiple n8n instances (dev, staging, production) from one interface
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-gray-600">
                Live monitoring with automatic refresh and real-time workflow status
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Analysis</h3>
              <p className="text-gray-600">
                Instant variable detection and dependency mapping across your entire workflow structure
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Connect Your N8N</h3>
              <p className="text-gray-600">
                Add your n8n instance with API key and URL. Your credentials are encrypted and stored securely.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Select Workflow</h3>
              <p className="text-gray-600">
                Choose from your available workflows and let our system analyze the structure and variables.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Search & Monitor</h3>
              <p className="text-gray-600">
                Search for variables, monitor workflow activity, and optimize your automations with insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built with Modern Technologies
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Leveraging the latest web technologies for performance and security
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <h3 className="font-semibold text-gray-900">Next.js 15</h3>
              <p className="text-sm text-gray-600">React Framework</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <h3 className="font-semibold text-gray-900">React 19</h3>
              <p className="text-sm text-gray-600">UI Library</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h3 className="font-semibold text-gray-900">Tailwind CSS</h3>
              <p className="text-sm text-gray-600">Styling</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h3 className="font-semibold text-gray-900">TypeScript</h3>
              <p className="text-sm text-gray-600">Type Safety</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Search Your N8N Variables?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start analyzing your workflow variables and optimize your automations today
          </p>
          <Link 
            href="/workflows" 
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Open Variable Finder
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">N8N Workflow Analyzer</h3>
              <p className="text-gray-400">
                Secure workflow variable search and monitoring for n8n automations.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/workflows" className="hover:text-white transition-colors">Variable Finder</Link></li>
                <li><Link href="https://github.com/Oskii0201/n8n-workflow-analyzer" className="hover:text-white transition-colors">GitHub</Link></li>
                <li><Link href="https://n8n.io" className="hover:text-white transition-colors">N8N</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Technologies</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Next.js 15</li>
                <li>React 19</li>
                <li>Tailwind CSS</li>
                <li>TypeScript</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()}{" "} N8N Workflow Analyzer. MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}