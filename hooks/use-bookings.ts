'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { bookingService, CreateBookingData, UpdateBookingData, BookingWithProperty } from '@/lib/bookings'

interface UseBookingsOptions {
  property_id?: string
  status?: string
  date_from?: Date
  date_to?: Date
  limit?: number
  autoRefresh?: boolean
}

interface UseBookingsReturn {
  bookings: BookingWithProperty[]
  loading: boolean
  error: string | null
  count: number
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useBookings(options: UseBookingsOptions = {}): UseBookingsReturn {
  const [bookings, setBookings] = useState<BookingWithProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const offsetRef = useRef(0)
  const limit = options.limit || 20

  const fetchBookings = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offsetRef.current
      const result = await bookingService.getBookings({
        ...options,
        limit,
        offset: currentOffset
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (reset) {
        setBookings(result.data)
        offsetRef.current = limit
      } else {
        setBookings(prev => [...prev, ...result.data])
        offsetRef.current = offsetRef.current + limit
      }

      setCount(result.count || 0)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [
    options.property_id,
    options.status,
    options.date_from ? options.date_from.toISOString() : undefined,
    options.date_to ? options.date_to.toISOString() : undefined,
    limit
  ])

  const refetch = useCallback(() => fetchBookings(true), [fetchBookings])

  const loadMore = useCallback(() => fetchBookings(false), [fetchBookings])

  const hasMore = bookings.length < count

  // Track previous filter values to detect changes
  const prevFiltersRef = useRef<string>('')
  const mountedRef = useRef(false)
  
  useEffect(() => {
    // Create a stable key from filter values
    const filterKey = JSON.stringify({
      property_id: options.property_id,
      status: options.status,
      date_from: options.date_from ? options.date_from.toISOString() : undefined,
      date_to: options.date_to ? options.date_to.toISOString() : undefined,
    })
    
    // On initial mount, always fetch
    if (!mountedRef.current) {
      mountedRef.current = true
      prevFiltersRef.current = filterKey
      offsetRef.current = 0
      fetchBookings(true)
      return
    }
    
    // Only refetch if filters actually changed
    if (prevFiltersRef.current !== filterKey) {
      prevFiltersRef.current = filterKey
      offsetRef.current = 0
      fetchBookings(true)
    }
  }, [
    options.property_id,
    options.status,
    options.date_from ? options.date_from.toISOString() : undefined,
    options.date_to ? options.date_to.toISOString() : undefined,
    fetchBookings
  ])

  // Auto refresh every 30 seconds if enabled
  useEffect(() => {
    if (!options.autoRefresh) return

    const interval = setInterval(() => {
      refetch()
    }, 30000)

    return () => clearInterval(interval)
  }, [options.autoRefresh, refetch])

  return {
    bookings,
    loading,
    error,
    count,
    refetch,
    loadMore,
    hasMore
  }
}

interface UseBookingReturn {
  booking: BookingWithProperty | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBooking(id: string): UseBookingReturn {
  const [booking, setBooking] = useState<BookingWithProperty | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBooking = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const result = await bookingService.getBooking(id)

      if (result.error) {
        setError(result.error)
        return
      }

      setBooking(result.data)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  return {
    booking,
    loading,
    error,
    refetch: fetchBooking
  }
}

interface UseBookingMutationsReturn {
  createBooking: (data: CreateBookingData) => Promise<{ success: boolean; error?: string; booking?: BookingWithProperty }>
  updateBooking: (data: UpdateBookingData) => Promise<{ success: boolean; error?: string; booking?: BookingWithProperty }>
  deleteBooking: (id: string) => Promise<{ success: boolean; error?: string }>
  loading: boolean
}

export function useBookingMutations(): UseBookingMutationsReturn {
  const [loading, setLoading] = useState(false)

  const createBooking = useCallback(async (data: CreateBookingData) => {
    setLoading(true)
    try {
      const result = await bookingService.createBooking(data)
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      return { 
        success: true, 
        booking: result.data as BookingWithProperty 
      }

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBooking = useCallback(async (data: UpdateBookingData) => {
    setLoading(true)
    try {
      const result = await bookingService.updateBooking(data)
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      return { 
        success: true, 
        booking: result.data as BookingWithProperty 
      }

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteBooking = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const result = await bookingService.deleteBooking(id)
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      return { success: true }

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createBooking,
    updateBooking,
    deleteBooking,
    loading
  }
}

interface UseBookingStatsReturn {
  stats: {
    total: number
    confirmed: number
    pending: number
    cancelled: number
    checkedIn: number
    checkedOut: number
    totalRevenue: number
    totalRevenueConverted: number
    averageNights: number
    revenueByCurrency: Record<string, number>
    bookingBreakdown?: Array<{
      guest_name?: string
      check_in?: string
      total_amount: number
      commission: number
      payout: number
      currency: string
    }>
  }
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBookingStats(propertyId?: string, targetCurrency?: string): UseBookingStatsReturn {
  const [stats, setStats] = useState({
    total: 0, confirmed: 0, pending: 0, cancelled: 0,
    checkedIn: 0, checkedOut: 0, totalRevenue: 0, totalRevenueConverted: 0,
    averageNights: 0, revenueByCurrency: {} as Record<string, number>
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  // Memoize targetCurrency to prevent unnecessary re-renders
  const stableTargetCurrency = useMemo(() => targetCurrency || 'USD', [targetCurrency])
  const stablePropertyId = useMemo(() => propertyId, [propertyId])

  const fetchStats = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return
    }

    try {
      fetchingRef.current = true
      setLoading(true)
      setError(null)

      const result = await bookingService.getBookingStats(stablePropertyId, stableTargetCurrency)
      setStats(result)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [stablePropertyId, stableTargetCurrency])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}