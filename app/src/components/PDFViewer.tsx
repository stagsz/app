'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker path - use local file since CDN may not have this version
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PDFViewerProps {
  url: string
  onPageChange?: (page: number, totalPages: number) => void
  onDocumentLoad?: (totalPages: number) => void
  renderOverlay?: (page: number, scale: number) => React.ReactNode
}

export function PDFViewer({ url, onPageChange, onDocumentLoad, renderOverlay }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true)
        setError(null)

        const loadingTask = pdfjsLib.getDocument(url)
        const pdfDoc = await loadingTask.promise

        setPdf(pdfDoc)
        setTotalPages(pdfDoc.numPages)
        onDocumentLoad?.(pdfDoc.numPages)
      } catch (err) {
        console.error('Failed to load PDF:', err)
        setError('Kunde inte ladda PDF-filen')
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
  }, [url, onDocumentLoad])

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return

    try {
      const page = await pdf.getPage(currentPage)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      const viewport = page.getViewport({ scale })
      canvas.height = viewport.height
      canvas.width = viewport.width
      setPageSize({ width: viewport.width, height: viewport.height })

      await page.render({
        canvasContext: context,
        viewport,
        canvas
      }).promise

      onPageChange?.(currentPage, totalPages)
    } catch (err) {
      console.error('Failed to render page:', err)
    }
  }, [pdf, currentPage, scale, totalPages, onPageChange])

  useEffect(() => {
    renderPage()
  }, [renderPage])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3))
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl bg-gray-900/50 border border-gray-700">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-gray-400">Laddar dokument...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg bg-gray-900/50 border border-gray-700 p-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="text-sm text-gray-300 min-w-[100px] text-center">
            Sida {currentPage} av {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomOut className="h-5 w-5" />
          </button>

          <span className="text-sm text-gray-300 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-auto rounded-xl bg-gray-800 border border-gray-700 p-4"
        style={{ maxHeight: '70vh' }}
      >
        <div className="relative inline-block mx-auto">
          <canvas ref={canvasRef} className="shadow-2xl" />
          {renderOverlay && (
            <div
              className="absolute top-0 left-0"
              style={{ width: pageSize.width, height: pageSize.height }}
            >
              {renderOverlay(currentPage, scale)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
