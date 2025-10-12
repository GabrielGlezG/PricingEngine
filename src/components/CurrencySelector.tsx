import { Currency, useCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/contexts/CurrencyContext'
import { Button } from '@/components/ui/button'

const currencies: Currency[] = ['CLP', 'USD', 'GBP', 'JPY', 'CNY']

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
            className={`min-w-[48px] sm:min-w-[60px] h-8 px-2 sm:px-3 ${
              currency === curr
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-primary/10'
            }`}
            title={CURRENCY_NAMES[curr]}
          >
            <span className="font-semibold text-xs sm:text-sm">{CURRENCY_SYMBOLS[curr]}</span>
            <span className="ml-0.5 sm:ml-1 text-[9px] sm:text-xs">{curr}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
