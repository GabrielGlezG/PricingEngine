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
  const { user, profile, signIn, signUp, makeFirstAdmin } = useAuth()
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
      
      // Verificar si necesita configurar el primer admin
      setTimeout(() => {
        setShowAdminSetup(true)
      }, 2000)
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
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in relative overflow-hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 backdrop-blur-sm"></div>
      
      <div className="w-full max-w-md relative z-10">
        <Card className="bg-card/95 backdrop-blur-md border-border/50 shadow-2xl">
          <CardContent className="pt-8 pb-6 px-8">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg p-4">
                <img src={logo} alt="PricingEngine" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center text-foreground mb-8">
              Bienvenido
            </h1>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Correo electrónico"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-12 bg-background/50 border-border/50 focus:bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="h-12 pr-20 bg-background/50 border-border/50 focus:bg-background"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-primary hover:text-primary/80 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90">
                    Iniciar sesión
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Nombre Completo"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="h-12 bg-background/50 border-border/50 focus:bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Correo electrónico"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-12 bg-background/50 border-border/50 focus:bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="h-12 pr-20 bg-background/50 border-border/50 focus:bg-background"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-primary hover:text-primary/80 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirmar Contraseña"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      className="h-12 bg-background/50 border-border/50 focus:bg-background"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90">
                    Crear Cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Modal para configurar primer admin */}
        {showAdminSetup && user && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Configurar Administrador
                </CardTitle>
                <CardDescription>
                  ¿Deseas convertir esta cuenta en administrador del sistema?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400">
                    Email: {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta acción solo está disponible si no hay otros administradores en el sistema.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleMakeFirstAdmin}
                    className="flex-1"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Hacer Administrador
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAdminSetup(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}