// lib/currency-converter.ts

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

/**
 * Fetch latest exchange rates from CurrencyFreaks API
 */
async function fetchExchangeRates(): Promise<CurrencyRates> {
  const apiKey = process.env.NEXT_PUBLIC_CURRENCYFREAKS_API_KEY || process.env.CURRENCYFREAKS_API_KEY
  
  if (!apiKey) {
    console.warn('CurrencyFreaks API key not found. Using fallback rates.')
    // Fallback rates (approximate, should be updated periodically)
    return {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      AUD: 1.52,
      CAD: 1.35,
      JPY: 149.5,
      CHF: 0.88,
      CNY: 7.24,
      INR: 83.1,
      BRL: 4.95,
      MXN: 17.1,
      ZAR: 18.7,
      NZD: 1.64,
      SGD: 1.34,
      HKD: 7.82,
      SEK: 10.5,
      NOK: 10.7,
      DKK: 6.87,
      PLN: 4.02,
      TRY: 30.2,
      RUB: 91.5
    }
  }

  try {
    // Check cache first
    const now = Date.now()
    if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedRates
    }

    // Fetch from API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    try {
      const response = await fetch(
        `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${apiKey}`,
        { signal: controller.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`CurrencyFreaks API error: ${response.status}`)
      }

      const data: CurrencyFreaksResponse = await response.json()
      
      // Cache the rates
      cachedRates = data.rates
      cachedRates.USD = 1.0 // Ensure USD is 1.0
      cacheTimestamp = now

      return cachedRates
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Currency API request timed out')
      }
      throw fetchError
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    
    // Return cached rates if available, otherwise fallback
    if (cachedRates) {
      console.warn('Using cached exchange rates due to API error')
      return cachedRates
    }
    
    // Fallback rates
    console.warn('Using fallback exchange rates')
    return {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      AUD: 1.52,
      CAD: 1.35,
      JPY: 149.5,
      CHF: 0.88,
      CNY: 7.24,
      INR: 83.1,
      BRL: 4.95,
      MXN: 17.1,
      ZAR: 18.7,
      NZD: 1.64,
      SGD: 1.34,
      HKD: 7.82,
      SEK: 10.5,
      NOK: 10.7,
      DKK: 6.87,
      PLN: 4.02,
      TRY: 30.2,
      RUB: 91.5
    }
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (amount === 0) return 0
  if (fromCurrency === toCurrency) return amount

  const rates = await fetchExchangeRates()
  
  // If base is USD, convert: fromCurrency -> USD -> toCurrency
  // Rate from USD to currency = rates[currency]
  // To convert FROM currency TO USD: amount / rates[fromCurrency]
  // To convert FROM USD TO currency: amount * rates[toCurrency]
  
  const fromRate = rates[fromCurrency.toUpperCase()] || 1
  const toRate = rates[toCurrency.toUpperCase()] || 1

  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate
  const convertedAmount = amountInUSD * toRate

  return convertedAmount
}

/**
 * Convert multiple amounts from different currencies to a target currency
 */
export async function convertMultipleCurrencies(
  amountsByCurrency: Record<string, number>,
  targetCurrency: string
): Promise<number> {
  const targetCurrencyUpper = targetCurrency.toUpperCase()
  
  // If all amounts are in the target currency, just sum them
  const currencies = Object.keys(amountsByCurrency).filter(c => amountsByCurrency[c] !== 0)
  if (currencies.length === 0) return 0
  if (currencies.every(c => c.toUpperCase() === targetCurrencyUpper)) {
    return Object.values(amountsByCurrency).reduce((sum, amount) => sum + amount, 0)
  }
  
  const rates = await fetchExchangeRates()
  const targetRate = rates[targetCurrencyUpper] || 1

  let totalInTargetCurrency = 0
  let totalInUSD = 0

  for (const [currency, amount] of Object.entries(amountsByCurrency)) {
    if (amount === 0) continue
    
    const currencyUpper = currency.toUpperCase()
    // If currency matches target, add directly without conversion
    if (currencyUpper === targetCurrencyUpper) {
      totalInTargetCurrency += amount
      continue
    }
    
    // Convert other currencies through USD
    const currencyRate = rates[currencyUpper] || 1
    const amountInUSD = amount / currencyRate
    totalInUSD += amountInUSD
  }

  // Convert USD total to target currency and add to direct total
  const convertedFromUSD = totalInUSD * targetRate
  return totalInTargetCurrency + convertedFromUSD
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return 1

  const rates = await fetchExchangeRates()
  const fromRate = rates[fromCurrency.toUpperCase()] || 1
  const toRate = rates[toCurrency.toUpperCase()] || 1

  // Rate from fromCurrency to toCurrency
  return toRate / fromRate
}

