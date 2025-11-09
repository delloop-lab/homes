'use client'

import { useState, useEffect } from 'react'
import { CalendarSource, mergeMultipleCalendars, CalendarEvent } from '@/utils/calendar'
import { syncPropertyCalendars, formatSyncResults, CalendarSyncResult } from '@/lib/calendar-sync'

export function MultiPlatformSync() {
  const [calendarSources, setCalendarSources] = useState<CalendarSource[]>([])

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResult, setSyncResult] = useState<CalendarSyncResult | null>(null)
  const [propertyId] = useState('550e8400-e29b-41d4-a716-446655440001') // Mock property ID

  const syncCalendars = async () => {
    setSyncing(true)
    setSyncResult(null)
    
    try {
      // Prepare sources for API
      const sources = calendarSources
        .filter(source => source.enabled && source.url)
        .map(source => ({
          name: source.name,
          platform: source.platform,
          url: source.url
        }))

      // Call the API
      const result = await syncPropertyCalendars(propertyId, sources)
      setSyncResult(result)
      
      if (result.success) {
        setLastSync(new Date())
        // Optionally refresh events from database here
      }
      
    } catch (error) {
      console.error('Failed to sync calendars:', error)
      setSyncResult({
        success: false,
        totalProcessed: 0,
        totalErrors: 1,
        sources: [],
        processingTime: 0,
        error: String(error)
      })
    } finally {
      setSyncing(false)
    }
  }

  const toggleCalendarSource = (index: number) => {
    const updated = [...calendarSources]
    updated[index].enabled = !updated[index].enabled
    setCalendarSources(updated)
  }

  const updateCalendarUrl = (index: number, url: string) => {
    const updated = [...calendarSources]
    updated[index].url = url
    setCalendarSources(updated)
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'airbnb': return 'bg-red-500'
      case 'vrbo': return 'bg-blue-600'
      case 'booking': return 'bg-blue-800'
      default: return 'bg-gray-500'
    }
  }

  const getPlatformInitial = (platform: string) => {
    switch (platform) {
      case 'airbnb': return 'A'
      case 'vrbo': return 'V'
      case 'booking': return 'B'
      default: return '?'
    }
  }

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Calendar Sync Status</h3>
            <p className="text-sm text-gray-600">
              {lastSync ? `Last synced: ${lastSync.toLocaleString()}` : 'Never synced'}
            </p>
          </div>
          <button
            onClick={syncCalendars}
            disabled={syncing}
            className={`px-4 py-2 rounded-lg font-medium text-white ${
              syncing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {syncing ? 'Syncing...' : 'Sync All Calendars'}
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {syncResult ? syncResult.totalProcessed : events.length}
            </div>
            <div className="text-sm text-gray-600">Total Processed</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {syncResult ? syncResult.sources.filter(s => s.success).length : events.filter(e => e.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Successful Sources</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {syncResult ? syncResult.totalErrors : events.filter(e => e.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {syncResult ? `${syncResult.processingTime}ms` : '-'}
            </div>
            <div className="text-sm text-gray-600">Processing Time</div>
          </div>
        </div>

        {/* Sync Result Details */}
        {syncResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            syncResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-medium ${
              syncResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {syncResult.success ? 'Sync Completed Successfully' : 'Sync Completed with Errors'}
            </h4>
            <p className={`text-sm mt-1 ${
              syncResult.success ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatSyncResults(syncResult)}
            </p>
            
            {syncResult.sources.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Source Details:</h5>
                {syncResult.sources.map((source, index) => (
                  <div key={index} className="text-sm">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      source.success ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {source.name}: {source.bookingsProcessed} bookings
                    {source.errors.length > 0 && (
                      <span className="text-red-600 ml-2">({source.errors.length} errors)</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Sources Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Connected Platforms</h3>
          <p className="text-sm text-gray-600 mt-1">Manage your calendar integrations</p>
        </div>
        <div className="p-6 space-y-4">
          {calendarSources.map((source, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-8 h-8 ${getPlatformColor(source.platform)} rounded-lg flex items-center justify-center`}>
                    <span className="text-white text-sm font-bold">
                      {getPlatformInitial(source.platform)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{source.name}</div>
                    <div className="text-sm text-gray-500 capitalize">{source.platform}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${source.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <button
                    onClick={() => toggleCalendarSource(index)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      source.enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {source.enabled ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ICS Calendar URL
                </label>
                <input
                  type="url"
                  value={source.url}
                  onChange={(e) => updateCalendarUrl(index, e.target.value)}
                  placeholder={`Enter your ${source.platform} ICS URL...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">
                  Get this URL from your {source.platform} calendar export settings
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Synced Events</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {events.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: event.color }}
                    ></div>
                    <div>
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.start).toLocaleDateString()} - {new Date(event.end).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 capitalize">{event.platform}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}