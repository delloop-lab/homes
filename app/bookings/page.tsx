'use client'

import { useState, useEffect } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { BookingList } from '@/components/bookings/booking-list'
import { useBookingStats } from '@/hooks/use-bookings'
import { propertiesService } from '@/lib/properties'

function BookingStats({ propertyId }: { propertyId?: string }) {
  const { stats, loading, error } = useBookingStats(propertyId)

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
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-semibold text-gray-900">${stats.totalRevenue.toFixed(0)}</p>
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

          {/* Booking Stats */}
          <BookingStats propertyId={selectedProperty === 'all' ? undefined : selectedProperty} />

          {/* Booking Management */}
          <BookingList propertyId={selectedProperty === 'all' ? undefined : selectedProperty} />
        </main>
      </div>
    </AuthenticatedRoute>
  )
}