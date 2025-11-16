'use client'

import { useEffect, useMemo, useState } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { DailyScheduleSheet } from '@/components/schedule/daily-schedule-sheet'
import { useScheduleStats } from '@/hooks/use-schedule-stats'
import { useBookings } from '@/hooks/use-bookings'
import { propertiesService } from '@/lib/properties'
import { useAuth } from '@/components/providers'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
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
  const { role, profile } = useAuth()
  const isCleanerView = role === 'cleaner'
  const cleanerId = isCleanerView ? profile?.id : undefined
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [propertyId, setPropertyId] = useState<string>('')
  const [platform, setPlatform] = useState<string>('') // booking_platform filter
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([])
  const [loadingProperties, setLoadingProperties] = useState<boolean>(false)
  
  // Get schedule statistics
  const { stats, loading: statsLoading } = useScheduleStats({ 
    date: selectedDate 
  })

  // Load properties for filter
  useEffect(() => {
    const load = async () => {
      setLoadingProperties(true)
      try {
        const res = await propertiesService.listMyProperties()
        if (!res.error && res.data) {
          setProperties(res.data.map(p => ({ id: p.id, name: p.name })))
        }
      } finally {
        setLoadingProperties(false)
      }
    }
    load()
  }, [])

  // Month range bookings (for indicators)
  const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate])
  const monthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate])
  const { bookings: monthBookings } = useBookings({
    property_id: propertyId || undefined,
    date_from: monthStart,
    date_to: monthEnd,
    limit: 500
  })
  const filteredMonthBookings = useMemo(() => {
    if (!platform) return monthBookings
    return monthBookings.filter(b => (b.booking_platform || '').toLowerCase() === platform.toLowerCase())
  }, [monthBookings, platform])

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1))
    } else if (viewMode === 'week') {
      setSelectedDate(direction === 'next' ? addDays(selectedDate, 7) : subDays(selectedDate, 7))
    } else {
      // month
      const delta = direction === 'next' ? 30 : -30
      setSelectedDate(addDays(selectedDate, delta))
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
                <p className="text-sm text-gray-500">Schedule</p>
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
        propertyId={propertyId || undefined}
        showActions={true}
        isReadOnly={isCleanerView}
        cleanerId={cleanerId}
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
                <p className="text-sm text-gray-500">Schedule</p>
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
                  propertyId={propertyId || undefined}
                  showActions={false}
                  isReadOnly={isCleanerView}
                  cleanerId={cleanerId}
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
                  Schedule
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage check-ins and check-outs for all properties
                </p>
              </div>

              {/* Filters + View Mode */}
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Property</label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    disabled={loadingProperties}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Referral Site</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="booking.com">Booking.com</option>
                    <option value="vrbo">VRBO</option>
                    <option value="manual">Manual</option>
                    <option value="direct">Direct</option>
                  </select>
                </div>
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
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'month'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Calendar className="h-4 w-4 mr-2 inline" />
                    Month
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
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && (
            <div className="space-y-6">
              {/* Month Navigation */}
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
                        {format(selectedDate, 'MMMM yyyy')}
                      </h2>
                      <p className="text-sm text-gray-500">Schedule</p>
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
                    This Month
                  </button>
                </div>
              </div>

              {/* Month Grid with booking indicators */}
              {(() => {
                const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 })
                const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
                const days = eachDayOfInterval({ start, end })
                const weekChunks: Date[][] = []
                for (let i = 0; i < days.length; i += 7) {
                  weekChunks.push(days.slice(i, i + 7))
                }
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-2 text-xs text-gray-500">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                        <div key={d} className="px-2">{d}</div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {weekChunks.map((week, idx) => (
                        <div key={idx} className="grid grid-cols-7 gap-2">
                          {week.map(d => {
                            const isOutside = d.getMonth() !== selectedDate.getMonth()
                            // Count bookings overlapping this day
                            const count = filteredMonthBookings.reduce((acc, b) => {
                              const ci = parseISO(b.check_in)
                              const co = parseISO(b.check_out)
                              if (isWithinInterval(d, { start: ci, end: co })) {
                                return acc + 1
                              }
                              return acc
                            }, 0)
                            return (
                              <div
                                key={d.toISOString()}
                                className={`bg-white rounded-lg border ${isOutside ? 'border-gray-100 bg-gray-50' : 'border-gray-200'} p-2 cursor-pointer hover:border-blue-300 outline-none focus:ring-2 focus:ring-blue-300`}
                                onClick={() => { setSelectedDate(d); setViewMode('day') }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setSelectedDate(d)
                                    setViewMode('day')
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                                title={count > 0 ? `${count} booking(s)` : 'No bookings'}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-medium text-gray-700">
                                    {format(d, 'd')}
                                  </div>
                                  {count > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedDate(d)
                                        setViewMode('day')
                                      }}
                                      className="ml-2 inline-flex items-center justify-center text-[10px] font-semibold text-white bg-blue-600 rounded-full px-1.5 py-0.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      aria-label={`View ${count} booking(s) on ${format(d, 'PPP')}`}
                                    >
                                      {count}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </main>
      </div>
    </AuthenticatedRoute>
  )
}