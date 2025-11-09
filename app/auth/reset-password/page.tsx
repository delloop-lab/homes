'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isExchanging, setIsExchanging] = useState(true)
  const [exchangeError, setExchangeError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const run = async () => {
      const supabase = createClient()
      if (!supabase) {
        setExchangeError('Auth backend unavailable')
        setIsExchanging(false)
        return
      }
      if (!code) {
        setExchangeError('Missing recovery code')
        setIsExchanging(false)
        return
      }
      
      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        setExchangeError('Reset link validation timed out. Please try requesting a new password reset.')
        setIsExchanging(false)
      }, 10000) // 10 second timeout
      
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        clearTimeout(timeoutId)
        if (error) {
          setExchangeError(error.message || 'Failed to validate recovery code')
        }
        setIsExchanging(false)
      } catch (err) {
        clearTimeout(timeoutId)
        setExchangeError('An error occurred validating the reset link')
        setIsExchanging(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdateError('')
    setUpdateSuccess('')
    if (!newPassword || newPassword.length < 8) {
      setUpdateError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setUpdateError('Passwords do not match')
      return
    }
    const supabase = createClient()
    if (!supabase) {
      setUpdateError('Auth backend unavailable')
      return
    }
    setIsUpdating(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsUpdating(false)
    if (error) {
      setUpdateError(error.message || 'Failed to set new password')
      return
    }
    setUpdateSuccess('Password updated. Redirecting to sign in...')
    setTimeout(() => router.push('/auth'), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h1>

        {isExchanging && (
          <div className="flex items-center text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Validating reset link...
          </div>
        )}

        {!isExchanging && exchangeError && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {exchangeError}
          </div>
        )}

        {!isExchanging && !exchangeError && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {updateError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {updateError}
              </div>
            )}

            {updateSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                {updateSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Set new password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}










