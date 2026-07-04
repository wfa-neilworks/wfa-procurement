import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface BatchLog {
  id: number
  product_code: string
  product_name: string
  batch_reference: string
  pallet_number: string
  scanned_date: string
  scanned_time: string
  supplier_name: string | null
  category: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  'shrink-bag': 'Shrink Bag',
  'carton': 'Carton',
  'liners': 'Liners',
  'soakerpad': 'Soakerpad',
  'poly-label': 'Poly Label',
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function TodaysBatchPage() {
  const { category } = useParams()
  const [logs, setLogs] = useState<BatchLog[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const label = category ? CATEGORY_LABELS[category] ?? category : 'All'

  const fetchLogs = async () => {
    setLoading(true)
    let q = supabase
      .from('batch_logs')
      .select('*')
      .eq('scanned_date', today)
      .order('scanned_time', { ascending: false })

    if (category) q = (q as any).eq('category', category)

    const { data } = await q as any
    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [category])

  return (
    <div className="p-6 space-y-5 h-full" style={{ color: 'white' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today's Batch</h1>
          <p className="text-sm mt-0.5" style={{ color: '#3a6a8a' }}>
            {label} · {today} · {logs.length} record{logs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5"
          style={{ color: '#4a7aaa', border: '1px solid #1e3a5a' }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5a' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#0d1e30', borderBottom: '1px solid #1e3a5a' }}>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#3a6a8a' }}>Time</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#3a6a8a' }}>Product Code</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#3a6a8a' }}>Product Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#3a6a8a' }}>Batch Ref</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#3a6a8a' }}>CTN</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#3a6a8a' }}>Supplier</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: '#2a6a9a' }} />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm" style={{ color: '#2a4a6a' }}>
                  No batches logged today for {label}
                </td>
              </tr>
            ) : logs.map((log, i) => (
              <tr
                key={log.id}
                style={{
                  borderTop: '1px solid #0a1a2a',
                  backgroundColor: i % 2 === 0 ? '#060e18' : '#080d18',
                }}
              >
                <td className="px-4 py-3 text-xs font-mono" style={{ color: '#4a7aaa' }}>
                  {formatTime(log.scanned_time)}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#6ab0d4' }}>
                  {log.product_code}
                </td>
                <td className="px-4 py-3 text-white">{log.product_name}</td>
                <td className="px-4 py-3 font-mono font-bold text-white">{log.batch_reference}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#4a9fd4' }}>
                  {log.pallet_number !== '0' ? log.pallet_number : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#4a7aaa' }}>
                  {log.supplier_name ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
