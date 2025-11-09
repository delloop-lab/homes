'use client'

import { useAuth } from '@/components/providers'
import { authService } from '@/lib/auth'
import { LogOut, Settings, User, Crown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/logo'

export function DashboardHeader() {
  const { user, role, profile, signOut, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    if (profile?.full_name) {
      return profile.full_name
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    return user?.email?.split('@')[0] || 'User'
  }

  const getRoleColor = () => {
    return role === 'host' ? 'text-blue-600' : 'text-green-600'
  }

  const getRoleLabel = () => {
    return role === 'host' ? 'Host' : 'Cleaner'
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center">
              <Logo className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              MyGuests
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a
              href="/"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </a>
            
            {authService.canAccessProperties(role) && (
              <a
                href="/properties"
                className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Properties
              </a>
            )}
            
            {authService.canAccessBookings(role) && (
              <a
                href="/bookings"
                className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Bookings
              </a>
            )}
            
            {authService.canAccessCalendar(role) && (
              <a
                href="/calendar"
                className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Calendar
              </a>
            )}

            {authService.canAccessBookings(role) && (
              <a
                href="/schedule"
                className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Schedule
              </a>
            )}
            
            {authService.canAccessCleanings(role) && (
              <>
                <a
                  href="/cleanings"
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Cleanings
                </a>
                <a
                  href="/send-cleanings"
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Send Jobs
                </a>
              </>
            )}

            {authService.canAccessProperties(role) && (
              <>
                <a
                  href="/cleaners"
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Cleaners
                </a>
                <a
                  href="/email-logs"
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Email Logs
                </a>
              </>
            )}
            {role === 'host' && (
              <a
                href="/email-templates"
                className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Email Templates
              </a>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <a 
              href="/settings" 
              className="p-2 text-gray-400 hover:text-gray-500"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </a>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {getUserDisplayName()}
                </div>
                <div className={`text-xs ${getRoleColor()} flex items-center`}>
                  {role === 'host' && <Crown className="h-3 w-3 mr-1" />}
                  {getRoleLabel()}
                </div>
              </div>
              
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              )}
            </div>

            <button 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="p-2 text-gray-400 hover:text-gray-500 disabled:opacity-50"
              title="Sign Out"
            >
              {isSigningOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
} 