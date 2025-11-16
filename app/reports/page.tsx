'use client'

import { useState } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { useAuth } from '@/components/providers'
import { CleaningScheduleReport } from '@/components/reports/cleaning-schedule-report'
import { EarningsReport } from '@/components/reports/earnings-report'
import { Calendar, DollarSign } from 'lucide-react'

type ReportType = 'schedule' | 'earnings'

export default function ReportsPage() {
  const { role, profile } = useAuth()
  const isCleaner = role === 'cleaner'
  const [selectedReport, setSelectedReport] = useState<ReportType>('schedule')

  // Only filter by cleaner_id if user is a cleaner
  const cleanerId = isCleaner ? profile?.id : undefined

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">
              {isCleaner 
                ? 'View your cleaning schedule and earnings reports'
                : 'View cleaning schedules and costs across all properties'
              }
            </p>
          </div>

          {/* Report Type Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="grid grid-cols-2 gap-0">
              <button
                onClick={() => setSelectedReport('schedule')}
                className={`flex items-center justify-center gap-3 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  selectedReport === 'schedule'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-5 w-5" />
                Cleaning Schedule
              </button>
              
              <button
                onClick={() => setSelectedReport('earnings')}
                className={`flex items-center justify-center gap-3 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  selectedReport === 'earnings'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="h-5 w-5" />
                Earnings Report
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {selectedReport === 'schedule' ? (
              <CleaningScheduleReport cleanerId={cleanerId} isHostView={!isCleaner} />
            ) : (
              <EarningsReport cleanerId={cleanerId} isHostView={!isCleaner} />
            )}
          </div>
        </main>
      </div>
    </AuthenticatedRoute>
  )
}
