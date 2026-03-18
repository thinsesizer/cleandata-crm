'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Database, Zap, AlertCircle, TrendingUp, Clock } from 'lucide-react'

interface MetricsData {
  timestamp: string
  system: {
    activeJobs: number
    queueDepth: number
    apiLatency: number
    errorRate: number
  }
  business: {
    totalContacts: number
    enrichedToday: number
    duplicatesFound: number
    apiCalls: number
  }
  performance: {
    avgEnrichmentTime: number
    successRate: number
    cacheHitRate: number
  }
}

export default function RealTimeDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [historicalData, setHistoricalData] = useState<any[]>([])

  useEffect(() => {
    const fetchMetrics = async () => {
      const res = await fetch('/api/metrics')
      const data = await res.json()
      setMetrics(data)
      
      // Add to historical data
      setHistoricalData(prev => [
        ...prev.slice(-50),
        {
          time: new Date().toLocaleTimeString(),
          apiLatency: data.system.apiLatency,
          queueDepth: data.system.queueDepth,
          enriched: data.business.enrichedToday,
        }
      ])
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  if (!metrics) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Real-Time Operations</h1>
        <p className="text-gray-600 mt-1">Live system metrics and performance monitoring</p>
      </div>

      {/* System Health */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          title="Active Jobs"
          value={metrics.system.activeJobs}
          icon={<Activity className="h-5 w-5 text-blue-600" />}
          trend={metrics.system.activeJobs > 10 ? 'high' : 'normal'}
        />
        <MetricCard
          title="Queue Depth"
          value={metrics.system.queueDepth}
          icon={<Database className="h-5 w-5 text-purple-600" />}
          trend={metrics.system.queueDepth > 100 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="API Latency"
          value={`${metrics.system.apiLatency}ms`}
          icon={<Clock className="h-5 w-5 text-green-600" />}
          trend={metrics.system.apiLatency > 500 ? 'warning' : 'normal'}
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics.system.errorRate.toFixed(2)}%`}
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
          trend={metrics.system.errorRate > 1 ? 'critical' : 'normal'}
        />
      </div>

      {/* Business Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Contacts"
          value={metrics.business.totalContacts.toLocaleString()}
          icon={<Database className="h-5 w-5 text-blue-600" />}
          trend="normal"
        />
        <MetricCard
          title="Enriched Today"
          value={metrics.business.enrichedToday.toLocaleString()}
          icon={<Zap className="h-5 w-5 text-yellow-600" />}
          trend="normal"
        />
        <MetricCard
          title="Duplicates Found"
          value={metrics.business.duplicatesFound.toLocaleString()}
          icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
          trend="normal"
        />
        <MetricCard
          title="API Calls"
          value={metrics.business.apiCalls.toLocaleString()}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          trend="normal"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Latency (ms)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="apiLatency" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Depth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="queueDepth" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.performance.avgEnrichmentTime.toFixed(0)}ms</div>
              <p className="text-gray-500">Avg Enrichment Time</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.performance.successRate.toFixed(1)}%</div>
              <p className="text-gray-500">Success Rate</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.performance.cacheHitRate.toFixed(1)}%</div>
              <p className="text-gray-500">Cache Hit Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, icon, trend }: { title: string; value: string | number; icon: React.ReactNode; trend: string }) {
  const trendColors = {
    normal: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
    high: 'bg-blue-50 border-blue-200',
  }

  return (
    <Card className={trendColors[trend as keyof typeof trendColors]}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}