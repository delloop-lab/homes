'use client'

import { useAuth } from '@/components/providers'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { CleaningTaskList } from '@/components/cleanings/cleaning-task-list'
import { useCleaningStats } from '@/hooks/use-cleanings'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function CleaningStats() {
  const { stats, loading, error } = useCleaningStats()

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
            <p className="text-sm font-medium text-gray-600">Scheduled</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.scheduled}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-yellow-100">
            <div className="w-6 h-6 bg-yellow-600 rounded"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">In Progress</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.in_progress}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-green-100">
            <div className="w-6 h-6 bg-green-600 rounded"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-purple-100">
            <div className="w-6 h-6 bg-purple-600 rounded"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Cost</p>
            <p className="text-2xl font-semibold text-gray-900">${stats.totalCost.toFixed(0)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CleaningsPage() {
  const { userRole } = useAuth()
  const router = useRouter()

  // Redirect cleaners to the mobile-optimized schedule
  useEffect(() => {
    if (userRole === 'cleaner') {
      router.push('/cleaner-schedule')
    }
  }, [userRole, router])

  // Show loading while redirecting cleaners
  if (userRole === 'cleaner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Redirecting to your schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Cleaning Management</h2>
            <p className="text-gray-600 mt-2">Manage your property cleaning tasks and schedules</p>
          </div>

          {/* Cleaning Stats */}
          <CleaningStats />

          {/* Cleaning Task List */}
          <CleaningTaskList 
            showFilters={true}
            mobileOptimized={false}
          />
        </main>
      </div>
    </AuthenticatedRoute>
  )
}