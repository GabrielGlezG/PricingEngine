import { BarChart3, Upload, Lightbulb, Car, Scale } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

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
    { title: "Cargar Datos", url: "/upload", icon: Upload, requireAdmin: true },
    { title: "Comparar", url: "/compare", icon: Scale, requireAdmin: false },
    { title: "Insights", url: "/insights", icon: Lightbulb, requireAdmin: false },
  ]

  const filteredItems = items.filter(item => !item.requireAdmin || isAdmin)

  const isActive = (path: string) => currentPath === path
  const collapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-4 py-2">
            <Car className="h-5 w-5" />
            {!collapsed && <span className="font-semibold">ModelPulse</span>}
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