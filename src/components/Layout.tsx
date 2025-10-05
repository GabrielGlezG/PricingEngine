import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { UserMenu } from "./UserMenu"
import logo from "@/assets/WhatsApp Image 2025-10-02 at 2.27.16 PM.jpeg"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 flex items-center justify-between ml-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="PricingEngine" className="h-9 w-9 object-cover rounded-md" />
                <h1 className="text-xl font-semibold text-foreground">PricingEngine</h1>
              </div>
              <UserMenu />
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}