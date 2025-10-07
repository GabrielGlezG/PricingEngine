import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'CLP' | 'USD' | 'GBP' | 'JPY' | 'CNY';

interface ExchangeRates {
  CLP: number;
  USD: number;
  GBP: number;
  JPY: number;
  CNY: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceInCLP: number) => number;
  formatPrice: (price: number, includeCurrency?: boolean) => string;
  loadingRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CLP: '$',
  USD: 'US$',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
};

const CURRENCY_NAMES: Record<Currency, string> = {
  CLP: 'Peso Chileno',
  USD: 'Dólar',
  GBP: 'Libra',
  JPY: 'Yen',
  CNY: 'Yuan',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('CLP');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    CLP: 1,
    USD: 0,
    GBP: 0,
    JPY: 0,
    CNY: 0,
  });
  const [loadingRates, setLoadingRates] = useState(true);

  const fetchExchangeRates = async () => {
    try {
      setLoadingRates(true);
      const res = await fetch('https://open.er-api.com/v6/latest/CLP');
      const data = await res.json();
      setExchangeRates({
        CLP: 1,
        USD: data.rates.USD,
        GBP: data.rates.GBP,
        JPY: data.rates.JPY,
        CNY: data.rates.CNY,
      });
    } catch (error) {
      console.error('Error al obtener tasas de cambio:', error);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const convertPrice = (priceInCLP: number): number => {
    return priceInCLP * exchangeRates[currency];
  };

  const formatPrice = (priceInCLP: number, includeCurrency: boolean = true): string => {
    if (loadingRates) return '...';
    const convertedPrice = convertPrice(priceInCLP);
    const symbol = CURRENCY_SYMBOLS[currency];

    let formattedNumber: string;
    switch (currency) {
      case 'JPY':
        formattedNumber = Math.round(convertedPrice).toLocaleString('ja-JP');
        break;
      case 'CNY':
        formattedNumber = convertedPrice.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        break;
      case 'GBP':
        formattedNumber = convertedPrice.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        break;
      case 'USD':
        formattedNumber = convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        break;
      case 'CLP':
      default:
        formattedNumber = convertedPrice.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        break;
    }

    return includeCurrency ? `${symbol}${formattedNumber}` : formattedNumber;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice, formatPrice, loadingRates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency debe ser usado dentro de CurrencyProvider');
  return context;
}

export { CURRENCY_SYMBOLS, CURRENCY_NAMES };
