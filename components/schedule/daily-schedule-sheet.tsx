'use client'

import { useState, useMemo } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { BookingWithProperty } from '@/lib/bookings'
import { format, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns'
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
  Filter
} from 'lucide-react'
import { pdfService } from '@/lib/pdf-generator'

interface DailyScheduleSheetProps {
  selectedDate?: Date
  propertyId?: string
  showActions?: boolean
}

interface GroupedSchedule {
  property_id: string
  property_name: string
  property_address?: string
  checkins: BookingWithProperty[]
  checkouts: BookingWithProperty[]
}

export function DailyScheduleSheet({ 
  selectedDate = new Date(), 
  propertyId,
  showActions = true 
}: DailyScheduleSheetProps) {
  const [date, setDate] = useState(selectedDate)
  const [selectedProperty, setSelectedProperty] = useState(propertyId || '')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showOnlyActive, setShowOnlyActive] = useState(true)

  const { bookings, loading, error, refetch } = useBookings({
    from: startOfDay(date).toISOString(),
    to: endOfDay(date).toISOString()
  })

  // Group bookings by property and categorize by check-in/check-out
  const groupedSchedule = useMemo(() => {
    if (!bookings) return []

    const filteredBookings = bookings.filter(booking => {
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)
      
      // Filter by property if selected
      if (selectedProperty && booking.property_id !== selectedProperty) {
        return false
      }

      // Filter by active status if enabled
      if (showOnlyActive && booking.status === 'cancelled') {
        return false
      }

      // Include if check-in or check-out is on selected date
      return isSameDay(checkInDate, date) || isSameDay(checkOutDate, date)
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
          checkouts: []
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
    })

    // Sort properties and bookings
    return Array.from(propertyGroups.values())
      .sort((a, b) => a.property_name.localeCompare(b.property_name))
      .map(group => ({
        ...group,
        checkins: group.checkins.sort((a, b) => a.check_in.localeCompare(b.check_in)),
        checkouts: group.checkouts.sort((a, b) => a.check_out.localeCompare(b.check_out))
      }))
  }, [bookings, date, selectedProperty, showOnlyActive])

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
    return { checkins, checkouts, total: checkins + checkouts }
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

          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Active bookings only</span>
          </label>

          <div className="text-sm text-gray-600">
            {counts.total > 0 ? (
              <>
                {counts.checkins} check-ins, {counts.checkouts} check-outs
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
            <p className="text-gray-500 text-lg">No check-ins or check-outs scheduled</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                  {booking.contact_email && (
                                    <div>
                                      <strong>Email:</strong> {booking.contact_email}
                                    </div>
                                  )}
                                  {booking.contact_phone && (
                                    <div>
                                      <strong>Phone:</strong> {booking.contact_phone}
                                    </div>
                                  )}
                                  {booking.booking_platform && (
                                    <div>
                                      <strong>Platform:</strong> {booking.booking_platform}
                                    </div>
                                  )}
                                </div>

                                {booking.notes && (
                                  <div className="mt-2 p-2 bg-white rounded border border-green-200">
                                    <div className="flex items-start space-x-1">
                                      <FileText className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs text-gray-600">
                                        {booking.notes}
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
                                  {booking.contact_email && (
                                    <div>
                                      <strong>Email:</strong> {booking.contact_email}
                                    </div>
                                  )}
                                  {booking.contact_phone && (
                                    <div>
                                      <strong>Phone:</strong> {booking.contact_phone}
                                    </div>
                                  )}
                                  {booking.booking_platform && (
                                    <div>
                                      <strong>Platform:</strong> {booking.booking_platform}
                                    </div>
                                  )}
                                </div>

                                {booking.notes && (
                                  <div className="mt-2 p-2 bg-white rounded border border-red-200">
                                    <div className="flex items-start space-x-1">
                                      <FileText className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-xs text-gray-600">
                                        {booking.notes}
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