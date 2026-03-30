import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/src/components/ui/button'
import { Database, Settings, Users, Zap, CreditCard } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Database className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">CleanData</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              <NavLink href="/dashboard" icon={<Zap className="h-5 w-5" />}>
                Overview
              </NavLink>
              <NavLink href="/dashboard/contacts" icon={<Users className="h-5 w-5" />}>
                Contacts
              </NavLink>
              <NavLink href="/dashboard/enrichment" icon={<Database className="h-5 w-5" />}>
                Enrichment
              </NavLink>
              <NavLink href="/dashboard/deduplication" icon={<Zap className="h-5 w-5" />}>
                Deduplication
              </NavLink>
              <NavLink href="/dashboard/billing" icon={<CreditCard className="h-5 w-5" />}>
                Billing
              </NavLink>
              <NavLink href="/dashboard/settings" icon={<Settings className="h-5 w-5" />}>
                Settings
              </NavLink>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}