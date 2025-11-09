'use client'

import { Calendar, DollarSign, Home, Users } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function DashboardStats() {
  // Mock data - replace with real data from your Supabase database
  const stats = [
    {
      title: 'Total Properties',
      value: 3,
      change: '+1 this month',
      icon: <Home className="h-6 w-6 text-white" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Bookings',
      value: 12,
      change: '+3 this week',
      icon: <Calendar className="h-6 w-6 text-white" />,
      color: 'bg-green-500'
    },
    {
      title: 'Monthly Revenue',
      value: '$8,420',
      change: '+12% from last month',
      icon: <DollarSign className="h-6 w-6 text-white" />,
      color: 'bg-yellow-500'
    },
    {
      title: 'Total Guests',
      value: 45,
      change: '+8 this month',
      icon: <Users className="h-6 w-6 text-white" />,
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
} 