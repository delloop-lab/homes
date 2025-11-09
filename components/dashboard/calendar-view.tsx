'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Mock bookings data - replace with real data from your Supabase database
  const mockBookings = [
    { date: new Date(2024, 0, 15), guest: 'John Smith' },
    { date: new Date(2024, 0, 16), guest: 'John Smith' },
    { date: new Date(2024, 0, 17), guest: 'John Smith' },
    { date: new Date(2024, 0, 20), guest: 'Sarah Johnson' },
    { date: new Date(2024, 0, 21), guest: 'Sarah Johnson' },
    { date: new Date(2024, 0, 22), guest: 'Sarah Johnson' },
    { date: new Date(2024, 0, 23), guest: 'Sarah Johnson' },
    { date: new Date(2024, 0, 24), guest: 'Sarah Johnson' },
  ]

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add days from previous month to fill first week
  const firstDayOfWeek = monthStart.getDay()
  const previousMonthDays = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    previousMonthDays.push(subMonths(currentDate, 1).setDate(31 - i))
  }

  // Add days from next month to fill last week
  const lastDayOfWeek = monthEnd.getDay()
  const nextMonthDays = []
  for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
    nextMonthDays.push(addMonths(currentDate, 1).setDate(i))
  }

  const allDays = [...previousMonthDays, ...days, ...nextMonthDays]

  const isBooked = (date: Date) => {
    return mockBookings.some(booking => isSameDay(booking.date, date))
  }

  const getBookingGuest = (date: Date) => {
    const booking = mockBookings.find(booking => isSameDay(booking.date, date))
    return booking?.guest
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Calendar</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevMonth}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, index) => {
            const date = new Date(day)
            const isCurrentMonth = isSameMonth(date, currentDate)
            const isBookedDay = isBooked(date)
            const guest = getBookingGuest(date)
            
            return (
              <div
                key={index}
                className={`
                  aspect-square p-1 text-xs
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isToday(date) ? 'bg-primary-50 border border-primary-200' : ''}
                  ${isBookedDay ? 'bg-green-50 border border-green-200' : ''}
                  hover:bg-gray-50 cursor-pointer
                `}
              >
                <div className="h-full flex flex-col">
                  <span className="text-right">{format(date, 'd')}</span>
                  {isBookedDay && guest && (
                    <div className="mt-1 text-xs text-green-700 truncate">
                      {guest}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
            <span>Booked</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary-50 border border-primary-200 rounded"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  )
} 