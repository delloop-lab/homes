'use client'

import { useState, useEffect } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { createClient } from '@/lib/supabase'
import { UserProfile } from '@/lib/auth'
import { User, Mail, Phone, DollarSign, Plus, Edit, Trash2, Send, Loader2 } from 'lucide-react'

export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCleaner, setEditingCleaner] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    hourly_rate: ''
  })

  useEffect(() => {
    loadCleaners()
  }, [])

  const loadCleaners = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase client not available')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'cleaner')
        .order('full_name', { ascending: true })

      if (fetchError) {
        console.error('Error fetching cleaners:', fetchError)
        setError(fetchError.message)
        return
      }

      console.log('Loaded cleaners:', data?.length || 0, data)
      setCleaners(data || [])
    } catch (err) {
      console.error('Error in loadCleaners:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase client not available')
        return
      }

      if (editingCleaner) {
        // Update existing cleaner
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone || null,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCleaner.id)

        if (updateError) {
          setError(updateError.message)
          return
        }
      } else {
        // Create new cleaner profile via API route (handles auth user creation)
        const response = await fetch('/api/create-cleaner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone || null,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
          })
        })

        const result = await response.json()
        if (!result.success) {
          setError(result.error || 'Failed to create cleaner')
          return
        }
        
        // Show success message
        setSuccess(result.message || 'Cleaner created successfully')
      }

      // Reload cleaners list
      await loadCleaners()
      setShowForm(false)
      setEditingCleaner(null)
      setFormData({ email: '', full_name: '', phone: '', hourly_rate: '' })
    } catch (err) {
      setError(String(err))
    }
  }

  const handleEdit = (cleaner: UserProfile) => {
    setEditingCleaner(cleaner)
    setFormData({
      email: cleaner.email,
      full_name: cleaner.full_name,
      phone: cleaner.phone || '',
      hourly_rate: cleaner.hourly_rate?.toString() || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (cleaner: UserProfile) => {
    if (!confirm(`Are you sure you want to delete ${cleaner.full_name}? This will deactivate their account.`)) {
      return
    }

    try {
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase client not available')
        return
      }

      const { error: deleteError } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', cleaner.id)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      await loadCleaners()
    } catch (err) {
      setError(String(err))
    }
  }

  const handleSendEmail = async (cleaner: UserProfile) => {
    const subject = prompt('Email subject:')
    if (!subject) return

    const message = prompt('Email message:')
    if (!message) return

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleaner.email,
          subject,
          message
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('Email sent successfully!')
      } else {
        alert(`Failed to send email: ${result.error}`)
      }
    } catch (err) {
      alert(`Error sending email: ${err}`)
    }
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cleaner Profiles</h2>
              <p className="text-gray-600 mt-2">Manage cleaner profiles and send emails</p>
            </div>
            <button
              onClick={() => {
                setEditingCleaner(null)
                setFormData({ email: '', full_name: '', phone: '', hourly_rate: '' })
                setShowForm(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cleaner
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Cleaner Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingCleaner ? 'Edit Cleaner Profile' : 'Add Cleaner'}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="cleaner@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Jane Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+1234567890"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hourly Rate ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="25.00"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false)
                          setEditingCleaner(null)
                          setFormData({ email: '', full_name: '', phone: '', hourly_rate: '' })
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                      >
                        {editingCleaner ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Cleaners List */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading cleaners...</p>
            </div>
          ) : cleaners.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cleaners found</h3>
              <p className="text-gray-500">Add your first cleaner profile to get started.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hourly Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cleaners.map((cleaner) => (
                      <tr key={cleaner.id} className={!cleaner.is_active ? 'opacity-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 mr-2" />
                            <div className="text-sm font-medium text-gray-900">
                              {cleaner.full_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-2" />
                            {cleaner.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cleaner.phone ? (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2" />
                              {cleaner.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cleaner.hourly_rate ? (
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              {cleaner.hourly_rate.toFixed(2)}/hr
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cleaner.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {cleaner.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleSendEmail(cleaner)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                              title="Send Email"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(cleaner)}
                              className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cleaner)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthenticatedRoute>
  )
}

