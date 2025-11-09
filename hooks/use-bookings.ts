'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [offset, setOffset] = useState(0)
  const limit = options.limit || 20

  const fetchBookings = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offset
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
        setOffset(limit)
      } else {
        setBookings(prev => [...prev, ...result.data])
        setOffset(prev => prev + limit)
      }

      setCount(result.count || 0)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [options.property_id, options.status, options.date_from, options.date_to, limit, offset])

  const refetch = useCallback(() => fetchBookings(true), [fetchBookings])

  const loadMore = useCallback(() => fetchBookings(false), [fetchBookings])

  const hasMore = bookings.length < count

  useEffect(() => {
    fetchBookings(true)
    // Depend on stable primitives to avoid refetch loops when Date instances are recreated
  }, [
    options.property_id,
    options.status,
    options.date_from ? options.date_from.toISOString() : undefined,
    options.date_to ? options.date_to.toISOString() : undefined
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
    averageNights: number
  }
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBookingStats(propertyId?: string): UseBookingStatsReturn {
  const [stats, setStats] = useState({
    total: 0, confirmed: 0, pending: 0, cancelled: 0,
    checkedIn: 0, checkedOut: 0, totalRevenue: 0, averageNights: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await bookingService.getBookingStats(propertyId)
      setStats(result)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

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