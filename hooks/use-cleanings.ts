'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cleaningService, CreateCleaningData, UpdateCleaningData, CleaningWithProperty } from '@/lib/cleanings'

interface UseCleaningsOptions {
  property_id?: string
  status?: string
  date_from?: Date
  date_to?: Date
  cleaner_id?: string
  limit?: number
  autoRefresh?: boolean
}

interface UseCleaningsReturn {
  cleanings: CleaningWithProperty[]
  loading: boolean
  error: string | null
  count: number
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useCleanings(options: UseCleaningsOptions = {}): UseCleaningsReturn {
  const [cleanings, setCleanings] = useState<CleaningWithProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const offsetRef = useRef(0)
  const limit = options.limit || 20

  const fetchCleanings = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offsetRef.current
      const result = await cleaningService.getCleanings({
        ...options,
        limit,
        offset: currentOffset
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (reset) {
        setCleanings(result.data)
        offsetRef.current = limit
      } else {
        setCleanings(prev => [...prev, ...result.data])
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
    options.cleaner_id,
    limit
  ])

  const refetch = useCallback(() => fetchCleanings(true), [fetchCleanings])

  const loadMore = useCallback(() => fetchCleanings(false), [fetchCleanings])

  const hasMore = cleanings.length < count

  // Track previous filter values to detect changes
  const prevFiltersRef = useRef<string>('')
  
  useEffect(() => {
    // Create a stable key from filter values
    const filterKey = JSON.stringify({
      property_id: options.property_id,
      status: options.status,
      date_from: options.date_from ? options.date_from.toISOString() : undefined,
      date_to: options.date_to ? options.date_to.toISOString() : undefined,
      cleaner_id: options.cleaner_id,
    })
    
    // Only refetch if filters actually changed
    if (prevFiltersRef.current !== filterKey) {
      prevFiltersRef.current = filterKey
      offsetRef.current = 0
      fetchCleanings(true)
    }
  }, [
    options.property_id,
    options.status,
    options.date_from ? options.date_from.toISOString() : undefined,
    options.date_to ? options.date_to.toISOString() : undefined,
    options.cleaner_id,
    // Removed fetchCleanings to prevent infinite loops
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
    cleanings,
    loading,
    error,
    count,
    refetch,
    loadMore,
    hasMore
  }
}

interface UseCleaningReturn {
  cleaning: CleaningWithProperty | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCleaning(id: string): UseCleaningReturn {
  const [cleaning, setCleaning] = useState<CleaningWithProperty | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCleaning = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const result = await cleaningService.getCleaning(id)

      if (result.error) {
        setError(result.error)
        return
      }

      setCleaning(result.data)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCleaning()
  }, [fetchCleaning])

  return {
    cleaning,
    loading,
    error,
    refetch: fetchCleaning
  }
}

interface UseCleaningMutationsReturn {
  createCleaning: (data: CreateCleaningData) => Promise<{ success: boolean; error?: string; cleaning?: CleaningWithProperty }>
  updateCleaning: (data: UpdateCleaningData) => Promise<{ success: boolean; error?: string; cleaning?: CleaningWithProperty }>
  updateStatus: (id: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled', notes?: string) => Promise<{ success: boolean; error?: string }>
  deleteCleaning: (id: string) => Promise<{ success: boolean; error?: string }>
  startCleaning: (id: string) => Promise<{ success: boolean; error?: string }>
  completeCleaning: (id: string, notes?: string) => Promise<{ success: boolean; error?: string }>
  loading: boolean
}

export function useCleaningMutations(): UseCleaningMutationsReturn {
  const [loading, setLoading] = useState(false)

  const createCleaning = useCallback(async (data: CreateCleaningData) => {
    setLoading(true)
    try {
      const result = await cleaningService.createCleaning(data)
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      return { 
        success: true, 
        cleaning: result.data as CleaningWithProperty 
      }

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCleaning = useCallback(async (data: UpdateCleaningData) => {
    setLoading(true)
    try {
      const result = await cleaningService.updateCleaning(data)
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      return { 
        success: true, 
        cleaning: result.data as CleaningWithProperty 
      }

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (id: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled', notes?: string) => {
    setLoading(true)
    try {
      const result = await cleaningService.updateStatus(id, status, notes)
      
      return result

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCleaning = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const result = await cleaningService.deleteCleaning(id)
      
      return result

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const startCleaning = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const result = await cleaningService.startCleaning(id)
      
      return result

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const completeCleaning = useCallback(async (id: string, notes?: string) => {
    setLoading(true)
    try {
      const result = await cleaningService.completeCleaning(id, notes)
      
      return result

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createCleaning,
    updateCleaning,
    updateStatus,
    deleteCleaning,
    startCleaning,
    completeCleaning,
    loading
  }
}

interface UseCleaningStatsReturn {
  stats: {
    total: number
    scheduled: number
    in_progress: number
    completed: number
    cancelled: number
    totalCost: number
    averageCost: number
  }
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCleaningStats(filters?: { property_id?: string; cleaner_id?: string }): UseCleaningStatsReturn {
  const [stats, setStats] = useState({
    total: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0,
    totalCost: 0, averageCost: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await cleaningService.getCleaningStats(filters)
      setStats(result)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [filters?.property_id, filters?.cleaner_id])

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

// Convenience hook for upcoming cleanings
export function useUpcomingCleanings(cleaner_id?: string) {
  const [cleanings, setCleanings] = useState<CleaningWithProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUpcoming = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await cleaningService.getUpcomingCleanings(cleaner_id)

      if (result.error) {
        setError(result.error)
        return
      }

      setCleanings(result.data)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [cleaner_id])

  useEffect(() => {
    fetchUpcoming()
  }, [fetchUpcoming])

  return {
    cleanings,
    loading,
    error,
    refetch: fetchUpcoming
  }
}

// Convenience hook for today's cleanings
export function useTodaysCleanings(cleaner_id?: string) {
  const [cleanings, setCleanings] = useState<CleaningWithProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTodays = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await cleaningService.getTodaysCleanings(cleaner_id)

      if (result.error) {
        setError(result.error)
        return
      }

      setCleanings(result.data)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [cleaner_id])

  useEffect(() => {
    fetchTodays()
  }, [fetchTodays])

  return {
    cleanings,
    loading,
    error,
    refetch: fetchTodays
  }
}