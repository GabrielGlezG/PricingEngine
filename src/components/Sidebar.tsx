import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Upload, Lightbulb, Scale, TrendingUp, Users, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/pricing-engine-logo-new.png'

interface SidebarProps {
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const { isAdmin } = useAuth()

  const items = [
    { title: 'Dashboard', url: '/', icon: BarChart3, requireAdmin: false },
    { title: 'Cargar Datos', url: '/upload', icon: Upload, requireAdmin: true },
    { title: 'Comparar', url: '/compare', icon: Scale, requireAdmin: false },
    { title: 'Evolución de Precios', url: '/price-evolution', icon: TrendingUp, requireAdmin: false },
    { title: 'Destacados', url: '/destacados', icon: Lightbulb, requireAdmin: false },
    { title: 'Admin', url: '/admin', icon: Users, requireAdmin: true },
  ]

  const filteredItems = items.filter(item => !item.requireAdmin || isAdmin)
  const isActive = (path: string) => location.pathname === path

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-gradient-to-b from-sidebar to-slate-950 border-r border-sidebar-border flex flex-col transition-all duration-300 relative
        ${isMobileOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} md:flex shadow-2xl`}>

        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute right-4 top-4 z-10 h-8 w-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center md:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Collapse/Expand button for desktop */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 hidden md:flex"
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className="relative z-10">
          <img src={logo} alt="PricingEngine" className={`${isCollapsed ? 'h-16 w-16 mx-auto' : 'h-24 sm:h-28 w-auto mx-4'} object-contain transition-all duration-300 mt-8 mb-6 drop-shadow-lg opacity-90 hover:opacity-100`} />
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto">
          {filteredItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={() => setIsMobileOpen(false)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                isActive(item.url)
                  ? 'bg-gradient-to-r from-sidebar-primary to-blue-600 text-sidebar-primary-foreground shadow-lg shadow-blue-500/20 ring-1 ring-white/10'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium text-sm sm:text-base">{item.title}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}
