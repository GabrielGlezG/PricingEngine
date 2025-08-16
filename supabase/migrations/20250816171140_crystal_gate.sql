/*
  # Sistema de Autenticación y Roles

  1. Nuevas Tablas
    - `user_roles` - Define los roles disponibles (admin, user)
    - Actualiza `user_profiles` para incluir rol y estado de suscripción

  2. Seguridad
    - Habilita RLS en todas las tablas
    - Políticas para admin y usuarios regulares
    - Restricciones basadas en suscripción

  3. Funciones
    - Función para verificar si el usuario es admin
    - Función para verificar suscripción activa
*/

-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insertar roles básicos
INSERT INTO public.user_roles (id, name, description) VALUES
  ('admin', 'Administrador', 'Acceso completo al sistema'),
  ('user', 'Usuario', 'Acceso limitado con suscripción')
ON CONFLICT (id) DO NOTHING;

-- Actualizar tabla user_profiles para incluir rol
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN role text DEFAULT 'user' REFERENCES public.user_roles(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Habilitar RLS en user_profiles si no está habilitado
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()::text AND up.role = 'admin'
    )
  );

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = user_id::text
    AND user_profiles.role = 'admin'
    AND user_profiles.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para verificar suscripción activa
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = user_id::text
    AND user_profiles.is_active = true
    AND (
      user_profiles.role = 'admin' OR
      (user_profiles.subscription_status = 'active' AND 
       user_profiles.subscription_expires_at > now())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Actualizar políticas de products para requerir suscripción
DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
CREATE POLICY "Authenticated users with subscription can read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.has_active_subscription());

-- Actualizar políticas de price_data para requerir suscripción
DROP POLICY IF EXISTS "Anyone can read price data" ON public.price_data;
CREATE POLICY "Authenticated users with subscription can read price data"
  ON public.price_data FOR SELECT
  TO authenticated
  USING (public.has_active_subscription());

-- Políticas para scraping_jobs (solo admin)
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage scraping jobs" ON public.scraping_jobs;
CREATE POLICY "Admins can manage scraping jobs"
  ON public.scraping_jobs FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Función para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, name, role)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);