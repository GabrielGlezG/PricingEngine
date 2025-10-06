import { AppSidebar } from './AppSidebar'
import { TopBar } from './TopBar'
import { SidebarProvider } from './ui/sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export function NewLayout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
