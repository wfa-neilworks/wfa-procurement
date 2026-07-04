import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function BatchLookupPage() {
  const { category } = useParams()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [logs, setLogs] = useState<BatchLog[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const label = category ? CATEGORY_LABELS[category] ?? category : 'All'

  const handleSearch = async () => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    setSearched(true)

    let q = supabase
      .from('batch_logs')
      .select('*')
      .gte('scanned_date', dateFrom)
      .lte('scanned_date', dateTo)
      .order('scanned_date', { ascending: false })
      .order('scanned_time', { ascending: false })

    if (category) q = (q as any).eq('category', category)

    const { data } = await q as any
    setLogs(data ?? [])
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-5 h-full" style={{ color: 'white' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Batch Lookup</h1>
        <p className="text-sm mt-0.5" style={{ color: '#3a6a8a' }}>{label} — search by date range</p>
      </div>

      {/* Date range picker */}
      <div className="flex items-end gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a7a9a' }}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{ backgroundColor: '#0d1625', border: '1px solid #1e3a5a' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a7a9a' }}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{ backgroundColor: '#0d1625', border: '1px solid #1e3a5a' }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!dateFrom || !dateTo || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: '#1a4a7a' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>

        {searched && !loading && (
          <span className="text-sm" style={{ color: '#3a6a8a' }}>
            {logs.length} record{logs.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* Results */}
      {searched && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5a' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#0d1e30', borderBottom: '1px solid #1e3a5a' }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#3a6a8a' }}>Date</th>
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
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: '#2a6a9a' }} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm" style={{ color: '#2a4a6a' }}>
                    No batches found for this date range
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
                  <td className="px-4 py-3 text-xs" style={{ color: '#4a7aaa' }}>{formatDate(log.scanned_date)}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#4a7aaa' }}>{formatTime(log.scanned_time)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#6ab0d4' }}>{log.product_code}</td>
                  <td className="px-4 py-3 text-white">{log.product_name}</td>
                  <td className="px-4 py-3 font-mono font-bold text-white">{log.batch_reference}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#4a9fd4' }}>
                    {log.pallet_number !== '0' ? log.pallet_number : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#4a7aaa' }}>{log.supplier_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
