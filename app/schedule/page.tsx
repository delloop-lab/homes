'use client'

import { useState } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { DailyScheduleSheet } from '@/components/schedule/daily-schedule-sheet'
import { useScheduleStats } from '@/hooks/use-schedule-stats'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  CalendarDays,
  FileText,
  Download
} from 'lucide-react'

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  
  // Get schedule statistics
  const { stats, loading: statsLoading } = useScheduleStats({ 
    date: selectedDate 
  })

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1))
    } else {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 7) : subDays(selectedDate, 7))
    }
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const getWeekDates = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  const renderDayView = () => (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </h2>
              <p className="text-sm text-gray-500">
                Daily Schedule
              </p>
            </div>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Today
            </button>
            
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Daily Schedule Sheet */}
      <DailyScheduleSheet 
        selectedDate={selectedDate}
        showActions={true}
      />
    </div>
  )

  const renderWeekView = () => {
    const weekDates = getWeekDates()
    
    return (
      <div className="space-y-6">
        {/* Week Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {format(weekDates[0], 'MMM dd')} - {format(weekDates[6], 'MMM dd, yyyy')}
                </h2>
                <p className="text-sm text-gray-500">
                  Weekly Schedule
                </p>
              </div>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              This Week
            </button>
          </div>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  {format(date, 'EEEE')}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(date, 'MMMM dd')}
                </p>
              </div>
              
              <div className="p-4">
                <DailyScheduleSheet 
                  selectedDate={date}
                  showActions={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <CalendarDays className="h-7 w-7 mr-3 text-blue-600" />
                  Daily Schedule
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage check-ins and check-outs for all properties
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <div className="bg-gray-100 rounded-lg p-1 flex">
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'day'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Calendar className="h-4 w-4 mr-2 inline" />
                    Day
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'week'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CalendarDays className="h-4 w-4 mr-2 inline" />
                    Week
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Home className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Today's Check-ins</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {statsLoading ? '--' : stats.today.checkins}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Home className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Today's Check-outs</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {statsLoading ? '--' : stats.today.checkouts}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">This Week</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {statsLoading ? '--' : stats.thisWeek.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active Properties</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {statsLoading ? '--' : stats.activeProperties}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Content */}
          {viewMode === 'day' ? renderDayView() : renderWeekView()}
        </main>
      </div>
    </AuthenticatedRoute>
  )
}