'use client'

import { useState, useEffect } from 'react'
import { guestCheckinService, PropertyInformation } from '@/lib/guest-checkin'
import { useAuth } from '@/components/providers'
import { authService } from '@/lib/auth'
import { 
  Info,
  Key,
  Wifi,
  Home,
  Shield,
  MapPin,
  Car,
  Phone,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  X
} from 'lucide-react'

interface PropertyInformationProps {
  propertyId: string
  propertyName: string
}

export function PropertyInformationManager({ propertyId, propertyName }: PropertyInformationProps) {
  const { role } = useAuth()
  const [data, setData] = useState<PropertyInformation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Only show to hosts
  if (!authService.canManageUsers(role)) {
    return null
  }

  useEffect(() => {
    loadPropertyInformation()
  }, [propertyId])

  const loadPropertyInformation = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await guestCheckinService.getPropertyInformation(propertyId)
      
      if (result.error) {
        setError(result.error)
        return
      }

      // Set default values if no information exists
      setData(result.data || {
        id: '',
        property_id: propertyId,
        checkin_instructions: 'Welcome! Your check-in instructions are below.',
        checkout_instructions: 'Thank you for staying with us! Please follow the checkout instructions.',
        entry_method: 'keypad',
        access_code: '',
        access_instructions: '',
        wifi_network: '',
        wifi_password: '',
        wifi_instructions: '',
        amenities: [],
        house_rules: ['No smoking indoors', 'Quiet hours: 10 PM - 8 AM', 'Maximum occupancy as booked'],
        quiet_hours: '10:00 PM - 8:00 AM',
        max_guests: 4,
        smoking_allowed: false,
        pets_allowed: false,
        parties_allowed: false,
        local_tips: '',
        nearby_restaurants: [],
        nearby_attractions: [],
        transportation_info: '',
        emergency_contacts: [],
        parking_instructions: '',
        trash_pickup_day: '',
        recycling_instructions: '',
        appliance_instructions: {},
        special_notes: '',
        created_at: '',
        updated_at: ''
      })
      
    } catch (err) {
      console.error('Error loading property information:', err)
      setError('Failed to load property information')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!data) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await guestCheckinService.updatePropertyInformation(propertyId, data)
      
      if (result.error) {
        setError(result.error)
        return
      }

      setData(result.data)
      setSuccess('Property information saved successfully')
      
    } catch (err) {
      console.error('Error saving property information:', err)
      setError('Failed to save property information')
    } finally {
      setSaving(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const updateField = (field: keyof PropertyInformation, value: any) => {
    if (!data) return
    setData(prev => ({ ...prev!, [field]: value }))
  }

  const addToArray = (field: keyof PropertyInformation, value: string) => {
    if (!data || !value.trim()) return
    const currentArray = (data[field] as string[]) || []
    updateField(field, [...currentArray, value.trim()])
  }

  const removeFromArray = (field: keyof PropertyInformation, index: number) => {
    if (!data) return
    const currentArray = (data[field] as string[]) || []
    updateField(field, currentArray.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading property information...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load property information</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-600" />
            Guest Check-in Information
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage information that guests will see on their check-in page
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Check-in Instructions */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Key className="h-4 w-4 mr-2 text-green-600" />
            Check-in Instructions
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <textarea
                value={data.checkin_instructions || ''}
                onChange={(e) => updateField('checkin_instructions', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Welcome message for guests arriving..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Method
                </label>
                <select
                  value={data.entry_method || ''}
                  onChange={(e) => updateField('entry_method', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="keypad">Keypad</option>
                  <option value="lockbox">Lockbox</option>
                  <option value="smart_lock">Smart Lock</option>
                  <option value="key">Physical Key</option>
                  <option value="concierge">Concierge</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={data.access_code || ''}
                  onChange={(e) => updateField('access_code', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1234#"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Instructions
              </label>
              <textarea
                value={data.access_instructions || ''}
                onChange={(e) => updateField('access_instructions', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Detailed instructions for property access..."
              />
            </div>
          </div>
        </div>

        {/* WiFi Information */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Wifi className="h-4 w-4 mr-2 text-blue-600" />
            WiFi Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network Name
              </label>
              <input
                type="text"
                value={data.wifi_network || ''}
                onChange={(e) => updateField('wifi_network', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="GuestWiFi"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="text"
                value={data.wifi_password || ''}
                onChange={(e) => updateField('wifi_password', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="password123"
              />
            </div>
          </div>
        </div>

        {/* House Rules */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Shield className="h-4 w-4 mr-2 text-purple-600" />
            House Rules & Policies
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                House Rules
              </label>
              <div className="space-y-2">
                {data.house_rules.map((rule, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => {
                        const newRules = [...data.house_rules]
                        newRules[index] = e.target.value
                        updateField('house_rules', newRules)
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <button
                      onClick={() => removeFromArray('house_rules', index)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addToArray('house_rules', 'New rule')}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiet Hours
                </label>
                <input
                  type="text"
                  value={data.quiet_hours || ''}
                  onChange={(e) => updateField('quiet_hours', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="10:00 PM - 8:00 AM"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Guests
                </label>
                <input
                  type="number"
                  value={data.max_guests || ''}
                  onChange={(e) => updateField('max_guests', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="4"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.smoking_allowed}
                  onChange={(e) => updateField('smoking_allowed', e.target.checked)}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Smoking Allowed</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.pets_allowed}
                  onChange={(e) => updateField('pets_allowed', e.target.checked)}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Pets Allowed</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.parties_allowed}
                  onChange={(e) => updateField('parties_allowed', e.target.checked)}
                  className="rounded border-gray-300 mr-2"
                />
                <span className="text-sm text-gray-700">Parties Allowed</span>
              </label>
            </div>
          </div>
        </div>

        {/* Local Information */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-orange-600" />
            Local Information
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local Tips & Recommendations
              </label>
              <textarea
                value={data.local_tips || ''}
                onChange={(e) => updateField('local_tips', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Share local recommendations, hidden gems, and helpful tips..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transportation Information
              </label>
              <textarea
                value={data.transportation_info || ''}
                onChange={(e) => updateField('transportation_info', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Public transport, taxi, rideshare, parking info..."
              />
            </div>
          </div>
        </div>

        {/* Practical Information */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Car className="h-4 w-4 mr-2 text-gray-600" />
            Practical Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parking Instructions
              </label>
              <textarea
                value={data.parking_instructions || ''}
                onChange={(e) => updateField('parking_instructions', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Where to park, permits needed, etc..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trash Pickup Day
              </label>
              <input
                type="text"
                value={data.trash_pickup_day || ''}
                onChange={(e) => updateField('trash_pickup_day', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Monday mornings"
              />
            </div>
          </div>
        </div>

        {/* Checkout Instructions */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Home className="h-4 w-4 mr-2 text-red-600" />
            Checkout Instructions
          </h4>
          <textarea
            value={data.checkout_instructions || ''}
            onChange={(e) => updateField('checkout_instructions', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Checkout time, what to do with keys, final checklist..."
          />
        </div>

        {/* Special Notes */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
            Special Notes
          </h4>
          <textarea
            value={data.special_notes || ''}
            onChange={(e) => updateField('special_notes', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Any special instructions, quirks, or important information guests should know..."
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 flex items-center"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Save className="h-5 w-5 mr-2" />
          )}
          Save All Changes
        </button>
      </div>
    </div>
  )
}