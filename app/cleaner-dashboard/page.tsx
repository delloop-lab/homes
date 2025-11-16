'use client'

import { CleanerOnlyRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { useAuth } from '@/components/providers'
import { useCleanings } from '@/hooks/use-cleanings'
import { Calendar, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { format, isToday } from 'date-fns'

export default function CleanerDashboardPage() {
  const { profile } = useAuth()
  
  // Fetch cleanings assigned to this cleaner
  const { cleanings, loading } = useCleanings({
    cleaner_id: profile?.id,
    limit: 50,
    autoRefresh: true
  })

  // Calculate stats
  const todaysCleanings = cleanings.filter(c => 
    isToday(new Date(c.cleaning_date)) && c.status !== 'cancelled'
  )
  
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const completedThisWeek = cleanings.filter(c => 
    c.status === 'completed' && new Date(c.cleaning_date) >= weekStart
  )
  
  const upcoming = cleanings.filter(c => 
    c.status === 'scheduled' && new Date(c.cleaning_date) > new Date()
  )

  return (
    <CleanerOnlyRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile?.first_name || profile?.full_name || 'Cleaner'}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here's your cleaning schedule and tasks for today.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Today's Cleanings</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : todaysCleanings.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Completed This Week</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : completedThisWeek.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Upcoming</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : upcoming.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Today's Schedule</h2>
                <a 
                  href="/cleaner-schedule" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Full Schedule →
                </a>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading your schedule...</p>
                </div>
              ) : todaysCleanings.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No cleanings scheduled for today
                  </h3>
                  <p className="text-gray-600">
                    {upcoming.length > 0 
                      ? `You have ${upcoming.length} upcoming assignment${upcoming.length > 1 ? 's' : ''}.`
                      : 'Check your full schedule to see upcoming assignments.'
                    }
                  </p>
                  <a 
                    href="/cleaner-schedule" 
                    className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Schedule
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaysCleanings.map((cleaning) => (
                    <div 
                      key={cleaning.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {cleaning.property_name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {cleaning.property_address}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {format(new Date(cleaning.cleaning_date), 'h:mm a')}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                          {cleaning.status}
                        </span>
                      </div>
                      {cleaning.notes && (
                        <p className="text-sm text-gray-600 mt-2 border-t pt-2">
                          {cleaning.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </CleanerOnlyRoute>
  )
}
