'use client'

import { useState, useRef, useCallback } from 'react'
import { Pen, Type, Calendar, X, GripVertical } from 'lucide-react'

export type FieldType = 'signature' | 'initial' | 'date' | 'text'

export interface SignatureField {
  id: string
  type: FieldType
  x: number
  y: number
  width: number
  height: number
  page: number
  signerId?: string
}

interface SignatureFieldOverlayProps {
  fields: SignatureField[]
  currentPage: number
  scale: number
  onFieldAdd: (field: Omit<SignatureField, 'id'>) => void
  onFieldUpdate: (id: string, updates: Partial<SignatureField>) => void
  onFieldDelete: (id: string) => void
  activeFieldType: FieldType | null
  containerWidth: number
  containerHeight: number
}

const fieldConfig: Record<FieldType, { icon: typeof Pen; label: string; color: string; defaultWidth: number; defaultHeight: number }> = {
  signature: { icon: Pen, label: 'Signatur', color: 'purple', defaultWidth: 200, defaultHeight: 60 },
  initial: { icon: Type, label: 'Initial', color: 'blue', defaultWidth: 80, defaultHeight: 40 },
  date: { icon: Calendar, label: 'Datum', color: 'green', defaultWidth: 120, defaultHeight: 30 },
  text: { icon: Type, label: 'Text', color: 'orange', defaultWidth: 150, defaultHeight: 30 }
}

export function SignatureFieldOverlay({
  fields,
  currentPage,
  scale,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  activeFieldType,
  containerWidth,
  containerHeight
}: SignatureFieldOverlayProps) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  const pageFields = fields.filter(f => f.page === currentPage)

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (!activeFieldType || dragging) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const config = fieldConfig[activeFieldType]
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    onFieldAdd({
      type: activeFieldType,
      x: Math.max(0, Math.min(x - config.defaultWidth / 2, containerWidth / scale - config.defaultWidth)),
      y: Math.max(0, Math.min(y - config.defaultHeight / 2, containerHeight / scale - config.defaultHeight)),
      width: config.defaultWidth,
      height: config.defaultHeight,
      page: currentPage
    })
  }, [activeFieldType, currentPage, scale, onFieldAdd, dragging, containerWidth, containerHeight])

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation()
    const field = fields.find(f => f.id === fieldId)
    if (!field) return

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setDragging(fieldId)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const field = fields.find(f => f.id === dragging)
    if (!field) return

    const x = (e.clientX - rect.left - dragOffset.x) / scale
    const y = (e.clientY - rect.top - dragOffset.y) / scale

    onFieldUpdate(dragging, {
      x: Math.max(0, Math.min(x, containerWidth / scale - field.width)),
      y: Math.max(0, Math.min(y, containerHeight / scale - field.height))
    })
  }, [dragging, dragOffset, scale, fields, onFieldUpdate, containerWidth, containerHeight])

  const handleMouseUp = () => {
    setDragging(null)
  }

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 ${activeFieldType ? 'cursor-crosshair' : ''}`}
      onClick={handleOverlayClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {pageFields.map(field => {
        const config = fieldConfig[field.type]
        const Icon = config.icon

        return (
          <div
            key={field.id}
            className={`
              absolute flex items-center gap-1 rounded border-2 bg-opacity-20 cursor-move select-none
              ${config.color === 'purple' ? 'border-purple-500 bg-purple-500' : ''}
              ${config.color === 'blue' ? 'border-blue-500 bg-blue-500' : ''}
              ${config.color === 'green' ? 'border-green-500 bg-green-500' : ''}
              ${config.color === 'orange' ? 'border-orange-500 bg-orange-500' : ''}
              ${dragging === field.id ? 'ring-2 ring-white' : ''}
            `}
            style={{
              left: field.x * scale,
              top: field.y * scale,
              width: field.width * scale,
              height: field.height * scale
            }}
            onMouseDown={(e) => handleMouseDown(e, field.id)}
          >
            <div className="flex h-full items-center px-2">
              <GripVertical className="h-4 w-4 text-white/70" />
              <Icon className="h-4 w-4 text-white ml-1" />
              <span className="text-xs text-white ml-1 truncate">{config.label}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFieldDelete(field.id)
              }}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
