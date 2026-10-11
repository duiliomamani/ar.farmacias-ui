'use client'

import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

export type SheetState = 'collapsed' | 'partial' | 'expanded'

interface BottomSheetProps {
  children: ReactNode
  isOpen: boolean
  onOpenChange?: (open: boolean) => void
  sheetState?: SheetState
  onStateChange?: (state: SheetState) => void
  peekTitle?: ReactNode
}

export function BottomSheet({
  children,
  isOpen,
  sheetState: controlledState,
  onStateChange,
  peekTitle,
}: BottomSheetProps) {
  const [internalState, setInternalState] = useState<SheetState>('collapsed')
  const sheetState = controlledState !== undefined ? controlledState : internalState
  const setSheetState = (state: SheetState) => {
    if (onStateChange) onStateChange(state)
    else setInternalState(state)
  }

  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentDeltaY, setCurrentDeltaY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  const getTranslateStyle = () => {
    if (isDragging) {
      const baseTranslate =
        sheetState === 'expanded' ? 12 : sheetState === 'partial' ? 50 : 88
      const deltaPercent = (currentDeltaY / (typeof window !== 'undefined' ? window.innerHeight : 800)) * 100
      const clamped = Math.max(10, Math.min(90, baseTranslate + deltaPercent))
      return `translateY(${clamped}%)`
    }

    switch (sheetState) {
      case 'expanded':
        return 'translateY(12%)'
      case 'partial':
        return 'translateY(50%)'
      case 'collapsed':
      default:
        return 'translateY(calc(100% - 68px))'
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentDeltaY(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    setCurrentDeltaY(currentY - startY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    const threshold = 35
    if (currentDeltaY < -threshold) {
      // Swiped UP
      if (sheetState === 'collapsed') {
        setSheetState('partial')
      } else if (sheetState === 'partial') {
        setSheetState('expanded')
      }
    } else if (currentDeltaY > threshold) {
      // Swiped DOWN
      if (sheetState === 'expanded') {
        setSheetState('partial')
      } else if (sheetState === 'partial') {
        setSheetState('collapsed')
      }
    }
    setCurrentDeltaY(0)
  }

  const handleToggleState = () => {
    if (sheetState === 'collapsed') {
      setSheetState('partial')
    } else if (sheetState === 'partial') {
      setSheetState('expanded')
    } else {
      setSheetState('collapsed')
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={sheetRef}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 bg-card rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] border-t border-border/80 flex flex-col',
        !isDragging && 'transition-transform duration-300 ease-out'
      )}
      style={{
        transform: getTranslateStyle(),
        height: '90dvh',
      }}
    >
      {/* Drag & Peek Header */}
      <div
        className="flex flex-col items-center pt-2 pb-2 px-4 cursor-pointer select-none touch-none border-b border-border/40 hover:bg-muted/30 transition-colors shrink-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleToggleState}
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-1.5" />
        {peekTitle ? (
          <div className="w-full flex items-center justify-between py-0.5 text-xs">
            <div className="flex-1 min-w-0">{peekTitle}</div>
            <div className="text-muted-foreground ml-2 shrink-0">
              {sheetState === 'expanded' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </div>
          </div>
        ) : (
          <div className="py-0.5 text-[11px] font-bold text-muted-foreground flex items-center gap-1">
            <span>{sheetState === 'expanded' ? 'Toca para ver mapa' : 'Deslizá para ver lista'}</span>
            {sheetState === 'expanded' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </div>
        )}
      </div>

      {/* Sheet Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  )
}
