'use client'

import { useState, useEffect } from 'react'
import { useBookingMutations } from '@/hooks/use-bookings'
import { CreateBookingData, UpdateBookingData, BookingWithProperty } from '@/lib/bookings'
import { Calendar, User, Mail, Phone, DollarSign, Clock, FileText, X, Loader2, Upload, Building } from 'lucide-react'
import { storageService } from '@/lib/storage'
import { propertiesService } from '@/lib/properties'

interface BookingFormProps {
  booking?: BookingWithProperty | null
  propertyId?: string
  onSuccess?: (booking: BookingWithProperty) => void
  onCancel?: () => void
  isOpen?: boolean
}

interface Property {
  id: string
  name: string
  address: string
}

export function BookingForm({ 
  booking, 
  propertyId, 
  onSuccess, 
  onCancel, 
  isOpen = true 
}: BookingFormProps) {
  const { createBooking, updateBooking, loading } = useBookingMutations()
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Real properties for current user
  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    property_id: propertyId || '',
    guest_name: '',
    contact_email: '',
    contact_phone: '',
    check_in: '',
    check_out: '',
    booking_platform: 'manual',
    total_amount: '',
    status: 'confirmed' as const,
    notes: '',
    passport_image_url: ''
  })

  // Load properties from Supabase with timeout + graceful fallback
  // Skip loading if editing a booking (we already have the property_id)
  useEffect(() => {
    // If editing a booking, we don't need to load all properties
    if (booking && booking.property_id) {
      setPropertiesLoading(false)
      // Still try to load properties in background for dropdown, but don't block
      const loadBackground = async () => {
        try {
          const res = await Promise.race([
            propertiesService.listMyProperties(),
            new Promise<{ data: any[]; error: string | null }>((resolve) =>
              setTimeout(() => resolve({ data: [], error: null }), 5000)
            )
          ])
          if (res.data && res.data.length > 0) {
            const items = res.data.map(p => ({ id: p.id, name: p.name, address: p.address }))
            setProperties(items)
          }
        } catch (err) {
          // Silently fail in background
        }
      }
      loadBackground()
      return
    }
    
    // Only load properties if creating a new booking
    let cancelled = false
    const load = async () => {
      setPropertiesLoading(true)
      setPropertiesError(null)
      try {
        const res = await Promise.race([
          propertiesService.listMyProperties(),
          new Promise<{ data: any[]; error: string | null }>((resolve) =>
            setTimeout(() => resolve({ data: [], error: 'Timed out loading properties' }), 10000)
          )
        ])
        if (cancelled) return
        if (res.error) {
          setPropertiesError(res.error)
          setProperties([])
        } else {
          const items = (res.data || []).map(p => ({ id: p.id, name: p.name, address: p.address }))
          setProperties(items)
        }
      } catch (err) {
        if (!cancelled) {
          setPropertiesError('Failed to load properties. Please try again.')
          setProperties([])
        }
      } finally {
        if (!cancelled) setPropertiesLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking])

  // Populate form when editing
  useEffect(() => {
    if (booking) {
      // Clear any previous errors when form opens
      setError('')
      
      // When editing, set property_id immediately from booking data
      const bookingPropertyId = booking.property_id || propertyId || ''
      setFormData(prev => ({
        property_id: bookingPropertyId,
        guest_name: booking.guest_name || '',
        contact_email: booking.contact_email || '',
        contact_phone: booking.contact_phone || '',
        check_in: booking.check_in ? new Date(booking.check_in).toISOString().slice(0, 16) : '',
        check_out: booking.check_out ? new Date(booking.check_out).toISOString().slice(0, 16) : '',
        booking_platform: booking.booking_platform || 'manual',
        total_amount: booking.total_amount?.toString() || '',
        status: booking.status as any,
        notes: booking.notes || '',
        passport_image_url: booking.passport_image_url || ''
      }))
    }
  }, [booking, propertyId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = storageService.validateFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    try {
      setUploading(true)
      setError('')

      // Try uploading to Supabase Storage first
      let result = await storageService.uploadFile(file)

      // If Supabase Storage fails, fallback to base64
      if (!result.success) {
        console.warn('Supabase Storage upload failed, using base64 fallback:', result.error)
        result = await storageService.fileToBase64(file)
      }

      if (result.success && result.url) {
        setFormData(prev => ({ 
          ...prev, 
          passport_image_url: result.url! 
        }))
      } else {
        setError(result.error || 'Failed to upload image')
      }

    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    const currentUrl = formData.passport_image_url
    
    // Clear from form
    setFormData(prev => ({ ...prev, passport_image_url: '' }))
    
    // Try to delete from storage if it's not a base64 string
    if (currentUrl && !currentUrl.startsWith('data:')) {
      try {
        await storageService.deleteFile(currentUrl)
      } catch (error) {
        console.warn('Failed to delete file from storage:', error)
      }
    }
  }

  const calculateNights = () => {
    if (formData.check_in && formData.check_out) {
      const checkIn = new Date(formData.check_in)
      const checkOut = new Date(formData.check_out)
      const diffTime = checkOut.getTime() - checkIn.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    }
    return 0
  }

  const validateForm = () => {
    // Property validation
    if (!formData.property_id) {
      setError('Please select a property')
      return false
    }

    // Guest name validation
    if (!formData.guest_name.trim()) {
      setError('Guest name is required')
      return false
    }

    if (formData.guest_name.trim().length < 2) {
      setError('Guest name must be at least 2 characters')
      return false
    }
    
    // Date validation
    if (!formData.check_in) {
      setError('Check-in date is required')
      return false
    }
    
    if (!formData.check_out) {
      setError('Check-out date is required')
      return false
    }
    
    const checkInDate = new Date(formData.check_in)
    const checkOutDate = new Date(formData.check_out)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today && !booking) {
      setError('Check-in date cannot be in the past')
      return false
    }

    if (checkInDate >= checkOutDate) {
      setError('Check-out date must be after check-in date')
      return false
    }

    // Minimum stay validation (at least 1 night)
    const diffTime = checkOutDate.getTime() - checkInDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 1) {
      setError('Minimum stay is 1 night')
      return false
    }

    // Email validation
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Phone validation (optional but if provided, should be valid)
    if (formData.contact_phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.contact_phone.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number')
      return false
    }

    // Amount validation
    if (formData.total_amount && parseFloat(formData.total_amount) < 0) {
      setError('Total amount cannot be negative')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    try {
      // Normalize amount string to a number (strip currency symbols/commas)
      let normalizedAmount: number | undefined = undefined
      if (formData.total_amount && formData.total_amount.trim().length > 0) {
        const cleaned = formData.total_amount
          .trim()
          .replace(/[^0-9.,-]/g, '') // remove currency symbols and spaces
          .replace(/,/g, '') // drop thousand separators
        const parsed = parseFloat(cleaned)
        if (Number.isNaN(parsed)) {
          setError('Please enter a valid total amount (e.g., 1234.56)')
          return
        }
        normalizedAmount = parsed
      }

      let result

      if (booking) {
        // Update existing booking - only send fields that actually changed
        const updatePayload: any = {
          id: booking.id
        }
        
        // Always include simple fields (they're fast to update)
        if (formData.guest_name.trim() !== (booking.guest_name || '')) {
          updatePayload.guest_name = formData.guest_name.trim()
        }
        if ((formData.contact_email.trim() || undefined) !== (booking.contact_email || undefined)) {
          updatePayload.contact_email = formData.contact_email.trim() || undefined
        }
        if ((formData.contact_phone.trim() || undefined) !== (booking.contact_phone || undefined)) {
          updatePayload.contact_phone = formData.contact_phone.trim() || undefined
        }
        if ((formData.notes.trim() || undefined) !== (booking.notes || undefined)) {
          updatePayload.notes = formData.notes.trim() || undefined
        }
        if (normalizedAmount !== (booking.total_amount || undefined)) {
          updatePayload.total_amount = normalizedAmount
        }
        if ((formData.passport_image_url || undefined) !== (booking.passport_image_url || undefined)) {
          updatePayload.passport_image_url = formData.passport_image_url || undefined
        }
        
        // Only include dates/status/platform if they actually changed
        // Compare dates by normalizing to same format
        if (formData.check_in && booking.check_in) {
          // Normalize both to YYYY-MM-DD format for comparison
          const bookingDate = new Date(booking.check_in).toISOString().split('T')[0]
          const formDate = new Date(formData.check_in).toISOString().split('T')[0]
          
          if (bookingDate !== formDate) {
            updatePayload.check_in = new Date(formData.check_in)
            console.log('Check-in changed:', bookingDate, '->', formDate)
          } else {
            console.log('Check-in unchanged:', bookingDate)
          }
        }
        
        if (formData.check_out && booking.check_out) {
          const bookingDate = new Date(booking.check_out).toISOString().split('T')[0]
          const formDate = new Date(formData.check_out).toISOString().split('T')[0]
          
          if (bookingDate !== formDate) {
            updatePayload.check_out = new Date(formData.check_out)
            console.log('Check-out changed:', bookingDate, '->', formDate)
          } else {
            console.log('Check-out unchanged:', bookingDate)
          }
        }
        
        // Only include status if it actually changed (comparing strings)
        const bookingStatus = booking.status || 'confirmed'
        const formStatus = formData.status || 'confirmed'
        if (formStatus !== bookingStatus) {
          updatePayload.status = formStatus as any
          console.log('Status changed:', bookingStatus, '->', formStatus)
        } else {
          console.log('Status unchanged:', bookingStatus)
        }
        
        // Only include platform if it changed
        if (formData.booking_platform && formData.booking_platform !== booking.booking_platform) {
          updatePayload.booking_platform = formData.booking_platform
          console.log('Platform changed:', booking.booking_platform, '->', formData.booking_platform)
        } else {
          console.log('Platform unchanged:', booking.booking_platform)
        }
        
        console.log('Update payload:', Object.keys(updatePayload))
        result = await updateBooking(updatePayload)
      } else {
        // Create new booking
        if (!formData.property_id) {
          setError('Please select a property')
          return
        }
        
        result = await createBooking({
          property_id: formData.property_id,
          ...baseData
        })
      }

      if (result.success && result.booking) {
        onSuccess?.(result.booking)
      } else {
        setError(result.error || 'An error occurred. Please try again.')
      }
    } catch (err) {
      console.error('Form submission error:', err)
      setError(`Failed to save booking: ${String(err)}`)
    }
  }

  if (!isOpen) return null

  const nights = calculateNights()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {booking ? 'Edit Booking' : 'New Booking'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Property Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Property Selection
            </h3>

            <div>
              <label htmlFor="property_id" className="block text-sm font-medium text-gray-700 mb-2">
                Property *
              </label>
              <select
                id="property_id"
                name="property_id"
                value={formData.property_id}
                onChange={handleChange}
                required
                disabled={loading || !!booking || (!!propertyId && formData.property_id === propertyId)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {propertiesLoading && !formData.property_id ? (
                  <option value="">Loading properties...</option>
                ) : propertiesError && !formData.property_id ? (
                  <option value="">No properties available</option>
                ) : formData.property_id && !properties.find(p => p.id === formData.property_id) ? (
                  // Show current property even if not in loaded list (when editing)
                  <option value={formData.property_id}>
                    {booking?.property_name || 'Current Property'}
                  </option>
                ) : (
                  <>
                    <option value="">Select a property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name} - {property.address}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {propertiesError && !booking && (
                <p className="mt-2 text-sm text-red-600">{propertiesError}</p>
              )}
              {booking && propertiesError && (
                <p className="mt-2 text-sm text-gray-500">Note: Property list unavailable, but you can still edit this booking.</p>
              )}
            </div>
          </div>

          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Guest Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="guest_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Name *
                </label>
                <input
                  id="guest_name"
                  name="guest_name"
                  type="text"
                  value={formData.guest_name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Enter guest full name"
                />
              </div>

              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="guest@example.com"
                />
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Passport Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Documentation
            </h3>

            <div>
              <label htmlFor="passport_image" className="block text-sm font-medium text-gray-700 mb-2">
                Passport/ID Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  {formData.passport_image_url ? (
                    <div className="space-y-2">
                      <img
                        src={formData.passport_image_url}
                        alt="Passport preview"
                        className="mx-auto h-32 w-auto object-cover rounded"
                      />
                      <div className="flex space-x-2 justify-center">
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-red-600 hover:text-red-500 text-sm"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="passport_image"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload passport/ID image</span>
                          <input
                            id="passport_image"
                            name="passport_image"
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={loading || uploading}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </>
                  )}
                  {uploading && (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
                      <span className="ml-2 text-sm text-gray-600">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Booking Dates
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="check_in" className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Date & Time *
                </label>
                <input
                  id="check_in"
                  name="check_in"
                  type="datetime-local"
                  value={formData.check_in}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="check_out" className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Date & Time *
                </label>
                <input
                  id="check_out"
                  name="check_out"
                  type="datetime-local"
                  value={formData.check_out}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Nights
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Booking Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="booking_platform" className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  id="booking_platform"
                  name="booking_platform"
                  value={formData.booking_platform}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="manual">Manual</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="vrbo">VRBO</option>
                  <option value="booking">Booking.com</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>

              <div>
                <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Total Amount
                </label>
                <input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_amount}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Additional notes about this booking..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {booking ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                booking ? 'Update Booking' : 'Create Booking'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}