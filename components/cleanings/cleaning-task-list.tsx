'use client'

import { useState, useEffect } from 'react'
import { useCleanings, useCleaningMutations } from '@/hooks/use-cleanings'
import { CleaningWithProperty } from '@/lib/cleanings'
import { format, isToday, isTomorrow, isPast, differenceInHours } from 'date-fns'
import { createClient } from '@/lib/supabase'
import { 
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Filter,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  X,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Pencil
} from 'lucide-react'

interface CleaningTaskListProps {
  cleaner_id?: string
  showFilters?: boolean
  mobileOptimized?: boolean
  isCleanerView?: boolean // If true, hide Edit and Delete buttons
}

export function CleaningTaskList({ 
  cleaner_id, 
  showFilters = true,
  mobileOptimized = true,
  isCleanerView = false 
}: CleaningTaskListProps) {
  const [filters, setFilters] = useState({
    property_id: '',
    status: '',
    date_from: '',
    date_to: ''
  })
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [editingCleaningId, setEditingCleaningId] = useState<string | null>(null)
  const [cleaners, setCleaners] = useState<Array<{ id: string; full_name: string; email: string }>>([])
  const [loadingCleaners, setLoadingCleaners] = useState(false)

  const { 
    cleanings, 
    loading, 
    error, 
    refetch,
    loadMore,
    hasMore
  } = useCleanings({
    property_id: filters.property_id || undefined,
    status: filters.status || undefined,
    date_from: filters.date_from ? new Date(filters.date_from) : undefined,
    date_to: filters.date_to ? new Date(filters.date_to) : undefined,
    cleaner_id,
    limit: 20,
    autoRefresh: true
  })

  const { updateStatus, startCleaning, completeCleaning, deleteCleaning, updateCleaning } = useCleaningMutations()

  // Fetch cleaners for assignment
  useEffect(() => {
    const fetchCleaners = async () => {
      setLoadingCleaners(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('role', 'cleaner')
          .eq('is_active', true)
          .order('full_name')
        
        if (error) {
          console.error('Error fetching cleaners:', error)
        } else {
          setCleaners(data || [])
        }
      } catch (err) {
        console.error('Failed to fetch cleaners:', err)
      } finally {
        setLoadingCleaners(false)
      }
    }

    fetchCleaners()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getPriorityLevel = (cleaning: CleaningWithProperty) => {
    const cleaningDate = new Date(cleaning.cleaning_date)
    const now = new Date()
    const hoursUntil = differenceInHours(cleaningDate, now)

    if (isToday(cleaningDate) && cleaning.status === 'scheduled') {
      return hoursUntil <= 2 ? 'urgent' : 'high'
    }
    if (isTomorrow(cleaningDate) && cleaning.status === 'scheduled') {
      return 'medium'
    }
    if (isPast(cleaningDate) && cleaning.status !== 'completed') {
      return 'overdue'
    }
    return 'normal'
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-50'
      case 'overdue':
        return 'border-l-4 border-red-600 bg-red-100'
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50'
      default:
        return 'border-l-4 border-gray-300 bg-white'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`
    }
    if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`
    }
    return format(date, 'MMM dd, h:mm a')
  }

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleStatusUpdate = async (
    cleaning: CleaningWithProperty, 
    newStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  ) => {
    setUpdatingTasks(prev => new Set(prev).add(cleaning.id))

    try {
      let result
      if (newStatus === 'in_progress') {
        result = await startCleaning(cleaning.id)
      } else if (newStatus === 'completed') {
        result = await completeCleaning(cleaning.id)
      } else {
        result = await updateStatus(cleaning.id, newStatus)
      }

      if (result.success) {
        refetch()
      } else {
        alert(`Failed to update status: ${result.error}`)
      }
    } catch (error) {
      alert(`Error updating status: ${error}`)
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(cleaning.id)
        return newSet
      })
    }
  }

  const groupedCleanings = cleanings.reduce((groups, cleaning) => {
    const date = new Date(cleaning.cleaning_date)
    let key: string

    if (isToday(date)) {
      key = 'Today'
    } else if (isTomorrow(date)) {
      key = 'Tomorrow'
    } else if (isPast(date)) {
      key = 'Overdue'
    } else {
      key = format(date, 'MMM dd, yyyy')
    }

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(cleaning)
    return groups
  }, {} as Record<string, CleaningWithProperty[]>)

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">Error loading cleaning tasks: {error}</p>
        </div>
        <button
          onClick={refetch}
          className="mt-2 text-red-600 hover:text-red-500 font-medium"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Cleaning Schedule
            </h2>
            <div className="flex items-center space-x-2">
              {showFilters && (
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`p-2 rounded-lg ${showFilterPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Filter className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={refetch}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && showFilterPanel && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="From date"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setFilters({ property_id: '', status: '', date_from: '', date_to: '' })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="px-4 py-4 space-y-4">
        {loading && cleanings.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading cleaning tasks...</p>
          </div>
        ) : Object.keys(groupedCleanings).length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cleaning tasks found</h3>
            <p className="text-gray-500">No tasks match your current filters.</p>
          </div>
        ) : (
          Object.entries(groupedCleanings).map(([dateGroup, tasks]) => (
            <div key={dateGroup} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center">
                <h3 className={`text-sm font-medium ${
                  dateGroup === 'Overdue' ? 'text-red-600' : 
                  dateGroup === 'Today' ? 'text-blue-600' : 
                  'text-gray-700'
                }`}>
                  {dateGroup}
                </h3>
                <div className="flex-1 ml-3 h-px bg-gray-200"></div>
                <span className="ml-3 text-xs text-gray-500">
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              {/* Tasks in Group */}
              {tasks.map((cleaning) => {
                const isExpanded = expandedTasks.has(cleaning.id)
                const isUpdating = updatingTasks.has(cleaning.id)
                const priority = getPriorityLevel(cleaning)

                return (
                  <div
                    key={cleaning.id}
                    className={`rounded-lg shadow-sm border ${getPriorityStyle(priority)} ${
                      mobileOptimized ? 'touch-manipulation' : ''
                    }`}
                  >
                    {/* Task Header */}
                    <div
                      onClick={() => toggleTaskExpansion(cleaning.id)}
                      className="p-4 cursor-pointer active:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(cleaning.status)}`}>
                              {getStatusIcon(cleaning.status)}
                              <span className="ml-1 capitalize">{cleaning.status.replace('_', ' ')}</span>
                            </div>
                            {priority === 'urgent' && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                URGENT
                              </span>
                            )}
                            {priority === 'overdue' && (
                              <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
                                OVERDUE
                              </span>
                            )}
                          </div>

                          <h4 className="font-medium text-gray-900 truncate">
                            {cleaning.property_name || 'Unknown Property'}
                          </h4>

                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{cleaning.property_address}</span>
                          </div>

                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>{formatDateTime(cleaning.cleaning_date)}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-3">
                          {cleaning.cost && (
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span>{cleaning.cost.toFixed(0)}</span>
                            </div>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {/* Notes */}
                        {cleaning.notes && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-900 mb-1">Notes:</h5>
                            <p className="text-sm text-gray-600">{cleaning.notes}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {cleaning.status === 'scheduled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusUpdate(cleaning, 'in_progress')
                              }}
                              disabled={isUpdating}
                              className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Play className="h-4 w-4 mr-1" />
                              )}
                              Start Cleaning
                            </button>
                          )}

                          {cleaning.status === 'in_progress' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusUpdate(cleaning, 'completed')
                              }}
                              disabled={isUpdating}
                              className="flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Check className="h-4 w-4 mr-1" />
                              )}
                              Mark Complete
                            </button>
                          )}

                          {cleaning.status !== 'completed' && cleaning.status !== 'cancelled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Are you sure you want to cancel this cleaning task?')) {
                                  handleStatusUpdate(cleaning, 'cancelled')
                                }
                              }}
                              disabled={isUpdating}
                              className="flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <X className="h-4 w-4 mr-1" />
                              )}
                              Cancel
                            </button>
                          )}

                          {/* Edit Button - Only for hosts/admins, not cleaners */}
                          {!isCleanerView && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingCleaningId(cleaning.id)
                              }}
                              disabled={isUpdating}
                              className="flex items-center px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                          )}

                          {/* Delete Button - Only for hosts/admins, not cleaners */}
                          {!isCleanerView && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (confirm('Are you sure you want to permanently delete this cleaning task? This action cannot be undone.')) {
                                  setUpdatingTasks(prev => new Set(prev).add(cleaning.id))
                                  try {
                                    const result = await deleteCleaning(cleaning.id)
                                    if (result.success) {
                                      refetch()
                                    } else {
                                      alert(`Failed to delete: ${result.error}`)
                                    }
                                  } catch (error) {
                                    alert(`Error deleting task: ${error}`)
                                  } finally {
                                    setUpdatingTasks(prev => {
                                      const newSet = new Set(prev)
                                      newSet.delete(cleaning.id)
                                      return newSet
                                    })
                                  }
                                }
                              }}
                              disabled={isUpdating}
                              className="flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}

        {/* Load More */}
        {hasMore && (
          <div className="text-center py-4">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              ) : null}
              Load More Tasks
            </button>
          </div>
        )}
      </div>

      {/* Edit Cleaning Modal */}
      {editingCleaningId && (() => {
        const cleaning = cleanings.find(c => c.id === editingCleaningId)
        if (!cleaning) return null

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Cleaning Task</h2>
                  <button
                    onClick={() => setEditingCleaningId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const cleaner_id = formData.get('cleaner_id') as string
                    const cost = formData.get('cost') as string
                    const notes = formData.get('notes') as string

                    console.log('Submitting cleaning update:', { 
                      id: cleaning.id, 
                      cleaner_id, 
                      cost, 
                      notes 
                    })

                    setUpdatingTasks(prev => new Set(prev).add(cleaning.id))
                    try {
                      // Add 10 second timeout
                      const updatePromise = updateCleaning({
                        id: cleaning.id,
                        cleaner_id: cleaner_id || undefined,
                        cost: cost ? parseFloat(cost) : undefined,
                        notes: notes || undefined
                      })

                      const timeoutPromise = new Promise<{ success: boolean; error: string }>((resolve) =>
                        setTimeout(() => resolve({ success: false, error: 'Update timed out after 10 seconds' }), 10000)
                      )

                      const result = await Promise.race([updatePromise, timeoutPromise])

                      console.log('Update result:', result)

                      if (result.success) {
                        setEditingCleaningId(null)
                        refetch()
                      } else {
                        alert(`Failed to update: ${result.error}`)
                      }
                    } catch (error) {
                      console.error('Update error:', error)
                      alert(`Error updating task: ${error}`)
                    } finally {
                      setUpdatingTasks(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(cleaning.id)
                        return newSet
                      })
                    }
                  }}
                  className="space-y-4"
                >
                  {/* Property Info */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{cleaning.property_name}</p>
                    <p className="text-xs text-gray-600">{cleaning.property_address}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {format(new Date(cleaning.cleaning_date), 'PPp')}
                    </p>
                  </div>

                  {/* Assign Cleaner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Cleaner
                    </label>
                    <select
                      name="cleaner_id"
                      defaultValue={cleaning.cleaner_id || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {cleaners.map((cleaner) => (
                        <option key={cleaner.id} value={cleaner.id}>
                          {cleaner.full_name} ({cleaner.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost ($)
                    </label>
                    <input
                      type="number"
                      name="cost"
                      step="0.01"
                      min="0"
                      defaultValue={cleaning.cost || ''}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      defaultValue={cleaning.notes || ''}
                      placeholder="Add any notes about this cleaning..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingCleaningId(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingTasks.has(cleaning.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingTasks.has(cleaning.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}