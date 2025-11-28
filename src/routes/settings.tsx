import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { exportDatabase } from '@/database/sqlite-opfs/sqlite-service'
import { toast } from 'sonner'
import { DownloadIcon } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function Settings() {
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Check if StorageManager API is supported
  useEffect(() => {
    const checkSupport = async () => {
      if (navigator.storage && navigator.storage.persist) {
        setIsSupported(true)
        try {
          const persisted = await navigator.storage.persisted()
          setIsPersisted(persisted)
        } catch (err) {
          setMessage(`Error checking persistent storage status: ${String(err)}`)
        }
      } else {
        setIsSupported(false)
        setMessage('StorageManager API is not supported in this browser.')
      }
    }
    checkSupport()
  }, [])

  const handleTogglePersist = async (checked: boolean) => {
    if (!isSupported) return

    setIsRequesting(true)
    setMessage(null)

    try {
      if (checked) {
        // Request persistent storage
        const granted = await navigator.storage.persist()
        setIsPersisted(granted)
        
        if (granted) {
          setMessage('✓ Persistent storage granted successfully!')
        } else {
          setMessage('⚠ Persistent storage request was denied. This may happen if the browser decides storage quota is low or the site is not frequently used.')
        }
      } else {
        // Note: There's no direct API to "unpersist" storage
        // We can only show the current status
        setMessage('ℹ Note: Browsers do not provide an API to revoke persistent storage once granted. You may need to clear site data in browser settings.')
      }
    } catch (err) {
      setMessage(`Error: ${String(err)}`)
    } finally {
      setIsRequesting(false)
    }
  }

  const checkCurrentStatus = async () => {
    if (!isSupported) return
    
    try {
      const persisted = await navigator.storage.persisted()
      setIsPersisted(persisted)
      
      // Also get storage estimate if available
      if (navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate()
          const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2)
          const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2)
          setMessage(`Storage status updated. Using ${usedMB} MB of ${quotaMB} MB quota.`)
        } catch (estimateErr) {
          setMessage(`Storage status updated. (Could not retrieve quota: ${String(estimateErr)})`)
        }
      } else {
        setMessage('Storage status updated.')
      }
    } catch (err) {
      setMessage(`Error checking status: ${String(err)}`)
    }
  }

  const handleExportDatabase = async () => {
    setIsExporting(true)
    try {
      const dbData = await exportDatabase()
      
      // Create a blob from the database bytes
      const blob = new Blob([dbData], { type: 'application/x-sqlite3' })
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mydb-${new Date().toISOString().slice(0, 10)}.sqlite3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Database exported successfully!')
    } catch (err) {
      console.error('Export error:', err)
      toast.error(`Failed to export database: ${String(err)}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Persistent Storage</CardTitle>
          <CardDescription>
            Control whether the browser will persist your data across sessions without eviction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSupported ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {message || 'StorageManager API is not supported in this browser.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="persist-toggle" className="text-base font-medium">
                    Request Persistent Storage
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, prevents the browser from automatically clearing your data.
                  </p>
                </div>
                <Switch
                  id="persist-toggle"
                  checked={isPersisted || false}
                  onCheckedChange={handleTogglePersist}
                  disabled={isRequesting}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">Current Status:</span>
                  <span className={`text-sm font-semibold ${isPersisted ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {isPersisted === null ? 'Checking...' : isPersisted ? 'Persisted ✓' : 'Not Persisted'}
                  </span>
                </div>
                
                <Button 
                  onClick={checkCurrentStatus} 
                  variant="outline" 
                  className="w-full"
                  disabled={isRequesting}
                >
                  Refresh Status
                </Button>
              </div>

              {message && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-semibold">About Persistent Storage</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Persistent storage prevents automatic data eviction by the browser</li>
                  <li>The browser may grant or deny this permission based on various factors</li>
                  <li>Frequently used sites are more likely to be granted persistent storage</li>
                  <li>Once granted, the permission typically remains until manually revoked by the user</li>
                  <li>This affects IndexedDB, localStorage, Cache API, and OPFS storage</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Database Export</CardTitle>
          <CardDescription>
            Export your SQLite database stored in OPFS to a file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Export SQLite Database
              </Label>
              <p className="text-sm text-muted-foreground">
                Download a copy of your local database as a .sqlite3 file.
              </p>
            </div>
            <Button 
              onClick={handleExportDatabase}
              disabled={isExporting}
              variant="outline"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </Button>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-semibold">About Database Export</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Exports the SQLite database stored in OPFS (Origin Private File System)</li>
              <li>The exported file can be opened with any SQLite-compatible tool</li>
              <li>Use this to backup your data or transfer it to another device</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
