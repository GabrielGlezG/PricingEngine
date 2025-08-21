/*
  # Corregir sistema de roles y autenticación

  1. Corregir políticas RLS
  2. Mejorar funciones de verificación de roles
  3. Asegurar que los triggers funcionen correctamente
  4. Corregir problemas de permisos
*/

-- Primero, asegurar que las tablas base existen y tienen la estructura correcta
CREATE TABLE IF NOT EXISTS public.user_roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insertar roles si no existen
INSERT INTO public.user_roles (id, name, description) VALUES
  ('admin', 'Administrador', 'Acceso completo al sistema'),
  ('user', 'Usuario', 'Acceso limitado con suscripción')
ON CONFLICT (id) DO NOTHING;

-- Asegurar que user_profiles tiene todas las columnas necesarias
DO $$
BEGIN
  -- Agregar columna role si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN role text DEFAULT 'user';
  END IF;
  
  -- Agregar columna is_active si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  -- Agregar columna subscription_status si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_status text;
  END IF;
  
  -- Agregar columna subscription_expires_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;
  
  -- Agregar columna subscription_plan si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_plan text;
  END IF;
END $$;

-- Agregar constraint para role si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_role_fkey'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_role_fkey 
    FOREIGN KEY (role) REFERENCES public.user_roles(id);
  END IF;
END $$;

-- Habilitar RLS en todas las tablas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes y recrear
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;

-- Políticas para user_profiles
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()::text 
      AND up.role = 'admin' 
      AND up.is_active = true
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()::text 
      AND up.role = 'admin' 
      AND up.is_active = true
    )
  );

-- Política para user_roles
CREATE POLICY "Anyone can read roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Recrear función is_admin con mejor manejo de errores
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  user_role text;
  user_active boolean;
BEGIN
  -- Si no hay user_id, retornar false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Obtener rol y estado del usuario
  SELECT role, is_active INTO user_role, user_active
  FROM public.user_profiles
  WHERE user_profiles.user_id = user_id::text;
  
  -- Retornar true solo si es admin y está activo
  RETURN (user_role = 'admin' AND user_active = true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear función has_active_subscription con mejor lógica
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  user_profile public.user_profiles%ROWTYPE;
BEGIN
  -- Si no hay user_id, retornar false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Obtener perfil del usuario
  SELECT * INTO user_profile
  FROM public.user_profiles
  WHERE user_profiles.user_id = user_id::text;
  
  -- Si no existe el perfil o no está activo, denegar acceso
  IF user_profile IS NULL OR NOT user_profile.is_active THEN
    RETURN false;
  END IF;
  
  -- Los admins siempre tienen acceso
  IF user_profile.role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar suscripción activa para usuarios regulares
  IF user_profile.subscription_status = 'active' THEN
    -- Si no hay fecha de expiración, la suscripción es válida
    IF user_profile.subscription_expires_at IS NULL THEN
      RETURN true;
    END IF;
    
    -- Si hay fecha de expiración, verificar que no haya vencido
    IF user_profile.subscription_expires_at > now() THEN
      RETURN true;
    END IF;
  END IF;
  
  -- También verificar en la tabla de suscripciones si existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_subscriptions us
      WHERE us.user_id = user_id::text
      AND us.status IN ('active', 'trialing')
      AND us.current_period_end > now()
    );
  END IF;
  
  RETURN false;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Mejorar función handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, name, role, is_active)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user',
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    updated_at = now();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para bootstrap del primer admin (mejorada)
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
  p_user_email text
)
RETURNS void AS $$
DECLARE
  target_user_id text;
  admin_count integer;
BEGIN
  -- Contar admins existentes
  SELECT COUNT(*) INTO admin_count
  FROM public.user_profiles
  WHERE role = 'admin' AND is_active = true;
  
  -- Solo permitir si no hay admins
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Ya existen administradores en el sistema';
  END IF;

  -- Buscar el usuario por email en auth.users
  SELECT id::text INTO target_user_id
  FROM auth.users
  WHERE email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con email % no encontrado', p_user_email;
  END IF;

  -- Crear o actualizar el perfil del usuario como admin
  INSERT INTO public.user_profiles (user_id, email, name, role, is_active, subscription_status)
  VALUES (
    target_user_id,
    p_user_email,
    p_user_email,
    'admin',
    true,
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    subscription_status = 'active',
    subscription_expires_at = NULL,
    updated_at = now();
    
  RAISE NOTICE 'Usuario % convertido en administrador', p_user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Actualizar políticas de products y price_data para usar la función corregida
DROP POLICY IF EXISTS "Authenticated users with subscription can read products" ON public.products;
DROP POLICY IF EXISTS "Anyone can read products" ON public.products;

CREATE POLICY "Users with active subscription can read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.has_active_subscription());

DROP POLICY IF EXISTS "Authenticated users with subscription can read price data" ON public.price_data;
DROP POLICY IF EXISTS "Anyone can read price data" ON public.price_data;

CREATE POLICY "Users with active subscription can read price data"
  ON public.price_data FOR SELECT
  TO authenticated
  USING (public.has_active_subscription());

-- Permitir a usuarios autenticados ejecutar bootstrap_first_admin
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription TO authenticated;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);

-- Asegurar que existe al menos un admin placeholder
INSERT INTO public.user_profiles (user_id, email, name, role, is_active, subscription_status)
VALUES (
  'placeholder-admin-' || gen_random_uuid()::text,
  'admin@modelpulse.com',
  'Administrador del Sistema',
  'admin',
  true,
  'active'
) ON CONFLICT DO NOTHING;