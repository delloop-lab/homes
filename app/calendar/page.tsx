'use client'

import { useState } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { BookingCalendar } from '@/components/calendar/booking-calendar'
import { CalendarSummary } from '@/components/calendar/calendar-summary'
import { MultiPlatformSync } from '@/components/calendar/multi-platform-sync'
import { BookingWithProperty } from '@/lib/bookings'

export default function CalendarPage() {
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedBooking, setSelectedBooking] = useState<BookingWithProperty | null>(null)

  const handleBookingSelect = (booking: BookingWithProperty) => {
    setSelectedBooking(booking)
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Booking Calendar</h2>
            <p className="text-gray-600 mt-2">View and manage your property bookings across all platforms</p>
          </div>



          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Calendar Summary */}
              <CalendarSummary 
                currentDate={currentDate}
                propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
              />

              {/* Calendar Sync Section */}
              <MultiPlatformSync />
            </div>

            {/* Main Calendar */}
            <div className="lg:col-span-3">
              <BookingCalendar
                propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
                onBookingSelect={handleBookingSelect}
              />
            </div>
          </div>
        </main>
      </div>
    </AuthenticatedRoute>
  )
}