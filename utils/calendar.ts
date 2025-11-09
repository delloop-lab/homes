import ical from 'node-ical'
import { format, parseISO, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  location?: string
  status: 'confirmed' | 'pending' | 'cancelled'
  platform?: 'airbnb' | 'vrbo' | 'booking' | 'other'
  source?: string
  color?: string
}

export interface BookingDate {
  date: Date
  isBooked: boolean
  bookingId?: string
  guestName?: string
}

export interface CalendarSource {
  name: string
  platform: 'airbnb' | 'vrbo' | 'booking' | 'other'
  url: string
  color: string
  enabled: boolean
}

/**
 * Parse ICS calendar from any platform and return events
 */
export async function parseICSCalendar(
  icsUrl: string, 
  platform: 'airbnb' | 'vrbo' | 'booking' | 'other' = 'other'
): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(icsUrl)
    const icsData = await response.text()
    
    const events = ical.parseICS(icsData)
    const calendarEvents: CalendarEvent[] = []
    
    for (const [id, event] of Object.entries(events)) {
      if (event.type === 'VEVENT') {
        // Extract booking details based on platform
        const bookingDetails = parseBookingDetails(event, platform)
        
        calendarEvents.push({
          id: `${platform}-${id}`,
          title: bookingDetails.title,
          start: event.start || new Date(),
          end: event.end || new Date(),
          description: event.description,
          location: event.location,
          status: bookingDetails.status,
          platform: platform
        })
      }
    }
    
    return calendarEvents
  } catch (error) {
    console.error(`Error parsing ${platform} calendar:`, error)
    return []
  }
}

/**
 * Parse booking details from different platforms
 */
function parseBookingDetails(
  event: any, 
  platform: 'airbnb' | 'vrbo' | 'booking' | 'other'
): { title: string; status: 'confirmed' | 'pending' | 'cancelled' } {
  const summary = event.summary || ''
  const description = event.description || ''
  
  switch (platform) {
    case 'airbnb':
      // Airbnb typically uses "Reserved" or "Blocked" in titles
      if (summary.toLowerCase().includes('blocked')) {
        return { title: 'Blocked (Airbnb)', status: 'confirmed' }
      }
      return { title: summary || 'Airbnb Booking', status: 'confirmed' }
      
    case 'vrbo':
      // VRBO often includes booking status in description
      if (description.toLowerCase().includes('confirmed')) {
        return { title: summary || 'VRBO Booking', status: 'confirmed' }
      }
      if (description.toLowerCase().includes('pending')) {
        return { title: summary || 'VRBO Booking (Pending)', status: 'pending' }
      }
      return { title: summary || 'VRBO Booking', status: 'confirmed' }
      
    case 'booking':
      // Booking.com format
      if (summary.toLowerCase().includes('cancelled')) {
        return { title: summary || 'Booking.com (Cancelled)', status: 'cancelled' }
      }
      return { title: summary || 'Booking.com Reservation', status: 'confirmed' }
      
    default:
      return { title: summary || 'Booking', status: 'confirmed' }
  }
}

/**
 * Merge calendars from multiple sources
 */
export async function mergeMultipleCalendars(sources: CalendarSource[]): Promise<CalendarEvent[]> {
  const allEvents: CalendarEvent[] = []
  
  for (const source of sources) {
    if (!source.enabled || !source.url) continue
    
    try {
      const events = await parseICSCalendar(source.url, source.platform)
      // Add source information to each event
      const eventsWithSource = events.map(event => ({
        ...event,
        source: source.name,
        color: source.color
      }))
      allEvents.push(...eventsWithSource)
    } catch (error) {
      console.error(`Failed to fetch calendar from ${source.name}:`, error)
    }
  }
  
  // Sort events by start date
  return allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

/**
 * Legacy function for backward compatibility
 */
export async function parseAirbnbCalendar(icsUrl: string): Promise<CalendarEvent[]> {
  return parseICSCalendar(icsUrl, 'airbnb')
}

/**
 * Generate calendar days for a given month
 */
export function generateCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Add days from previous month to fill first week
  const firstDayOfWeek = firstDay.getDay()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  
  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day))
  }
  
  // Add days from next month to fill last week
  const lastDayOfWeek = lastDay.getDay()
  for (let day = 1; day <= 6 - lastDayOfWeek; day++) {
    days.push(new Date(year, month + 1, day))
  }
  
  return days
}

/**
 * Check if a date is booked based on events
 */
export function isDateBooked(date: Date, events: CalendarEvent[]): boolean {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)
  
  return events.some(event => {
    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)
    
    return isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
           isWithinInterval(dayEnd, { start: eventStart, end: eventEnd }) ||
           isWithinInterval(eventStart, { start: dayStart, end: dayEnd })
  })
}

/**
 * Format date for display
 */
export function formatDate(date: Date, formatStr: string = 'MMM dd, yyyy'): string {
  return format(date, formatStr)
}

/**
 * Calculate booking duration in days
 */
export function calculateBookingDuration(checkIn: Date, checkOut: Date): number {
  const diffTime = checkOut.getTime() - checkIn.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Generate date range for a booking
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  let currentDate = new Date(startDate)
  
  while (currentDate < endDate) {
    dates.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }
  
  return dates
} 