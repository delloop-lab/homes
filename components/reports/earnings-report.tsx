'use client'

import { useState } from 'react'
import { useCleanings } from '@/hooks/use-cleanings'
import { useAuth } from '@/components/providers'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear } from 'date-fns'
import { DollarSign, TrendingUp, Calendar, Printer, Loader2, CheckCircle } from 'lucide-react'

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

interface EarningsReportProps {
  cleanerId?: string
  isHostView?: boolean
}

type DateRange = 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'custom'

export function EarningsReport({ cleanerId, isHostView = false }: EarningsReportProps) {
  const { profile } = useAuth()
  const hostCurrency = profile?.currency || 'USD'
  const currencySymbol = getCurrencySymbol(hostCurrency)
  const [dateRange, setDateRange] = useState<DateRange>('this-month')
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
      case 'this-month':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now)
        }
      case 'last-month':
        const lastMonth = addMonths(now, -1)
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth)
        }
      case 'this-year':
        return {
          from: startOfYear(now),
          to: endOfYear(now)
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
  
  // Fetch completed cleanings for earnings
  const { cleanings, loading, error } = useCleanings({
    cleaner_id: cleanerId,
    date_from: range?.from,
    date_to: range?.to,
    status: 'completed',
    limit: 500
  })

  // Calculate earnings
  const totalEarnings = cleanings.reduce((sum, cleaning) => sum + (cleaning.cost || 0), 0)
  const averagePerCleaning = cleanings.length > 0 ? totalEarnings / cleanings.length : 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          {isHostView ? `Cleaning Costs Report (All Properties) - ${hostCurrency}` : `Earnings Report - ${hostCurrency}`}
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
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            This Week
          </button>
          
          <button
            onClick={() => setDateRange('this-month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'this-month'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            This Month
          </button>
          
          <button
            onClick={() => setDateRange('last-month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'last-month'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            Last Month
          </button>
          
          <button
            onClick={() => setDateRange('this-year')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'this-year'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            This Year
          </button>
          
          <button
            onClick={() => setDateRange('custom')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
              dateRange === 'custom'
                ? 'border-green-600 bg-green-50 text-green-700'
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}

        {/* Selected Date Range Display */}
        {range && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="font-medium">
              {format(range.from, 'MMM dd, yyyy')} - {format(range.to, 'MMM dd, yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          <p>Error loading earnings: {error}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">
                  {isHostView ? 'Total Cost' : 'Total Earnings'}
                </span>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">
                {currencySymbol}{totalEarnings.toFixed(2)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  {isHostView ? 'Completed Cleanings' : 'Completed Jobs'}
                </span>
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">
                {cleanings.length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">
                  {isHostView ? 'Average per Cleaning' : 'Average per Job'}
                </span>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900">
                {currencySymbol}{averagePerCleaning.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Detailed List */}
          {cleanings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {isHostView 
                  ? 'No completed cleanings in this period'
                  : 'No completed cleanings in this period'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cleaning Details</h3>
              
              {cleanings.map((cleaning) => (
                <div
                  key={cleaning.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          {cleaning.property_name}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {format(new Date(cleaning.cleaning_date), 'MMM dd, yyyy • h:mm a')}
                      </div>
                      
                      {cleaning.property_address && (
                        <div className="text-sm text-gray-500 mt-1">
                          {cleaning.property_address}
                        </div>
                      )}
                      
                      {isHostView && cleaning.cleaner_full_name && (
                        <div className="text-sm text-gray-500 mt-1">
                          Cleaner: {cleaning.cleaner_full_name}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {currencySymbol}{(cleaning.cost || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

