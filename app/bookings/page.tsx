'use client'

import { useState, useEffect } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { BookingList } from '@/components/bookings/booking-list'
import { useBookingStats } from '@/hooks/use-bookings'
import { propertiesService } from '@/lib/properties'
import { useAuth } from '@/components/providers'

// Currency symbol mapping
const getCurrencySymbol = (currencyCode?: string): string => {
  const currencyMap: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'AUD': 'A$',
    'CAD': 'C$',
    'JPY': '¥',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': '$',
    'ZAR': 'R',
    'NZD': 'NZ$',
    'SGD': 'S$',
    'HKD': 'HK$',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'TRY': '₺',
    'RUB': '₽'
  }
  return currencyMap[currencyCode || 'USD'] || currencyCode || '$'
}

function BookingBreakdown({ 
  breakdown, 
  currencySymbol, 
  hostCurrency 
}: { 
  breakdown: Array<{
    guest_name?: string
    check_in?: string
    total_amount: number
    commission: number
    payout: number
    currency: string
  }>
  currencySymbol: string
  hostCurrency: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Calculate total payout
  const totalPayout = breakdown.reduce((sum, booking) => sum + booking.payout, 0)

  return (
    <div className="mt-4 pt-3 border-t border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        {isExpanded ? '▼' : '▶'} Show Detailed Breakdown ({breakdown.length} bookings)
      </button>
      
      {isExpanded && (
        <div className="mt-3 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-3">
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-gray-700 border-b pb-2 mb-2">
              <div>#</div>
              <div>Guest</div>
              <div>Check-in</div>
              <div className="text-right">Total</div>
              <div className="text-right">Commission</div>
              <div className="text-right">Payout</div>
              <div className="text-right">Running Total</div>
            </div>
            {breakdown.map((booking, index) => {
              const bookingCurrencySymbol = getCurrencySymbol(booking.currency)
              // Calculate running total up to this booking
              const runningTotal = breakdown.slice(0, index + 1).reduce((sum, b) => sum + b.payout, 0)
              return (
                <div key={index} className="grid grid-cols-7 gap-2 text-xs border-b pb-1">
                  <div className="text-gray-500">{index + 1}</div>
                  <div className="text-gray-700 truncate">{booking.guest_name || 'N/A'}</div>
                  <div className="text-gray-600">
                    {booking.check_in ? new Date(booking.check_in).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-right text-gray-700">
                    {bookingCurrencySymbol}{booking.total_amount.toFixed(2)}
                  </div>
                  <div className="text-right text-red-600">
                    -{bookingCurrencySymbol}{booking.commission.toFixed(2)}
                  </div>
                  <div className="text-right font-semibold text-green-700">
                    {bookingCurrencySymbol}{booking.payout.toFixed(2)}
                  </div>
                  <div className="text-right text-gray-500 text-xs">
                    (Running: {currencySymbol}{runningTotal.toFixed(2)})
                  </div>
                </div>
              )
            })}
            <div className="grid grid-cols-7 gap-2 text-xs font-bold text-gray-900 border-t pt-2 mt-2">
              <div className="col-span-6 text-right">TOTAL:</div>
              <div className="text-right text-green-700">
                {currencySymbol}{totalPayout.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingStats({ propertyId }: { propertyId?: string }) {
  const { profile } = useAuth()
  const hostCurrency = profile?.currency || 'USD'
  const currencySymbol = getCurrencySymbol(hostCurrency)
  const { stats, loading, error } = useBookingStats(propertyId, hostCurrency)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <p className="text-red-700 text-sm">Error loading stats: {error}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-blue-100">
            <div className="w-6 h-6 bg-blue-600 rounded"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Bookings</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-green-100">
            <div className="w-6 h-6 bg-green-600 rounded"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Confirmed</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.confirmed}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-yellow-100">
            <div className="w-6 h-6 bg-yellow-600 rounded"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-purple-100">
            <div className="w-6 h-6 bg-purple-600 rounded"></div>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">Total Revenue ({hostCurrency})</p>
            <p className="text-2xl font-semibold text-gray-900">
              {currencySymbol}{stats.totalRevenueConverted.toFixed(2)}
            </p>
            
            {/* Revenue breakdown by currency */}
            {Object.keys(stats.revenueByCurrency || {}).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">Revenue by Currency (converted to {hostCurrency}):</p>
                <div className="space-y-1">
                  {Object.entries(stats.revenueByCurrency)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([currency, amount]) => {
                      const symbol = getCurrencySymbol(hostCurrency)
                      return (
                        <div key={currency} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{currency} (original):</span>
                          <span className="font-semibold text-gray-900">
                            {symbol}{amount.toFixed(2)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Detailed booking breakdown */}
            {stats.bookingBreakdown && stats.bookingBreakdown.length > 0 && (
              <BookingBreakdown 
                breakdown={stats.bookingBreakdown} 
                currencySymbol={currencySymbol}
                hostCurrency={hostCurrency}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Property {
  id: string
  name: string
  address: string
}

export default function BookingsPage() {
  const { role } = useAuth()
  const isCleanerView = role === 'cleaner'
  
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [properties, setProperties] = useState<Property[]>([])
  const [propLoading, setPropLoading] = useState(true)
  const [propError, setPropError] = useState<string | null>(null)

  // Load properties for filter dropdown
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
      }
      setPropLoading(false)
    }
    loadProps()
  }, [])

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Property Filter */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Filter by Property:
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                disabled={propLoading}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {propLoading ? (
                  <option>Loading properties...</option>
                ) : propError ? (
                  <option>Error loading properties</option>
                ) : (
                  properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Booking Stats - Hide revenue for cleaners */}
          {!isCleanerView && (
            <BookingStats propertyId={selectedProperty === 'all' ? undefined : selectedProperty} />
          )}

          {/* Booking Management */}
          <BookingList 
            propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
            isReadOnly={isCleanerView}
          />
        </main>
      </div>
    </AuthenticatedRoute>
  )
}