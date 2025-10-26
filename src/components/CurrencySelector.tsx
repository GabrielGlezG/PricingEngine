import { Currency, useCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/contexts/CurrencyContext'
import { Button } from '@/components/ui/button'

const currencies: Currency[] = ['CLP', 'USD', 'GBP', 'JPY', 'CNY']

const CURRENCY_FLAGS: Record<Currency, string> = {
  CLP: 'https://flagcdn.com/w20/cl.png',
  USD: 'https://flagcdn.com/w20/us.png',
  GBP: 'https://flagcdn.com/w20/gb.png',
  JPY: 'https://flagcdn.com/w20/jp.png',
  CNY: 'https://flagcdn.com/w20/cn.png'
}

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="flex items-center justify-center w-full max-w-3xl mx-auto px-2">
      <div className="flex gap-1 sm:gap-2 flex-wrap justify-center">
        {currencies.map((curr) => (
          <Button
            key={curr}
            variant={currency === curr ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrency(curr)}
            className={`min-w-[60px] sm:min-w-[80px] h-8 px-2 sm:px-3 flex items-center gap-1.5 ${
              currency === curr
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-primary/10'
            }`}
            title={CURRENCY_NAMES[curr]}
          >
            <img 
              src={CURRENCY_FLAGS[curr]} 
              alt={`${curr} flag`}
              className="w-4 h-3 object-cover rounded-sm"
            />
            <span className="font-semibold text-xs sm:text-sm">{CURRENCY_SYMBOLS[curr]}</span>
            <span className="text-[9px] sm:text-xs">{curr}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
