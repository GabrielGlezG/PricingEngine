import { BarChart3, Upload, Lightbulb, Scale, TrendingUp } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import logo from "@/assets/pricing-engine-icon.png"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"


export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const { isAdmin } = useAuth()
  const currentPath = location.pathname

  const items = [
    { title: "Dashboard", url: "/", icon: BarChart3, requireAdmin: false },
    { title: "Dashboard Alt", url: "/dashboard-alt", icon: BarChart3, requireAdmin: false },
    { title: "Cargar Datos", url: "/upload", icon: Upload, requireAdmin: true },
    { title: "Comparar", url: "/compare", icon: Scale, requireAdmin: false },
    { title: "Evolución de Precios", url: "/price-evolution", icon: TrendingUp, requireAdmin: false },
    { title: "Insights", url: "/insights", icon: Lightbulb, requireAdmin: false },
    { title: "Admin", url: "/admin", icon: BarChart3, requireAdmin: true },
  ]

  const filteredItems = items.filter(item => !item.requireAdmin || isAdmin)

  const isActive = (path: string) => currentPath === path
  const collapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-4 py-3">
            <img src={logo} alt="PricingEngine" className="h-8 w-8 object-contain" />
            {!collapsed && <span className="font-semibold">PricingEngine</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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