'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { BookingWithProperty } from '@/lib/bookings'
import { format, startOfDay, endOfDay, isSameDay, isWithinInterval, parseISO, subDays, addDays } from 'date-fns'
import { 
  Calendar,
  Printer,
  Download,
  MapPin,
  User,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Filter,
  ExternalLink
} from 'lucide-react'
import { pdfService } from '@/lib/pdf-generator'
import { getBookingPlatformLink, formatPlatformName } from '@/lib/booking-platforms'
import { emailToLink } from '@/lib/email-utils'
import { referralSiteService, ReferralSiteConfig } from '@/lib/referral-sites'

interface DailyScheduleSheetProps {
  selectedDate?: Date
  propertyId?: string
  showActions?: boolean
  isReadOnly?: boolean
  cleanerId?: string
}

interface GroupedSchedule {
  property_id: string
  property_name: string
  property_address?: string
  checkins: BookingWithProperty[]
  checkouts: BookingWithProperty[]
  stays: BookingWithProperty[]
}

export function DailyScheduleSheet({ 
  selectedDate = new Date(), 
  propertyId,
  showActions = true,
  isReadOnly = false,
  cleanerId 
}: DailyScheduleSheetProps) {
  const [date, setDate] = useState(selectedDate)
  const [selectedProperty, setSelectedProperty] = useState(propertyId || '')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [referralConfigs, setReferralConfigs] = useState<Map<string, Map<string, ReferralSiteConfig>>>(new Map())

  // Helper function to filter out channel block text from notes
  const cleanNotes = (notes: string | null | undefined): string | null => {
    if (!notes) return null
    const lowerNotes = notes.toLowerCase()
    // Remove common channel block phrases
    if (
      lowerNotes.includes('closed - not available') ||
      lowerNotes.includes('closed') && lowerNotes.includes('not available') ||
      lowerNotes.includes('not available') ||
      lowerNotes === 'closed'
    ) {
      return null // Don't show channel block notes
    }
    return notes
  }

  // Helper function to get referral config for a booking
  const getReferralConfigForBooking = (booking: BookingWithProperty): ReferralSiteConfig | null => {
    if (!booking.booking_platform) return null
    
    const propertyConfigs = referralConfigs.get(booking.property_id)
    if (!propertyConfigs) return null
    
    const platform = String(booking.booking_platform).toLowerCase().trim()
    
    // Try exact match first
    let config = propertyConfigs.get(platform)
    if (config) return config
    
    // For Booking.com, try various variations
    if (platform.includes('booking')) {
      // Try common variations
      for (const key of Array.from(propertyConfigs.keys())) {
        if (key.includes('booking')) {
          return propertyConfigs.get(key) || null
        }
      }
    }
    
    return null
  }

  // Query a wider date range to ensure we get all bookings that overlap with the selected date
  // This includes bookings that start before or end after the selected date
  const queryStart = subDays(startOfDay(date), 30) // 30 days before
  const queryEnd = addDays(endOfDay(date), 30) // 30 days after
  
  const { bookings, loading, error, refetch } = useBookings({
    date_from: queryStart,
    date_to: queryEnd,
    limit: 500
  })

  // Keep local date in sync with parent prop
  useEffect(() => {
    setDate(selectedDate)
  }, [selectedDate])

  // Keep local property filter in sync with parent prop
  useEffect(() => {
    if (propertyId !== undefined) {
      setSelectedProperty(propertyId || '')
    }
  }, [propertyId])

  // Get stable list of property IDs from bookings
  const propertyIdsKey = useMemo(() => {
    if (!bookings || bookings.length === 0) return ''
    const ids = Array.from(new Set(bookings.map(b => b.property_id))).sort().join(',')
    return ids
  }, [bookings])

  // Fetch referral site configs for all properties that have bookings
  useEffect(() => {
    const fetchReferralConfigs = async () => {
      if (!bookings || bookings.length === 0) {
        setReferralConfigs(new Map())
        return
      }

      // Get unique property IDs from bookings
      const propertyIds = Array.from(new Set(bookings.map(b => b.property_id)))
      
      // Fetch configs for all properties (caching handled by service layer)
      const configMap = new Map<string, Map<string, ReferralSiteConfig>>()
      
      await Promise.all(
        propertyIds.map(async (propId) => {
          const result = await referralSiteService.getConfigsByProperty(propId)
          if (!result.error && result.data) {
            const platformMap = new Map<string, ReferralSiteConfig>()
            result.data.forEach(config => {
              if (config.is_active) {
                platformMap.set(config.platform.toLowerCase(), config)
              }
            })
            configMap.set(propId, platformMap)
          }
        })
      )
      
      setReferralConfigs(configMap)
    }

    fetchReferralConfigs()
    // Only re-fetch when property IDs actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyIdsKey])

  // Group bookings by property and categorize by check-in/check-out
  const groupedSchedule = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return []
    }

    

    const filteredBookings = bookings.filter(booking => {
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)
      const name = (booking.guest_name || '').toLowerCase()
      const notes = (booking.notes || '').toLowerCase()
      
      // Filter by property if selected
      if (selectedProperty && booking.property_id !== selectedProperty) {
        return false
      }

      // Hide channel blocks / not-available placeholders
      // If guest name itself is a placeholder, filter out the entire booking
      if (
        name.includes('closed') ||
        name.includes('not available') ||
        name.includes('blocked')
      ) {
        
        return false
      }
      
      // If notes contain channel block text, we'll filter it from display but keep the booking
      // (since it might be a real guest with channel block text in notes)

      // Include if check-in or check-out is on selected date OR guest is in-house (date between check-in and check-out)
      const isCheckIn = isSameDay(checkInDate, date)
      const isCheckOut = isSameDay(checkOutDate, date)
      const isInHouse = isWithinInterval(date, { start: checkInDate, end: checkOutDate })
      const shouldInclude = isCheckIn || isCheckOut || isInHouse
      
      if (!shouldInclude) {
        
      }
      
      return shouldInclude
    })
    
    

    // Group by property
    const propertyGroups = new Map<string, GroupedSchedule>()

    filteredBookings.forEach(booking => {
      const propertyId = booking.property_id
      const propertyName = booking.property_name || 'Unknown Property'
      const propertyAddress = booking.property_address || ''

      if (!propertyGroups.has(propertyId)) {
        propertyGroups.set(propertyId, {
          property_id: propertyId,
          property_name: propertyName,
          property_address: propertyAddress,
          checkins: [],
          checkouts: [],
          stays: []
        })
      }

      const group = propertyGroups.get(propertyId)!
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)

      // Add to check-ins if checking in today
      if (isSameDay(checkInDate, date)) {
        group.checkins.push(booking)
      }

      // Add to check-outs if checking out today
      if (isSameDay(checkOutDate, date)) {
        group.checkouts.push(booking)
      }

      // Otherwise, guest is currently in-house
      if (
        !isSameDay(checkInDate, date) &&
        !isSameDay(checkOutDate, date) &&
        isWithinInterval(date, { start: checkInDate, end: checkOutDate })
      ) {
        group.stays.push(booking)
      }
    })

    // Sort properties and bookings
    return Array.from(propertyGroups.values())
      .sort((a, b) => a.property_name.localeCompare(b.property_name))
      .map(group => ({
        ...group,
        checkins: group.checkins.sort((a, b) => a.check_in.localeCompare(b.check_in)),
        checkouts: group.checkouts.sort((a, b) => a.check_out.localeCompare(b.check_out)),
        stays: group.stays.sort((a, b) => a.check_in.localeCompare(b.check_in))
      }))
  }, [bookings, date, selectedProperty])

  // Get unique properties for filter
  const availableProperties = useMemo(() => {
    if (!bookings) return []
    
    const properties = new Map()
    bookings.forEach(booking => {
      if (!properties.has(booking.property_id)) {
        properties.set(booking.property_id, {
          id: booking.property_id,
          name: booking.property_name || 'Unknown Property'
        })
      }
    })
    
    return Array.from(properties.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [bookings])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      await pdfService.generateDailySchedulePDF({
        date,
        schedule: groupedSchedule,
        includeNotes: true,
        includeContactInfo: true
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const getTotalCount = () => {
    const checkins = groupedSchedule.reduce((sum, group) => sum + group.checkins.length, 0)
    const checkouts = groupedSchedule.reduce((sum, group) => sum + group.checkouts.length, 0)
    const stays = groupedSchedule.reduce((sum, group) => sum + group.stays.length, 0)
    return { checkins, checkouts, stays, total: checkins + checkouts + stays }
  }

  const counts = getTotalCount()

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading schedule...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">Failed to load schedule</div>
          <button
            onClick={refetch}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header - Hidden in print */}
      <div className="p-6 border-b border-gray-200 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Daily Schedule Sheet</h2>
          
          {showActions && (
            <div className="flex items-center space-x-2">
              <button
                onClick={refetch}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              
              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Properties</option>
              {availableProperties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active bookings toggle removed as requested */}

          <div className="text-sm text-gray-600">
            {counts.total > 0 ? (
              <>
                {counts.checkins} check-ins, {counts.checkouts} check-outs, {counts.stays} in-house
              </>
            ) : (
              'No activities'
            )}
          </div>
        </div>
      </div>

      {/* Print Header - Only visible in print */}
      <div className="hidden print:block p-6 border-b border-gray-300">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Daily Schedule</h1>
          <p className="text-lg text-gray-600">{format(date, 'EEEE, MMMM dd, yyyy')}</p>
        </div>
        <div className="text-center text-sm text-gray-600">
          <p>Check-ins: {counts.checkins} | Check-outs: {counts.checkouts} | Total: {counts.total}</p>
          <p>Generated: {format(new Date(), 'MM/dd/yyyy h:mm a')}</p>
        </div>
      </div>

      {/* Schedule Content */}
      <div className="p-6">
        {groupedSchedule.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No check-ins, check-outs, or in-house stays</p>
            <p className="text-gray-400">for {format(date, 'MMMM dd, yyyy')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedSchedule.map((property) => (
              <div key={property.property_id} className="break-inside-avoid">
                {/* Property Header */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {property.property_name}
                    </h3>
                  </div>
                  {property.property_address && (
                    <p className="text-sm text-gray-600 ml-7">
                      {property.property_address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Check-ins */}
                  <div>
                    <h4 className="font-medium text-green-800 mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Check-ins ({property.checkins.length})
                    </h4>
                    
                    {property.checkins.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No check-ins</p>
                    ) : (
                      <div className="space-y-3">
                        {property.checkins.map((booking) => (
                          <div key={`checkin-${booking.id}`} className="border border-green-200 bg-green-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <User className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-gray-900">
                                    {booking.guest_name}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div>
                                    <strong>Check-in:</strong> {format(parseISO(booking.check_in), 'h:mm a')}
                                  </div>
                                  <div>
                                    <strong>Stay:</strong> {format(parseISO(booking.check_in), 'MMM dd')} - {format(parseISO(booking.check_out), 'MMM dd')}
                                  </div>
                                  {!isReadOnly && booking.contact_email && (
                                    <div>
                                      <strong>Email:</strong> {emailToLink(booking.contact_email)}
                                    </div>
                                  )}
                                  {!isReadOnly && booking.contact_phone && (
                                    <div>
                                      <strong>Phone:</strong> {booking.contact_phone}
                                    </div>
                                  )}
                                  {booking.booking_platform && (
                                    <div className="flex items-center gap-2">
                                      <span><strong>Platform:</strong> {formatPlatformName(booking.booking_platform)}</span>
                                      {(() => {
                                        const referralConfig = getReferralConfigForBooking(booking)
                                        const bookingPlatform = String(booking.booking_platform || '').toLowerCase()
                                        const hasBookingPlatform = bookingPlatform.includes('booking')
                                        
                                        
                                        
                                        const platformLink = getBookingPlatformLink({
                                          booking_platform: booking.booking_platform,
                                          external_hotel_id: (booking as any).external_hotel_id,
                                          external_reservation_id: (booking as any).external_reservation_id,
                                          reservation_url: booking.reservation_url
                                        }, referralConfig || undefined)
                                        
                                        if (platformLink) {
                                          return (
                                            <a
                                              href={platformLink.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded"
                                              title={platformLink.label}
                                            >
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Open on Booking.com
                                            </a>
                                          )
                                        }
                                        
                                        // Show a helpful message if platform is Booking.com but we can't build the link
                                        // Only show these messages to hosts/admins, not cleaners
                                        if (!isReadOnly && hasBookingPlatform) {
                                          const hasReservationId = !!(booking as any).external_reservation_id
                                          const hasHotelId = !!referralConfig?.hotel_id || !!(booking as any).external_hotel_id
                                          
                                          if (!hasReservationId && !hasHotelId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Reservation ID and Hotel ID to enable link
                                              </span>
                                            )
                                          } else if (!hasReservationId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Reservation ID to enable link
                                              </span>
                                            )
                                          } else if (!hasHotelId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Hotel ID in Referral Sites to enable link
                                              </span>
                                            )
                                          } else {
                                            return (
                                              <span className="text-xs text-orange-600">
                                                Link generation failed - check console
                                              </span>
                                            )
                                          }
                                        }
                                        return null
                                      })()}
                                    </div>
                                  )}
                                </div>

                                {!isReadOnly && cleanNotes(booking.notes) && (
                                  <div className="mt-2 p-2 bg-white rounded border border-green-200">
                                    <div className="flex items-start space-x-1">
                                      <FileText className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs text-gray-600">
                                        {cleanNotes(booking.notes)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="text-xs text-green-700 font-medium ml-2">
                                {booking.status?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Check-outs */}
                  <div>
                    <h4 className="font-medium text-red-800 mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Check-outs ({property.checkouts.length})
                    </h4>
                    
                    {property.checkouts.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No check-outs</p>
                    ) : (
                      <div className="space-y-3">
                        {property.checkouts.map((booking) => (
                          <div key={`checkout-${booking.id}`} className="border border-red-200 bg-red-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <User className="h-4 w-4 text-red-600" />
                                  <span className="font-medium text-gray-900">
                                    {booking.guest_name}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div>
                                    <strong>Check-out:</strong> {format(parseISO(booking.check_out), 'h:mm a')}
                                  </div>
                                  <div>
                                    <strong>Stay:</strong> {format(parseISO(booking.check_in), 'MMM dd')} - {format(parseISO(booking.check_out), 'MMM dd')}
                                  </div>
                                  {!isReadOnly && booking.contact_email && (
                                    <div>
                                      <strong>Email:</strong> {emailToLink(booking.contact_email)}
                                    </div>
                                  )}
                                  {!isReadOnly && booking.contact_phone && (
                                    <div>
                                      <strong>Phone:</strong> {booking.contact_phone}
                                    </div>
                                  )}
                                  {booking.booking_platform && (
                                    <div className="flex items-center gap-2">
                                      <span><strong>Platform:</strong> {formatPlatformName(booking.booking_platform)}</span>
                                      {(() => {
                                        const referralConfig = getReferralConfigForBooking(booking)
                                        const bookingPlatform = String(booking.booking_platform || '').toLowerCase()
                                        const hasBookingPlatform = bookingPlatform.includes('booking')
                                        
                                        const platformLink = getBookingPlatformLink({
                                          booking_platform: booking.booking_platform,
                                          external_hotel_id: (booking as any).external_hotel_id,
                                          external_reservation_id: (booking as any).external_reservation_id,
                                          reservation_url: booking.reservation_url
                                        }, referralConfig || undefined)
                                        
                                        if (platformLink) {
                                          return (
                                            <a
                                              href={platformLink.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded"
                                              title={platformLink.label}
                                            >
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Open on Booking.com
                                            </a>
                                          )
                                        }
                                        
                                        // Show a helpful message if platform is Booking.com but we can't build the link
                                        // Only show these messages to hosts/admins, not cleaners
                                        if (!isReadOnly && hasBookingPlatform) {
                                          const hasReservationId = !!(booking as any).external_reservation_id
                                          const hasHotelId = !!referralConfig?.hotel_id || !!(booking as any).external_hotel_id
                                          
                                          if (!hasReservationId && !hasHotelId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Reservation ID and Hotel ID to enable link
                                              </span>
                                            )
                                          } else if (!hasReservationId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Reservation ID to enable link
                                              </span>
                                            )
                                          } else if (!hasHotelId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Hotel ID in Referral Sites to enable link
                                              </span>
                                            )
                                          } else {
                                            return (
                                              <span className="text-xs text-orange-600">
                                                Link generation failed - check console
                                              </span>
                                            )
                                          }
                                        }
                                        return null
                                      })()}
                                    </div>
                                  )}
                                </div>

                                {cleanNotes(booking.notes) && (
                                  <div className="mt-2 p-2 bg-white rounded border border-red-200">
                                    <div className="flex items-start space-x-1">
                                      <FileText className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs text-gray-600">
                                        {cleanNotes(booking.notes)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="text-xs text-red-700 font-medium ml-2">
                                {booking.status?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* In-house (current stays) */}
                  <div>
                    <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      In-house ({property.stays.length})
                    </h4>
                    
                    {property.stays.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No current stays</p>
                    ) : (
                      <div className="space-y-3">
                        {property.stays.map((booking) => (
                          <div key={`stay-${booking.id}`} className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-gray-900">
                                    {booking.guest_name}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div>
                                    <strong>Stay:</strong> {format(parseISO(booking.check_in), 'MMM dd')} - {format(parseISO(booking.check_out), 'MMM dd')}
                                  </div>
                                  {!isReadOnly && booking.contact_email && (
                                    <div>
                                      <strong>Email:</strong> {emailToLink(booking.contact_email)}
                                    </div>
                                  )}
                                  {!isReadOnly && booking.contact_phone && (
                                    <div>
                                      <strong>Phone:</strong> {booking.contact_phone}
                                    </div>
                                  )}
                                  {booking.booking_platform && (
                                    <div className="flex items-center gap-2">
                                      <span><strong>Platform:</strong> {formatPlatformName(booking.booking_platform)}</span>
                                      {(() => {
                                        const referralConfig = getReferralConfigForBooking(booking)
                                        const bookingPlatform = String(booking.booking_platform || '').toLowerCase()
                                        const hasBookingPlatform = bookingPlatform.includes('booking')
                                        
                                        const platformLink = getBookingPlatformLink({
                                          booking_platform: booking.booking_platform,
                                          external_hotel_id: (booking as any).external_hotel_id,
                                          external_reservation_id: (booking as any).external_reservation_id,
                                          reservation_url: booking.reservation_url
                                        }, referralConfig || undefined)
                                        
                                        if (platformLink) {
                                          return (
                                            <a
                                              href={platformLink.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded"
                                              title={platformLink.label}
                                            >
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Open on Booking.com
                                            </a>
                                          )
                                        }
                                        
                                        // Show a helpful message if platform is Booking.com but we can't build the link
                                        // Only show these messages to hosts/admins, not cleaners
                                        if (!isReadOnly && hasBookingPlatform) {
                                          const hasReservationId = !!(booking as any).external_reservation_id
                                          const hasHotelId = !!referralConfig?.hotel_id || !!(booking as any).external_hotel_id
                                          
                                          if (!hasReservationId && !hasHotelId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Reservation ID and Hotel ID to enable link
                                              </span>
                                            )
                                          } else if (!hasReservationId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Reservation ID to enable link
                                              </span>
                                            )
                                          } else if (!hasHotelId) {
                                            return (
                                              <span className="text-xs text-gray-500">
                                                Add Hotel ID in Referral Sites to enable link
                                              </span>
                                            )
                                          } else {
                                            return (
                                              <span className="text-xs text-orange-600">
                                                Link generation failed - check console
                                              </span>
                                            )
                                          }
                                        }
                                        return null
                                      })()}
                                    </div>
                                  )}
                                </div>

                                {!isReadOnly && cleanNotes(booking.notes) && (
                                  <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                    <div className="flex items-start space-x-1">
                                      <FileText className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs text-gray-600">
                                        {cleanNotes(booking.notes)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>
                      Property Total: {property.checkins.length + property.checkouts.length} activities
                    </span>
                    <span>
                      {property.checkins.length} in, {property.checkouts.length} out
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print Footer - Only visible in print */}
      <div className="hidden print:block p-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Daily Schedule Report - Generated {format(new Date(), 'MM/dd/yyyy h:mm a')}</p>
        <p>Page 1 of 1</p>
      </div>
    </div>
  )
}