import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ical from 'node-ical'
import { format } from 'date-fns'

interface ICSEvent {
  type: string
  summary?: string
  description?: string
  start?: Date
  end?: Date
  uid?: string
  location?: string
  status?: string
  url?: string
}

interface BookingData {
  event_uid: string
  guest_name: string
  contact_email?: string
  contact_phone?: string
  guest_first_name?: string
  guest_last_initial?: string
  check_in: string
  check_out: string
  booking_platform: string
  status: 'confirmed' | 'pending' | 'cancelled'
  notes?: string
  reservation_url?: string
  guest_phone_last4?: string
  listing_name?: string
  property_id: string
  total_amount?: number
}

// Platform-specific parsing logic
function parseEventByPlatform(event: ICSEvent, platform: string): Partial<BookingData> | null {
  const summary = event.summary || ''
  const description = event.description || ''
  
  switch (platform) {
    case 'airbnb':
      return parseAirbnbEvent(event, summary, description)
    case 'vrbo':
      return parseVrboEvent(event, summary, description)
    case 'booking':
      return parseBookingComEvent(event, summary, description)
    default:
      return parseGenericEvent(event, summary, description)
  }
}

function parseAirbnbEvent(event: ICSEvent, summary: string, description: string): Partial<BookingData> | null {
  const lsum = (summary || '').toLowerCase()
  const ldesc = (description || '').toLowerCase()

  // Check if this is a blocked date (import these too!)
  const isBlockedDate = lsum.includes('not available') || lsum.includes('blocked') || 
                        lsum.includes('unavailable') || lsum.includes('closed')
  
  if (isBlockedDate) {
    // Import as a blocked date with status 'cancelled' so it shows as unavailable
    return {
      guest_name: 'Blocked - Not Available',
      booking_platform: 'airbnb',
      status: 'cancelled',
      notes: summary || 'Property blocked on Airbnb'
    }
  }

  // Use only values present in the ICS feed. Do not generate synthetic names.
  // Try to extract an explicit name from the description first, then fall back to summary.

  const tryExtractFromDescription = (): string | null => {
    if (!description) return null
    const lines = description.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const patterns = [
      /guest\s*[:\-]\s*(.+)/i,
      /name\s*[:\-]\s*(.+)/i,
      /reserved\s*for\s*(.+)/i,
      /reservation\s*for\s*(.+)/i
    ]
    for (const line of lines) {
      for (const p of patterns) {
        const m = line.match(p)
        if (m && m[1]) return m[1].trim()
      }
    }
    return null
  }

  const extracted = tryExtractFromDescription()
  let candidate = (extracted || '').trim()
  if (!candidate && summary) {
    const sum = summary.trim()
    const summaryPatterns = [
      /^(.+?)\s*-\s*airbnb/i,         // "John Doe - Airbnb"
      /airbnb\s*[:\-]\s*(.+)/i,      // "Airbnb: John Doe"
      /reserved\s*[:\-]\s*(.+)/i,    // "Reserved: John Doe"
      /^(.+?)\s*\(airbnb\)/i,        // "John Doe (Airbnb)"
      /^([^\-\(\)]+?)(?:\s*-|\s*\(|$)/ // take leading text
    ]
    for (const p of summaryPatterns) {
      const m = sum.match(p)
      if (m && m[1]) {
        candidate = m[1].trim()
        break
      }
    }
    if (!candidate) candidate = sum
  }

  let status: 'confirmed' | 'pending' | 'cancelled' = 'confirmed'
  if (lsum.includes('pending') || ldesc.includes('pending')) {
    status = 'pending'
  }
  if (lsum.includes('cancelled') || ldesc.includes('cancelled')) {
    status = 'cancelled'
  }

  // Normalize generic placeholders
  const normalized = candidate
    .replace(/\b(reserved|not available|blocked)\b/gi, '')
    .trim()

  const lowerSum = (summary || '').toLowerCase()
  const lowerDesc = (description || '').toLowerCase()
  const hasReservationKeyword = /\b(reserved|reservation)\b/.test(lowerSum) || /\b(reserved|reservation)\b/.test(lowerDesc)
  const looksLikeName = /[a-zA-Z]{2,}\s+[a-zA-Z]{2,}/.test(normalized)

  // Strict filter: skip events that look like generic platform blocks with no real details
  if (!hasReservationKeyword && !looksLikeName) {
    // Example summaries to skip: "Airbnb", "Not available", etc.
    return null
  }

  // Extract additional metadata and derive first name/last initial when possible
  const details = extractAirbnbDetails(description, event.location, event.url)
  let guest_first_name: string | undefined
  let guest_last_initial: string | undefined
  const nameMatch = normalized.match(/^([A-Za-z]+)\s+([A-Za-z])[A-Za-z]*\.?$/)
  if (nameMatch) {
    guest_first_name = nameMatch[1]
    guest_last_initial = nameMatch[2].toUpperCase()
  }

  return {
    guest_name: normalized || (summary?.trim() || 'Reserved'),
    booking_platform: 'airbnb',
    status,
    notes: description || undefined,
    reservation_url: details.reservation_url,
    guest_phone_last4: details.guest_phone_last4,
    listing_name: details.listing_name,
    guest_first_name,
    guest_last_initial
  }
}

function extractAirbnbDetails(
  description?: string,
  location?: string,
  urlFromEvent?: string
): { reservation_url?: string; guest_phone_last4?: string; listing_name?: string } {
  let reservation_url: string | undefined
  let guest_phone_last4: string | undefined
  let listing_name: string | undefined

  if (description) {
    const lines = description.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const urlMatch = line.match(/https?:\/\/(?:www\.)?airbnb\.com\S+/i)
      if (urlMatch && urlMatch[0]) {
        reservation_url = urlMatch[0]
      }
      const mentionsPhone = /phone|tel|telephone|contact/i.test(line)
      if (mentionsPhone && !guest_phone_last4) {
        const phoneMatch = line.match(/(\d{3}[-\s]?)?\d{3}[-\s]?(\d{4})\b/)
        if (phoneMatch && phoneMatch[2]) {
          guest_phone_last4 = phoneMatch[2]
        } else {
          const last4Match = line.match(/\*{0,4}(\d{4})\b/)
          if (last4Match && last4Match[1]) {
            guest_phone_last4 = last4Match[1]
          }
        }
      }
      const listingMatch = line.match(/listing\s*[:\-]\s*(.+)/i)
      if (!listing_name && listingMatch && listingMatch[1]) {
        listing_name = listingMatch[1].trim()
      }
    }
  }

  // Fallbacks: use event URL and location if provided by ICS
  if (!reservation_url && urlFromEvent) {
    reservation_url = urlFromEvent
  }
  if (!listing_name && location) {
    const trimmed = location.trim()
    if (trimmed && !/^unknown$/i.test(trimmed)) {
      listing_name = trimmed
    }
  }

  return { reservation_url, guest_phone_last4, listing_name }
}

function parseVrboEvent(event: ICSEvent, summary: string, description: string): Partial<BookingData> | null {
  const lsum = (summary || '').toLowerCase()
  const ldesc = (description || '').toLowerCase()

  // Skip blocked/closed/generic events
  if (lsum.includes('blocked') || lsum.includes('closed') || lsum.includes('not available') || 
      lsum.includes('unavailable') || lsum.includes('maintenance')) {
    return null
  }

  // Require reservation context
  const hasReservationKeyword = /\b(reserved|reservation|booking)\b/.test(lsum) || 
                               /\b(reserved|reservation|booking)\b/.test(ldesc)
  if (!hasReservationKeyword) {
    return null
  }

  let extractedName: string | undefined

  // Try to extract a guest name from common formats
  const patterns = [
    /(?:reserved)\s*-\s*(.+)/i,
    /^(.+?)\s*-\s*vrbo/i,
    /vrbo:\s*(.+)/i,
    /^(.+?)\s*\(vrbo\)/i,
    /^([^\-\(\)]+?)(?:\s*-|\s*\(|$)/
  ]
  for (const pattern of patterns) {
    const match = summary.match(pattern)
    if (match && match[1]) {
      const candidate = match[1].trim()
      if (candidate.length > 0) {
        extractedName = candidate
        break
      }
    }
  }

  // Fallback to description for explicit labels
  if (!extractedName && description) {
    const descPatterns = [
      /guest\s*[:\-]\s*(.+)/i,
      /name\s*[:\-]\s*(.+)/i,
      /renter\s*[:\-]\s*(.+)/i,
      /traveler\s*[:\-]\s*(.+)/i
    ]
    for (const pattern of descPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        const candidate = match[1].trim().split('\n')[0]
        if (candidate.length > 0) {
          extractedName = candidate
          break
        }
      }
    }
  }

  // Normalize and validate the extracted name
  const normalized = (extractedName || summary || '')
    .replace(/\b(reserved|not available|blocked|vrbo)\b/gi, '')
    .trim()

  // Skip if no plausible guest name found
  const looksLikeName = /[a-zA-Z]{2,}\s+[a-zA-Z]{2,}/.test(normalized) || 
                       /^[A-Za-z]+\s+[A-Za-z]\.?$/.test(normalized)
  
  if (!looksLikeName && !hasReservationKeyword) {
    return null
  }

  let status: 'confirmed' | 'pending' | 'cancelled' = 'confirmed'
  if (lsum.includes('pending') || ldesc.includes('pending')) status = 'pending'
  if (lsum.includes('cancelled') || ldesc.includes('cancelled')) status = 'cancelled'

  return {
    guest_name: normalized || 'VRBO Guest',
    booking_platform: 'vrbo',
    status,
    notes: description || undefined
  }
}

function parseBookingComEvent(event: ICSEvent, summary: string, description: string): Partial<BookingData> | null {
  const lsum = (summary || '').toLowerCase()
  const ldesc = (description || '').toLowerCase()

  // Import blocked/closed dates as bookings so they show in calendar
  const isBlockedDate = lsum.includes('blocked') || lsum.includes('closed') || 
                        lsum.includes('not available') || lsum.includes('unavailable')
  
  if (isBlockedDate) {
    // Import as a blocked date with status 'cancelled' so it shows as unavailable
    return {
      guest_name: 'Blocked - Not Available',
      booking_platform: 'booking',
      status: 'cancelled',
      notes: summary || 'Property blocked on Booking.com'
    }
  }

  // For maintenance, still skip
  if (lsum.includes('maintenance')) {
    return null
  }

  // Require reservation context for actual bookings
  const hasReservationKeyword = /\b(reserved|reservation|booking)\b/.test(lsum) || 
                               /\b(reserved|reservation|booking)\b/.test(ldesc)
  if (!hasReservationKeyword) {
    return null
  }

  let extractedName: string | undefined
  const patterns = [
    /^(.+?)\s*-\s*booking\.com/i,
    /^(.+?)\s*\(booking\.com\)/i,
    /^(.+?)\s*-\s*reservation/i,
    /booking\.com:\s*(.+)/i,
    /reserved\s+for\s+(.+)/i,
    /^([^\-\(\)]+)(?:\s*-|\s*\(|$)/
  ]
  for (const pattern of patterns) {
    const match = summary.match(pattern)
    if (match && match[1]) {
      const candidate = match[1].trim()
      if (candidate.length > 0 && !candidate.toLowerCase().includes('booking.com')) {
        extractedName = candidate
        break
      }
    }
  }

  if (!extractedName && description) {
    const descPatterns = [
      /guest\s*[:\-]\s*(.+)/i,
      /name\s*[:\-]\s*(.+)/i,
      /reserved\s+for\s+(.+)/i
    ]
    for (const pattern of descPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        const candidate = match[1].trim().split('\n')[0]
        if (candidate.length > 0) {
          extractedName = candidate
          break
        }
      }
    }
  }

  // Normalize and validate the extracted name
  const normalized = (extractedName || summary || '')
    .replace(/\b(reserved|not available|blocked|booking\.com)\b/gi, '')
    .trim()

  // Skip if no plausible guest name found
  const looksLikeName = /[a-zA-Z]{2,}\s+[a-zA-Z]{2,}/.test(normalized) || 
                       /^[A-Za-z]+\s+[A-Za-z]\.?$/.test(normalized)
  
  if (!looksLikeName && !hasReservationKeyword) {
    return null
  }

  let status: 'confirmed' | 'pending' | 'cancelled' = 'confirmed'
  if (lsum.includes('cancelled') || ldesc.includes('cancelled')) status = 'cancelled'

  return {
    guest_name: normalized || 'Booking.com Guest',
    booking_platform: 'booking',
    status,
    notes: description || undefined
  }
}

function parseGenericEvent(event: ICSEvent, summary: string, description: string): Partial<BookingData> | null {
  const lsum = (summary || '').toLowerCase()
  const ldesc = (description || '').toLowerCase()

  // Skip blocked/closed/generic events
  if (lsum.includes('blocked') || lsum.includes('closed') || lsum.includes('not available')) {
    return null
  }

  // Require reservation context
  const mentionsReservation = /reserved|reservation|booking/.test(lsum) || /reserved|reservation|booking/.test(ldesc)
  if (!mentionsReservation) {
    return null
  }

  let status: 'confirmed' | 'pending' | 'cancelled' = 'confirmed'
  if (lsum.includes('pending') || ldesc.includes('pending')) status = 'pending'
  if (lsum.includes('cancelled') || ldesc.includes('cancelled')) status = 'cancelled'

  return {
    guest_name: summary?.trim() || 'Guest',
    booking_platform: 'other',
    status,
    notes: description || undefined
  }
}

// Simple fetch with timeout to avoid hanging on slow ICS endpoints
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}

async function fetchAndParseICS(url: string, platform: string): Promise<Partial<BookingData>[]> {
  try {
    console.log(`Fetching ICS from ${platform}: ${url}`)
    
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Rental-Host-App/1.0'
      }
    }, 20000)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const icsData = await response.text()
    console.log(`Fetched ${icsData.length} characters of ICS data`)

    const events = ical.parseICS(icsData)
    const bookings: Partial<BookingData>[] = []

    for (const [uid, event] of Object.entries(events)) {
      if (event.type !== 'VEVENT' || !event.start || !event.end) {
        continue
      }

      const parsedEvent = parseEventByPlatform(event as ICSEvent, platform)
      if (!parsedEvent) {
        continue // Skip blocked dates or invalid events
      }

      const booking: Partial<BookingData> = {
        event_uid: event.uid || uid,
        check_in: event.start.toISOString(),
        check_out: event.end.toISOString(),
        ...parsedEvent
      }

      bookings.push(booking)
    }

    console.log(`Parsed ${bookings.length} bookings from ${platform}` )
    return bookings

  } catch (error) {
    console.error(`Error fetching/parsing ICS for ${platform}:`, error)
    throw error
  }
}

async function upsertBooking(supabase: any, booking: Partial<BookingData>, propertyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, try to fetch existing booking by event_uid and property
    let existing: any = null
    // Compose a storage UID to avoid collisions across platforms/properties
    const platform = (booking.booking_platform as string) || 'other'
    const storageEventUid = booking.event_uid ? `${platform}:${propertyId}:${booking.event_uid}` : undefined
    if (storageEventUid) {
      const { data: found } = await supabase
        .from('bookings')
        .select('*')
        .eq('event_uid', storageEventUid)
        .eq('property_id', propertyId)
        .maybeSingle()
      existing = found || null
    }

    // Helper function to get default currency for a platform
    const getPlatformCurrency = (platform?: string): string => {
      switch (platform?.toLowerCase()) {
        case 'vrbo':
          return 'EUR'
        case 'airbnb':
          return 'AUD'
        case 'booking':
        case 'booking.com':
          return 'EUR'
        default:
          return 'USD'
      }
    }

    // Determine currency: preserve existing currency, or set based on platform
    const currency = existing?.currency || getPlatformCurrency(booking.booking_platform as string)

    // Merge logic: preserve host-edited fields if a record already exists
    // Only fill these from feed when they are currently null/empty.
    const bookingData = {
      // Always update ICS-driven fields
      check_in: booking.check_in,
      check_out: booking.check_out,
      booking_platform: booking.booking_platform,
      status: booking.status,
      event_uid: storageEventUid,
      reservation_url: booking.reservation_url ?? existing?.reservation_url ?? null,
      guest_phone_last4: booking.guest_phone_last4 ?? existing?.guest_phone_last4 ?? null,
      listing_name: booking.listing_name ?? existing?.listing_name ?? null,
      guest_first_name: booking.guest_first_name ?? existing?.guest_first_name ?? null,
      guest_last_initial: booking.guest_last_initial ?? existing?.guest_last_initial ?? null,

      // Preserve host-entered fields when record exists
      guest_name: existing ? existing.guest_name : booking.guest_name,
      contact_email: existing ? existing.contact_email : (booking as any).contact_email,
      contact_phone: existing ? existing.contact_phone : (booking as any).contact_phone,
      total_amount: existing ? existing.total_amount : (booking as any).total_amount,
      notes: existing ? existing.notes : booking.notes,
      currency: currency,

      property_id: propertyId,
      updated_at: new Date().toISOString()
    }

    // Try to upsert (insert or update based on event_uid)
    const { data, error } = await supabase
      .from('bookings')
      .upsert(bookingData, {
        onConflict: 'event_uid'
      })

    if (error) {
      console.error('Supabase upsert error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Upsert booking error:', error)
    return { success: false, error: String(error) }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('Starting ICS sync at:', new Date().toISOString())

  try {
    // Parse request body
    const body = await request.json()
    const { property_id, sources, reconcile, platform } = body

    if (!property_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: property_id' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      )
    }

    // Build sources: prefer database-configured calendar_sources for this property
    let calendarSources: any[] = sources || []
    if (!calendarSources || calendarSources.length === 0) {
      const { data: dbSources, error: srcErr } = await supabase
        .from('calendar_sources')
        .select('name, platform, ics_url, sync_enabled')
        .eq('property_id', property_id)
        .eq('sync_enabled', true)

      if (!srcErr && dbSources && dbSources.length > 0) {
        calendarSources = dbSources
          .filter(s => !!s.ics_url)
          .map(s => ({ name: s.name, platform: s.platform, url: s.ics_url }))
      } else {
        // Fallback to environment variables
        calendarSources = [
          { name: 'Airbnb', platform: 'airbnb', url: process.env.AIRBNB_ICS_URL },
          { name: 'VRBO', platform: 'vrbo', url: process.env.VRBO_ICS_URL },
          { name: 'Booking.com', platform: 'booking', url: process.env.BOOKING_COM_ICS_URL }
        ]
      }
    }

    // If platform is specified, filter to only that platform
    if (platform) {
      calendarSources = calendarSources.filter(s => s.platform === platform)
      console.log(`Filtered to platform: ${platform}, found ${calendarSources.length} sources`)
    }

    // Validate ICS URLs (allow http/https; no .ics suffix required)
    const validateIcsUrl = (url?: string): boolean => {
      if (!url) return false
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
        return true
      } catch {
        return false
      }
    }

    calendarSources = calendarSources.filter(s => validateIcsUrl(s.url))

    const results = {
      success: true,
      totalProcessed: 0,
      totalErrors: 0,
      sources: [] as any[],
      processingTime: 0,
      platform: platform || 'all'
    }

    // Process each calendar source
    for (const source of calendarSources) {
      if (!source.url) {
        console.log(`Skipping ${source.name} - no URL configured`)
        continue
      }

      const sourceResult = {
        name: source.name,
        platform: source.platform,
        url: source.url,
        bookingsProcessed: 0,
        errors: [] as string[],
        success: true
      }

      try {
        // Fetch and parse ICS
        const bookings = await fetchAndParseICS(source.url, source.platform)
        
        // Upsert each booking
        for (const booking of bookings) {
          if (!booking.event_uid) {
            sourceResult.errors.push('Booking missing event_uid')
            continue
          }

          const upsertResult = await upsertBooking(supabase, booking, property_id)
          
          if (upsertResult.success) {
            sourceResult.bookingsProcessed++
            results.totalProcessed++
          } else {
            sourceResult.errors.push(`Failed to upsert booking ${booking.event_uid}: ${upsertResult.error}`)
            results.totalErrors++
          }
        }

        // Reconcile: delete existing bookings for this source that are no longer in feed (by platform and property)
        if (reconcile) {
          const existing = await supabase
            .from('bookings')
            .select('id, event_uid')
            .eq('property_id', property_id)
            .eq('booking_platform', source.platform)
          const feedUids = new Set(bookings.map(b => `${source.platform}:${property_id}:${b.event_uid}`))
          const toDelete = (existing.data || []).filter(b => b.event_uid && !feedUids.has(b.event_uid))
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase
              .from('bookings')
              .delete()
              .in('id', toDelete.map(b => b.id))
            if (delErr) {
              sourceResult.errors.push(`Reconcile delete failed: ${delErr.message}`)
              results.totalErrors++
            }
          }
        }

      } catch (error) {
        sourceResult.success = false
        sourceResult.errors.push(String(error))
        results.totalErrors++
        results.success = false
      }

      results.sources.push(sourceResult)
    }

    results.processingTime = Date.now() - startTime

    console.log('ICS sync completed:', {
      platform: results.platform,
      totalProcessed: results.totalProcessed,
      totalErrors: results.totalErrors,
      processingTime: results.processingTime
    })

    // Update calendar source sync status in database
    for (const source of results.sources) {
      await supabase
        .from('calendar_sources')
        .update({
          last_sync: new Date().toISOString(),
          sync_status: source.success ? 'success' : 'error',
          error_message: source.errors.length > 0 ? source.errors.join('; ') : null
        })
        .eq('property_id', property_id)
        .eq('platform', source.platform)
    }

    return NextResponse.json(results, { 
      status: results.success ? 200 : 207 // 207 = Multi-Status (partial success)
    })

  } catch (error) {
    console.error('ICS sync fatal error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error during ICS sync',
        details: String(error),
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// GET endpoint for health check and status
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const healthCheck = url.searchParams.get('health')

  if (healthCheck) {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        hasAirbnbUrl: !!process.env.AIRBNB_ICS_URL,
        hasVrboUrl: !!process.env.VRBO_ICS_URL,
        hasBookingUrl: !!process.env.BOOKING_COM_ICS_URL,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    })
  }

  return NextResponse.json(
    {
      message: 'ICS Sync API',
      methods: ['POST', 'GET'],
      usage: {
        POST: 'Sync calendar data for a property',
        GET: 'Health check (add ?health=true parameter)'
      }
    },
    { status: 200 }
  )
}