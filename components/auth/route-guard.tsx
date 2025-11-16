'use client'

import { useAuth } from '@/components/providers'
import { authService, UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requireAuth?: boolean
  redirectTo?: string
}

export function RouteGuard({ 
  children, 
  requiredRole, 
  requireAuth = true, 
  redirectTo = '/auth' 
}: RouteGuardProps) {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const demoMode =
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  useEffect(() => {
    if (loading) return

    if (demoMode) {
      // In demo mode, do not redirect anywhere
      return
    }

    // If authentication is required but user is not logged in
    if (requireAuth && !user) {
      router.push(redirectTo)
      return
    }

    // Wait for role to resolve before enforcing role-based redirects
    // But don't wait forever - if we have user metadata, use that
    if (requireAuth && user && requiredRole && role === null) {
      // Give it a moment, but don't block indefinitely
      // The auth provider will set role from metadata quickly
      return
    }

    // If specific role is required but user doesn't have permission
    if (requiredRole && !authService.hasPermission(role, requiredRole)) {
      // Redirect to appropriate page based on user role
      if (role === 'cleaner') {
        router.push('/cleaner-schedule')
      } else if (role === 'host') {
        router.push('/')
      } else {
        router.push('/unauthorized')
      }
      return
    }
  }, [user, loading, role, requiredRole, requireAuth, redirectTo, router])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (demoMode) {
    return <>{children}</>
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    return null // Router.push will handle the redirect
  }

  // If role is required but still resolving, show a loading indicator
  if (requireAuth && user && requiredRole && role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If specific role is required but user doesn't have permission
  if (requiredRole && !authService.hasPermission(role, requiredRole)) {
    return null // Router.push will handle the redirect
  }

  return <>{children}</>
}

// Convenience components for specific roles
export function HostOnlyRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requiredRole="host" requireAuth={true}>
      {children}
    </RouteGuard>
  )
}

export function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth={true}>
      {children}
    </RouteGuard>
  )
}

export function CleanerOnlyRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requiredRole="cleaner" requireAuth={true}>
      {children}
    </RouteGuard>
  )
}

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requiredRole="admin" requireAuth={true}>
      {children}
    </RouteGuard>
  )
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth={false}>
      {children}
    </RouteGuard>
  )
}