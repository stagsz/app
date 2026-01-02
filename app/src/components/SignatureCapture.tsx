'use client'

import { useRef, useState, useEffect } from 'react'
import { Pen, Type, Eraser, Check } from 'lucide-react'

interface SignatureCaptureProps {
  onSave: (signatureData: string) => void
  onCancel: () => void
  type?: 'signature' | 'initial'
}

type Mode = 'draw' | 'type'

export function SignatureCapture({ onSave, onCancel, type = 'signature' }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [typedText, setTypedText] = useState('')

  const isInitial = type === 'initial'
  const canvasWidth = isInitial ? 200 : 400
  const canvasHeight = isInitial ? 100 : 150

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setHasDrawn(true)

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'draw') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const renderTypedSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (typedText) {
      // Draw typed signature with cursive-like font
      ctx.fillStyle = '#1a1a2e'
      ctx.font = `${isInitial ? '32' : '48'}px 'Brush Script MT', cursive`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedText, canvas.width / 2, canvas.height / 2)
    }
  }

  useEffect(() => {
    if (mode === 'type') {
      renderTypedSignature()
    }
  }, [typedText, mode])

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (mode === 'draw' && !hasDrawn) return
    if (mode === 'type' && !typedText.trim()) return

    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  const canSave = (mode === 'draw' && hasDrawn) || (mode === 'type' && typedText.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {isInitial ? 'Skriv dina initialer' : 'Skriv din signatur'}
        </h3>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('draw'); clearCanvas() }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'draw'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Pen className="h-4 w-4" />
            Rita
          </button>
          <button
            onClick={() => { setMode('type'); setTypedText('') }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'type'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Type className="h-4 w-4" />
            Skriv
          </button>
        </div>

        {/* Canvas */}
        <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-white">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {mode === 'draw' && (
            <button
              onClick={clearCanvas}
              className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-gray-800/80 px-2 py-1 text-xs text-white hover:bg-gray-700 transition-colors"
            >
              <Eraser className="h-3 w-3" />
              Rensa
            </button>
          )}
        </div>

        {/* Type Input */}
        {mode === 'type' && (
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={isInitial ? 'T.ex. AB' : 'Skriv ditt namn'}
            maxLength={isInitial ? 5 : 50}
            className="mt-4 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            autoFocus
          />
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="h-4 w-4" />
            Spara
          </button>
        </div>
      </div>
    </div>
  )
}
