import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Upload, Lightbulb, Scale, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/pricing-engine-logo-new.png'

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const { isAdmin } = useAuth()
  
  const items = [
    { title: 'Dashboard', url: '/', icon: BarChart3, requireAdmin: false },
    { title: 'Cargar Datos', url: '/upload', icon: Upload, requireAdmin: true },
    { title: 'Comparar', url: '/compare', icon: Scale, requireAdmin: false },
    { title: 'Evolución de Precios', url: '/price-evolution', icon: TrendingUp, requireAdmin: false },
    { title: 'Insights', url: '/insights', icon: Lightbulb, requireAdmin: false },
    { title: 'Admin', url: '/admin', icon: Users, requireAdmin: true },
  ]

  const filteredItems = items.filter(item => !item.requireAdmin || isAdmin)
  const isActive = (path: string) => location.pathname === path

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-card border-r border-border flex flex-col transition-all duration-300 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <img src={logo} alt="PricingEngine" className={`${isCollapsed ? 'h-12 w-12 mx-auto' : 'h-20 w-auto mx-4'} object-contain transition-all duration-300 mt-8 mb-6`} />

      <nav className="flex-1 p-4 space-y-2 mt-2">
        {filteredItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.url)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">{item.title}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
