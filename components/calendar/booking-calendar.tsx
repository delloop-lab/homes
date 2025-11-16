'use client'

import { useState, useEffect, useMemo } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { propertiesService } from '@/lib/properties'
import { BookingWithProperty } from '@/lib/bookings'
import { BookingForm } from '@/components/bookings/booking-form'
import { createClient } from '@/lib/supabase'
import { referralSiteService } from '@/lib/referral-sites'
import { getBookingPlatformLink, formatPlatformName } from '@/lib/booking-platforms'
import { emailToLink } from '@/lib/email-utils'
import { UserProfile } from '@/lib/auth'
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
  Clock,
  Send,
  Loader2,
  X,
  Mail,
  CheckCircle,
  XCircle,
  Trash2
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
  const [showSendToCleaner, setShowSendToCleaner] = useState(false)
  const [cleaners, setCleaners] = useState<UserProfile[]>([])
  const [selectedCleanerId, setSelectedCleanerId] = useState('')
  const [hostNote, setHostNote] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [showEmailLogs, setShowEmailLogs] = useState(false)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [emailFilter, setEmailFilter] = useState('')
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>('all')
  const [referralConfig, setReferralConfig] = useState<any | null>(null)
  const [currencySymbol, setCurrencySymbol] = useState<string>('$')
  const getCurrencySymbol = (code?: string | null): string => {
    const c = (code || '').toUpperCase().trim()
    const map: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', NGN: '₦', GHS: '₵', JPY: '¥', CNY: '¥', INR: '₹',
      AUD: '$', NZD: '$', CAD: '$', SGD: '$', ZAR: 'R', BRL: 'R$', MXN: '$', TRY: '₺',
      RUB: '₽', AED: 'د.إ', SAR: '﷼', KES: 'KSh', UGX: 'USh', TZS: 'TSh'
    }
    return map[c] || '$'
  }
  const platformLink = useMemo(() => {
    if (!booking) return null
    return getBookingPlatformLink({
      booking_platform: booking.booking_platform,
      external_hotel_id: (booking as any).external_hotel_id,
      external_reservation_id: (booking as any).external_reservation_id,
      reservation_url: booking.reservation_url
    }, referralConfig || undefined)
  }, [booking, referralConfig])

  useEffect(() => {
    // First, check if booking has currency field set
    const bookingCurrency = (booking as any)?.currency
    if (bookingCurrency) {
      setCurrencySymbol(getCurrencySymbol(bookingCurrency))
    }
    
    const loadReferral = async () => {
      try {
        // If booking already has currency, use it and skip referral config lookup
        if (bookingCurrency) {
          setReferralConfig(null)
          return
        }
        
        const platform = booking.booking_platform || ''
        let res = await referralSiteService.getConfig(booking.property_id, platform)
        if ((!res.data || (!res.data.currency_symbol && !res.data.currency_code)) && platform.toLowerCase().includes('booking')) {
          res = await referralSiteService.getConfig(booking.property_id, 'booking.com')
        }
        if ((!res.data || (!res.data.currency_symbol && !res.data.currency_code)) && platform.toLowerCase() === 'booking.com') {
          res = await referralSiteService.getConfig(booking.property_id, 'booking')
        }
        setReferralConfig(res.data || null)
        const symbol = res.data?.currency_symbol || getCurrencySymbol(res.data?.currency_code)
        setCurrencySymbol(symbol || '$')
      } catch {
        setReferralConfig(null)
        // Only set default if booking doesn't have currency
        if (!bookingCurrency) {
          setCurrencySymbol('$')
        }
      }
    }
    loadReferral()
  }, [booking.property_id, booking.booking_platform, (booking as any)?.currency])

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

  // Load email logs function - loads both cleaning emails and template emails
  const loadEmailLogs = async () => {
    try {
      const supabase = createClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from('cleaning_email_logs')
        .select('*')
        .eq('booking_id', booking.id)
        .order('sent_at', { ascending: false })

      if (!error && data) {
        setEmailLogs(data)
      }
    } catch (err) {
      console.error('Error loading email logs:', err)
    }
  }

  // Load email logs when modal opens
  useEffect(() => {
    loadEmailLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id])

  // Delete email log
  const handleDeleteEmailLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this email log? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from('cleaning_email_logs')
        .delete()
        .eq('id', logId)
        .select()

      if (error) {
        console.error('Error deleting email log:', error)
        alert(`Failed to delete email log: ${error.message || error}. Please check RLS policies.`)
      } else {
        console.log('Email log deleted successfully:', data)
        // Reload email logs
        await loadEmailLogs()
        // Also update the local state immediately for better UX
        setEmailLogs(prev => prev.filter(log => log.id !== logId))
      }
    } catch (err) {
      console.error('Error deleting email log:', err)
      alert('Failed to delete email log. Please try again.')
    }
  }

  // Load cleaners when opening send-to-cleaner modal
  useEffect(() => {
    if (showSendToCleaner && cleaners.length === 0) {
      const loadCleaners = async () => {
        try {
          const supabase = createClient()
          if (!supabase) return

          const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('role', 'cleaner')
            .eq('is_active', true)
            .order('full_name', { ascending: true })

          setCleaners(data || [])
        } catch (err) {
          console.error('Error loading cleaners:', err)
        }
      }
      loadCleaners()
    }
  }, [showSendToCleaner, cleaners.length])

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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
            {emailLogs.length > 0 ? (
              <button
                onClick={() => setShowEmailLogs(true)}
                className="relative p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                title={`${emailLogs.length} email${emailLogs.length > 1 ? 's' : ''} sent (includes cleaning and guest emails)`}
              >
                <Mail className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {emailLogs.length}
                </span>
              </button>
            ) : (
              <span className="text-xs text-gray-400" title="No emails sent yet">
                <Mail className="h-4 w-4 opacity-50" />
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-6">
            {/* Guest Info */}
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-base">{booking.guest_name}</div>
                {booking.contact_email && (
                  <div className="text-sm text-gray-500 mt-1">{emailToLink(booking.contact_email)}</div>
                )}
                {booking.contact_phone && (
                  <div className="text-sm text-gray-500">{booking.contact_phone}</div>
                )}
              </div>
            </div>

            {/* Property Info */}
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-base">{booking.property_name}</div>
                {booking.property_address && (
                  <div className="text-sm text-gray-500 mt-1">{booking.property_address}</div>
                )}
              </div>
            </div>

            {/* Dates and Status - Side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-base">
                    {format(parseISO(booking.check_in), 'MMM dd, yyyy')} - {format(parseISO(booking.check_out), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-2">Status</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            {typeof booking.total_amount === 'number' && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-3">Financial Details</div>
                <div className="space-y-2">
                  {/* Total Amount */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Amount:</span>
                    <span className="text-base font-semibold text-gray-900">
                      {currencySymbol}{booking.total_amount.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Commission & Charges */}
                  {((booking as any).commission_and_charges && (booking as any).commission_and_charges > 0) ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Commission & Charges:</span>
                        <span className="text-base font-semibold text-red-600">
                          -{currencySymbol}{((booking as any).commission_and_charges || 0).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Formula */}
                      <div className="pt-2 mt-2 border-t border-gray-300">
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                          <span>Formula:</span>
                          <span className="font-mono">
                            {currencySymbol}{booking.total_amount.toFixed(2)} - {currencySymbol}{((booking as any).commission_and_charges || 0).toFixed(2)} = {currencySymbol}{Math.max(0, (booking.total_amount || 0) - ((booking as any).commission_and_charges || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : null}
                  
                  {/* Total Payout */}
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-300">
                    <span className="text-sm font-medium text-gray-700">Total Payout:</span>
                    <span className="text-xl font-bold text-green-600">
                      {currencySymbol}{Math.max(0, (booking.total_amount || 0) - ((booking as any).commission_and_charges || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Platform */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Platform</div>
              <div className="text-base font-medium text-gray-900">{formatPlatformName(booking.booking_platform)}</div>
            </div>

            {/* Notes (sanitized) */}
            {sanitizedNotes && (
              <div>
                <div className="font-medium text-gray-900 mb-2 text-base">Notes</div>
                <div className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded-md">{sanitizedNotes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-gray-200 p-6 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {platformLink?.url && (
                <a
                  href={platformLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center"
                >
                  Open on {formatPlatformName(platformLink.platform || booking.booking_platform || 'platform')}
                </a>
              )}
              <button
                onClick={() => {
                  setShowSendToCleaner(true)
                  setEmailSuccess(null)
                  setEmailError(null)
                  setHostNote('')
                  setSelectedCleanerId('')
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm flex items-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Cleaner
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm"
              >
                Close
              </button>
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Send to Cleaner Modal */}
      {showSendToCleaner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Send Booking to Cleaner
              </h3>
              <button
                onClick={() => {
                  setShowSendToCleaner(false)
                  setEmailSuccess(null)
                  setEmailError(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={sendingEmail}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {emailSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 text-sm">{emailSuccess}</p>
                </div>
              )}

              {emailError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{emailError}</p>
                </div>
              )}

              <div>
                <label htmlFor="cleaner_select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Cleaner *
                </label>
                <select
                  id="cleaner_select"
                  value={selectedCleanerId}
                  onChange={(e) => setSelectedCleanerId(e.target.value)}
                  disabled={sendingEmail}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">Choose a cleaner...</option>
                  {cleaners.map(cleaner => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.full_name || cleaner.email} {cleaner.email ? `(${cleaner.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="host_note" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes for Cleaner
                </label>
                <textarea
                  id="host_note"
                  value={hostNote}
                  onChange={(e) => setHostNote(e.target.value)}
                  disabled={sendingEmail}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Add any special instructions or notes for the cleaner..."
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium text-gray-900">Email will include:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Property: {booking.property_name || 'N/A'}</li>
                  <li>Check-in: {format(parseISO(booking.check_in), 'MMM dd, yyyy')}</li>
                  <li>Check-out: {format(parseISO(booking.check_out), 'MMM dd, yyyy')}</li>
                  {hostNote && <li>Your notes</li>}
                </ul>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowSendToCleaner(false)
                    setEmailSuccess(null)
                    setEmailError(null)
                  }}
                  disabled={sendingEmail}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedCleanerId) {
                      setEmailError('Please select a cleaner')
                      return
                    }

                    const selectedCleaner = cleaners.find(c => c.id === selectedCleanerId)
                    if (!selectedCleaner || !selectedCleaner.email) {
                      setEmailError('Selected cleaner does not have an email address')
                      return
                    }

                    setSendingEmail(true)
                    setEmailError(null)
                    setEmailSuccess(null)

                    try {
                      const controller = new AbortController()
                      const timeoutId = setTimeout(() => controller.abort(), 35000)

                      const response = await fetch('/api/send-booking-to-cleaner', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          booking_id: booking.id,
                          cleaner_id: selectedCleaner.id,
                          cleaner_email: selectedCleaner.email,
                          host_note: hostNote.trim() || undefined
                        }),
                        signal: controller.signal
                      })

                      clearTimeout(timeoutId)

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                        throw new Error(errorData.error || `HTTP ${response.status}`)
                      }

                      const result = await response.json()

                      if (result.success) {
                        setEmailSuccess(`Email sent successfully to ${selectedCleaner.email}`)
                        setHostNote('')
                        // Refresh email logs to show the new email
                        await loadEmailLogs()
                        setTimeout(() => {
                          setShowSendToCleaner(false)
                          setEmailSuccess(null)
                        }, 2000)
                      } else {
                        setEmailError(result.error || 'Failed to send email')
                      }
                    } catch (err: any) {
                      console.error('Error sending email:', err)
                      if (err.name === 'AbortError') {
                        setEmailError('Request timed out. Please check your connection and try again.')
                      } else {
                        setEmailError(err.message || 'Failed to send email. Please try again.')
                      }
                    } finally {
                      setSendingEmail(false)
                    }
                  }}
                  disabled={sendingEmail || !selectedCleanerId}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium flex items-center"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Logs Modal */}
      {showEmailLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]" onClick={() => setShowEmailLogs(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">
                Emails Sent
              </h3>
              <button
                onClick={() => setShowEmailLogs(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  {emailLogs.length} email{emailLogs.length > 1 ? 's' : ''} sent for this booking
                  <br />
                  <span className="text-xs text-gray-400">
                    Includes cleaning emails to cleaners and template emails (check-in, checkout, thank you) to guests
                  </span>
                </p>
                
                {/* Filter and Search */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Search by recipient, subject..."
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={emailTypeFilter}
                      onChange={(e) => setEmailTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      <option value="cleaning">Cleaning Emails</option>
                      <option value="check_in_instructions">Check-in Instructions</option>
                      <option value="checkout_reminder">Checkout Reminder</option>
                      <option value="thank_you_review">Thank You & Review</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Filtered Email Logs */}
              {(() => {
                const filtered = emailLogs.filter(log => {
                  const matchesSearch = !emailFilter || 
                    (log.recipient_name || log.cleaner_name || '').toLowerCase().includes(emailFilter.toLowerCase()) ||
                    (log.cleaner_email || '').toLowerCase().includes(emailFilter.toLowerCase()) ||
                    (log.subject || '').toLowerCase().includes(emailFilter.toLowerCase())
                  
                  const matchesType = emailTypeFilter === 'all' || 
                    (emailTypeFilter === 'cleaning' && (!log.email_type || log.email_type === 'cleaning')) ||
                    (log.email_type === emailTypeFilter)
                  
                  return matchesSearch && matchesType
                })

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No emails found matching your filters.
                    </div>
                  )
                }

                return filtered.map((log, index) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {log.status === 'sent' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.recipient_name || log.cleaner_name || log.cleaner_email}
                        </div>
                        <div className="text-sm text-gray-500">{log.cleaner_email}</div>
                        {log.email_type && log.email_type !== 'cleaning' && (
                          <div className="text-xs text-blue-600 mt-1">
                            {log.email_type === 'check_in_instructions' ? 'Check-in Instructions' :
                             log.email_type === 'checkout_reminder' ? 'Checkout Reminder' :
                             log.email_type === 'thank_you_review' ? 'Thank You & Review' :
                             'Template Email'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.subject}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEmailLog(log.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete email log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </span>
                    )}
                    {log.provider_message_id && (
                      <span className="text-xs text-gray-500">
                        ID: {log.provider_message_id.substring(0, 8)}...
                      </span>
                    )}
                  </div>

                  {log.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm text-red-700">{log.error_message}</p>
                    </div>
                  )}

                  {log.email_content && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        View Email Content
                      </summary>
                      <div 
                        className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 max-h-64 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: log.email_content }}
                      />
                    </details>
                  )}

                  {index < filtered.length - 1 && (
                    <div className="border-t border-gray-200 pt-4 mt-4"></div>
                  )}
                </div>
              ))
              })()}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEmailLogs(false)}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}