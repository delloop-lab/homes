'use client'

import { useState, useEffect, useMemo } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { propertiesService } from '@/lib/properties'
import { BookingWithProperty } from '@/lib/bookings'
import { BookingForm } from '@/components/bookings/booking-form'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Filter,
  Plus,
  Eye,
  Edit,
  MapPin,
  User,
  Clock
} from 'lucide-react'
import { format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO,
  isWithinInterval
} from 'date-fns'

interface BookingCalendarProps {
  propertyId?: string
  onBookingSelect?: (booking: BookingWithProperty) => void
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  bookings: BookingWithProperty[]
  checkIns: BookingWithProperty[]
  checkOuts: BookingWithProperty[]
}

interface PropertyOption {
  id: string
  name: string
  address: string
}

export function BookingCalendar({ propertyId, onBookingSelect }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProperty, setSelectedProperty] = useState(propertyId || 'all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithProperty | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Real properties for current user
  const [properties, setProperties] = useState<PropertyOption[]>([{ id: 'all', name: 'All Properties', address: '' }])
  const [propLoading, setPropLoading] = useState(true)
  const [propError, setPropError] = useState<string | null>(null)

  useEffect(() => {
    const loadProps = async () => {
      setPropLoading(true)
      setPropError(null)
      const res = await propertiesService.listMyProperties()
      if (res.error) {
        setPropError(res.error)
      } else {
        const items = (res.data || []).map(p => ({ id: p.id, name: p.name, address: p.address }))
        setProperties([{ id: 'all', name: 'All Properties', address: '' }, ...items])
        // If selectedProperty is not in the list anymore, reset to 'all'
        if (selectedProperty !== 'all' && !items.find(i => i.id === selectedProperty)) {
          setSelectedProperty('all')
        }
      }
      setPropLoading(false)
    }
    loadProps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calculate date range for the calendar view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  // Fetch bookings for the visible date range
  const { 
    bookings, 
    loading, 
    error, 
    refetch 
  } = useBookings({
    property_id: selectedProperty === 'all' ? undefined : selectedProperty,
    date_from: calendarStart,
    date_to: calendarEnd,
    limit: 200 // Get all bookings for the month
  })

  // Generate calendar days with booking data
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    })

    return days.map(date => {
      const dayBookings = bookings.filter(booking => {
        const checkIn = parseISO(booking.check_in)
        const checkOut = parseISO(booking.check_out)
        
        return isWithinInterval(date, {
          start: checkIn,
          end: checkOut
        }) || isSameDay(date, checkIn) || isSameDay(date, checkOut)
      })

      const checkIns = bookings.filter(booking => 
        isSameDay(parseISO(booking.check_in), date)
      )

      const checkOuts = bookings.filter(booking => 
        isSameDay(parseISO(booking.check_out), date)
      )

      return {
        date,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isToday(date),
        bookings: dayBookings,
        checkIns,
        checkOuts
      } as CalendarDay
    })
  }, [calendarStart, calendarEnd, currentDate, bookings])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date)
    
    if (day.checkIns.length > 0) {
      // If there are check-ins, select the first one
      handleBookingClick(day.checkIns[0])
    } else if (day.checkOuts.length > 0) {
      // If there are check-outs, select the first one
      handleBookingClick(day.checkOuts[0])
    } else if (day.bookings.length > 0) {
      // If there are ongoing bookings, select the first one
      handleBookingClick(day.bookings[0])
    } else {
      // Empty day - option to create new booking
      setSelectedBooking(null)
      setShowBookingForm(true)
    }
  }

  const handleBookingClick = (booking: BookingWithProperty) => {
    setSelectedBooking(booking)
    onBookingSelect?.(booking)
  }

  const getPlatformColor = (platform: string) => {
    const platformColors = {
      'booking.com': 'bg-blue-600',    // Blue for Booking.com
      'booking': 'bg-blue-600',        // Blue for Booking.com
      'vrbo': 'bg-orange-500',         // Orange for VRBO
      'airbnb': 'bg-green-400',        // Light green for Airbnb
      'manual': 'bg-purple-500',       // Purple for manual bookings
      'other': 'bg-gray-500',          // Gray for other platforms
      // Handle null/undefined/empty values that might come from synced bookings
      '': 'bg-gray-500',
      'null': 'bg-gray-500',
      'undefined': 'bg-gray-500'
    }
    
    const normalizedPlatform = platform?.toLowerCase() || 'other'
    const color = platformColors[normalizedPlatform] || 'bg-gray-500'
    
    return color
  }

  const getBookingColor = (booking: BookingWithProperty, type: 'ongoing' | 'checkin' | 'checkout') => {
    // Get platform-specific color as base
    let baseColor = getPlatformColor(booking.booking_platform || 'other')
    
    // Modify opacity/style based on status
    const statusModifiers = {
      confirmed: '',
      pending: 'opacity-70 border-2 border-dashed border-yellow-400',
      cancelled: 'opacity-40 line-through',
      checked_in: 'ring-2 ring-green-400',
      checked_out: 'opacity-60'
    }

    const statusModifier = statusModifiers[booking.status as keyof typeof statusModifiers] || ''
    
    // Add type-specific borders
    if (type === 'checkin') baseColor += ' border-l-4 border-green-600'
    if (type === 'checkout') baseColor += ' border-r-4 border-red-600'
    
    return `${baseColor} ${statusModifier}`.trim()
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">Error loading calendar: {error}</p>
        <button
          onClick={refetch}
          className="mt-2 text-red-600 hover:text-red-500 font-medium"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Booking Calendar
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-500 hover:text-gray-700 flex items-center"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedDate(null)
              setSelectedBooking(null)
              setShowBookingForm(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
                {propError && (
                  <p className="mt-2 text-sm text-red-600">{propError}</p>
                )}
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Go to Today
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <h3 className="text-lg font-medium text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading calendar...</p>
          </div>
        ) : (
          <>
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[120px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                    ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  {/* Date Number with warning icon if changeover day */}
                  <div className={`
                    text-sm font-medium mb-1 text-center flex items-center justify-center
                    ${day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  `}>
                    <span>{format(day.date, 'd')}</span>
                    {day.checkIns.length > 0 && day.checkOuts.length > 0 && (
                      <span className="ml-1 text-orange-500" title="Changeover day: Check-out and Check-in">⚠️</span>
                    )}
                  </div>

                  {/* Combine all bookings and sort - Paint Shop always first, then by type (check-out, check-in, ongoing) */}
                  {(() => {
                    const sortBookings = (bookings: BookingWithProperty[]) => {
                      return [...bookings].sort((a, b) => {
                        const aIsPaintShop = a.property_name?.toLowerCase().includes('paint shop') || false
                        const bIsPaintShop = b.property_name?.toLowerCase().includes('paint shop') || false
                        
                        // Paint Shop always first
                        if (aIsPaintShop && !bIsPaintShop) return -1
                        if (!aIsPaintShop && bIsPaintShop) return 1
                        
                        // If both are Paint Shop or both are not, maintain original order
                        return 0
                      })
                    }

                    // Get all bookings for this day with their types
                    const allBookings: Array<{ booking: BookingWithProperty; type: 'checkout' | 'checkin' | 'ongoing'; order: number }> = []
                    
                    // Add check-outs (order 1)
                    day.checkOuts.forEach(booking => {
                      allBookings.push({ booking, type: 'checkout', order: 1 })
                    })
                    
                    // Add check-ins (order 2)
                    day.checkIns.forEach(booking => {
                      allBookings.push({ booking, type: 'checkin', order: 2 })
                    })
                    
                    // Add ongoing bookings (order 3)
                    day.bookings
                      .filter(booking => 
                        !day.checkIns.includes(booking) && 
                        !day.checkOuts.includes(booking)
                      )
                      .forEach(booking => {
                        allBookings.push({ booking, type: 'ongoing', order: 3 })
                      })
                    
                    // Sort: Paint Shop first, then by type order
                    allBookings.sort((a, b) => {
                      const aIsPaintShop = a.booking.property_name?.toLowerCase().includes('paint shop') || false
                      const bIsPaintShop = b.booking.property_name?.toLowerCase().includes('paint shop') || false
                      
                      // Paint Shop always first
                      if (aIsPaintShop && !bIsPaintShop) return -1
                      if (!aIsPaintShop && bIsPaintShop) return 1
                      
                      // If same Paint Shop status, sort by type order
                      return a.order - b.order
                    })

                    return (
                      <>
                        {allBookings.map(({ booking, type }) => {
                          const platform = booking.booking_platform?.toLowerCase() || ''
                          const isBookingCom = platform === 'booking' || platform === 'booking.com' || platform.includes('booking')
                          const reservationUrl = booking.reservation_url || (booking.notes?.match(/Reservation\s*URL\s*:\s*(https?:\/\/[^\s]+)/i)?.[1])
                          
                          // Debug: log if Booking.com but no URL
                          if (isBookingCom && !reservationUrl) {
                            console.log('Booking.com booking without URL:', booking.guest_name, booking.booking_platform, booking.reservation_url)
                          }
                          
                          const bookingContent = (() => {
                            if (type === 'checkout') {
                              return (
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center flex-1 min-w-0">
                                    <div className="w-2 h-2 bg-red-300 rounded-full mr-1 flex-shrink-0"></div>
                                    <span className="truncate">
                                      {booking.guest_name}
                                    </span>
                                  </div>
                                  {isBookingCom && reservationUrl && (
                                    <a
                                      href={reservationUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="ml-1.5 flex-shrink-0 text-white hover:text-blue-200 opacity-80 hover:opacity-100 transition-opacity"
                                      title="Open on Booking.com"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  )}
                                  {isBookingCom && !reservationUrl && (
                                    <span className="ml-1.5 flex-shrink-0 text-white opacity-50 text-xs" title="No reservation URL available">
                                      ⚠
                                    </span>
                                  )}
                                </div>
                              )
                            } else if (type === 'checkin') {
                              return (
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center flex-1 min-w-0">
                                    <div className="w-2 h-2 bg-green-300 rounded-full mr-1 flex-shrink-0"></div>
                                    <span className="truncate">
                                      {booking.guest_name}
                                    </span>
                                  </div>
                                  {isBookingCom && reservationUrl && (
                                    <a
                                      href={reservationUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="ml-1.5 flex-shrink-0 text-white hover:text-blue-200 opacity-80 hover:opacity-100 transition-opacity"
                                      title="Open on Booking.com"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  )}
                                  {isBookingCom && !reservationUrl && (
                                    <span className="ml-1.5 flex-shrink-0 text-white opacity-50 text-xs" title="No reservation URL available">
                                      ⚠
                                    </span>
                                  )}
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center justify-between w-full">
                                  <span className="truncate block flex-1 min-w-0">
                                    {booking.guest_name}
                                  </span>
                                  {isBookingCom && reservationUrl && (
                                    <a
                                      href={reservationUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="ml-1.5 flex-shrink-0 text-white hover:text-blue-200 opacity-80 hover:opacity-100 transition-opacity"
                                      title="Open on Booking.com"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  )}
                                  {isBookingCom && !reservationUrl && (
                                    <span className="ml-1.5 flex-shrink-0 text-white opacity-50 text-xs" title="No reservation URL available">
                                      ⚠
                                    </span>
                                  )}
                                </div>
                              )
                            }
                          })()

                          if (type === 'checkout') {
                            return (
                              <div
                                key={`checkout-${booking.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleBookingClick(booking)
                                }}
                                className={`
                                  text-xs p-1 mb-1 rounded text-white cursor-pointer hover:opacity-80
                                  ${getBookingColor(booking, 'checkout')}
                                `}
                                title={`Check-out: ${booking.guest_name} from ${booking.property_name}`}
                              >
                                {bookingContent}
                              </div>
                            )
                          } else if (type === 'checkin') {
                            return (
                              <div
                                key={`checkin-${booking.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleBookingClick(booking)
                                }}
                                className={`
                                  text-xs p-1 mb-1 rounded text-white cursor-pointer hover:opacity-80
                                  ${getBookingColor(booking, 'checkin')}
                                `}
                                title={`Check-in: ${booking.guest_name} at ${booking.property_name}`}
                              >
                                {bookingContent}
                              </div>
                            )
                          } else {
                            return (
                              <div
                                key={`ongoing-${booking.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleBookingClick(booking)
                                }}
                                className={`
                                  text-xs p-1 mb-1 rounded text-white cursor-pointer hover:opacity-80
                                  ${getBookingColor(booking, 'ongoing')}
                                `}
                                title={`Ongoing: ${booking.guest_name} at ${booking.property_name}`}
                              >
                                {bookingContent}
                              </div>
                            )
                          }
                        })}
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Legend</h4>
        
        {/* Platform Colors */}
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-600 mb-2">Platforms:</h5>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
              <span>Booking.com</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
              <span>VRBO</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
              <span>Airbnb</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span>Manual</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
              <span>Other</span>
            </div>
          </div>
        </div>

        {/* Status & Event Types */}
        <div>
          <h5 className="text-xs font-medium text-gray-600 mb-2">Event Indicators:</h5>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-300 rounded-full mr-2"></div>
              <span>Check-in (arriving)</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-300 rounded-full mr-2"></div>
              <span>Check-out (leaving)</span>
            </div>
            <div className="flex items-center">
              <span className="text-orange-500 mr-2">⚠️</span>
              <span>Changeover day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && !showBookingForm && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onEdit={() => setShowBookingForm(true)}
        />
      )}

      {/* Booking Form Modal */}
      {showBookingForm && (
        <BookingForm
          booking={selectedBooking}
          propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
          onSuccess={(updatedBooking) => {
            setShowBookingForm(false)
            setSelectedBooking(null)
            // Force immediate refetch to update calendar
            setTimeout(() => refetch(), 100)
          }}
          onCancel={() => {
            setShowBookingForm(false)
            setSelectedBooking(null)
          }}
        />
      )}
    </div>
  )
}

// Booking Details Modal Component
interface BookingDetailsModalProps {
  booking: BookingWithProperty
  onClose: () => void
  onEdit: () => void
}

function BookingDetailsModal({ booking, onClose, onEdit }: BookingDetailsModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'checked_in': return 'bg-blue-100 text-blue-800'
      case 'checked_out': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Fallback extractors if DB fields are missing but notes contain details
  const extractFromNotes = (pattern: RegExp): string | undefined => {
    if (!booking.notes) return undefined
    const m = booking.notes.match(pattern)
    return m && m[1] ? m[1].trim() : undefined
  }
  const derivedReservationUrl = booking.reservation_url || extractFromNotes(/Reservation\s*URL\s*:\s*(https?:\/\/[^\s]+)/i)
  const derivedPhoneLast4 = booking.guest_phone_last4 || extractFromNotes(/Last\s*4\s*Digits\)\s*:\s*(\d{4})/i)
  const derivedGuestInitials = (
    booking.guest_first_name || booking.guest_last_initial
  ) ? `${booking.guest_first_name || ''}${booking.guest_first_name && booking.guest_last_initial ? ' ' : ''}${booking.guest_last_initial ? booking.guest_last_initial + '.' : ''}`.trim() : undefined

  // Sanitize notes: remove full Airbnb reservation URLs and explicit Reservation URL lines
  const sanitizedNotes = (() => {
    if (!booking.notes) return undefined
    const lines = booking.notes.split(/\r?\n/)
    const filtered = lines.filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (/^Reservation\s*URL\s*:/i.test(trimmed)) return false
      if (/https?:\/\/(?:www\.)?airbnb\.com\S*/i.test(trimmed)) return false
      if (/(phone|tel)[^\n]*last\s*4\s*digits/i.test(trimmed)) return false
      if (/last\s*4\s*digits\)\s*:\s*\d{4}/i.test(trimmed)) return false
      return true
    })
    const text = filtered.join('\n').trim()
    return text.length > 0 ? text : undefined
  })()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Guest Info */}
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">{booking.guest_name}</div>
                {booking.contact_email && (
                  <div className="text-sm text-gray-500">{booking.contact_email}</div>
                )}
                {booking.contact_phone && (
                  <div className="text-sm text-gray-500">{booking.contact_phone}</div>
                )}
              </div>
            </div>

            {/* Property Info */}
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">{booking.property_name}</div>
                {booking.property_address && (
                  <div className="text-sm text-gray-500">{booking.property_address}</div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-start space-x-3">
              <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">
                  {format(parseISO(booking.check_in), 'MMM dd, yyyy')} - {format(parseISO(booking.check_out), 'MMM dd, yyyy')}
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                {booking.status.replace('_', ' ')}
              </span>
            </div>

            {/* Amount */}
            {booking.total_amount && (
              <div className="text-lg font-semibold text-gray-900">
                ${booking.total_amount.toFixed(2)}
              </div>
            )}

            {/* Platform */}
            <div className="text-sm text-gray-500">
              Platform: {booking.booking_platform}
            </div>

            {/* Booking.com Direct Link */}
            {(booking.booking_platform?.toLowerCase() === 'booking' || booking.booking_platform?.toLowerCase() === 'booking.com') && derivedReservationUrl && (
              <div>
                <a
                  href={derivedReservationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <span>Open on Booking.com</span>
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Platform Metadata (Airbnb/others) */}
            {(derivedReservationUrl || booking.listing_name || derivedPhoneLast4 || derivedGuestInitials || booking.event_uid) && (
              <div className="space-y-2">
                <div className="font-medium text-gray-900">Platform details</div>
                {booking.listing_name && (
                  <div className="text-sm text-gray-600">Listing: {booking.listing_name}</div>
                )}
                {derivedGuestInitials && (
                  <div className="text-sm text-gray-600">
                    Guest (from feed): {derivedGuestInitials}
                  </div>
                )}
                {derivedPhoneLast4 && (
                  <div className="text-sm text-gray-600">Guest phone: ••••{derivedPhoneLast4}</div>
                )}
                {booking.event_uid && (
                  <div className="text-sm text-gray-600">Event UID: {booking.event_uid}</div>
                )}
                {derivedReservationUrl && (booking.booking_platform?.toLowerCase() !== 'booking' && booking.booking_platform?.toLowerCase() !== 'booking.com') && (
                  <a
                    href={derivedReservationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Open Reservation
                  </a>
                )}
              </div>
            )}

            {/* Notes (sanitized) */}
            {sanitizedNotes && (
              <div>
                <div className="font-medium text-gray-900 mb-1">Notes</div>
                <div className="text-sm text-gray-600 whitespace-pre-line">{sanitizedNotes}</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}