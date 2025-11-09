'use client'

import { useState, useEffect } from 'react'
import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { Mail, CheckCircle, XCircle, Calendar, User, FileText, Loader2, Eye } from 'lucide-react'

interface EmailLog {
  id: string
  cleaner_id: string | null
  cleaner_email: string
  cleaner_name: string | null
  subject: string
  email_content: string
  cleaning_ids: string[]
  status: 'sent' | 'failed'
  provider_message_id: string | null
  error_message: string | null
  sent_at: string
  created_at: string
}

export default function EmailLogsPage() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)

  useEffect(() => {
    loadEmailLogs()
  }, [])

  const loadEmailLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase client not available')
        return
      }

      // First check current user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user for email logs:', user?.id)
      
      const { data, error: fetchError } = await supabase
        .from('cleaning_email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100)

      if (fetchError) {
        console.error('Error fetching email logs:', fetchError)
        console.error('Error code:', fetchError.code)
        console.error('Error message:', fetchError.message)
        // Check if table doesn't exist
        if (fetchError.code === '42P01' || fetchError.message.includes('does not exist')) {
          setError('Email logs table does not exist. Please run the SQL migration: scripts/create-email-logs-table.sql')
        } else if (fetchError.code === '42501' || fetchError.message.includes('permission denied')) {
          setError('Permission denied. Your user role may not have access. Check RLS policies.')
        } else {
          setError(`Error: ${fetchError.message} (Code: ${fetchError.code})`)
        }
        return
      }

      console.log('Loaded email logs:', data?.length || 0, data)
      setEmailLogs(data || [])
    } catch (err) {
      console.error('Error in loadEmailLogs:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Email Logs</h2>
            <p className="text-gray-600 mt-2">View all emails sent to cleaners</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading email logs...</p>
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No emails sent yet</h3>
              <p className="text-gray-500">Email logs will appear here after you send cleaning jobs to cleaners.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jobs
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {emailLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {log.cleaner_name || 'Unknown'}
                              </div>
                              <div className="text-gray-500">{log.cleaner_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {log.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.status === 'sent' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.cleaning_ids?.length || 0} job{log.cleaning_ids?.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedEmail(log)}
                            className="text-blue-600 hover:text-blue-900 flex items-center ml-auto"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Email Detail Modal */}
          {selectedEmail && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Email Details</h3>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedEmail.cleaner_name} ({selectedEmail.cleaner_email})
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <p className="text-sm text-gray-900">{selectedEmail.subject}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sent At
                      </label>
                      <p className="text-sm text-gray-900">
                        {format(new Date(selectedEmail.sent_at), 'PPpp')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      {selectedEmail.status === 'sent' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sent
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-2">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </span>
                          {selectedEmail.error_message && (
                            <p className="text-sm text-red-600 mt-1">{selectedEmail.error_message}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedEmail.provider_message_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Message ID
                        </label>
                        <p className="text-sm text-gray-500 font-mono">{selectedEmail.provider_message_id}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="h-4 w-4 inline mr-1" />
                        Email Content
                      </label>
                      <div 
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.email_content }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthenticatedRoute>
  )
}

