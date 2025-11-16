// app/api/currency/convert/route.ts
// Server-side API route for currency conversion (keeps API key secure)

import { NextRequest, NextResponse } from 'next/server'

interface CurrencyRates {
  [currencyCode: string]: number
}

interface CurrencyFreaksResponse {
  date: string
  base: string
  rates: CurrencyRates
}

let cachedRates: CurrencyRates | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour cache

async function fetchExchangeRates(): Promise<CurrencyRates> {
  const apiKey = process.env.CURRENCYFREAKS_API_KEY || process.env.NEXT_PUBLIC_CURRENCYFREAKS_API_KEY
  
  if (!apiKey) {
    throw new Error('CurrencyFreaks API key not found')
  }

  try {
    // Check cache first
    const now = Date.now()
    if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedRates
    }

    // Fetch from API
    const response = await fetch(
      `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`CurrencyFreaks API error: ${response.status}`)
    }

    const data: CurrencyFreaksResponse = await response.json()
    
    // Cache the rates
    cachedRates = data.rates
    cachedRates.USD = 1.0 // Ensure USD is 1.0
    cacheTimestamp = now

    return cachedRates
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    throw error
  }
}

function convertMultipleCurrencies(
  amountsByCurrency: Record<string, number>,
  targetCurrency: string,
  rates: CurrencyRates
): number {
  const targetRate = rates[targetCurrency.toUpperCase()] || 1

  let totalInUSD = 0

  for (const [currency, amount] of Object.entries(amountsByCurrency)) {
    if (amount === 0) continue
    
    const currencyRate = rates[currency.toUpperCase()] || 1
    const amountInUSD = amount / currencyRate
    totalInUSD += amountInUSD
  }

  // Convert total USD to target currency
  return totalInUSD * targetRate
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amountsByCurrency, targetCurrency } = body

    if (!amountsByCurrency || !targetCurrency) {
      return NextResponse.json(
        { error: 'Missing required parameters: amountsByCurrency and targetCurrency' },
        { status: 400 }
      )
    }

    const rates = await fetchExchangeRates()
    const convertedTotal = convertMultipleCurrencies(amountsByCurrency, targetCurrency, rates)

    return NextResponse.json({
      success: true,
      convertedAmount: convertedTotal,
      targetCurrency
    })
  } catch (error) {
    console.error('Currency conversion API error:', error)
    return NextResponse.json(
      { error: 'Failed to convert currency', details: String(error) },
      { status: 500 }
    )
  }
}


