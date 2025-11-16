/**
 * Helper functions for generating links to external booking platforms
 */

export interface BookingPlatformLink {
  url: string
  label: string
  platform: string
}

/**
 * Format platform name for display - ensures consistent capitalization
 * @param platform - Platform name (e.g., "booking", "booking.com", "airbnb")
 * @returns Formatted platform name (e.g., "Booking.com", "Airbnb")
 */
export function formatPlatformName(platform: string | null | undefined): string {
  if (!platform) return 'Manual'
  
  const normalized = platform.toLowerCase().trim()
  
  // Booking.com variations
  if (normalized === 'booking' || normalized === 'booking.com' || normalized.includes('booking')) {
    return 'Booking.com'
  }
  
  // Other platforms - capitalize first letter
  if (normalized === 'airbnb') return 'Airbnb'
  if (normalized === 'vrbo') return 'VRBO'
  if (normalized === 'manual') return 'Manual'
  if (normalized === 'other') return 'Other'
  
  // Generic: capitalize first letter of each word
  return platform.split(/[\s-]+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

/**
 * Generate a Booking.com reservation link
 * Note: The session token (ses) parameter is not included as it expires.
 * The link will work if the user is already logged into Booking.com, 
 * or will redirect to login first.
 * 
 * @param hotelId - Booking.com hotel ID (e.g., "4127707")
 * @param reservationId - Booking.com reservation ID (e.g., "4680936579")
 * @param lang - Language code (default: "en")
 * @returns Booking.com reservation URL
 */
export function generateBookingComLink(
  hotelId: string,
  reservationId: string,
  lang: string = 'en'
): string {
  if (!hotelId || !reservationId) {
    return ''
  }

  // Base URL for Booking.com extranet
  const baseUrl = 'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html'
  
  // Note: We don't include the 'ses' (session) parameter as it expires
  // The link will work if user is logged in, or redirect to login
  return `${baseUrl}?lang=${lang}&hotel_id=${hotelId}&res_id=${reservationId}`
}

/**
 * Generate platform-specific reservation links based on booking data
 * 
 * @param booking - Booking object with platform and external IDs
 * @param referralConfig - Referral site configuration (optional, from property settings)
 * @returns Platform link or null if not available
 */
export function getBookingPlatformLink(
  booking: {
    booking_platform?: string | null
    external_hotel_id?: string | null
    external_reservation_id?: string | null
    reservation_url?: string | null
  },
  referralConfig?: {
    platform?: string | null
    hotel_id?: string | null
    extranet_url?: string | null
    config_data?: any
  } | null
): BookingPlatformLink | null {
  if (!booking.booking_platform) {
    return null
  }

  const platform = booking.booking_platform.toLowerCase()

  // Booking.com
  if (platform === 'booking' || platform === 'booking.com' || platform.includes('booking')) {
    // Use referral config hotel_id, or booking's external_hotel_id as fallback
    const hotelId = referralConfig?.hotel_id || booking.external_hotel_id
    
    if (hotelId && booking.external_reservation_id) {
      return {
        url: generateBookingComLink(
          hotelId,
          booking.external_reservation_id
        ),
        label: 'View on Booking.com',
        platform: 'booking.com'
      }
    }
    
    // Fallback: try to parse from reservation_url if available
    if (booking.reservation_url) {
      const urlMatch = booking.reservation_url.match(/hotel_id=(\d+)&res_id=(\d+)/)
      if (urlMatch) {
        return {
          url: generateBookingComLink(urlMatch[1], urlMatch[2]),
          label: 'View on Booking.com',
          platform: 'booking.com'
        }
      }
    }
  }

  // Airbnb - use reservation_url if available
  if (platform === 'airbnb' && booking.reservation_url) {
    return {
      url: booking.reservation_url,
      label: 'View on Airbnb',
      platform: 'airbnb'
    }
  }

  // VRBO - use reservation_url if available
  if (platform === 'vrbo' && booking.reservation_url) {
    return {
      url: booking.reservation_url,
      label: 'View on VRBO',
      platform: 'vrbo'
    }
  }

  // Generic: use reservation_url if available
  if (booking.reservation_url) {
    return {
      url: booking.reservation_url,
      label: `View on ${booking.booking_platform}`,
      platform: booking.booking_platform
    }
  }

  return null
}

