import { useState, useRef, useEffect } from 'react'
import { ScanLine, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface ScanResult {
  ok: boolean
  message: string
  detail?: string
}

export function BatchEntryPage() {
  const { user } = useAuth()
  const [barcode, setBarcode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep focus on input at all times
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleScan = async (raw: string) => {
    const value = raw.trim()
    if (!value) return

    setScanning(true)
    setResult(null)

    try {
      // Insert directly into batch_logs
      // Expected barcode format: product_code|batch_reference|pallet_number
      // or just a raw batch_reference — adjust parsing to match your scanner output
      const parts = value.split('|')
      const productCode = parts[0] ?? value
      const batchReference = parts[1] ?? value
      const palletNumber = parts[2] ?? ''

      // Look up product details
      const { data: product } = await supabase
        .from('products')
        .select('code, description, supplier_id, supplier_name')
        .eq('code', productCode)
        .single() as any

      const now = new Date()
      const scannedDate = now.toISOString().split('T')[0]
      const scannedTime = now.toTimeString().split(' ')[0]

      const { error } = await supabase.from('batch_logs').insert({
        product_code: productCode,
        product_name: product?.description ?? productCode,
        batch_reference: batchReference,
        pallet_number: palletNumber,
        scanned_date: scannedDate,
        scanned_time: scannedTime,
        supplier_id: product?.supplier_id ?? null,
        supplier_name: product?.supplier_name ?? null,
      } as any)

      if (error) throw error

      setResult({
        ok: true,
        message: 'Batch logged successfully',
        detail: `${productCode} — ${batchReference}${palletNumber ? ` / Pallet ${palletNumber}` : ''}`,
      })
    } catch (err: any) {
      setResult({
        ok: false,
        message: 'Failed to log batch',
        detail: err?.message ?? 'Unknown error',
      })
    } finally {
      setScanning(false)
      setBarcode('')
      // Refocus after a short delay so the result is visible
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-screen gap-8"
      style={{ backgroundColor: '#080d18' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-blue-400">
          <ScanLine className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-widest uppercase">Batch Entry</span>
        </div>
        <p className="text-sm" style={{ color: '#3a5a7a' }}>Scan or type a barcode and press Enter</p>
      </div>

      {/* Big scan input */}
      <div className="w-full max-w-2xl px-6">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleScan(barcode)
          }}
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

      {/* Status */}
      <div className="h-20 flex items-center justify-center">
        {scanning && (
          <div className="flex items-center gap-3 text-blue-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-lg">Processing...</span>
          </div>
        )}
        {!scanning && result && (
          <div className={`flex flex-col items-center gap-1 ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
            <div className="flex items-center gap-2 text-xl font-semibold">
              {result.ok
                ? <CheckCircle2 className="h-6 w-6" />
                : <XCircle className="h-6 w-6" />}
              {result.message}
            </div>
            {result.detail && (
              <span className="text-sm font-mono opacity-70">{result.detail}</span>
            )}
          </div>
        )}
        {!scanning && !result && (
          <div className="text-sm" style={{ color: '#1e3a5a' }}>
            Ready to scan
          </div>
        )}
      </div>
    </div>
  )
}
