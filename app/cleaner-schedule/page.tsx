'use client'

import { useState, useEffect } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { useAuth } from '@/components/providers'
import { CleaningTaskList } from '@/components/cleanings/cleaning-task-list'
import { useTodaysCleanings, useUpcomingCleanings, useCleaningStats } from '@/hooks/use-cleanings'
import { 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  Home
} from 'lucide-react'

export default function CleanerSchedulePage() {
  const { user, userRole } = useAuth()
  const [view, setView] = useState<'today' | 'upcoming' | 'all'>('today')

  // Get cleaner-specific data
  const cleaner_id = userRole === 'cleaner' ? user?.id : undefined

  const { cleanings: todaysCleanings, loading: todaysLoading } = useTodaysCleanings(cleaner_id)
  const { cleanings: upcomingCleanings, loading: upcomingLoading } = useUpcomingCleanings(cleaner_id)
  const { stats, loading: statsLoading } = useCleaningStats({ cleaner_id })

  // Quick stats for today
  const todaysStats = {
    total: todaysCleanings.length,
    completed: todaysCleanings.filter(c => c.status === 'completed').length,
    inProgress: todaysCleanings.filter(c => c.status === 'in_progress').length,
    pending: todaysCleanings.filter(c => c.status === 'scheduled').length
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile-First Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Schedule</h1>
                <p className="text-sm text-gray-600">
                  {userRole === 'cleaner' ? 'Your cleaning tasks' : 'All cleaning tasks'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{todaysStats.total}</div>
                <div className="text-xs text-blue-600 font-medium">Today's Tasks</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">{todaysStats.completed}</div>
                <div className="text-xs text-green-600 font-medium">Completed</div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-yellow-600">{todaysStats.inProgress}</div>
                <div className="text-xs text-yellow-600 font-medium">In Progress</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-600">{todaysStats.pending}</div>
                <div className="text-xs text-gray-600 font-medium">Pending</div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('today')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  view === 'today' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setView('upcoming')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  view === 'upcoming' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setView('all')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  view === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Tasks
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="pb-4">
          {view === 'today' && (
            <TodaysTasksView 
              cleanings={todaysCleanings} 
              loading={todaysLoading}
              cleaner_id={cleaner_id}
            />
          )}
          
          {view === 'upcoming' && (
            <UpcomingTasksView 
              cleanings={upcomingCleanings} 
              loading={upcomingLoading}
              cleaner_id={cleaner_id}
            />
          )}
          
          {view === 'all' && (
            <CleaningTaskList 
              cleaner_id={cleaner_id}
              showFilters={true}
              mobileOptimized={true}
            />
          )}
        </div>

        {/* Weekly Summary (if host) */}
        {userRole === 'host' && (
          <div className="px-4 py-6 bg-white border-t">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">${stats.totalCost.toFixed(0)}</div>
                <div className="text-sm text-gray-600">Total Cost</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedRoute>
  )
}

// Today's Tasks Component
function TodaysTasksView({ 
  cleanings, 
  loading, 
  cleaner_id 
}: { 
  cleanings: any[], 
  loading: boolean, 
  cleaner_id?: string 
}) {
  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading today's tasks...</p>
      </div>
    )
  }

  if (cleanings.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
        <p className="text-gray-500">No cleaning tasks scheduled for today.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Today's Tasks</h3>
        <p className="text-sm text-gray-600">{cleanings.length} tasks to complete</p>
      </div>
      <CleaningTaskList 
        cleaner_id={cleaner_id}
        showFilters={false}
        mobileOptimized={true}
      />
    </div>
  )
}

// Upcoming Tasks Component
function UpcomingTasksView({ 
  cleanings, 
  loading, 
  cleaner_id 
}: { 
  cleanings: any[], 
  loading: boolean, 
  cleaner_id?: string 
}) {
  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading upcoming tasks...</p>
      </div>
    )
  }

  if (cleanings.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming tasks</h3>
        <p className="text-gray-500">Your schedule is clear for the next 7 days.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Next 7 Days</h3>
        <p className="text-sm text-gray-600">{cleanings.length} upcoming tasks</p>
      </div>
      <CleaningTaskList 
        cleaner_id={cleaner_id}
        showFilters={false}
        mobileOptimized={true}
      />
    </div>
  )
}