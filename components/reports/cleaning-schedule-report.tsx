'use client'

import { useState } from 'react'
import { useCleanings } from '@/hooks/use-cleanings'
import { useAuth } from '@/components/providers'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { Calendar, Download, Printer, MapPin, Clock, Loader2, DollarSign } from 'lucide-react'

// Currency symbol mapping
const getCurrencySymbol = (currencyCode?: string): string => {
  const currencyMap: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'AUD': 'A$',
    'CAD': 'C$',
    'JPY': '¥',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': '$',
    'ZAR': 'R',
    'NZD': 'NZ$',
    'SGD': 'S$',
    'HKD': 'HK$',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'TRY': '₺',
    'RUB': '₽'
  }
  return currencyMap[currencyCode || 'USD'] || currencyCode || '$'
}

interface CleaningScheduleReportProps {
  cleanerId?: string
  isHostView?: boolean
}

type DateRange = 'this-week' | 'next-week' | 'this-month' | 'next-month' | 'custom'

export function CleaningScheduleReport({ cleanerId, isHostView = false }: CleaningScheduleReportProps) {
  const { profile } = useAuth()
  const hostCurrency = profile?.currency || 'USD'
  const currencySymbol = getCurrencySymbol(hostCurrency)
  const [dateRange, setDateRange] = useState<DateRange>('this-week')
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customEndDate, setCustomEndDate] = useState('')

  // Calculate date range
  const getDateRange = () => {
    const now = new Date()
    
    switch (dateRange) {
      case 'this-week':
        return {
          from: startOfWeek(now, { weekStartsOn: 0 }),
          to: endOfWeek(now, { weekStartsOn: 0 })
        }
      case 'next-week':
        const nextWeek = new Date(now)
        nextWeek.setDate(now.getDate() + 7)
        return {
          from: startOfWeek(nextWeek, { weekStartsOn: 0 }),
          to: endOfWeek(nextWeek, { weekStartsOn: 0 })
        }
      case 'this-month':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now)
        }
      case 'next-month':
        const nextMonth = addMonths(now, 1)
        return {
          from: startOfMonth(nextMonth),
          to: endOfMonth(nextMonth)
        }
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            from: new Date(customStartDate),
            to: new Date(customEndDate)
          }
        }
        return null
      default:
        return null
    }
  }

  const range = getDateRange()
  
  const { cleanings, loading, error } = useCleanings({
    cleaner_id: cleanerId,
    date_from: range?.from,
    date_to: range?.to,
    status: 'scheduled',
    limit: 100
  })

  // Calculate total earnings
  const totalEarnings = cleanings.reduce((sum, cleaning) => sum + (cleaning.cost || 0), 0)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          {isHostView ? `Cleaning Schedule Report (All Properties) - ${hostCurrency}` : `Cleaning Schedule Report - ${hostCurrency}`}
        </h2>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => setDateRange('this-week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'this-week'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            This Week
          </button>
          
          <button
            onClick={() => setDateRange('next-week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'next-week'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            Next Week
          </button>
          
          <button
            onClick={() => setDateRange('this-month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'this-month'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            This Month
          </button>
          
          <button
            onClick={() => setDateRange('next-month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'next-month'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            Next Month
          </button>
          
          <button
            onClick={() => setDateRange('custom')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'custom'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Range Inputs */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Selected Date Range Display */}
        {range && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium">
              {format(range.from, 'MMM dd, yyyy')} - {format(range.to, 'MMM dd, yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          <p>Error loading schedule: {error}</p>
        </div>
      ) : cleanings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No cleanings scheduled for this period</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Total Cleanings</span>
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">
                {cleanings.length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">
                  {isHostView ? 'Total Cost' : 'Total to be Paid'}
                </span>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">
                {currencySymbol}{totalEarnings.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Cleaning List */}
          <div className="space-y-3">

          {cleanings.map((cleaning) => (
            <div
              key={cleaning.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-gray-900">
                      {format(new Date(cleaning.cleaning_date), 'EEEE, MMMM dd, yyyy')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(cleaning.cleaning_date), 'h:mm a')}</span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">{cleaning.property_name}</div>
                      <div className="text-gray-500">{cleaning.property_address}</div>
                      {isHostView && cleaning.cleaner_full_name && (
                        <div className="text-gray-500 mt-1">
                          Cleaner: {cleaning.cleaner_full_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {cleaning.status}
                  </span>
                  {cleaning.cost && (
                    <div className="mt-2 text-lg font-semibold text-gray-900">
                      {currencySymbol}{cleaning.cost.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

