'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'

interface PDFDropzoneProps {
  onUpload: (file: File) => Promise<void>
  isUploading?: boolean
}

export function PDFDropzone({ onUpload, isUploading }: PDFDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Endast PDF-filer tillåtna'
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Filen får max vara 10MB'
    }
    return null
  }

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleUpload = async () => {
    if (!selectedFile) return
    await onUpload(selectedFile)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError(null)
  }

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12
            transition-all duration-200 cursor-pointer
            ${isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900'
            }
          `}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className={`
            flex h-16 w-16 items-center justify-center rounded-full mb-4
            ${isDragging ? 'bg-purple-500/20' : 'bg-gray-800'}
          `}>
            <Upload className={`h-8 w-8 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
          </div>

          <p className="text-lg font-medium text-white mb-1">
            {isDragging ? 'Släpp filen här' : 'Dra och släpp din PDF'}
          </p>
          <p className="text-sm text-gray-400">
            eller klicka för att välja fil (max 10MB)
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
              <FileText className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isUploading && (
              <button
                onClick={clearFile}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Laddar upp...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Ladda upp dokument
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
