'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  children: ReactNode
  isOpen: boolean
  onOpenChange?: (open: boolean) => void
}

type SheetState = 'collapsed' | 'partial' | 'expanded'

export function BottomSheet({ children, isOpen }: BottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('partial')
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentTranslate, setCurrentTranslate] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  const heights = {
    collapsed: 80,
    partial: 45,
    expanded: 10,
  }

  const getTranslateY = () => {
    if (isDragging) return currentTranslate
    return heights[sheetState]
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentTranslate(heights[sheetState])
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const currentY = e.touches[0].clientY
    const diff = currentY - startY
    const newTranslate = heights[sheetState] + (diff / window.innerHeight) * 100
    
    // Clamp between expanded and collapsed
    setCurrentTranslate(Math.max(heights.expanded, Math.min(heights.collapsed, newTranslate)))
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    
    // Determine which state to snap to
    if (currentTranslate < 25) {
      setSheetState('expanded')
    } else if (currentTranslate < 60) {
      setSheetState('partial')
    } else {
      setSheetState('collapsed')
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartY(e.clientY)
    setCurrentTranslate(heights[sheetState])
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const diff = e.clientY - startY
      const newTranslate = heights[sheetState] + (diff / window.innerHeight) * 100
      
      setCurrentTranslate(Math.max(heights.expanded, Math.min(heights.collapsed, newTranslate)))
    }

    const handleMouseUp = () => {
      if (!isDragging) return
      setIsDragging(false)
      
      if (currentTranslate < 25) {
        setSheetState('expanded')
      } else if (currentTranslate < 60) {
        setSheetState('partial')
      } else {
        setSheetState('collapsed')
      }
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, startY, sheetState, currentTranslate])

  if (!isOpen) return null

  return (
    <div
      ref={sheetRef}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-2xl border-t',
        !isDragging && 'transition-transform duration-300 ease-out'
      )}
      style={{
        transform: `translateY(${getTranslateY()}%)`,
        height: '90vh',
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="drag-handle" />
      </div>

      {/* Content */}
      <div className="h-[calc(100%-40px)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}
