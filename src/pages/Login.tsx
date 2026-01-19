import { useState, useEffect } from 'react'
import { useTheme } from "next-themes"
import { useAuth } from '@/contexts/AuthContext'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Crown, Mail, Lock, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import logo from '@/assets/pricing-engine-logo-new.png'

export default function Login() {
  const { setTheme } = useTheme()
  const { user, profile, loading, signIn, signUp } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  
  // Force Reset to Light Mode when accessing Login
  useEffect(() => {
    setTheme('light')
  }, [setTheme])
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const [justRegistered, setJustRegistered] = useState(false)
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })
  
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })

  // Only show spinner if we have a user but are waiting for profile/data
  // This prevents the "Authenticating" flash for unauthenticated users visiting the page
  if (loading && user) {
    return <LoadingSpinner fullScreen size="lg" text="Verificando perfil..." />
  }

  if (user && profile) {
    // Si acaba de registrarse, ir a subscription
    if (justRegistered) {
      return <Navigate to="/subscription" replace />
    }

    // Si es admin o tiene suscripción activa → ir siempre al dashboard
    if (profile.role === 'admin' || profile.subscription_status === 'active') {
      return <Navigate to="/dashboard" replace />
    }

    // Si tiene perfil pero NO tiene suscripción activa → ir a subscription
    return <Navigate to="/subscription" replace />
  }



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const { error } = await signIn(loginForm.email, loginForm.password)
    
    setIsLoading(false)
    
    if (error) {
      setError(error.message)
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente."
      })
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    if (signupForm.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }

    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.name)
    
    setIsLoading(false)
    
    if (error) {
      setError(error.message)
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive"
      })
    } else {
      setJustRegistered(true)
      toast({
        title: "¡Registro exitoso!",
        description: "Serás redirigido a la página de suscripción."
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" text="Autenticando..." />
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* LEFT PANEL: Branding & Value Prop (Enterprise Style) */}
      {/* LEFT PANEL: Branding & Value Prop (Enterprise Style) */}
      <div className="hidden lg:flex flex-col bg-[#002B5E] text-white relative overflow-hidden h-full">
        {/* Background Gradients & Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#001A38] via-[#002B5E] to-[#003B73] opacity-90" />
        
        {/* Decorative Elements - Subtle Data Feel */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none mix-blend-overlay" />

        {/* CONTENT CONTAINER: Full Height Flex Column */}
        <div className="relative z-10 flex flex-col h-full p-12 justify-between">
            
            {/* Main Content Group - Centered vertically in remaining space */}
            <div className="flex flex-col justify-center flex-1 max-w-xl">
               <div className="transition-transform duration-500 hover:scale-105 origin-left mb-12">
                 <img src={logo} alt="PricingEngine" className="w-48 sm:w-64 h-auto object-contain drop-shadow-2xl -ml-10" />
               </div>

               <div className="space-y-8">
                 <div className="space-y-3">
                   <h1 className="text-6xl font-bold tracking-tighter text-white font-heading drop-shadow-lg">
                     DDS
                   </h1>
                   <p className="text-xl font-medium tracking-widest text-blue-200/90 uppercase flex items-center gap-4">
                     Data <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Decisions <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Solutions
                   </p>
                 </div>
                 
                 <div className="h-px w-24 bg-gradient-to-r from-blue-400 to-transparent opacity-70" />

                 <p className="text-lg leading-loose text-blue-100/90 font-light max-w-lg text-pretty">
                   Plataforma avanzada de inteligencia de precios para el sector automotriz. Toma decisiones estratégicas con información en tiempo real, agilidad y eficiencia.
                 </p>
               </div>
            </div>

            {/* Footer - Natural flow at bottom, no overlap */}
            <div className="flex items-center gap-4 text-xs font-bold tracking-widest text-blue-200/30 uppercase mt-8 shrink-0">
               <span>PricingEngine</span>
               <span className="w-1 h-1 bg-current rounded-full" />
               <span>2026</span>
            </div>
        </div>
      </div>

      {/* RIGHT PANEL: Authentication Form */}
      <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/50">
        <div className="w-full max-w-[440px] space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
          
           {/* Card Container for Form */}
           <div className="bg-white dark:bg-slate-900 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 md:p-10">
            
            {/* Mobile Logo (only visible on small screens) */}
            <div className="lg:hidden flex justify-center mb-8">
              <img src={logo} alt="PricingEngine" className="h-14 w-auto" />
            </div>

            <div className="space-y-2 text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Bienvenido
              </h2>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg">
                <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium transition-all">Ingresar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium transition-all">Registrarse</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-6 animate-in fade-in slide-in-from-top-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="space-y-6 focus-visible:outline-none">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Correo Electrónico</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="nombre@empresa.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                        className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Contraseña</Label>
                      <a href="#" className="text-xs font-medium text-primary hover:underline hover:text-primary/80">¿Olvidaste tu contraseña?</a>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        placeholder="*********"
                        className="h-11 pl-10 pr-10 bg-slate-50 border-slate-200 focus:bg-white transition-all ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all font-medium text-[15px] hover:scale-[1.01] active:scale-[0.99]">
                    Iniciar Sesión
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="focus-visible:outline-none">
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Nombre Completo</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Juan Pérez"
                          value={signupForm.name}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="nombre@empresa.com"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Contraseña</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Crear contraseña"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                          required
                          className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Confirmar Contraseña</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Repetir contraseña"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          required
                          className="h-11 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all font-medium text-[15px] mt-2 hover:scale-[1.01] active:scale-[0.99]">
                      Crear Cuenta
                    </Button>
                  </form>
              </TabsContent>
            </Tabs>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Al continuar, aceptas nuestros{" "}
              <Link to="/terms" className="underline underline-offset-4 hover:text-primary transition-colors">
                Términos de Servicio
              </Link>{" "}
              y{" "}
              <Link to="/privacy" className="underline underline-offset-4 hover:text-primary transition-colors">
                Política de Privacidad
              </Link>.
            </p>
          </div>
        </div>



      </div>
    </div>
  )
}