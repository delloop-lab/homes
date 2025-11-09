'use client'

import { useState, useEffect } from 'react'
import { authService, UserProfile } from '@/lib/auth'
import { useAuth } from '@/components/providers'
import { 
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Crown,
  Briefcase
} from 'lucide-react'

interface CleanerAssignmentsProps {
  propertyId: string
  propertyName: string
}

export function CleanerAssignments({ propertyId, propertyName }: CleanerAssignmentsProps) {
  const { role } = useAuth()
  const [assignedCleaners, setAssignedCleaners] = useState<UserProfile[]>([])
  const [availableCleaners, setAvailableCleaners] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Only show to hosts
  if (!authService.canAssignCleaners(role)) {
    return null
  }

  useEffect(() => {
    loadCleaners()
  }, [propertyId])

  const loadCleaners = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load assigned and available cleaners in parallel
      const [assigned, available] = await Promise.all([
        authService.getPropertyCleaners(propertyId),
        authService.getCleaners()
      ])

      setAssignedCleaners(assigned)
      
      // Filter out already assigned cleaners
      const assignedIds = new Set(assigned.map(c => c.id))
      const unassigned = available.filter(c => !assignedIds.has(c.id))
      setAvailableCleaners(unassigned)
      
    } catch (err) {
      console.error('Error loading cleaners:', err)
      setError('Failed to load cleaners')
    } finally {
      setLoading(false)
    }
  }

  const assignCleaner = async (cleanerId: string) => {
    setActionLoading(cleanerId)
    setError(null)
    setSuccess(null)

    try {
      await authService.assignCleanerToProperty(propertyId, cleanerId)
      
      // Move cleaner from available to assigned
      const cleaner = availableCleaners.find(c => c.id === cleanerId)
      if (cleaner) {
        setAssignedCleaners(prev => [...prev, cleaner])
        setAvailableCleaners(prev => prev.filter(c => c.id !== cleanerId))
        setSuccess(`${cleaner.full_name} assigned successfully`)
      }
      
    } catch (err) {
      console.error('Error assigning cleaner:', err)
      setError('Failed to assign cleaner')
    } finally {
      setActionLoading(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const removeCleaner = async (cleanerId: string) => {
    if (!confirm('Are you sure you want to remove this cleaner from the property?')) {
      return
    }

    setActionLoading(cleanerId)
    setError(null)
    setSuccess(null)

    try {
      await authService.removeCleanerFromProperty(propertyId, cleanerId)
      
      // Move cleaner from assigned to available
      const cleaner = assignedCleaners.find(c => c.id === cleanerId)
      if (cleaner) {
        setAvailableCleaners(prev => [...prev, cleaner])
        setAssignedCleaners(prev => prev.filter(c => c.id !== cleanerId))
        setSuccess(`${cleaner.full_name} removed successfully`)
      }
      
    } catch (err) {
      console.error('Error removing cleaner:', err)
      setError('Failed to remove cleaner')
    } finally {
      setActionLoading(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading cleaners...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Cleaner Assignments
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage who can access and clean {propertyName}
          </p>
        </div>
        
        <div className="text-sm text-gray-500">
          {assignedCleaners.length} assigned
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Cleaners */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Assigned Cleaners ({assignedCleaners.length})
          </h4>
          
          {assignedCleaners.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No cleaners assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedCleaners.map((cleaner) => (
                <div key={cleaner.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {cleaner.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cleaner.email}
                      </div>
                      {cleaner.phone && (
                        <div className="text-sm text-gray-500">
                          {cleaner.phone}
                        </div>
                      )}
                      {cleaner.hourly_rate && (
                        <div className="text-sm text-green-600 font-medium">
                          ${cleaner.hourly_rate}/hour
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeCleaner(cleaner.id)}
                    disabled={actionLoading === cleaner.id}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    title="Remove cleaner"
                  >
                    {actionLoading === cleaner.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Cleaners */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <UserPlus className="h-4 w-4 mr-2 text-blue-600" />
            Available Cleaners ({availableCleaners.length})
          </h4>
          
          {availableCleaners.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">All cleaners are assigned</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableCleaners.map((cleaner) => (
                <div key={cleaner.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {cleaner.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cleaner.email}
                      </div>
                      {cleaner.phone && (
                        <div className="text-sm text-gray-500">
                          {cleaner.phone}
                        </div>
                      )}
                      {cleaner.hourly_rate && (
                        <div className="text-sm text-blue-600 font-medium">
                          ${cleaner.hourly_rate}/hour
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => assignCleaner(cleaner.id)}
                    disabled={actionLoading === cleaner.id}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                    title="Assign cleaner"
                  >
                    {actionLoading === cleaner.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Assignment Guidelines</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Assigned cleaners can view and update cleaning tasks for this property</li>
          <li>• They can see booking information for scheduling purposes</li>
          <li>• Cleaners cannot modify bookings or property settings</li>
          <li>• You can remove cleaners at any time if needed</li>
        </ul>
      </div>
    </div>
  )
}