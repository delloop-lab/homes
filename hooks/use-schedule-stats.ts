'use client'

import { useState, useEffect, useMemo } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { BookingWithProperty } from '@/lib/bookings'
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  parseISO,
  addDays,
  subDays
} from 'date-fns'

interface ScheduleStats {
  today: {
    checkins: number
    checkouts: number
    total: number
  }
  thisWeek: {
    checkins: number
    checkouts: number
    total: number
  }
  nextWeek: {
    checkins: number
    checkouts: number
    total: number
  }
  activeProperties: number
  busyDays: {
    date: Date
    count: number
  }[]
}

interface UseScheduleStatsOptions {
  date?: Date
  includeInactive?: boolean
}

export function useScheduleStats(options: UseScheduleStatsOptions = {}) {
  const { date = new Date(), includeInactive = false } = options
  
  const today = startOfDay(date)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const nextWeekStart = addDays(weekEnd, 1)
  const nextWeekEnd = addDays(nextWeekStart, 6)

  // Fetch bookings for current and next week
  const { bookings, loading, error } = useBookings({
    from: subDays(weekStart, 7).toISOString(), // Include previous week for context
    to: addDays(nextWeekEnd, 7).toISOString(), // Include week after next for context
    includeInactive
  })

  const stats = useMemo((): ScheduleStats => {
    if (!bookings || bookings.length === 0) {
      return {
        today: { checkins: 0, checkouts: 0, total: 0 },
        thisWeek: { checkins: 0, checkouts: 0, total: 0 },
        nextWeek: { checkins: 0, checkouts: 0, total: 0 },
        activeProperties: 0,
        busyDays: []
      }
    }

    // Filter active bookings if needed
    const activeBookings = includeInactive 
      ? bookings 
      : bookings.filter(booking => booking.status !== 'cancelled')

    // Today's stats
    const todayStats = activeBookings.reduce((acc, booking) => {
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)

      if (isSameDay(checkInDate, today)) {
        acc.checkins++
        acc.total++
      }
      if (isSameDay(checkOutDate, today)) {
        acc.checkouts++
        acc.total++
      }

      return acc
    }, { checkins: 0, checkouts: 0, total: 0 })

    // This week's stats
    const thisWeekStats = activeBookings.reduce((acc, booking) => {
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)

      if (checkInDate >= weekStart && checkInDate <= weekEnd) {
        acc.checkins++
        acc.total++
      }
      if (checkOutDate >= weekStart && checkOutDate <= weekEnd) {
        acc.checkouts++
        acc.total++
      }

      return acc
    }, { checkins: 0, checkouts: 0, total: 0 })

    // Next week's stats
    const nextWeekStats = activeBookings.reduce((acc, booking) => {
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)

      if (checkInDate >= nextWeekStart && checkInDate <= nextWeekEnd) {
        acc.checkins++
        acc.total++
      }
      if (checkOutDate >= nextWeekStart && checkOutDate <= nextWeekEnd) {
        acc.checkouts++
        acc.total++
      }

      return acc
    }, { checkins: 0, checkouts: 0, total: 0 })

    // Count unique active properties
    const activePropertyIds = new Set(
      activeBookings
        .filter(booking => {
          const checkInDate = parseISO(booking.check_in)
          const checkOutDate = parseISO(booking.check_out)
          // Property is active if it has bookings in the current period
          return (checkInDate >= subDays(weekStart, 30) && checkInDate <= addDays(nextWeekEnd, 30)) ||
                 (checkOutDate >= subDays(weekStart, 30) && checkOutDate <= addDays(nextWeekEnd, 30))
        })
        .map(booking => booking.property_id)
    )

    // Calculate busy days (days with multiple activities)
    const dailyActivityCount = new Map<string, number>()
    
    activeBookings.forEach(booking => {
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)

      // Count check-ins
      const checkInKey = format(checkInDate, 'yyyy-MM-dd')
      dailyActivityCount.set(checkInKey, (dailyActivityCount.get(checkInKey) || 0) + 1)

      // Count check-outs
      const checkOutKey = format(checkOutDate, 'yyyy-MM-dd')
      dailyActivityCount.set(checkOutKey, (dailyActivityCount.get(checkOutKey) || 0) + 1)
    })

    // Get busy days (3+ activities) within the next 2 weeks
    const busyDays = Array.from(dailyActivityCount.entries())
      .filter(([dateStr, count]) => {
        const date = new Date(dateStr)
        return count >= 3 && date >= today && date <= addDays(nextWeekEnd, 7)
      })
      .map(([dateStr, count]) => ({
        date: new Date(dateStr),
        count
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5) // Top 5 busiest days

    return {
      today: todayStats,
      thisWeek: thisWeekStats,
      nextWeek: nextWeekStats,
      activeProperties: activePropertyIds.size,
      busyDays
    }
  }, [bookings, today, weekStart, weekEnd, nextWeekStart, nextWeekEnd, includeInactive])

  return {
    stats,
    loading,
    error,
    refreshStats: () => {
      // Trigger refetch if needed
    }
  }
}

// Hook specifically for today's stats
export function useTodayStats(date: Date = new Date()) {
  const { stats, loading, error } = useScheduleStats({ date })
  
  return {
    todayStats: stats.today,
    loading,
    error
  }
}

// Hook for weekly comparison
export function useWeeklyComparison(date: Date = new Date()) {
  const { stats, loading, error } = useScheduleStats({ date })
  
  const weeklyComparison = useMemo(() => {
    const thisWeekTotal = stats.thisWeek.total
    const nextWeekTotal = stats.nextWeek.total
    
    const isNextWeekBusier = nextWeekTotal > thisWeekTotal
    const difference = Math.abs(nextWeekTotal - thisWeekTotal)
    const percentageChange = thisWeekTotal > 0 
      ? Math.round((difference / thisWeekTotal) * 100)
      : nextWeekTotal > 0 ? 100 : 0

    return {
      thisWeek: thisWeekTotal,
      nextWeek: nextWeekTotal,
      isNextWeekBusier,
      difference,
      percentageChange
    }
  }, [stats.thisWeek.total, stats.nextWeek.total])

  return {
    comparison: weeklyComparison,
    loading,
    error
  }
}

// Hook for property activity distribution
export function usePropertyActivity(date: Date = new Date()) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 13) // 2 weeks

  const { bookings, loading, error } = useBookings({
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
    includeInactive: false
  })

  const propertyActivity = useMemo(() => {
    if (!bookings) return []

    const activityMap = new Map<string, {
      property_id: string
      property_name: string
      checkins: number
      checkouts: number
      total: number
    }>()

    bookings.forEach(booking => {
      const checkInDate = parseISO(booking.check_in)
      const checkOutDate = parseISO(booking.check_out)
      
      if (!activityMap.has(booking.property_id)) {
        activityMap.set(booking.property_id, {
          property_id: booking.property_id,
          property_name: booking.property_name || 'Unknown Property',
          checkins: 0,
          checkouts: 0,
          total: 0
        })
      }

      const activity = activityMap.get(booking.property_id)!

      if (checkInDate >= weekStart && checkInDate <= weekEnd) {
        activity.checkins++
        activity.total++
      }
      if (checkOutDate >= weekStart && checkOutDate <= weekEnd) {
        activity.checkouts++
        activity.total++
      }
    })

    return Array.from(activityMap.values())
      .filter(activity => activity.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [bookings, weekStart, weekEnd])

  return {
    propertyActivity,
    loading,
    error
  }
}