'use client'

import { format } from 'date-fns'
import { Eye, MoreHorizontal } from 'lucide-react'

interface Booking {
  id: string
  guestName: string
  propertyName: string
  checkIn: Date
  checkOut: Date
  totalAmount: number
  status: 'confirmed' | 'pending' | 'cancelled'
}

export function RecentBookings() {
  // No demo data - will show empty state or load from real data
  const recentBookings: Booking[] = []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {recentBookings.map((booking) => (
          <div key={booking.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {booking.guestName}
                  </h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mt-1">
                  {booking.propertyName}
                </p>
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>
                    {format(booking.checkIn, 'MMM dd')} - {format(booking.checkOut, 'MMM dd, yyyy')}
                  </span>
                  <span className="font-medium text-gray-900">
                    ${booking.totalAmount}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="px-6 py-4 border-t border-gray-200">
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all bookings →
        </button>
      </div>
    </div>
  )
} 