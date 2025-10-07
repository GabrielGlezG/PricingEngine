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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN subscription_plan text;
  END IF;
END $$;

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_roles
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;
CREATE POLICY "Anyone can read roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para user_profiles - Admins pueden leer todos los perfiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()::text AND up.role = 'admin' AND up.is_active = true
    )
  );

-- Política para que admins puedan gestionar todos los perfiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()::text AND up.role = 'admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()::text AND up.role = 'admin' AND up.is_active = true
    )
  );

-- Permitir creación de perfiles para nuevos usuarios
DROP POLICY IF EXISTS "System can create profiles" ON public.user_profiles;
CREATE POLICY "System can create profiles"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
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
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = user_id::text
    AND user_profiles.is_active = true
    AND (
      user_profiles.role = 'admin' OR
      (user_profiles.subscription_status = 'active' AND 
       (user_profiles.subscription_expires_at IS NULL OR user_profiles.subscription_expires_at > now()))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para listar todos los usuarios (solo para admins)
CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE(
  user_id text,
  email text,
  name text,
  role text,
  is_active boolean,
  subscription_status text,
  subscription_expires_at timestamptz,
  subscription_plan text,
  created_at timestamptz
) AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden listar todos los usuarios';
  END IF;

  RETURN QUERY
  SELECT 
    up.user_id,
    up.email,
    up.name,
    up.role,
    up.is_active,
    up.subscription_status,
    up.subscription_expires_at,
    up.subscription_plan,
    up.created_at
  FROM public.user_profiles up
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_all_users TO authenticated;

-- Actualizar políticas de products para requerir suscripción
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
CREATE POLICY "Authenticated users with subscription can read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.has_active_subscription() OR public.is_admin());

-- Actualizar políticas de price_data para requerir suscripción
DROP POLICY IF EXISTS "Authenticated users can read price data" ON public.price_data;
CREATE POLICY "Authenticated users with subscription can read price data"
  ON public.price_data FOR SELECT
  TO authenticated
  USING (public.has_active_subscription() OR public.is_admin());

-- Políticas para scraping_jobs (solo admin)
DROP POLICY IF EXISTS "Admins can manage scraping jobs" ON public.scraping_jobs;
CREATE POLICY "Admins can manage scraping jobs"
  ON public.scraping_jobs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());