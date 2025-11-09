import { AuthenticatedRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { BookingsReport } from '@/components/reports/bookings-report'

// In demo mode, AuthenticatedRoute will not redirect; the page will render

export default function DashboardPage() {
  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Message */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to MyGuests
            </h2>
            <p className="text-gray-600 mb-4">
              Your short-term rental management app is now running successfully!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Properties</h3>
                <p className="text-blue-700">Manage your rental properties</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900">Bookings</h3>
                <p className="text-green-700">Track guest reservations</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900">Reports</h3>
                <p className="text-purple-700">Generate revenue reports</p>
              </div>
            </div>
          </div>

          {/* Bookings Report */}
          <BookingsReport />

          {/* Setup Instructions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Next Steps to Complete Setup
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Set up Supabase</p>
                  <p className="text-gray-600 text-sm">Create your database and configure environment variables</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Add Airbnb Calendar</p>
                  <p className="text-gray-600 text-sm">Connect your Airbnb ICS calendar URL</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Deploy to Vercel</p>
                  <p className="text-gray-600 text-sm">Push to GitHub and deploy your app</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
    </AuthenticatedRoute>
  )
} 