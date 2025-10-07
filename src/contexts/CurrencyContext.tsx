import { createContext, useContext, useState, ReactNode } from 'react'

export type Currency = 'CLP' | 'USD' | 'GBP' | 'JPY' | 'CNY'

interface ExchangeRates {
  CLP: number
  USD: number
  GBP: number
  JPY: number
  CNY: number
}

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  convertPrice: (priceInCLP: number) => number
  formatPrice: (price: number, includeCurrency?: boolean) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

// Exchange rates from CLP (Chilean Peso) to other currencies
// These are approximate rates and should be updated periodically
const EXCHANGE_RATES: ExchangeRates = {
  CLP: 1,
  USD: 0.0011,     // 1 CLP ≈ 0.0011 USD
  GBP: 0.00085,    // 1 CLP ≈ 0.00085 GBP
  JPY: 0.16,       // 1 CLP ≈ 0.16 JPY
  CNY: 0.0078,     // 1 CLP ≈ 0.0078 CNY
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CLP: '$',
  USD: 'US$',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
}

const CURRENCY_NAMES: Record<Currency, string> = {
  CLP: 'Peso Chileno',
  USD: 'Dólar',
  GBP: 'Libra',
  JPY: 'Yen',
  CNY: 'Yuan',
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('CLP')

  const convertPrice = (priceInCLP: number): number => {
    return priceInCLP * EXCHANGE_RATES[currency]
  }

  const formatPrice = (priceInCLP: number, includeCurrency: boolean = true): string => {
    const convertedPrice = convertPrice(priceInCLP)
    const symbol = CURRENCY_SYMBOLS[currency]
    
    // Format based on currency
    let formattedNumber: string
    
    switch (currency) {
      case 'JPY':
        // JPY doesn't use decimals
        formattedNumber = Math.round(convertedPrice).toLocaleString('ja-JP')
        break
      case 'CNY':
        formattedNumber = convertedPrice.toLocaleString('zh-CN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        break
      case 'GBP':
        formattedNumber = convertedPrice.toLocaleString('en-GB', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        break
      case 'USD':
        formattedNumber = convertedPrice.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        break
      case 'CLP':
      default:
        formattedNumber = convertedPrice.toLocaleString('es-CL', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        break
    }

    return includeCurrency ? `${symbol}${formattedNumber}` : formattedNumber
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

export { CURRENCY_SYMBOLS, CURRENCY_NAMES }
