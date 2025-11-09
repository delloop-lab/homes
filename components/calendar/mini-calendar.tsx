'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns'

interface MiniCalendarProps {
  selectedDate?: Date | null
  onDateSelect?: (date: Date) => void
  highlightedDates?: Date[]
  disabledDates?: Date[]
  className?: string
}

export function MiniCalendar({ 
  selectedDate, 
  onDateSelect, 
  highlightedDates = [],
  disabledDates = [],
  className = '' 
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  })

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const handleDateClick = (date: Date) => {
    const isDisabled = disabledDates.some(disabledDate => 
      isSameDay(date, disabledDate)
    )
    
    if (!isDisabled) {
      onDateSelect?.(date)
    }
  }

  const isHighlighted = (date: Date) => {
    return highlightedDates.some(highlightedDate => 
      isSameDay(date, highlightedDate)
    )
  }

  const isDisabled = (date: Date) => {
    return disabledDates.some(disabledDate => 
      isSameDay(date, disabledDate)
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <h3 className="text-sm font-medium text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isTodayDate = isToday(day)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isHighlightedDate = isHighlighted(day)
          const isDisabledDate = isDisabled(day)

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              disabled={isDisabledDate}
              className={`
                w-8 h-8 text-xs rounded transition-colors
                ${!isCurrentMonth 
                  ? 'text-gray-300 hover:text-gray-400' 
                  : 'text-gray-700 hover:bg-gray-100'
                }
                ${isTodayDate && isCurrentMonth ? 'bg-blue-100 text-blue-700' : ''}
                ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                ${isHighlightedDate && !isSelected ? 'bg-green-100 text-green-700' : ''}
                ${isDisabledDate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}