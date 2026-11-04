import { useState, useRef, useEffect } from 'react'
import { ScanLine, CheckCircle2, XCircle, Loader2, Barcode, Wifi } from 'lucide-react'
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

function applyMask(mask: string, barcode: string): { batchRef: string; ctn: string } | null {
  if (mask.length !== barcode.length) return null
  let batchRef = ''
  let ctn = ''
  for (let i = 0; i < mask.length; i++) {
    const m = mask[i].toUpperCase()
    if (m === 'X') batchRef += barcode[i]
    else if (m === 'Y') ctn += barcode[i]
  }
  return { batchRef, ctn }
}

const LENGTH_TO_CATEGORY: Record<number, string> = {
  35: 'carton',
}

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
      if (ref.batch_references.includes(raw)) {
        return { batchRef: ref, extractedRef: raw, ctnNumber: '0' }
      }
      continue
    }
    const parsed = applyMask(ref.format_mask, raw)
    if (!parsed) continue
    const { batchRef: extractedRef, ctn } = parsed
    if (ref.batch_references.includes(extractedRef)) {
      return { batchRef: ref, extractedRef, ctnNumber: ref.has_ctn ? (ctn || '0') : '0' }
    }
  }
  return null
}

export function BatchEntryPage() {
  const [barcode, setBarcode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

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
      const scannedDate = now.toISOString().split('T')[0]

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

  // Derive scanner status
  const scannerStatus: 'idle' | 'scanning' | 'success' | 'error' =
    scanning ? 'scanning' :
    result?.ok === true ? 'success' :
    result?.ok === false ? 'error' :
    'idle'

  const statusConfig = {
    idle:     { dot: '#16A36A', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: 'Ready to scan' },
    scanning: { dot: '#1677E8', bg: '#eff6ff', border: '#bfdbfe', text: '#1677E8', label: 'Scanning…'     },
    success:  { dot: '#16A36A', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: 'Scan successful' },
    error:    { dot: '#DC4545', bg: '#fef2f2', border: '#fecaca', text: '#dc4545', label: 'Scan failed'    },
  }
  const sc = statusConfig[scannerStatus]

  return (
    <div
      className="flex flex-col items-center justify-center min-h-full py-12 px-4"
      style={{ backgroundColor: '#F3F6FB' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="w-full max-w-xl space-y-8">

        {/* BELL Logo */}
        <div className="flex justify-center">
          <img
            src="/BellV3.png"
            alt="BELL"
            style={{ height: '72px', width: 'auto', display: 'block', objectFit: 'contain' }}
          />
        </div>

        {/* Heading */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2.5" style={{ color: '#1677E8' }}>
            <ScanLine className="h-5 w-5" />
            <span className="text-lg font-bold tracking-widest uppercase">Batch Entry</span>
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>Scan or type a barcode and press Enter</p>
        </div>

        {/* Scanner card */}
        <div className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #DFE7F0' }}>

          {/* Input area */}
          <div className="p-6">
            <div className="relative">
              <Barcode
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none"
                style={{ color: focused || barcode ? '#1677E8' : '#94a3b8' }}
              />
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleScan(barcode) }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Scan barcode here…"
                autoComplete="off"
                spellCheck={false}
                className="w-full text-center font-mono tracking-widest rounded-xl outline-none transition-all"
                style={{
                  fontSize: '1.5rem',
                  padding: '1.25rem 3rem',
                  backgroundColor: '#F8FAFD',
                  border: `2px solid ${focused || barcode ? '#1677E8' : '#DFE7F0'}`,
                  color: '#172B45',
                  caretColor: '#1677E8',
                  boxShadow: focused ? '0 0 0 4px rgba(22,119,232,0.1)' : 'none',
                }}
              />
            </div>
          </div>

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-6 py-3 rounded-b-2xl"
            style={{ backgroundColor: sc.bg, borderTop: `1px solid ${sc.border}` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: sc.dot,
                  boxShadow: scannerStatus === 'scanning' ? `0 0 0 3px ${sc.border}` : 'none',
                  animation: scannerStatus === 'scanning' ? 'pulse 1.5s infinite' : 'none',
                }}
              />
              <span className="text-xs font-semibold" style={{ color: sc.text }}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
              <Wifi className="h-3 w-3" />
              <span className="text-[10px] font-medium">Scanner ready</span>
            </div>
          </div>
        </div>

        {/* Result area */}
        <div className="min-h-[160px] flex items-center justify-center">
          {scanning && (
            <div className="flex items-center gap-3" style={{ color: '#1677E8' }}>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-base font-medium">Processing barcode…</span>
            </div>
          )}

          {!scanning && result?.ok === true && (
            <div
              className="w-full rounded-2xl p-6 text-center space-y-4"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <div className="flex items-center justify-center gap-2" style={{ color: '#16a34a' }}>
                <CheckCircle2 className="h-7 w-7" />
                <span className="text-xl font-bold">Batch Logged</span>
              </div>
              <div className="space-y-2">
                <div className="text-base font-semibold text-slate-800">
                  {result.productCode} — {result.productName}
                </div>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Batch Ref</span>
                    <span className="font-mono font-bold text-slate-700">{result.batchRef}</span>
                  </div>
                  {result.ctn !== '0' && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">CTN</span>
                      <span className="font-mono font-bold text-slate-700">{result.ctn}</span>
                    </div>
                  )}
                  {result.supplier && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Supplier</span>
                      <span className="font-semibold text-slate-600">{result.supplier}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!scanning && result?.ok === false && (
            <div
              className="w-full rounded-2xl p-6 text-center space-y-3"
              style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <div className="flex items-center justify-center gap-2" style={{ color: '#dc4545' }}>
                <XCircle className="h-7 w-7" />
                <span className="text-xl font-bold">{result.message}</span>
              </div>
              {result.detail && (
                <p className="text-sm font-mono text-red-600/70">{result.detail}</p>
              )}
            </div>
          )}

          {!scanning && !result && (
            <div className="text-center space-y-2">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: '#eff6ff' }}
              >
                <ScanLine className="h-8 w-8" style={{ color: '#1677E8' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                Waiting for scan…
              </p>
            </div>
          )}
        </div>

        {/* Click-anywhere hint */}
        <p className="text-center text-xs" style={{ color: '#cbd5e1' }}>
          Click anywhere on the page to focus the scanner
        </p>
      </div>
    </div>
  )
}
