'use client'

import { useMemo } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { BookingWithProperty } from '@/lib/bookings'
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  parseISO,
  isSameDay,
  isWithinInterval,
  addDays
} from 'date-fns'

interface CalendarSummaryProps {
  currentDate: Date
  propertyId?: string
}

interface SummaryStats {
  totalBookings: number
  checkInsToday: number
  checkOutsToday: number
  checkInsThisWeek: number
  checkOutsThisWeek: number
  occupancyRate: number
  totalRevenue: number
  averageNightlyRate: number
}

export function CalendarSummary({ currentDate, propertyId }: CalendarSummaryProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
  const weekEnd = addDays(weekStart, 6) // End of week (Saturday)

  const { bookings, loading, error } = useBookings({
    property_id: propertyId,
    date_from: monthStart,
    date_to: monthEnd,
    limit: 200
  })

  const stats = useMemo((): SummaryStats => {
    if (!bookings.length) {
      return {
        totalBookings: 0,
        checkInsToday: 0,
        checkOutsToday: 0,
        checkInsThisWeek: 0,
        checkOutsThisWeek: 0,
        occupancyRate: 0,
        totalRevenue: 0,
        averageNightlyRate: 0
      }
    }

    const confirmedBookings = bookings.filter(b => b.status !== 'cancelled')
    
    // Check-ins and check-outs
    const checkInsToday = confirmedBookings.filter(b => 
      isSameDay(parseISO(b.check_in), today)
    ).length

    const checkOutsToday = confirmedBookings.filter(b => 
      isSameDay(parseISO(b.check_out), today)
    ).length

    const checkInsThisWeek = confirmedBookings.filter(b => {
      const checkInDate = parseISO(b.check_in)
      return isWithinInterval(checkInDate, { start: weekStart, end: weekEnd })
    }).length

    const checkOutsThisWeek = confirmedBookings.filter(b => {
      const checkOutDate = parseISO(b.check_out)
      return isWithinInterval(checkOutDate, { start: weekStart, end: weekEnd })
    }).length

    // Revenue calculations
    const totalRevenue = confirmedBookings.reduce((sum, b) => 
      sum + (b.total_amount || 0), 0
    )

    const totalNights = confirmedBookings.reduce((sum, b) => 
      sum + (b.nights || 0), 0
    )

    const averageNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0

    // Occupancy rate (simplified - days with bookings / total days in month)
    const daysInMonth = monthEnd.getDate()
    const occupiedDays = new Set()
    
    confirmedBookings.forEach(booking => {
      const checkIn = parseISO(booking.check_in)
      const checkOut = parseISO(booking.check_out)
      
      // Count each day the property is occupied
      let currentDay = new Date(checkIn)
      while (currentDay < checkOut) {
        if (currentDay >= monthStart && currentDay <= monthEnd) {
          occupiedDays.add(format(currentDay, 'yyyy-MM-dd'))
        }
        currentDay = addDays(currentDay, 1)
      }
    })

    const occupancyRate = (occupiedDays.size / daysInMonth) * 100

    return {
      totalBookings: confirmedBookings.length,
      checkInsToday,
      checkOutsToday,
      checkInsThisWeek,
      checkOutsThisWeek,
      occupancyRate,
      totalRevenue,
      averageNightlyRate
    }
  }, [bookings, monthStart, monthEnd, today, weekStart, weekEnd])

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(b => {
        const checkIn = parseISO(b.check_in)
        return checkIn >= today && b.status !== 'cancelled'
      })
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
      .slice(0, 3)
  }, [bookings, today])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-red-600 text-sm">Error loading summary: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Monthly Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          {format(currentDate, 'MMMM yyyy')} Overview
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</div>
            <div className="text-sm text-gray-500">Total Bookings</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-blue-600">{stats.occupancyRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Occupancy Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">${stats.totalRevenue.toFixed(0)}</div>
            <div className="text-sm text-gray-500">Total Revenue</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-purple-600">${stats.averageNightlyRate.toFixed(0)}</div>
            <div className="text-sm text-gray-500">Avg Nightly Rate</div>
          </div>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Activity</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">Check-ins</span>
            </div>
            <span className="text-lg font-semibold text-green-600">{stats.checkInsToday}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">Check-outs</span>
            </div>
            <span className="text-lg font-semibold text-red-600">{stats.checkOutsToday}</span>
          </div>
        </div>
      </div>

      {/* This Week */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">This Week</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Check-ins</span>
            <span className="font-medium text-gray-900">{stats.checkInsThisWeek}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Check-outs</span>
            <span className="font-medium text-gray-900">{stats.checkOutsThisWeek}</span>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Bookings</h3>
        
        {upcomingBookings.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming bookings</p>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map(booking => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{booking.guest_name}</div>
                  <div className="text-xs text-gray-500">
                    {format(parseISO(booking.check_in), 'MMM dd')} - {format(parseISO(booking.check_out), 'MMM dd')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                  </div>
                  {booking.total_amount && (
                    <div className="text-xs text-gray-500">${booking.total_amount}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Status</h3>
        
        <div className="space-y-2">
          {[
            { status: 'confirmed', label: 'Confirmed', color: 'bg-green-500' },
            { status: 'pending', label: 'Pending', color: 'bg-yellow-500' },
            { status: 'checked_in', label: 'Checked In', color: 'bg-blue-500' },
            { status: 'checked_out', label: 'Checked Out', color: 'bg-gray-500' },
            { status: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
          ].map(({ status, label, color }) => {
            const count = bookings.filter(b => b.status === status).length
            const percentage = bookings.length > 0 ? (count / bookings.length) * 100 : 0
            
            return (
              <div key={status} className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${color} mr-3`}></div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{label}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}