'use client'

import { CleanerOnlyRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { CleaningTaskList } from '@/components/cleanings/cleaning-task-list'
import { useAuth } from '@/components/providers'
import { useCleaningStats } from '@/hooks/use-cleanings'
import { Calendar, CheckCircle, Clock, DollarSign } from 'lucide-react'

function CleanerStats() {
  const { profile } = useAuth()
  const { stats, loading, error } = useCleaningStats({ cleaner_id: profile?.id })

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return null // Silently fail for stats
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">Scheduled</p>
            <p className="text-xl font-bold text-gray-900">{stats.scheduled}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-yellow-100">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">In Progress</p>
            <p className="text-xl font-bold text-gray-900">{stats.in_progress}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">Completed</p>
            <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <DollarSign className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">Total Earned</p>
            <p className="text-xl font-bold text-gray-900">${stats.totalCost.toFixed(0)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CleanerSchedulePage() {
  const { profile } = useAuth()

  return (
    <CleanerOnlyRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              My Schedule
            </h1>
            <p className="text-gray-600 mt-1">
              Your assigned cleaning tasks
            </p>
          </div>

          {/* Stats */}
          <CleanerStats />

          {/* Cleaning Task List - Filtered by cleaner_id */}
          <CleaningTaskList 
            cleaner_id={profile?.id}
            showFilters={false}
            mobileOptimized={true}
            isCleanerView={true}
          />
        </main>
      </div>
    </CleanerOnlyRoute>
  )
}
