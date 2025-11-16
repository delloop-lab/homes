'use client'

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { 
  Home,
  MapPin,
  Calendar,
  Clock,
  Wifi,
  Key,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  Car,
  Utensils,
  Camera,
  Shield,
  Info,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { format } from 'date-fns'

interface GuestCheckinPageProps {
  params: {
    token: string
  }
}

interface CheckinData {
  valid_until: string
  booking: {
    id: string
    guest_name: string
    contact_email: string
    contact_phone?: string
    check_in: string
    check_out: string
    nights: number
    platform: string
    notes?: string
    status: string
  }
  property: {
    id: string
    name: string
    address: string
    description?: string
    bedrooms: number
    bathrooms: number
    max_guests: number
  }
  checkin: {
    checkin_instructions: string
    checkout_instructions: string
    entry_method?: string
    access_code?: string
    access_instructions?: string
    wifi: {
      network?: string
      password?: string
      instructions?: string
    }
    amenities: any[]
    house_rules: string[]
    quiet_hours?: string
    max_guests: number
    policies: {
      smoking_allowed: boolean
      pets_allowed: boolean
      parties_allowed: boolean
    }
    local_info: {
      tips?: string
      restaurants: any[]
      attractions: any[]
      transportation?: string
    }
    emergency_contacts: any[]
    parking_instructions?: string
    trash_pickup_day?: string
    recycling_instructions?: string
    appliance_instructions: any
    special_notes?: string
  }
}

export default function GuestCheckinPage({ params }: GuestCheckinPageProps) {
  const [data, setData] = useState<CheckinData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCheckinData()
    
    // Log page view
    if (params.token) {
      logInteraction('page_view', 'checkin')
    }
  }, [params.token])

  const loadCheckinData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/guest-checkin/validate?token=${params.token}`)
      const result = await response.json()

      if (!response.ok) {
        if (result.expired) {
          setExpired(true)
          setError('Your check-in link has expired. Please contact your host for assistance.')
        } else {
          setError(result.error || 'Invalid check-in link')
        }
        return
      }

      if (!result.success) {
        setError(result.error || 'Failed to load check-in information')
        return
      }

      setData(result.data)

    } catch (err) {
      console.error('Error loading check-in data:', err)
      setError('Failed to load check-in information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const logInteraction = async (action: string, page: string) => {
    try {
      await fetch('/api/guest-checkin/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: params.token,
          action,
          page
        })
      })
    } catch (err) {
      console.error('Failed to log interaction:', err)
    }
  }

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => {
        const newSet = new Set(prev)
        newSet.add(item)
        return newSet
      })
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(item)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your check-in information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {expired ? 'Link Expired' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          {expired && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Please contact your host to get a new check-in link or for assistance with your stay.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!data) {
    return notFound()
  }

  const checkInDate = new Date(data.booking.check_in)
  const checkOutDate = new Date(data.booking.check_out)
  const validUntil = new Date(data.valid_until)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Home className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to {data.property.name}!
            </h1>
            <p className="text-lg text-gray-600">
              Hello {data.booking.guest_name}, we're excited to host you
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Booking Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Your Stay Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">{data.property.address}</div>
                  <div className="text-sm text-gray-500">
                    {data.property.bedrooms} bed • {data.property.bathrooms} bath • Up to {data.property.max_guests} guests
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-400 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">
                    {format(checkInDate, 'EEEE, MMMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-gray-500">
                    Check-in: {format(checkInDate, 'h:mm a')}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">
                    {data.booking.nights} night{data.booking.nights !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-gray-500">
                    Until {format(checkOutDate, 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                Checkout: {format(checkOutDate, 'h:mm a')}
              </div>
            </div>
          </div>

          {data.booking.notes && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Special Notes for Your Stay</h3>
              <p className="text-blue-800">{data.booking.notes}</p>
            </div>
          )}
        </div>

        {/* Check-in Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Key className="h-5 w-5 mr-2 text-green-600" />
            Check-in Instructions
          </h2>
          
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700">{data.checkin.checkin_instructions}</p>
          </div>

          {/* Access Information */}
          {(data.checkin.access_code || data.checkin.access_instructions) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-green-900 mb-3">Property Access</h3>
              
              {data.checkin.entry_method && (
                <div className="mb-3">
                  <span className="text-sm text-green-700 font-medium">Entry Method: </span>
                  <span className="text-green-800 capitalize">{data.checkin.entry_method.replace('_', ' ')}</span>
                </div>
              )}
              
              {data.checkin.access_code && (
                <div className="mb-3">
                  <span className="text-sm text-green-700 font-medium">Access Code: </span>
                  <div className="inline-flex items-center bg-white border border-green-300 rounded px-3 py-1">
                    <code className="text-lg font-mono font-bold text-green-900 mr-2">
                      {data.checkin.access_code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(data.checkin.access_code!, 'access_code')}
                      className="text-green-600 hover:text-green-700"
                      title="Copy access code"
                    >
                      {copiedItems.has('access_code') ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {data.checkin.access_instructions && (
                <p className="text-green-800">{data.checkin.access_instructions}</p>
              )}
            </div>
          )}
        </div>

        {/* WiFi Information */}
        {(data.checkin.wifi.network || data.checkin.wifi.password) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Wifi className="h-5 w-5 mr-2 text-blue-600" />
              WiFi Information
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {data.checkin.wifi.network && (
                <div className="mb-3">
                  <span className="text-sm text-blue-700 font-medium">Network Name: </span>
                  <div className="inline-flex items-center bg-white border border-blue-300 rounded px-3 py-1">
                    <code className="font-mono font-bold text-blue-900 mr-2">
                      {data.checkin.wifi.network}
                    </code>
                    <button
                      onClick={() => copyToClipboard(data.checkin.wifi.network!, 'wifi_network')}
                      className="text-blue-600 hover:text-blue-700"
                      title="Copy network name"
                    >
                      {copiedItems.has('wifi_network') ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {data.checkin.wifi.password && (
                <div className="mb-3">
                  <span className="text-sm text-blue-700 font-medium">Password: </span>
                  <div className="inline-flex items-center bg-white border border-blue-300 rounded px-3 py-1">
                    <code className="font-mono font-bold text-blue-900 mr-2">
                      {data.checkin.wifi.password}
                    </code>
                    <button
                      onClick={() => copyToClipboard(data.checkin.wifi.password!, 'wifi_password')}
                      className="text-blue-600 hover:text-blue-700"
                      title="Copy password"
                    >
                      {copiedItems.has('wifi_password') ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {data.checkin.wifi.instructions && (
                <p className="text-blue-800">{data.checkin.wifi.instructions}</p>
              )}
            </div>
          </div>
        )}

        {/* House Rules */}
        {data.checkin.house_rules.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              House Rules
            </h2>
            
            <div className="space-y-3">
              {data.checkin.house_rules.map((rule, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{rule}</span>
                </div>
              ))}
            </div>
            
            {data.checkin.quiet_hours && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-sm text-purple-700 font-medium">Quiet Hours: </span>
                <span className="text-purple-800">{data.checkin.quiet_hours}</span>
              </div>
            )}
            
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className={`p-3 rounded-lg border ${data.checkin.policies.smoking_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <span className={`font-medium ${data.checkin.policies.smoking_allowed ? 'text-green-700' : 'text-red-700'}`}>
                  Smoking: {data.checkin.policies.smoking_allowed ? 'Allowed' : 'Not Allowed'}
                </span>
              </div>
              <div className={`p-3 rounded-lg border ${data.checkin.policies.pets_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <span className={`font-medium ${data.checkin.policies.pets_allowed ? 'text-green-700' : 'text-red-700'}`}>
                  Pets: {data.checkin.policies.pets_allowed ? 'Allowed' : 'Not Allowed'}
                </span>
              </div>
              <div className={`p-3 rounded-lg border ${data.checkin.policies.parties_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <span className={`font-medium ${data.checkin.policies.parties_allowed ? 'text-green-700' : 'text-red-700'}`}>
                  Parties: {data.checkin.policies.parties_allowed ? 'Allowed' : 'Not Allowed'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Amenities */}
        {data.checkin.amenities.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="h-5 w-5 mr-2 text-indigo-600" />
              Property Amenities
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.checkin.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center p-2 bg-indigo-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-indigo-800 text-sm">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local Information */}
        {(data.checkin.local_info.tips || data.checkin.local_info.restaurants.length > 0 || data.checkin.local_info.attractions.length > 0) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-orange-600" />
              Local Area Guide
            </h2>
            
            {data.checkin.local_info.tips && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Local Tips</h3>
                <p className="text-gray-700">{data.checkin.local_info.tips}</p>
              </div>
            )}
            
            {data.checkin.local_info.restaurants.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Utensils className="h-4 w-4 mr-2" />
                  Recommended Restaurants
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.checkin.local_info.restaurants.map((restaurant: any, index: number) => (
                    <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="font-medium text-orange-900">{restaurant.name}</div>
                      {restaurant.description && (
                        <p className="text-sm text-orange-700 mt-1">{restaurant.description}</p>
                      )}
                      {restaurant.distance && (
                        <p className="text-xs text-orange-600 mt-1">{restaurant.distance}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {data.checkin.local_info.attractions.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Camera className="h-4 w-4 mr-2" />
                  Nearby Attractions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.checkin.local_info.attractions.map((attraction: any, index: number) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-900">{attraction.name}</div>
                      {attraction.description && (
                        <p className="text-sm text-green-700 mt-1">{attraction.description}</p>
                      )}
                      {attraction.distance && (
                        <p className="text-xs text-green-600 mt-1">{attraction.distance}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {data.checkin.local_info.transportation && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Transportation</h3>
                <p className="text-gray-700">{data.checkin.local_info.transportation}</p>
              </div>
            )}
          </div>
        )}

        {/* Practical Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2 text-gray-600" />
            Practical Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.checkin.parking_instructions && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Car className="h-4 w-4 mr-2" />
                  Parking
                </h3>
                <p className="text-gray-700">{data.checkin.parking_instructions}</p>
              </div>
            )}
            
            {data.checkin.trash_pickup_day && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Trash Pickup</h3>
                <p className="text-gray-700">{data.checkin.trash_pickup_day}</p>
              </div>
            )}
            
            {data.checkin.recycling_instructions && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Recycling</h3>
                <p className="text-gray-700">{data.checkin.recycling_instructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contacts */}
        {data.checkin.emergency_contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-red-600" />
              Emergency Contacts
            </h2>
            
            <div className="space-y-3">
              {data.checkin.emergency_contacts.map((contact: any, index: number) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="font-medium text-red-900">{contact.name}</div>
                  {contact.role && (
                    <div className="text-sm text-red-700">{contact.role}</div>
                  )}
                  {contact.phone && (
                    <div className="text-sm text-red-800">
                      <a href={`tel:${contact.phone}`} className="hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.email && (
                    <div className="text-sm text-red-800">
                      <a href={`mailto:${contact.email}`} className="hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checkout Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-orange-600" />
            Checkout Instructions
          </h2>
          
          <div className="prose max-w-none mb-4">
            <p className="text-gray-700">{data.checkin.checkout_instructions}</p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="font-medium text-orange-900 mb-2">
              Checkout: {format(checkOutDate, 'EEEE, MMMM dd, yyyy \'at\' h:mm a')}
            </div>
            <p className="text-orange-800 text-sm">
              Please ensure you leave on time to allow cleaning preparation for the next guest.
            </p>
          </div>
        </div>

        {/* Special Notes */}
        {data.checkin.special_notes && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
              Important Notes
            </h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">{data.checkin.special_notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Enjoy Your Stay!</h2>
          <p className="text-gray-600 mb-4">
            We hope you have a wonderful time at {data.property.name}. 
            If you have any questions or need assistance, please don't hesitate to contact us.
          </p>
          
          <div className="text-sm text-gray-500">
            <p>This page expires on {format(validUntil, 'MMMM dd, yyyy \'at\' h:mm a')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}