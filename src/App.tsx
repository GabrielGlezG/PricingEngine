import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { LastUpdateProvider } from "./contexts/LastUpdateContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NewLayout } from "./components/NewLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Compare from "./pages/Compare";
import Insights from "./pages/Insights";
import PriceEvolution from "./pages/PriceEvolution";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <CurrencyProvider>
            <LastUpdateProvider>
              <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ProtectedRoute requireSubscription={true}>
                  <NewLayout>
                    <Dashboard />
                  </NewLayout>
                </ProtectedRoute>
              } />
              <Route path="/upload" element={
                <ProtectedRoute requireAdmin={true}>
                  <NewLayout>
                    <Upload />
                  </NewLayout>
                </ProtectedRoute>
              } />
              <Route path="/compare" element={
                <ProtectedRoute requireSubscription={true}>
                  <NewLayout>
                    <Compare />
                  </NewLayout>
                </ProtectedRoute>
              } />
              <Route path="/insights" element={
                <ProtectedRoute requireSubscription={true}>
                  <NewLayout>
                    <Insights />
                  </NewLayout>
                </ProtectedRoute>
              } />
              <Route path="/price-evolution" element={
                <ProtectedRoute requireSubscription={true}>
                  <NewLayout>
                    <PriceEvolution />
                  </NewLayout>
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute requireSubscription={false} allowWithoutProfile={true}>
                  <NewLayout>
                    <Subscription />
                  </NewLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                  <NewLayout>
                    <Admin />
                  </NewLayout>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </LastUpdateProvider>
          </CurrencyProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
