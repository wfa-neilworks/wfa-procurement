import { useState } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import type { Database } from '../../types/database'

type SdsChemical = Database['public']['Tables']['sds_chemicals']['Row']

interface ReplaceSdsDialogProps {
  isOpen: boolean
  onClose: () => void
  chemical: SdsChemical | null
  onSuccess: () => void
}

export function ReplaceSdsDialog({ isOpen, onClose, chemical, onSuccess }: ReplaceSdsDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validSince, setValidSince] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!chemical || !selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    if (!validSince || !validUntil) {
      toast.error('Please enter validity dates')
      return
    }

    // Validate dates
    const sinceDate = new Date(validSince)
    const untilDate = new Date(validUntil)
    if (untilDate <= sinceDate) {
      toast.error('Valid Until must be after Valid Since')
      return
    }

    try {
      setUploading(true)

      // Upload new file to storage
      const fileName = `sds/${chemical.id}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      const { error: uploadError } = await supabase.storage
        .from('sds-documents')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sds-documents')
        .getPublicUrl(fileName)

      // Update SDS chemical record
      const { error: updateError } = await supabase
        .from('sds_chemicals')
        .update({
          pdf_url: publicUrl,
          valid_since: validSince,
          valid_until: validUntil,
        })
        .eq('id', chemical.id)

      if (updateError) throw updateError

      toast.success('SDS document replaced successfully')
      onSuccess()
      onClose()

      // Reset form
      setSelectedFile(null)
      setValidSince('')
      setValidUntil('')
    } catch (error) {
      console.error('Error replacing SDS document:', error)
      toast.error('Failed to replace SDS document')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setValidSince('')
    setValidUntil('')
    onClose()
  }

  if (!isOpen || !chemical) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Replace SDS Document
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {chemical.name}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current SDS Info */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Current SDS:</p>
            <p className="text-sm text-gray-900 font-medium">{chemical.name}</p>
            <p className="text-xs text-gray-600">Location: {chemical.location}</p>
            {chemical.valid_until && (
              <p className="text-xs text-gray-600 mt-1">
                Expires: {new Date(chemical.valid_until).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2">
              New SDS Document (PDF) *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#6D9197] transition-colors">
              <label htmlFor="sds-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-700">
                  Click to upload new PDF
                </span>
                <span className="text-xs text-gray-500">
                  PDF files only
                </span>
              </label>
              <input
                id="sds-file-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="mt-2 flex items-center justify-between p-2 rounded border border-gray-300 bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6D9197]" />
                  <span className="text-sm text-gray-900">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Validity Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-2">
                Valid Since *
              </label>
              <Input
                type="date"
                value={validSince}
                onChange={(e) => setValidSince(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-2">
                Valid Until *
              </label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex-1"
            >
              {uploading ? 'Replacing...' : 'Replace SDS'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
