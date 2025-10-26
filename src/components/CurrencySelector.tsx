import { Currency, useCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/contexts/CurrencyContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check } from 'lucide-react'

const currencies: Currency[] = ['CLP', 'USD', 'GBP', 'JPY', 'CNY']

const CURRENCY_FLAGS: Record<Currency, string> = {
  CLP: 'https://flagcdn.com/w20/cl.png',
  USD: 'https://flagcdn.com/w20/us.png',
  GBP: 'https://flagcdn.com/w20/gb.png',
  JPY: 'https://flagcdn.com/w20/jp.png',
  CNY: 'https://flagcdn.com/w20/cn.png'
}

export function CurrencySelectorCompact() {
  const { currency, setCurrency } = useCurrency()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 min-w-[100px] h-10"
        >
          <img 
            src={CURRENCY_FLAGS[currency]} 
            alt={`${currency} flag`}
            className="w-4 h-3 object-cover rounded-sm"
            loading="lazy"
          />
          <span className="font-semibold text-sm">{CURRENCY_SYMBOLS[currency]}</span>
          <span className="text-xs text-muted-foreground">{currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr}
            onClick={() => setCurrency(curr)}
            className="flex items-center justify-between cursor-pointer py-2.5"
          >
            <div className="flex items-center gap-3">
              <img 
                src={CURRENCY_FLAGS[curr]} 
                alt={`${curr} flag`}
                className="w-5 h-4 object-cover rounded-sm"
              />
              <div>
                <div className="font-medium text-sm">{CURRENCY_SYMBOLS[curr]} {curr}</div>
                <div className="text-xs text-muted-foreground">{CURRENCY_NAMES[curr]}</div>
              </div>
            </div>
            {currency === curr && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}