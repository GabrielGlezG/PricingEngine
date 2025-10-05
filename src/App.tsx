import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
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
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute requireSubscription={true}>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/upload" element={
                <ProtectedRoute requireAdmin={true}>
                  <Layout>
                    <Upload />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/compare" element={
                <ProtectedRoute requireSubscription={true}>
                  <Layout>
                    <Compare />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/insights" element={
                <ProtectedRoute requireSubscription={true}>
                  <Layout>
                    <Insights />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/price-evolution" element={
                <ProtectedRoute requireSubscription={true}>
                  <Layout>
                    <PriceEvolution />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute requireSubscription={false}>
                  <Layout>
                    <Subscription />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                  <Layout>
                    <Admin />
                  </Layout>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
