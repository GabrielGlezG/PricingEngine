import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Menu, X } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface LayoutProps {
  children: React.ReactNode
}

export function NewLayout({ children }: LayoutProps) {
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-primary rounded-lg text-primary-foreground shadow-lg"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Sidebar - mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-40 w-64">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* Sidebar - desktop */}
      {!isMobile && <Sidebar />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
