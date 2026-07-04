import { useState, useRef, useEffect } from 'react'
import { ScanLine, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ScanResult {
  ok: boolean
  message: string
  detail?: string
}

interface FormatMask {
  supplier_id: string
  supplier_name: string
  format_mask: string
  has_ctn: boolean
  category: string | null
}

interface BatchRef {
  id: number
  product_code: string
  product_name: string
  category: string | null
  supplier_id: string | null
  supplier_name: string | null
  batch_references: string[]
}

// Parse a format mask like "XXXXXXXXYYY" into batch length and ctn length
// X = batch digits, Y = carton digits
function parseMask(mask: string): { batchLen: number; ctnLen: number; totalLen: number } {
  const batchLen = (mask.match(/X/gi) ?? []).length
  const ctnLen = (mask.match(/Y/gi) ?? []).length
  return { batchLen, ctnLen, totalLen: batchLen + ctnLen }
}

// Try to match a raw barcode against all known format masks and batch references
// Returns the matched batch ref row, extracted batch ref string, and ctn number
async function resolveBarcode(raw: string): Promise<{
  batchRef: BatchRef
  extractedRef: string
  ctnNumber: string
} | null> {
  // Load all format masks and all batch references in parallel
  const [{ data: formats }, { data: allRefs }] = await Promise.all([
    supabase.from('supplier_barcode_formats').select('supplier_id, supplier_name, format_mask, has_ctn, category') as any,
    supabase.from('batch_references').select('*') as any,
  ])

  const masks: FormatMask[] = formats ?? []
  const refs: BatchRef[] = allRefs ?? []

  // Try each format mask
  for (const fmt of masks) {
    const { batchLen, ctnLen, totalLen } = parseMask(fmt.format_mask)

    // Barcode must match the total length of this mask
    if (raw.length !== totalLen) continue

    const extractedRef = raw.substring(0, batchLen)
    const ctnNumber = fmt.has_ctn ? raw.substring(batchLen) : '0'

    // Find a batch_references row for this supplier that contains the extracted ref
    const match = refs.find(r =>
      r.supplier_id === fmt.supplier_id &&
      r.batch_references.includes(extractedRef)
    )

    if (match) {
      return { batchRef: match, extractedRef, ctnNumber }
    }
  }

  // Fallback: try exact match across all refs regardless of supplier/format
  for (const ref of refs) {
    if (ref.batch_references.includes(raw)) {
      return { batchRef: ref, extractedRef: raw, ctnNumber: '0' }
    }
  }

  return null
}

export function BatchEntryPage() {
  const [barcode, setBarcode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleScan = async (raw: string) => {
    const value = raw.trim()
    if (!value) return

    setScanning(true)
    setResult(null)

    try {
      const resolved = await resolveBarcode(value)

      if (!resolved) {
        setResult({
          ok: false,
          message: 'No match found',
          detail: `"${value}" did not match any known batch reference`,
        })
        return
      }

      const { batchRef, extractedRef, ctnNumber } = resolved
      const now = new Date()

      const { error } = await supabase.from('batch_logs').insert({
        product_code: batchRef.product_code,
        product_name: batchRef.product_name,
        batch_reference: extractedRef,
        pallet_number: ctnNumber,
        scanned_date: now.toISOString().split('T')[0],
        scanned_time: now.toTimeString().split(' ')[0],
        supplier_id: batchRef.supplier_id ?? null,
        supplier_name: batchRef.supplier_name ?? null,
        category: batchRef.category ?? null,
      } as any)

      if (error) throw error

      setResult({
        ok: true,
        message: 'Batch logged',
        detail: `${batchRef.product_name}${ctnNumber !== '0' ? ` · CTN ${ctnNumber}` : ''} · ${batchRef.supplier_name ?? ''}`,
      })
    } catch (err: any) {
      setResult({
        ok: false,
        message: 'Error',
        detail: err?.message ?? 'Unknown error',
      })
    } finally {
      setScanning(false)
      setBarcode('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-screen gap-8"
      style={{ backgroundColor: '#080d18' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-blue-400">
          <ScanLine className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-widest uppercase">Batch Entry</span>
        </div>
        <p className="text-sm" style={{ color: '#3a5a7a' }}>Scan or type a barcode and press Enter</p>
      </div>

      <div className="w-full max-w-2xl px-6">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleScan(barcode) }}
          placeholder="Scan barcode here..."
          autoComplete="off"
          spellCheck={false}
          className="w-full text-center text-3xl font-mono tracking-widest rounded-2xl outline-none border-2 transition-all"
          style={{
            backgroundColor: '#0d1625',
            borderColor: barcode ? '#2a6a9a' : '#1a3a5a',
            color: '#a0d4f5',
            padding: '2rem 2rem',
            caretColor: '#4a9fd4',
          }}
        />
      </div>

      <div className="h-20 flex items-center justify-center">
        {scanning && (
          <div className="flex items-center gap-3 text-blue-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-lg">Processing...</span>
          </div>
        )}
        {!scanning && result && (
          <div className={`flex flex-col items-center gap-2 ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
            <div className="flex items-center gap-2 text-xl font-semibold">
              {result.ok ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              {result.message}
            </div>
            {result.detail && (
              <span className="text-sm font-mono opacity-70">{result.detail}</span>
            )}
          </div>
        )}
        {!scanning && !result && (
          <div className="text-sm" style={{ color: '#1e3a5a' }}>Ready to scan</div>
        )}
      </div>
    </div>
  )
}
