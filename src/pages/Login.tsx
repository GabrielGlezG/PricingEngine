import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Crown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import logo from '@/assets/pricing-engine-logo-new.png'

export default function Login() {
  const { user, profile, loading, signIn, signUp, makeFirstAdmin } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showAdminSetup, setShowAdminSetup] = useState(false)
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

  // Esperar a que termine de cargar antes de redirigir
  if (loading) {
    return <LoadingSpinner fullScreen size="lg" text="Autenticando..." />
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


  const handleMakeFirstAdmin = async () => {
    if (!user?.email) return
    
    setIsLoading(true)
    try {
      await makeFirstAdmin(user.email)
      setShowAdminSetup(false)
    } catch (error) {
      console.error('Error making first admin:', error)
    } finally {
      setIsLoading(false)
    }
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
      <div className="hidden lg:flex flex-col justify-between bg-[#002B5E] text-white p-12 relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
           </svg>
        </div>
        
        <div className="relative z-10">
          <img src={logo} alt="PricingEngine" className="h-16 w-auto object-contain brightness-0 invert opacity-90" />
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Inteligencia de Precios para el Mercado Automotriz
          </h1>
          <p className="text-blue-100 text-lg">
            Toma decisiones basadas en datos reales. Monitorea competidores, optimiza márgenes y lidera el mercado con PricingEngine.
          </p>
        </div>

        <div className="relative z-10 text-sm text-blue-200/60">
          © 2025 PricingEngine Inc. Todos los derechos reservados.
        </div>
      </div>

      {/* RIGHT PANEL: Authentication Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
          
          {/* Mobile Logo (only visible on small screens) */}
          <div className="lg:hidden flex justify-center mb-8">
             <img src={logo} alt="PricingEngine" className="h-12 w-auto" />
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Bienvenido
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Ingresa tus credenciales para acceder al dashboard.
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <a href="#" className="text-xs font-medium text-primary hover:underline">¿Olvidaste tu contraseña?</a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-[#002B5E] hover:bg-[#002B5E]/90 text-white shadow-md transition-all">
                  Iniciar Sesión
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
               <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="nombre@empresa.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Crear contraseña"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repetir contraseña"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-[#002B5E] hover:bg-[#002B5E]/90 text-white shadow-md transition-all">
                    Crear Cuenta
                  </Button>
                </form>
            </TabsContent>
          </Tabs>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Al continuar, aceptas nuestros{" "}
            <a href="/terms" className="underline underline-offset-4 hover:text-primary">
              Términos de Servicio
            </a>{" "}
            y{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Política de Privacidad
            </a>.
          </p>
        </div>

        {/* Modal Admin Setup (Floating, kept minimal) */}
        {showAdminSetup && user && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
             <Card className="w-full max-w-md shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Configurar Administrador
                </CardTitle>
                <CardDescription>
                  Confirmar creación de rol administrador.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="p-3 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-sm">
                    <strong>Email:</strong> {user.email}
                 </div>
                 <div className="flex gap-2 pt-2">
                    <Button onClick={handleMakeFirstAdmin} className="flex-1">Confirmar</Button>
                    <Button variant="outline" onClick={() => setShowAdminSetup(false)} className="flex-1">Cancelar</Button>
                 </div>
              </CardContent>
             </Card>
          </div>
        )}

      </div>
    </div>
  )
}