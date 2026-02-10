import { useState, useEffect } from 'react'
import { Search, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

interface BatchLog {
  id: number
  product_code: string
  product_name: string
  batch_reference: string
  pallet_number: string
  scanned_date: string
  scanned_time: string
  created_at: string
}

export function BatchMonitoringPage() {
  const [logs, setLogs] = useState<BatchLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<BatchLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Date range state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Fetch batch logs
  useEffect(() => {
    fetchBatchLogs()
  }, [])

  // Filter logs based on search and date range
  useEffect(() => {
    let filtered = logs

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.product_code.toLowerCase().includes(term) ||
          log.product_name.toLowerCase().includes(term) ||
          log.batch_reference.toLowerCase().includes(term) ||
          log.pallet_number.toLowerCase().includes(term)
      )
    }

    if (dateFrom) {
      filtered = filtered.filter((log) => log.scanned_date >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter((log) => log.scanned_date <= dateTo)
    }

    setFilteredLogs(filtered)
  }, [searchTerm, logs, dateFrom, dateTo])

  const fetchBatchLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('batch_logs')
        .select('*')
        .order('scanned_date', { ascending: false })
        .order('scanned_time', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching batch logs:', error)
      toast.error('Failed to load batch logs')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batch Monitoring</h1>
        <p className="text-muted-foreground">View scanned batch logs</p>
      </div>

      {/* Search and Date Range Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, batch, pallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9 w-[160px]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9 w-[160px]"
              />
            </div>
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="outline" size="sm" onClick={clearDateFilter}>
              Clear
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scanned Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Batch Reference</TableHead>
                <TableHead>Pallet Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm || dateFrom || dateTo
                      ? 'No batch logs found matching your filters'
                      : 'No batch logs yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{formatDate(log.scanned_date)}</TableCell>
                    <TableCell>{formatTime(log.scanned_time)}</TableCell>
                    <TableCell className="font-mono">{log.product_code}</TableCell>
                    <TableCell>{log.product_name}</TableCell>
                    <TableCell>{log.batch_reference}</TableCell>
                    <TableCell>{log.pallet_number}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
