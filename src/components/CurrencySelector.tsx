import { Currency, useCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/contexts/CurrencyContext'
import { Button } from '@/components/ui/button'
import { DollarSign } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

const currencies: Currency[] = ['CLP', 'USD', 'GBP', 'JPY', 'CNY']

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const isMobile = useIsMobile()

  return (
    <div className="flex items-center gap-1 md:gap-2 flex-wrap overflow-x-auto max-w-full">
      <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground flex-shrink-0">
        <DollarSign className="h-3 md:h-4 w-3 md:w-4" />
        <span className="hidden sm:inline">Moneda:</span>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {currencies.map((curr) => (
          <Button
            key={curr}
            variant={currency === curr ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrency(curr)}
            className={`min-w-[50px] md:min-w-[60px] text-xs ${
              currency === curr 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card text-card-foreground hover:bg-primary/10'
            }`}
            title={CURRENCY_NAMES[curr]}
          >
            <span className="font-semibold">{CURRENCY_SYMBOLS[curr]}</span>
            <span className="ml-0.5 md:ml-1 text-[10px] md:text-xs">{curr}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
