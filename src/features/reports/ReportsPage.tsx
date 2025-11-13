import { useState, useEffect } from 'react'
import { Database, HardDrive, Table, AlertCircle, FolderOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { toast } from 'sonner'

interface DatabaseSize {
  size: string
  sizeBytes: number
}

interface TableSize {
  tablename: string
  size: string
  sizeBytes: number
}

interface StorageSize {
  size: string
  sizeBytes: number
}

export function ReportsPage() {
  const [databaseSize, setDatabaseSize] = useState<DatabaseSize | null>(null)
  const [tableSizes, setTableSizes] = useState<TableSize[]>([])
  const [storageSize, setStorageSize] = useState<StorageSize | null>(null)
  const [loading, setLoading] = useState(false)

  const FREE_PLAN_DB_LIMIT_MB = 500
  const FREE_PLAN_DB_LIMIT_BYTES = FREE_PLAN_DB_LIMIT_MB * 1024 * 1024
  const FREE_PLAN_STORAGE_LIMIT_MB = 1024 // 1 GB
  const FREE_PLAN_STORAGE_LIMIT_BYTES = FREE_PLAN_STORAGE_LIMIT_MB * 1024 * 1024

  const fetchDatabaseSize = async () => {
    try {
      setLoading(true)

      // Get total database size
      const { data: sizeData, error: sizeError } = await supabase
        .rpc('get_database_size')

      if (sizeError) {
        console.error('Error fetching database size:', sizeError)
        toast.error('Failed to fetch database size. Make sure the function is created.')
        return
      }

      if (sizeData && sizeData.length > 0) {
        setDatabaseSize({
          size: sizeData[0].database_size,
          sizeBytes: sizeData[0].size_bytes
        })
      }

      // Get table sizes
      const { data: tableData, error: tableError } = await supabase
        .rpc('get_table_sizes')

      if (tableError) {
        console.error('Error fetching table sizes:', tableError)
      } else if (tableData) {
        setTableSizes(tableData)
      }

      // Get file storage size
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets()

      if (!bucketsError && buckets) {
        let totalSize = 0

        // Calculate total size across all buckets
        for (const bucket of buckets) {
          const { data: files, error: filesError } = await supabase
            .storage
            .from(bucket.name)
            .list()

          if (!filesError && files) {
            for (const file of files) {
              if (file.metadata?.size) {
                totalSize += file.metadata.size
              }
            }
          }
        }

        setStorageSize({
          size: formatBytes(totalSize),
          sizeBytes: totalSize
        })
      }

      toast.success('Storage information retrieved successfully')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to fetch storage information')
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  useEffect(() => {
    fetchDatabaseSize()
  }, [])

  const getDbUsagePercentage = () => {
    if (!databaseSize) return 0
    return (databaseSize.sizeBytes / FREE_PLAN_DB_LIMIT_BYTES) * 100
  }

  const getStorageUsagePercentage = () => {
    if (!storageSize) return 0
    return (storageSize.sizeBytes / FREE_PLAN_STORAGE_LIMIT_BYTES) * 100
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          View analytics and database usage information
        </p>
      </div>

      {/* Database Size Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Usage
              </CardTitle>
              <CardDescription>
                Monitor your database size and storage limits
              </CardDescription>
            </div>
            <Button
              onClick={fetchDatabaseSize}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {databaseSize ? (
            <>
              {/* Usage Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Current Size</div>
                  <div className="text-2xl font-bold">{databaseSize.size}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Free Plan Limit</div>
                  <div className="text-2xl font-bold">{FREE_PLAN_DB_LIMIT_MB} MB</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Usage</div>
                  <div className="text-2xl font-bold">{getDbUsagePercentage().toFixed(2)}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Database Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {databaseSize.size} / {FREE_PLAN_DB_LIMIT_MB} MB
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getUsageColor(getDbUsagePercentage())}`}
                    style={{ width: `${Math.min(getDbUsagePercentage(), 100)}%` }}
                  />
                </div>
              </div>

              {/* Warning if near limit */}
              {getDbUsagePercentage() >= 75 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-orange-900 dark:text-orange-200">
                      {getDbUsagePercentage() >= 90 ? 'Critical: ' : 'Warning: '}
                      Approaching Database Limit
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Your database is using {getDbUsagePercentage().toFixed(1)}% of available storage.
                      Consider upgrading to a Pro plan or cleaning up old data.
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? 'Loading database information...' : 'Click Refresh to load database size'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Storage Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                File Storage Usage
              </CardTitle>
              <CardDescription>
                Monitor your file storage (buckets) usage and limits
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {storageSize ? (
            <>
              {/* Usage Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Current Size</div>
                  <div className="text-2xl font-bold">{storageSize.size}</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Free Plan Limit</div>
                  <div className="text-2xl font-bold">{FREE_PLAN_STORAGE_LIMIT_MB} MB (1 GB)</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Usage</div>
                  <div className="text-2xl font-bold">{getStorageUsagePercentage().toFixed(2)}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">File Storage Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {storageSize.size} / 1 GB
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getUsageColor(getStorageUsagePercentage())}`}
                    style={{ width: `${Math.min(getStorageUsagePercentage(), 100)}%` }}
                  />
                </div>
              </div>

              {/* Warning if near limit */}
              {getStorageUsagePercentage() >= 75 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-orange-900 dark:text-orange-200">
                      {getStorageUsagePercentage() >= 90 ? 'Critical: ' : 'Warning: '}
                      Approaching File Storage Limit
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Your file storage is using {getStorageUsagePercentage().toFixed(1)}% of available space.
                      Consider upgrading to a Pro plan or removing unused files.
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? 'Loading file storage information...' : 'No file storage data available'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Sizes Card */}
      {tableSizes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Table Sizes
            </CardTitle>
            <CardDescription>
              Storage usage breakdown by table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableSizes.map((table) => (
                <div
                  key={table.tablename}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{table.tablename}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {table.size}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
