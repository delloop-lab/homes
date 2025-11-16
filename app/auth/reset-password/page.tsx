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
    const validateResetLink = async () => {
      const supabase = createClient()
      if (!supabase) {
        setValidationError('Auth backend unavailable')
        setIsValidating(false)
        return
      }

      // Helper to parse hash params
      const getHashParams = (): URLSearchParams | null => {
        if (typeof window === 'undefined') return null
        if (!window.location.hash) return null
        try {
          return new URLSearchParams(window.location.hash.substring(1))
        } catch (e) {
          return null
        }
      }

      // Helper to get all query params
      const getAllQueryParams = (): URLSearchParams => {
        if (typeof window === 'undefined') return new URLSearchParams()
        try {
          return new URLSearchParams(window.location.search)
        } catch (e) {
          return new URLSearchParams()
        }
      }

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.error('Password reset validation timed out')
        setValidationError('Reset link validation timed out. Please try requesting a new password reset.')
        setIsValidating(false)
      }, 20000) // 20 second timeout
      
      try {
        // Check immediately first (before any delay)
        let queryParams = getAllQueryParams()
        let hashParams = getHashParams()
        let codeFromQuery = queryParams.get('code')
        let codeFromHash = hashParams?.get('code')
        let tokenFromQuery = queryParams.get('token')
        let accessToken = hashParams?.get('access_token')
        let refreshToken = hashParams?.get('refresh_token')
        let type = hashParams?.get('type') || queryParams.get('type')
        
        // CRITICAL: If we have a token parameter, this means the user clicked the verify URL directly
        // and Supabase didn't redirect properly (likely because redirect URL isn't whitelisted)
        if (tokenFromQuery && type === 'recovery') {
          console.error('❌ CRITICAL: Token parameter found in URL - redirect URL is NOT whitelisted in Supabase!')
          console.error('Token:', tokenFromQuery.substring(0, 20) + '...')
          console.error('This means Supabase verify endpoint did not redirect properly.')
          clearTimeout(timeoutId)
          setValidationError(
            'CRITICAL ERROR: The redirect URL is not whitelisted in Supabase. ' +
            'Please add "http://localhost:3001/auth/reset-password" to your Supabase Dashboard → ' +
            'Authentication → URL Configuration → Redirect URLs. ' +
            'Then request a new password reset email. ' +
            'The token parameter in the URL indicates the redirect failed.'
          )
          setIsValidating(false)
          return
        }
        
        // If nothing found, wait a bit for redirect to complete and check again
        if (!codeFromQuery && !codeFromHash && !accessToken && !tokenFromQuery) {
          console.log('No params found initially, waiting for redirect...')
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // Re-check after delay
          queryParams = getAllQueryParams()
          hashParams = getHashParams()
          codeFromQuery = queryParams.get('code')
          codeFromHash = hashParams?.get('code')
          tokenFromQuery = queryParams.get('token')
          accessToken = hashParams?.get('access_token')
          refreshToken = hashParams?.get('refresh_token')
          type = hashParams?.get('type') || queryParams.get('type')
        }

        const debugInfo = {
          hasQueryCode: !!codeFromQuery,
          hasHashCode: !!codeFromHash,
          hasToken: !!tokenFromQuery,
          hasAccessToken: !!accessToken,
          type: type,
          fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
          queryParams: typeof window !== 'undefined' ? window.location.search : 'N/A',
          hash: typeof window !== 'undefined' ? window.location.hash : 'N/A',
          codeFromQuery: codeFromQuery,
          codeFromHash: codeFromHash,
          tokenFromQuery: tokenFromQuery ? tokenFromQuery.substring(0, 20) + '...' : null,
          allHashParams: hashParams ? Object.fromEntries(hashParams.entries()) : null,
          allQueryParams: Object.fromEntries(queryParams.entries())
        }
        console.log('Password reset validation:', JSON.stringify(debugInfo, null, 2))
        
        // Also log the raw URL components for debugging
        if (typeof window !== 'undefined') {
          console.log('Raw URL breakdown:', {
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            href: window.location.href
          })
        }

        // First, check if we already have a valid session (Supabase may have created one)
        console.log('🔍 Checking for existing session...')
        let session, sessionError
        try {
          // Add timeout to session check to prevent hanging
          const sessionPromise = supabase.auth.getSession()
          const sessionTimeout = new Promise<{ data: { session: null }; error: { message: string } }>((resolve) => {
            setTimeout(() => {
              console.warn('⏱️ Session check timed out after 3 seconds, continuing...')
              resolve({ data: { session: null }, error: { message: 'Session check timed out' } })
            }, 3000)
          })
          
          const sessionResult = await Promise.race([sessionPromise, sessionTimeout])
          session = sessionResult.data?.session
          sessionError = sessionResult.error
          console.log('🔍 Session check result:', {
            hasSession: !!session,
            hasError: !!sessionError,
            errorMessage: sessionError?.message || null
          })
        } catch (err: any) {
          console.error('❌ Session check exception:', err)
          sessionError = err
        }
        
        if (session && !sessionError) {
          console.log('✅ Session already exists, validation successful')
          clearTimeout(timeoutId)
          setIsValidating(false)
          return
        }

        // Try PKCE code from query params first
        console.log('🔍 Checking codeFromQuery:', !!codeFromQuery)
        if (codeFromQuery) {
          console.log('✅ Code found in query params, attempting PKCE exchange...')
          console.log('Code (first 20 chars):', codeFromQuery.substring(0, 20) + '...')
          console.log('Full code:', codeFromQuery)
          try {
            console.log('🔄 Starting code exchange...')
            console.log('🔄 Calling supabase.auth.exchangeCodeForSession...')
            
            // Add a timeout wrapper to prevent hanging
            const exchangePromise = supabase.auth.exchangeCodeForSession(codeFromQuery)
              .then((result) => {
                console.log('📥 Exchange promise resolved:', {
                  hasData: !!result.data,
                  hasError: !!result.error,
                  dataKeys: result.data ? Object.keys(result.data) : null,
                  errorMessage: result.error?.message || null
                })
                return result
              })
              .catch((err) => {
                console.error('❌ Exchange promise rejected:', err)
                throw err
              })
            
            const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
              setTimeout(() => {
                console.error('⏱️ Code exchange timed out after 10 seconds')
                resolve({ 
                  data: null,
                  error: { message: 'Code exchange timed out. Please try requesting a new password reset.' } 
                })
              }, 10000) // 10 second timeout for the exchange
            })
            
            console.log('🔄 Racing exchange promise against timeout...')
            const result = await Promise.race([exchangePromise, timeoutPromise])
            console.log('🏁 Race completed, result:', {
              hasData: !!result.data,
              hasError: !!result.error,
              resultType: typeof result
            })
            clearTimeout(timeoutId)
            
            if (result.error) {
              console.error('❌ PKCE exchange error:', result.error)
              console.error('Error details:', JSON.stringify(result.error, null, 2))
              setValidationError(result.error.message || 'Failed to validate recovery code')
              setIsValidating(false)
              return
            }
            
            if (result.data) {
              console.log('✅ PKCE exchange successful!')
              console.log('Exchange result data:', {
                hasSession: !!result.data.session,
                hasUser: !!result.data.user,
                sessionKeys: result.data.session ? Object.keys(result.data.session) : null
              })
              
              // Check if we got a session
              const { data: { session }, error: sessionError } = await supabase.auth.getSession()
              if (session) {
                console.log('✅ Session confirmed after exchange - validation successful')
                setIsValidating(false)
                return
              } else if (sessionError) {
                console.warn('⚠️ Session check error:', sessionError)
                // Still allow password reset - sometimes the session is created but not immediately available
                console.log('⚠️ Allowing password reset despite session check error')
                setIsValidating(false)
                return
              } else {
                console.warn('⚠️ Exchange succeeded but no session found - allowing password reset anyway')
                // Still allow password reset - sometimes the session is created but not immediately available
                setIsValidating(false)
                return
              }
            }
            
            // If we get here, something unexpected happened
            console.error('❌ Unexpected exchange result format:', result)
            console.error('Result keys:', Object.keys(result))
            setValidationError('Unexpected response from authentication server')
            setIsValidating(false)
          } catch (err: any) {
            clearTimeout(timeoutId)
            console.error('❌ PKCE exchange exception:', err)
            console.error('Exception details:', err?.stack || err)
            console.error('Exception message:', err?.message)
            setValidationError(err?.message || 'An error occurred during code exchange')
            setIsValidating(false)
          }
        }
        // Try PKCE code from hash
        else if (codeFromHash) {
          console.log('Attempting PKCE exchange with hash code:', codeFromHash.substring(0, 20) + '...')
          try {
            // Add a timeout wrapper to prevent hanging
            const exchangePromise = supabase.auth.exchangeCodeForSession(codeFromHash)
            const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) => {
              setTimeout(() => {
                resolve({ error: { message: 'Code exchange timed out. Please try requesting a new password reset.' } })
              }, 10000) // 10 second timeout for the exchange
            })
            
            const result = await Promise.race([exchangePromise, timeoutPromise])
            clearTimeout(timeoutId)
            
            if ('error' in result && result.error) {
              console.error('PKCE exchange error:', result.error)
              setValidationError(result.error.message || 'Failed to validate recovery code')
              setIsValidating(false)
            } else if ('data' in result) {
              console.log('PKCE exchange successful')
              setIsValidating(false)
              return
            }
          } catch (err: any) {
            clearTimeout(timeoutId)
            console.error('PKCE exchange exception:', err)
            setValidationError(err?.message || 'An error occurred during code exchange')
            setIsValidating(false)
          }
        }
        // Try token-based flow from hash
        else if (hashParams && accessToken) {
          console.log('Attempting token-based session setup')
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })
          clearTimeout(timeoutId)
          if (setSessionError) {
            console.error('Session setup error:', setSessionError)
            setValidationError(setSessionError.message || 'Failed to validate reset link')
          } else {
            console.log('Session setup successful')
            setIsValidating(false)
            return
          }
        }
        // No code or token found - this usually means the redirect URL isn't whitelisted
        else {
          console.error('❌ CRITICAL: No code, token, or access_token found in URL!')
          console.error('This means the redirect URL is NOT whitelisted in Supabase.')
          console.error('Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')
          console.error('Expected redirect URL should be whitelisted: http://localhost:3001/auth/reset-password')
          
          // Check referrer to see if we came from Supabase verify endpoint
          const referrer = typeof document !== 'undefined' ? document.referrer : ''
          const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
          
          console.log('Referrer:', referrer)
          console.log('Current URL:', currentUrl)
          
          // If we came from Supabase's verify endpoint but have no code, URL is definitely not whitelisted
          if (referrer.includes('supabase.co/auth/v1/verify')) {
            console.error('❌ Detected redirect from Supabase verify endpoint but no code was passed!')
            console.error('This confirms the redirect URL is NOT whitelisted in Supabase.')
            clearTimeout(timeoutId)
            setValidationError(
              'CRITICAL ERROR: Redirect URL not whitelisted. ' +
              'Supabase redirected from verify endpoint but did not pass the recovery code. ' +
              'Please add "http://localhost:3001/auth/reset-password" to your Supabase Dashboard → ' +
              'Authentication → URL Configuration → Redirect URLs. ' +
              'Then request a new password reset email.'
            )
            setIsValidating(false)
            return
          }
          
          // Give a brief moment for auth state to potentially change (in case of race condition)
          // But fail fast if nothing happens
          let resolved = false
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change:', event, session ? 'has session' : 'no session')
            if (!resolved && (event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED' || (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')))) {
              resolved = true
              clearTimeout(timeoutId)
              console.log('Auth state change resolved validation')
              setIsValidating(false)
              subscription.unsubscribe()
            }
          })
          
          // Check session immediately and periodically
          const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session && !resolved) {
              resolved = true
              clearTimeout(timeoutId)
              console.log('Session found')
              setIsValidating(false)
              subscription.unsubscribe()
              return true
            }
            return false
          }
          
          // Check immediately first
          if (await checkSession()) {
            return
          }
          
          // Then check periodically
          const checkInterval = setInterval(async () => {
            if (await checkSession()) {
              clearInterval(checkInterval)
            }
          }, 500)
          
          // Fail fast - show error after 3 seconds if no session found
          // This is much faster than the 20-second timeout
          setTimeout(() => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeoutId)
              clearInterval(checkInterval)
              console.error('❌ No session found after waiting - redirect URL likely not whitelisted')
              setValidationError(
                'CRITICAL ERROR: The redirect URL is not configured in Supabase. ' +
                'Please add "http://localhost:3001/auth/reset-password" to your Supabase Dashboard → ' +
                'Authentication → URL Configuration → Redirect URLs. ' +
                'Then request a new password reset email. ' +
                'If you clicked a reset link and see this error, it means Supabase did not pass the recovery code because the URL is not whitelisted.'
              )
              setIsValidating(false)
              subscription.unsubscribe()
            }
          }, 3000) // Reduced from 5000 to 3000 for faster failure
          
          return // Don't set isValidating to false yet, wait for auth state change or timeout
        }
        
        setIsValidating(false)
      } catch (err: any) {
        clearTimeout(timeoutId)
        console.error('Validation error:', err)
        setValidationError(err?.message || 'An error occurred validating the reset link')
        setIsValidating(false)
      }
    }
    
    validateResetLink()
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}










