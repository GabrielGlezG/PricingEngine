import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface LayoutProps {
  children: React.ReactNode
}

export function NewLayout({ children }: LayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
