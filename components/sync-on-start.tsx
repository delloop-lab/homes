'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers'
import { syncAllCalendars } from '@/lib/calendar-sync'

export function SyncOnStart() {
  const { loading, user } = useAuth()
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // DISABLED: Auto-sync on start causes loading issues
    // You can manually sync calendars from the calendar page
    
    // Only run once per browser session
    if (typeof window === 'undefined') return
    const alreadySynced = sessionStorage.getItem('synced_this_session')
    if (alreadySynced) return

    // Wait until auth resolves and a user exists
    if (loading || !user) return

    // Mark as synced without actually syncing to prevent the loading spinner
    sessionStorage.setItem('synced_this_session', '1')

    /* Disabled auto-sync - uncomment to re-enable
    const run = async () => {
      try {
        setShow(true)
        setStatus('running')
        setMessage('Syncing calendars for your properties...')

        const results = await syncAllCalendars()
        const totalProcessed = results.reduce((sum, r: any) => sum + (r.totalProcessed || 0), 0)
        const totalErrors = results.reduce((sum, r: any) => sum + (r.totalErrors || 0), 0)

        setStatus('done')
        setMessage(`Sync complete. Processed ${totalProcessed} events${totalErrors ? `, ${totalErrors} errors` : ''}.`)
        sessionStorage.setItem('synced_this_session', '1')

        // Auto-dismiss after a short delay
        setTimeout(() => setShow(false), 1500)
      } catch (err) {
        setStatus('error')
        setMessage(`Sync failed: ${String(err)}`)
        // Dismiss after showing error briefly
        setTimeout(() => setShow(false), 2000)
      }
    }

    run()
    */
  }, [loading, user])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white w-full max-w-sm mx-4 rounded-lg shadow-lg border border-gray-200 p-5">
        <div className="flex items-center gap-3">
          {status === 'running' && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          )}
          {status === 'done' && (
            <div className="h-6 w-6 rounded-full bg-green-500" />
          )}
          {status === 'error' && (
            <div className="h-6 w-6 rounded-full bg-red-500" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {status === 'running' ? 'Syncing calendars' : status === 'done' ? 'Sync finished' : 'Sync error'}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{message}</div>
          </div>
        </div>
      </div>
    </div>
  )
}







