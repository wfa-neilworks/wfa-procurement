import { useState, useRef, useEffect } from 'react'
import { ScanLine, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ScanResult {
  ok: boolean
  message: string
  detail?: string
  productCode?: string
  productName?: string
  batchRef?: string
  ctn?: string
  supplier?: string
}

interface BatchRef {
  id: number
  product_code: string
  product_name: string
  category: string | null
  supplier_id: string | null
  supplier_name: string | null
  batch_references: string[]
  format_mask: string | null
  has_ctn: boolean
}

// Extract batch ref and CTN from a barcode using a mask
// X = batch ref char, Y = carton number char, Z = ignored
// e.g. mask "ZXXXXXXXXYYYYZZ", barcode "A12345678001XX"
//   → batchRef = "12345678", ctn = "001"
function applyMask(mask: string, barcode: string): { batchRef: string; ctn: string } | null {
  if (mask.length !== barcode.length) return null
  let batchRef = ''
  let ctn = ''
  for (let i = 0; i < mask.length; i++) {
    const m = mask[i].toUpperCase()
    if (m === 'X') batchRef += barcode[i]
    else if (m === 'Y') ctn += barcode[i]
    // Z = skip
  }
  return { batchRef, ctn }
}

// Known fixed-length categories — add more as confirmed
const LENGTH_TO_CATEGORY: Record<number, string> = {
  35: 'carton',
}

// Try to match a raw barcode against all known format masks and batch references
// Returns the matched batch ref row, extracted batch ref string, and ctn number
async function resolveBarcode(raw: string): Promise<{
  batchRef: BatchRef
  extractedRef: string
  ctnNumber: string
} | null> {
  const categoryHint = LENGTH_TO_CATEGORY[raw.length] ?? null

  let q = supabase.from('batch_references').select('*')
  if (categoryHint) q = (q as any).eq('category', categoryHint)
  const { data } = await q as any
  const refs: BatchRef[] = data ?? []

  for (const ref of refs) {
    if (!ref.format_mask) {
      // No mask — exact match only
      if (ref.batch_references.includes(raw)) {
        return { batchRef: ref, extractedRef: raw, ctnNumber: '0' }
      }
      continue
    }

    const parsed = applyMask(ref.format_mask, raw)
    if (!parsed) continue // barcode length doesn't match this mask

    const { batchRef: extractedRef, ctn } = parsed
    if (ref.batch_references.includes(extractedRef)) {
      return {
        batchRef: ref,
        extractedRef,
        ctnNumber: ref.has_ctn ? (ctn || '0') : '0',
      }
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
      console.log('[scan] matched:', { product: batchRef.product_code, extractedRef, ctnNumber })
      const now = new Date()
      const scannedDate = now.toISOString().split('T')[0]

      // Only check duplicates when the barcode has a CTN — without one we can't
      // distinguish cartons so the same batch ref is allowed multiple times
      if (batchRef.has_ctn) {
        const { data: existing } = await supabase
          .from('batch_logs')
          .select('id, scanned_date')
          .eq('batch_reference', extractedRef)
          .eq('pallet_number', ctnNumber)
          .limit(1) as any

        if (existing && existing.length > 0) {
          setResult({
            ok: false,
            message: 'Duplicate — already recorded',
            detail: `Batch ${extractedRef} · CTN ${ctnNumber} was already logged on ${existing[0].scanned_date}`,
          })
          return
        }
      }

      const { error } = await supabase.from('batch_logs').insert({
        product_code: batchRef.product_code,
        product_name: batchRef.product_name,
        batch_reference: extractedRef,
        pallet_number: ctnNumber,
        scanned_date: scannedDate,
        scanned_time: now.toTimeString().split(' ')[0],
        supplier_id: batchRef.supplier_id ?? null,
        supplier_name: batchRef.supplier_name ?? null,
        category: batchRef.category ?? null,
      } as any)

      if (error) throw error

      setResult({
        ok: true,
        message: 'Batch logged',
        productCode: batchRef.product_code,
        productName: batchRef.product_name,
        batchRef: extractedRef,
        ctn: ctnNumber,
        supplier: batchRef.supplier_name ?? '',
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
      {/* Logo */}
      <div className="w-full max-w-2xl px-6">
        <img src="/BellV3.png" alt="BELL" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-blue-400">
          <ScanLine className="h-5 w-5" />
          <span className="text-base font-semibold tracking-widest uppercase">Batch Entry</span>
        </div>
        <p className="text-xs" style={{ color: '#3a5a7a' }}>Scan or type a barcode and press Enter</p>
      </div>

      {/* Scan input */}
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

      {/* Result */}
      <div className="flex items-center justify-center" style={{ minHeight: 220 }}>
        {scanning && (
          <div className="flex items-center gap-3 text-blue-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xl">Processing...</span>
          </div>
        )}

        {!scanning && result && result.ok && (
          <div className="flex flex-col items-center gap-5 text-center">
            <CheckCircle2 className="h-20 w-20" style={{ color: '#22c55e' }} />
            <span className="text-3xl font-bold" style={{ color: '#22c55e' }}>Batch Logged</span>
            <div className="space-y-2 mt-1">
              <div className="text-lg font-semibold text-white">{result.productCode} &mdash; {result.productName}</div>
              <div className="flex items-center justify-center gap-6 text-sm" style={{ color: '#6ab0d4' }}>
                <span>Batch <span className="font-mono font-bold text-white text-base">{result.batchRef}</span></span>
                {result.ctn !== '0' && (
                  <span>CTN <span className="font-mono font-bold text-white text-base">{result.ctn}</span></span>
                )}
              </div>
              <div className="text-sm mt-1" style={{ color: '#3a6a8a' }}>{result.supplier}</div>
            </div>
          </div>
        )}

        {!scanning && result && !result.ok && (
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle className="h-16 w-16" style={{ color: '#ef4444' }} />
            <span className="text-2xl font-bold" style={{ color: '#ef4444' }}>{result.message}</span>
            {result.detail && <span className="text-sm font-mono" style={{ color: '#7a3a3a' }}>{result.detail}</span>}
          </div>
        )}

        {!scanning && !result && (
          <div className="text-sm" style={{ color: '#1a3a5a' }}>Ready to scan</div>
        )}
      </div>
    </div>
  )
}
