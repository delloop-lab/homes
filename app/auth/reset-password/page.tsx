'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isValidating, setIsValidating] = useState(true)
  const [validationError, setValidationError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')

  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    
    if (!supabase) {
      setValidationError('Auth backend unavailable')
      setIsValidating(false)
      return
    }

    // Official Supabase approach: Listen for PASSWORD_RECOVERY event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event, session ? 'has session' : 'no session')
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ PASSWORD_RECOVERY event detected - allowing password reset')
        if (mounted) {
          setIsValidating(false)
        }
      } else if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in - allowing password reset')
        if (mounted) {
          setIsValidating(false)
        }
      }
    })

    // Check for code in URL and exchange it
    const code = searchParams.get('code')
    
    if (code) {
      console.log('✅ Recovery code found, exchanging...')
      ;(async () => {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('❌ Code exchange error:', error.message)
            if (mounted) {
              setValidationError(error.message || 'Invalid reset code')
              setIsValidating(false)
            }
            return
          }
          
          if (data?.session) {
            console.log('✅ Code exchanged, session created')
            if (mounted) {
              setIsValidating(false)
            }
          }
        } catch (err: any) {
          console.error('❌ Code exchange exception:', err)
          if (mounted) {
            setValidationError('Failed to validate reset code')
            setIsValidating(false)
          }
        }
      })()
    } else {
      // No code - wait for PASSWORD_RECOVERY event (handled by onAuthStateChange above)
      console.log('⏳ No code in URL, waiting for auth state change...')
    }
    
    // Cleanup function
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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
    
    try {
      // Official Supabase approach: update password after PASSWORD_RECOVERY event
      const { data, error } = await supabase.auth.updateUser({ 
        password: newPassword 
      })
      
      if (error) {
        console.error('❌ Password update error:', error)
        setUpdateError(error.message || 'Failed to update password')
        setIsUpdating(false)
        return
      }
      
      console.log('✅ Password updated successfully')
      setUpdateSuccess('Password updated successfully! Redirecting to sign in...')
      
      // Sign out and redirect to login
      await supabase.auth.signOut()
      setTimeout(() => router.push('/auth'), 1500)
    } catch (err: any) {
      console.error('❌ Password update exception:', err)
      setUpdateError('An error occurred updating your password. Please try again.')
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h1>

        {isValidating && (
          <div className="flex items-center text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Validating reset link...
          </div>
        )}

        {!isValidating && validationError && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {validationError}
            <div className="mt-3">
              <button
                onClick={() => router.push('/auth')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Return to login
              </button>
            </div>
          </div>
        )}

        {!isValidating && !validationError && (
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
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
