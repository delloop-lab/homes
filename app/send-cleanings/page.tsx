'use client'

import { useState, useEffect } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { useCleanings } from '@/hooks/use-cleanings'
import { CleaningWithProperty } from '@/lib/cleanings'
import { createClient } from '@/lib/supabase'
import { UserProfile } from '@/lib/auth'
import { format } from 'date-fns'
import { 
  CheckSquare, 
  Square, 
  Send, 
  Loader2, 
  Calendar, 
  MapPin, 
  FileText,
  User,
  Mail,
  AlertCircle
} from 'lucide-react'

export default function SendCleaningsPage() {
  const [selectedCleanings, setSelectedCleanings] = useState<Set<string>>(new Set())
  const [cleaners, setCleaners] = useState<UserProfile[]>([])
  const [selectedCleanerId, setSelectedCleanerId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

  const { cleanings, loading, refetch } = useCleanings({
    status: 'scheduled',
    limit: 100
  })

  useEffect(() => {
    loadCleaners()
  }, [])

  const loadCleaners = async () => {
    try {
      const supabase = createClient()
      if (!supabase) return

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'cleaner')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      setCleaners(data || [])
    } catch (err) {
      console.error('Error loading cleaners:', err)
    }
  }

  const toggleSelection = (cleaningId: string) => {
    setSelectedCleanings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cleaningId)) {
        newSet.delete(cleaningId)
      } else {
        newSet.add(cleaningId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedCleanings.size === cleanings.length) {
      setSelectedCleanings(new Set())
    } else {
      setSelectedCleanings(new Set(cleanings.map(c => c.id)))
    }
  }

  const handleSend = async () => {
    if (selectedCleanings.size === 0) {
      setError('Please select at least one cleaning job to send')
      return
    }

    if (!selectedCleanerId) {
      setError('Please select a cleaner to send the jobs to')
      return
    }

    const selectedCleaner = cleaners.find(c => c.id === selectedCleanerId)
    if (!selectedCleaner) {
      setError('Selected cleaner not found')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const selectedJobs = cleanings.filter(c => selectedCleanings.has(c.id))
      
      const response = await fetch('/api/send-cleaning-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleaner_id: selectedCleanerId,
          cleaner_email: selectedCleaner.email,
          cleaning_ids: Array.from(selectedCleanings),
          jobs: selectedJobs.map(job => ({
            id: job.id,
            property_name: job.property_name,
            property_address: job.property_address,
            cleaning_date: job.cleaning_date,
            notes: editingNotes[job.id] || job.notes || '',
            cost: job.cost
          }))
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`Successfully sent ${selectedCleanings.size} cleaning job(s) to ${selectedCleaner.full_name}`)
        setSelectedCleanings(new Set())
        setEditingNotes({})
        refetch()
      } else {
        console.error('Email send error:', result)
        setError(result.error || 'Failed to send cleaning jobs. Check the server console for details.')
      }
    } catch (err) {
      setError(`Error sending jobs: ${err}`)
    } finally {
      setSending(false)
    }
  }

  const updateNotes = (cleaningId: string, notes: string) => {
    setEditingNotes(prev => ({
      ...prev,
      [cleaningId]: notes
    }))
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Send Cleaning Jobs to Cleaner</h2>
            <p className="text-gray-600 mt-2">Select cleaning jobs and send them to a cleaner via email</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Cleaner Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Cleaner
            </label>
            <select
              value={selectedCleanerId}
              onChange={(e) => setSelectedCleanerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a cleaner --</option>
              {cleaners.map(cleaner => (
                <option key={cleaner.id} value={cleaner.id}>
                  {cleaner.full_name} ({cleaner.email})
                </option>
              ))}
            </select>
          </div>

          {/* Selection Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={toggleSelectAll}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {selectedCleanings.size === cleanings.length ? (
                  <CheckSquare className="h-5 w-5 mr-2" />
                ) : (
                  <Square className="h-5 w-5 mr-2" />
                )}
                {selectedCleanings.size === cleanings.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="ml-4 text-sm text-gray-600">
                {selectedCleanings.size} of {cleanings.length} selected
              </span>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || selectedCleanings.size === 0 || !selectedCleanerId}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Selected Jobs
                </>
              )}
            </button>
          </div>

          {/* Cleaning Jobs List */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading cleaning jobs...</p>
            </div>
          ) : cleanings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled cleaning jobs</h3>
              <p className="text-gray-500">All cleaning jobs have been completed or cancelled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cleanings.map((cleaning) => {
                const isSelected = selectedCleanings.has(cleaning.id)
                const notes = editingNotes[cleaning.id] !== undefined 
                  ? editingNotes[cleaning.id] 
                  : cleaning.notes || ''

                return (
                  <div
                    key={cleaning.id}
                    className={`bg-white rounded-lg shadow-sm border-2 ${
                      isSelected ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start">
                        <button
                          onClick={() => toggleSelection(cleaning.id)}
                          className="mt-1 mr-4 flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {cleaning.property_name || 'Unknown Property'}
                              </h3>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <MapPin className="h-4 w-4 mr-1" />
                                {cleaning.property_address || 'No address'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <Calendar className="h-4 w-4 mr-1" />
                                {format(new Date(cleaning.cleaning_date), 'MMM dd, yyyy h:mm a')}
                              </div>
                              {cleaning.cost && (
                                <div className="text-sm font-medium text-gray-900">
                                  ${cleaning.cost.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Notes Editor */}
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <FileText className="h-4 w-4 inline mr-1" />
                              Notes for Cleaner
                            </label>
                            <textarea
                              value={notes}
                              onChange={(e) => updateNotes(cleaning.id, e.target.value)}
                              placeholder="Add notes for the cleaner (e.g., special instructions, areas to focus on, etc.)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </AuthenticatedRoute>
  )
}

