'use client'

import { useAuth } from '@/components/providers'
import { authService } from '@/lib/auth'
import { LogOut, Settings, User, Crown, Loader2, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Logo } from '@/components/logo'

export function DashboardHeader() {
  const { user, role, profile, signOut, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showMaintenanceMenu, setShowMaintenanceMenu] = useState(false)
  const [showEmailMenu, setShowEmailMenu] = useState(false)
  const maintenanceMenuRef = useRef<HTMLDivElement>(null)
  const emailMenuRef = useRef<HTMLDivElement>(null)

  // Close maintenance menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (maintenanceMenuRef.current && !maintenanceMenuRef.current.contains(event.target as Node)) {
        setShowMaintenanceMenu(false)
      }
      if (emailMenuRef.current && !emailMenuRef.current.contains(event.target as Node)) {
        setShowEmailMenu(false)
      }
    }

    if (showMaintenanceMenu || showEmailMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMaintenanceMenu, showEmailMenu])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      // Use window.location for a hard redirect to avoid any routing issues
      // This prevents infinite loops and ensures clean logout
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'
      }
    } catch (error) {
      console.error('Sign out error:', error)
      // Still redirect even on error to ensure user gets to auth page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'
      }
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
          {/* Logo and Title - clickable to go to dashboard */}
          <a href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center">
              <Logo className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              MyGuests
            </h1>
          </a>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            
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
            
            {/* Maintenance Dropdown Menu - Cleanings and Cleaners */}
            {authService.canAccessCleanings(role) && (
              <div className="relative" ref={maintenanceMenuRef}>
                <button
                  onClick={() => setShowMaintenanceMenu(!showMaintenanceMenu)}
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  Maintenance
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showMaintenanceMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showMaintenanceMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <a
                      href="/cleanings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-t-md"
                      onClick={() => setShowMaintenanceMenu(false)}
                    >
                      Cleanings
                    </a>
                    {authService.canAccessProperties(role) && (
                      <a
                        href="/cleaners"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => setShowMaintenanceMenu(false)}
                      >
                        Cleaners
                      </a>
                    )}
                    {authService.canAccessProperties(role) && (
                      <a
                        href="/send-cleanings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => setShowMaintenanceMenu(false)}
                      >
                        Send Jobs
                      </a>
                    )}
                    {authService.canAccessProperties(role) && (
                      <a
                        href="/reports"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-b-md"
                        onClick={() => setShowMaintenanceMenu(false)}
                      >
                        Reports
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reports - Standalone link for cleaners only */}
            {role === 'cleaner' && (
              <a
                href="/reports"
                className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Reports
              </a>
            )}

            {/* Email Dropdown Menu - Email Logs and Templates */}
            {(authService.canAccessProperties(role) || role === 'host') && (
              <div className="relative" ref={emailMenuRef}>
                <button
                  onClick={() => setShowEmailMenu(!showEmailMenu)}
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  Email
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showEmailMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showEmailMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    {authService.canAccessProperties(role) && (
                      <a
                        href="/email-logs"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-t-md"
                        onClick={() => setShowEmailMenu(false)}
                      >
                        Email Logs
                      </a>
                    )}
                    {role === 'host' && (
                      <a
                        href="/email-templates"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-b-md"
                        onClick={() => setShowEmailMenu(false)}
                      >
                        Email Templates
                      </a>
                    )}
                  </div>
                )}
              </div>
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