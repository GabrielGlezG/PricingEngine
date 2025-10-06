import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Upload, Lightbulb, Scale, TrendingUp, Users, Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/pricing-engine-logo.png'

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
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-card border-r border-border flex flex-col transition-all duration-300`}>
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src={logo} alt="PricingEngine" className="h-10 w-10 object-contain" />
            <span className="font-bold text-lg text-foreground">PricingEngine</span>
          </div>
        )}
        {isCollapsed && (
          <img src={logo} alt="PricingEngine" className="h-10 w-10 object-contain mx-auto" />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {isCollapsed ? <Menu className="h-5 w-5 text-foreground" /> : <X className="h-5 w-5 text-foreground" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
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
