'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/src/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Switch } from '@/src/components/ui/switch'
import { Label } from '@/src/components/ui/label'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import { Separator } from '@/src/components/ui/separator'
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Trash2
} from 'lucide-react'

interface SalesforceConnection {
  id: string
  instanceUrl: string
  isActive: boolean
  lastSyncAt: string | null
  createdAt: string
}

export default function SettingsPage() {
  const [connection, setConnection] = useState<SalesforceConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchConnection()
  }, [])

  const fetchConnection = async () => {
    try {
      const res = await fetch('/api/settings/salesforce')
      const data = await res.json()
      setConnection(data.connection)
    } catch (error) {
      console.error('Failed to fetch connection:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectSalesforce = () => {
    const clientId = process.env.NEXT_PUBLIC_SALESFORCE_CLIENT_ID
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/salesforce/callback`)
    const scope = encodeURIComponent('api refresh_token')
    
    const authUrl = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
    
    window.location.href = authUrl
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'salesforce_sync' }),
      })

      if (res.ok) {
        setTimeout(fetchConnection, 3000)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const disconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Salesforce?')) return
    
    setDisconnecting(true)
    try {
      const res = await fetch('/api/settings/salesforce', {
        method: 'DELETE',
      })

      if (res.ok) {
        setConnection(null)
      }
    } catch (error) {
      console.error('Disconnect failed:', error)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your integrations and preferences</p>
      </div>

      {/* Salesforce Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Salesforce Integration
              </CardTitle>
              <CardDescription>
                Connect your Salesforce account to sync contacts
              </CardDescription>
            </div>
            {connection?.isActive && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : connection?.isActive ? (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Instance URL</Label>
                    <p className="text-sm font-medium">{connection.instanceUrl}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Connected Since</Label>
                    <p className="text-sm font-medium">
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Last Sync</Label>
                    <p className="text-sm font-medium">
                      {connection.lastSyncAt 
                        ? new Date(connection.lastSyncAt).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <p className="text-sm font-medium text-green-600">Active</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button onClick={syncNow} disabled={syncing}>
                  {syncing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <a href={connection.instanceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Salesforce
                  </a>
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={disconnect}
                  disabled={disconnecting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Not Connected</h3>
              <p className="text-gray-500 mb-4">
                Connect your Salesforce account to start syncing contacts
              </p>
              <Button onClick={connectSalesforce}>
                <Database className="mr-2 h-4 w-4" />
                Connect Salesforce
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deduplication Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Settings</CardTitle>
          <CardDescription>
            Configure how duplicate detection and enrichment work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-enrich new contacts</Label>
              <p className="text-sm text-gray-500">
                Automatically run ABN lookup and website scraping on new contacts
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-merge high-confidence duplicates</Label>
              <p className="text-sm text-gray-500">
                Automatically merge duplicates with 95%+ match confidence
              </p>
            </div>
            <Switch />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Daily Salesforce sync</Label>
              <p className="text-sm text-gray-500">
                Automatically sync with Salesforce every 24 hours
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Delete all enriched data</h4>
              <p className="text-sm text-gray-500">
                Remove all ABN, website, and enrichment data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}