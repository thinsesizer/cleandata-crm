import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Progress } from '@/src/components/ui/progress'
import { Database, Users, Zap, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's an overview of your data.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value="12,450"
          icon={<Users className="h-5 w-5 text-blue-600" />}
          trend="+234 this week"
        />
        <StatCard
          title="Enriched"
          value="8,230"
          icon={<Database className="h-5 w-5 text-green-600" />}
          trend="66% complete"
        />
        <StatCard
          title="Duplicates Found"
          value="156"
          icon={<Zap className="h-5 w-5 text-yellow-600" />}
          trend="Ready to merge"
        />
        <StatCard
          title="Data Quality"
          value="92%"
          icon={<CheckCircle className="h-5 w-5 text-purple-600" />}
          trend="Excellent"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/enrichment">
              <Button className="w-full justify-start" variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Run Enrichment
              </Button>
            </Link>
            <Link href="/dashboard/deduplication">
              <Button className="w-full justify-start" variant="outline">
                <Zap className="mr-2 h-4 w-4" />
                Find Duplicates
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button className="w-full justify-start" variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Connect Salesforce
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrichment Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>ABN Lookup</span>
                <span className="text-gray-500">8,230 / 12,450</span>
              </div>
              <Progress value={66} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Website Scraping</span>
                <span className="text-gray-500">5,420 / 12,450</span>
              </div>
              <Progress value={43} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Deduplication</span>
                <span className="text-gray-500">156 found</span>
              </div>
              <Progress value={12} className="bg-yellow-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ActivityItem
              action="Enrichment completed"
              details="2,340 contacts enriched with ABN data"
              time="2 hours ago"
            />
            <ActivityItem
              action="Duplicates found"
              details="23 potential duplicates detected"
              time="5 hours ago"
            />
            <ActivityItem
              action="Salesforce sync"
              details="156 contacts updated in Salesforce"
              time="1 day ago"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{trend}</p>
          </div>
          <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ action, details, time }: { action: string; details: string; time: string }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
      <div className="flex-1">
        <p className="font-medium">{action}</p>
        <p className="text-sm text-gray-600">{details}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  )
}