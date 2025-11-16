'use client'

import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { Home, Calendar, Sparkles, TrendingUp, Mail, Link2, CheckCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers'
import { useRouter } from 'next/navigation'

function FeatureSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { role, loading } = useAuth()
  const router = useRouter()

  // Redirect cleaners to their dashboard
  useEffect(() => {
    if (!loading && role === 'cleaner') {
      router.push('/cleaner-dashboard')
    }
  }, [role, loading, router])

  // Show loading while checking role
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render host dashboard for cleaners (they'll be redirected)
  if (role === 'cleaner') {
    return null
  }

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-5xl mb-4 animate-pulse">🏡</div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 animate-fade-in">
              Welcome to MyGuests
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 font-medium">
              Your short-term rental, finally running itself.
            </p>
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto mb-8 transform transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <p className="text-lg text-gray-700 leading-relaxed">
                You've got properties. You've got guests.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-2">
                Now you've got <span className="font-semibold text-blue-600">MyGuests</span> — the app that keeps your short-term rental business running smoothly while you get on with your life.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto space-y-16">
            
            {/* Properties Section */}
            <FeatureSection>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="text-4xl mb-4 transform transition-transform duration-300 hover:scale-110 inline-block">🏠</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    All your properties, one place
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    See every booking, every calendar, and every detail in one clean view.
                  </p>
                  <p className="text-lg text-gray-600">
                    Add or edit properties in seconds and manage them like a pro — without the spreadsheets or headaches.
                  </p>
                  <a 
                    href="/properties" 
                    className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg"
                  >
                    Manage Properties →
                  </a>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-8 h-64 flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <Home className="h-32 w-32 text-blue-600 opacity-50 transition-transform duration-300 hover:scale-110" />
                </div>
              </div>
            </FeatureSection>

            {/* Bookings & Calendar Section */}
            <FeatureSection delay={100}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg p-8 h-64 flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <Calendar className="h-32 w-32 text-green-600 opacity-50 transition-transform duration-300 hover:scale-110" />
                </div>
                <div className="order-1 md:order-2">
                  <div className="text-4xl mb-4 transform transition-transform duration-300 hover:scale-110 inline-block">📅</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Bookings & Calendar
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    No more double bookings or missed check-ins.
                  </p>
                  <p className="text-lg text-gray-600">
                    View everything on an easy visual calendar and get instant updates from Airbnb, Booking.com, and others.
                  </p>
                  <a 
                    href="/calendar" 
                    className="inline-block mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg"
                  >
                    View Calendar →
                  </a>
                </div>
              </div>
            </FeatureSection>

            {/* Cleaning & Scheduling Section */}
            <FeatureSection delay={200}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="text-4xl mb-4 transform transition-transform duration-300 hover:scale-110 inline-block">🧹</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Cleaning & Scheduling made easy
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    Assign cleaning jobs automatically, track who's done what, and make sure every guest walks into a perfect space — even when you're miles away.
                  </p>
                  <a 
                    href="/cleanings" 
                    className="inline-block mt-6 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg"
                  >
                    Manage Cleanings →
                  </a>
                </div>
                <div className="bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg p-8 h-64 flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <Sparkles className="h-32 w-32 text-teal-600 opacity-50 transition-transform duration-300 hover:scale-110" />
                </div>
              </div>
            </FeatureSection>

            {/* Reports Section */}
            <FeatureSection delay={300}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-8 h-64 flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <TrendingUp className="h-32 w-32 text-purple-600 opacity-50 transition-transform duration-300 hover:scale-110" />
                </div>
                <div className="order-1 md:order-2">
                  <div className="text-4xl mb-4 transform transition-transform duration-300 hover:scale-110 inline-block">💸</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Reports that actually mean something
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    See how much you're earning, which properties are performing, and where to grow next — all without exporting a single CSV.
                  </p>
                  <a 
                    href="/reports" 
                    className="inline-block mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg"
                  >
                    View Reports →
                  </a>
                </div>
              </div>
            </FeatureSection>

            {/* Smart Emails Section */}
            <FeatureSection delay={400}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="text-4xl mb-4 transform transition-transform duration-300 hover:scale-110 inline-block">✉️</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Smart emails & guest communication
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    Your templates, your tone, your rules.
                  </p>
                  <p className="text-lg text-gray-600">
                    Schedule messages or let MyGuests handle the follow-ups so guests always feel looked after.
                  </p>
                  <a 
                    href="/email-templates" 
                    className="inline-block mt-6 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg"
                  >
                    Manage Emails →
                  </a>
                </div>
                <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg p-8 h-64 flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <Mail className="h-32 w-32 text-pink-600 opacity-50 transition-transform duration-300 hover:scale-110" />
                </div>
              </div>
            </FeatureSection>

            {/* Platform Integration Section */}
            <FeatureSection delay={500}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg p-8 h-64 flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <Link2 className="h-32 w-32 text-violet-600 opacity-50 transition-transform duration-300 hover:scale-110" />
                </div>
                <div className="order-1 md:order-2">
                  <div className="text-4xl mb-4 transform transition-transform duration-300 hover:scale-110 inline-block">🔗</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Connected everywhere
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    MyGuests plays nicely with the big guys. Sync everything automatically, and stop jumping between apps to stay on top of things.
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-sm font-semibold text-gray-700 px-3 py-1 bg-gray-100 rounded-md transition-all duration-300 hover:bg-gray-200 hover:scale-105">Airbnb</span>
                    <span className="text-sm font-semibold text-gray-700 px-3 py-1 bg-gray-100 rounded-md transition-all duration-300 hover:bg-gray-200 hover:scale-105">Booking.com</span>
                    <span className="text-sm font-semibold text-gray-700 px-3 py-1 bg-gray-100 rounded-md transition-all duration-300 hover:bg-gray-200 hover:scale-105">VRBO</span>
                    <span className="text-sm font-semibold text-gray-700 px-3 py-1 bg-gray-100 rounded-md transition-all duration-300 hover:bg-gray-200 hover:scale-105">Expedia</span>
                  </div>
                  <a 
                    href="/properties" 
                    className="inline-block mt-6 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg"
                  >
                    Connect Platforms →
                  </a>
                </div>
              </div>
            </FeatureSection>
          </div>
        </section>

        {/* CTA Section */}
        <FeatureSection delay={600}>
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-16 px-4 sm:px-6 lg:px-8 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <div className="text-5xl mb-6 transform transition-transform duration-300 hover:scale-110 inline-block">✨</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to take your rentals seriously?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join the hosts who've made MyGuests their secret weapon for hassle-free short-term rental management.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/bookings" 
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 font-semibold text-lg inline-flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-xl"
                >
                  <CheckCircle className="h-5 w-5" />
                  Get Started
                </a>
                <a 
                  href="/schedule" 
                  className="px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all duration-300 font-semibold text-lg inline-flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-xl"
                >
                  <CheckCircle className="h-5 w-5" />
                  Explore Features
                </a>
              </div>
            </div>
          </section>
        </FeatureSection>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-sm text-gray-600">
              Email: lou@schillaci.me
            </div>
            <div className="flex-1 text-center text-sm text-gray-600">
              Copyright © 2025 Lou Schillaci. All rights Reserved
            </div>
            <div className="flex-1 text-right text-sm text-gray-500">
              Version Beta 0.76
            </div>
          </div>
        </div>
      </footer>
      </div>
    </AuthenticatedRoute>
  )
}
