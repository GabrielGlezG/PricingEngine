import { createContext, useContext, useState, ReactNode } from 'react'

interface LastUpdateContextType {
  lastUpdate: string | null
  setLastUpdate: (date: string | null) => void
}

const LastUpdateContext = createContext<LastUpdateContextType | undefined>(undefined)

export function LastUpdateProvider({ children }: { children: ReactNode }) {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  return (
    <LastUpdateContext.Provider value={{ lastUpdate, setLastUpdate }}>
      {children}
    </LastUpdateContext.Provider>
  )
}

export function useLastUpdate() {
  const context = useContext(LastUpdateContext)
  if (context === undefined) {
    throw new Error('useLastUpdate must be used within a LastUpdateProvider')
  }
  return context
}
