import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Upload, Lightbulb, Scale, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const { state } = useSidebar()
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
  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
