import { Currency, useCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/contexts/CurrencyContext'
import { Button } from '@/components/ui/button'
import { DollarSign } from 'lucide-react'

const currencies: Currency[] = ['CLP', 'USD', 'GBP', 'JPY', 'CNY']

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <DollarSign className="h-4 w-4" />
        <span className="hidden sm:inline">Moneda:</span>
      </div>
      <div className="flex gap-1">
        {currencies.map((curr) => (
          <Button
            key={curr}
            variant={currency === curr ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrency(curr)}
            className={`min-w-[60px] ${
              currency === curr 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card text-card-foreground hover:bg-primary/10'
            }`}
            title={CURRENCY_NAMES[curr]}
          >
            <span className="font-semibold">{CURRENCY_SYMBOLS[curr]}</span>
            <span className="ml-1 text-xs">{curr}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
