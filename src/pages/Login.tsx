import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Loader2, Crown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import logo from '@/assets/pricing-engine-logo-new.png'

export default function Login() {
  const { user, signIn, signUp, makeFirstAdmin } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showAdminSetup, setShowAdminSetup] = useState(false)
  
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

  // Redirect if already logged in
  if (user) {
    const from = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
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
    
    setIsLoading(false)
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
    
    if (error) {
      setError(error.message)
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "¡Registro exitoso!",
        description: "Revisa tu email para confirmar tu cuenta."
      })
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img src={logo} alt="PricingEngine" className="h-32 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">PricingEngine</h1>
          <p className="text-muted-foreground">Sistema de Análisis de Precios Automotrices</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Acceso al Sistema</CardTitle>
            <CardDescription className="text-center">
              Inicia sesión o crea una cuenta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="pr-10"
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                      placeholder="Tu nombre"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿Necesitas ayuda?{' '}
                <Link to="/contact" className="text-primary hover:underline">
                  Contacta soporte
                </Link>
              </p>
            </div>
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
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Crown className="mr-2 h-4 w-4" />
                    )}
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
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Al usar PricingEngine, aceptas nuestros{' '}
            <Link to="/terms" className="text-muted-foreground hover:underline">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link to="/privacy" className="text-muted-foreground hover:underline">
              Política de Privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}