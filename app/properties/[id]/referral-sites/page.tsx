'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { referralSiteService, ReferralSiteConfig, CreateReferralSiteConfigData } from '@/lib/referral-sites'
import { propertiesService } from '@/lib/properties'
import { obfuscate } from '@/lib/encryption'
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2,
  ExternalLink,
  Building,
  Eye,
  EyeOff
} from 'lucide-react'

const COMMON_PLATFORMS = [
  'booking.com',
  'airbnb',
  'vrbo',
  'expedia',
  'tripadvisor',
  'direct',
  'other'
]

export default function ReferralSitesPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const propertyId = params.id
  
  const [property, setProperty] = useState<any>(null)
  const [configs, setConfigs] = useState<ReferralSiteConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Utility: derive currency symbol from ISO code
  const getCurrencySymbol = (code?: string | null): string => {
    const c = (code || '').toUpperCase().trim()
    const map: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      GHS: '₵',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
      AUD: '$',
      NZD: '$',
      CAD: '$',
      SGD: '$',
      ZAR: 'R',
      BRL: 'R$',
      MXN: '$',
      TRY: '₺',
      RUB: '₽',
      AED: 'د.إ',
      SAR: '﷼',
      KES: 'KSh',
      UGX: 'USh',
      TZS: 'TSh',
    }
    return map[c] || ''
  }

  const [formData, setFormData] = useState<CreateReferralSiteConfigData>({
    property_id: propertyId,
    platform: '',
    hotel_id: '',
    currency_code: '',
    currency_symbol: '',
    account_number: '',
    username: '',
    password: '',
    extranet_url: '',
    is_active: true,
    notes: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadData()
  }, [propertyId])

  // When platform changes in the add/edit form, refresh the form with the
  // existing configuration for that platform (if any) for this property.
  useEffect(() => {
    const refreshForPlatform = async () => {
      if (!showAddForm) return
      const platform = (formData.platform || '').trim()
      if (!platform) return
      try {
        const res = await referralSiteService.getConfig(propertyId, platform)
        const cfg = res.data as ReferralSiteConfig | null
        if (cfg) {
          setFormData({
            property_id: cfg.property_id,
            platform: cfg.platform,
            hotel_id: cfg.hotel_id || '',
            currency_code: cfg.currency_code || '',
            currency_symbol: cfg.currency_symbol || getCurrencySymbol(cfg.currency_code),
            account_number: cfg.account_number || '',
            username: cfg.username || '',
            password: '',
            extranet_url: cfg.extranet_url || '',
            is_active: cfg.is_active,
            notes: cfg.notes || ''
          })
          setEditingId(cfg.id || null)
        } else {
          // No existing config for this platform; reset platform-specific fields
          setEditingId(null)
          setFormData(prev => ({
            ...prev,
            hotel_id: '',
            currency_code: '',
            currency_symbol: '',
            account_number: '',
            username: '',
            password: '',
            extranet_url: '',
            is_active: true,
            notes: ''
          }))
        }
      } catch {
        // On error, keep current values but don't block user
      }
    }
    refreshForPlatform()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.platform, showAddForm, propertyId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [propertyRes, configsRes] = await Promise.all([
        propertiesService.getProperty(propertyId),
        referralSiteService.getConfigsByProperty(propertyId)
      ])

      if (propertyRes.error) throw new Error(propertyRes.error)
      if (configsRes.error) throw new Error(configsRes.error)

      setProperty(propertyRes.data)
      setConfigs(configsRes.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({
      property_id: propertyId,
      platform: '',
      hotel_id: '',
      currency_code: '',
      currency_symbol: '',
      account_number: '',
      username: '',
      password: '',
      extranet_url: '',
      is_active: true,
      notes: ''
    })
    setShowPassword(false)
    setShowAddForm(true)
    setEditingId(null)
  }

  const handleEdit = (config: ReferralSiteConfig) => {
    setFormData({
      property_id: config.property_id,
      platform: config.platform,
      hotel_id: config.hotel_id || '',
      currency_code: config.currency_code || '',
      currency_symbol: config.currency_symbol || '',
      account_number: config.account_number || '',
      username: config.username || '',
      password: '', // Don't populate password - user must re-enter if changing
      extranet_url: config.extranet_url || '',
      is_active: config.is_active,
      notes: config.notes || ''
    })
    setShowPassword(false)
    setEditingId(config.id)
    setShowAddForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Use API route for create/update to handle password encryption server-side
      const response = await fetch('/api/referral-sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId || undefined,
          ...formData
        }),
      })

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`)
      }
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Success - close form and reset state
      setShowAddForm(false)
      setEditingId(null)
      
      // Reset form data
      setFormData({
        property_id: propertyId,
        platform: '',
        hotel_id: '',
        currency_code: '',
        currency_symbol: '',
        account_number: '',
        username: '',
        password: '',
        extranet_url: '',
        is_active: true,
        notes: ''
      })
      setShowPassword(false)
      
      // Reload data to show the new/updated config
      await loadData()
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save')
      // Don't close form on error so user can fix and retry
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this referral site configuration?')) {
      return
    }

    setSaving(true)
    try {
      const result = await referralSiteService.deleteConfig(id)
      if (result.error) throw new Error(result.error)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AuthenticatedRoute>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </main>
        </div>
      </AuthenticatedRoute>
    )
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Building className="h-6 w-6 mr-2" />
              Referral Site Configuration
            </h1>
            <p className="text-gray-600 mt-1">
              {property?.name || 'Property'} - Configure referral site credentials and settings
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Referral Sites</h2>
              <button
                onClick={handleAdd}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Referral Site
              </button>
            </div>

            {showAddForm && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  {editingId ? 'Edit' : 'Add'} Referral Site Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform *
                    </label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select platform...</option>
                      {COMMON_PLATFORMS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency Code (ISO)
                    </label>
                    <input
                      type="text"
                      value={formData.currency_code || ''}
                      onChange={(e) => {
                        const code = e.target.value.toUpperCase()
                        const symbol = getCurrencySymbol(code)
                        setFormData({ 
                          ...formData, 
                          currency_code: code, 
                          currency_symbol: symbol || formData.currency_symbol 
                        })
                      }}
                      placeholder="e.g., USD, EUR, NGN"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      value={formData.currency_symbol || ''}
                      onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                      placeholder="e.g., $, €, ₦"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hotel/Property ID
                    </label>
                    <input
                      type="text"
                      value={formData.hotel_id}
                      onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
                      placeholder="e.g., 4127707 for Booking.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username/Email
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                      {editingId && (
                        <span className="text-xs text-gray-500 ml-2">
                          (leave blank to keep current)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingId ? 'Enter new password to change' : 'Enter password'}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Password is encrypted before storage
                    </p>
                  </div>


                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Extranet/Admin URL
                    </label>
                    <input
                      type="url"
                      value={formData.extranet_url}
                      onChange={(e) => setFormData({ ...formData, extranet_url: e.target.value })}
                      placeholder="https://admin.booking.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label className="ml-2 text-sm text-gray-700">Active</label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingId(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <X className="h-4 w-4 inline mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.platform}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="p-6">
              {configs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No referral site configurations yet.</p>
                  <p className="text-gray-400 text-sm mt-2">Click "Add Referral Site" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {configs.map((config) => (
                    <div
                      key={config.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 capitalize">
                              {config.platform}
                            </h3>
                            {config.is_active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                Inactive
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {config.hotel_id && (
                              <div>
                                <span className="text-gray-500">Hotel ID:</span>
                                <span className="ml-2 font-medium">{config.hotel_id}</span>
                              </div>
                            )}
                            {config.account_number && (
                              <div>
                                <span className="text-gray-500">Account:</span>
                                <span className="ml-2 font-medium">{config.account_number}</span>
                              </div>
                            )}
                            {config.username && (
                              <div>
                                <span className="text-gray-500">Username:</span>
                                <span className="ml-2 font-medium">{config.username}</span>
                              </div>
                            )}
                            {(config.currency_symbol || config.currency_code) && (
                              <div>
                                <span className="text-gray-500">Currency:</span>
                                <span className="ml-2 font-medium">
                                  {config.currency_symbol || ''} {config.currency_code || ''}
                                </span>
                              </div>
                            )}
                            {config.password_encrypted && (
                              <div>
                                <span className="text-gray-500">Password:</span>
                                <span className="ml-2 font-medium text-gray-700">
                                  {obfuscate(config.password_encrypted)}
                                </span>
                                <span className="ml-2 text-xs text-gray-400">(encrypted)</span>
                              </div>
                            )}
                            {config.extranet_url && (
                              <div className="md:col-span-2">
                                <span className="text-gray-500">URL:</span>
                                <a
                                  href={config.extranet_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600 hover:underline inline-flex items-center"
                                >
                                  {config.extranet_url.substring(0, 40)}...
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            )}
                          </div>

                          {config.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="text-gray-500">Notes:</span> {config.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthenticatedRoute>
  )
}

