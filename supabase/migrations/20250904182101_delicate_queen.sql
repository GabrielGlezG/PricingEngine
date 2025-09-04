/*
  # Corregir problemas de acceso de administrador

  1. Verificar y corregir políticas RLS
  2. Mejorar funciones de verificación
  3. Asegurar que los admins tengan acceso completo
  4. Agregar debugging y logging
*/

-- Verificar que las funciones de verificación funcionen correctamente
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  user_role text;
  user_active boolean;
  result boolean := false;
BEGIN
  -- Si no hay user_id, retornar false
  IF user_id IS NULL THEN
    RAISE LOG 'is_admin: user_id is NULL';
    RETURN false;
  END IF;

  -- Obtener rol y estado del usuario
  SELECT role, is_active INTO user_role, user_active
  FROM public.user_profiles
  WHERE user_profiles.user_id = user_id::text;
  
  -- Log para debugging
  RAISE LOG 'is_admin check for user %: role=%, active=%', user_id, user_role, user_active;
  
  -- Retornar true solo si es admin y está activo
  result := (user_role = 'admin' AND user_active = true);
  
  RAISE LOG 'is_admin result for user %: %', user_id, result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'is_admin error for user %: %', user_id, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Mejorar función has_active_subscription con mejor logging
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  user_profile public.user_profiles%ROWTYPE;
  result boolean := false;
BEGIN
  -- Si no hay user_id, retornar false
  IF user_id IS NULL THEN
    RAISE LOG 'has_active_subscription: user_id is NULL';
    RETURN false;
  END IF;

  -- Obtener perfil del usuario
  SELECT * INTO user_profile
  FROM public.user_profiles
  WHERE user_profiles.user_id = user_id::text;
  
  -- Log para debugging
  RAISE LOG 'has_active_subscription check for user %: profile exists=%, active=%, role=%, sub_status=%', 
    user_id, (user_profile IS NOT NULL), user_profile.is_active, user_profile.role, user_profile.subscription_status;
  
  -- Si no existe el perfil o no está activo, denegar acceso
  IF user_profile IS NULL OR NOT user_profile.is_active THEN
    RAISE LOG 'has_active_subscription: user profile missing or inactive for user %', user_id;
    RETURN false;
  END IF;
  
  -- Los admins siempre tienen acceso
  IF user_profile.role = 'admin' THEN
    RAISE LOG 'has_active_subscription: user % is admin, granting access', user_id;
    RETURN true;
  END IF;
  
  -- Verificar suscripción activa para usuarios regulares
  IF user_profile.subscription_status = 'active' THEN
    -- Si no hay fecha de expiración, la suscripción es válida
    IF user_profile.subscription_expires_at IS NULL THEN
      RAISE LOG 'has_active_subscription: user % has active subscription with no expiry', user_id;
      RETURN true;
    END IF;
    
    -- Si hay fecha de expiración, verificar que no haya vencido
    IF user_profile.subscription_expires_at > now() THEN
      RAISE LOG 'has_active_subscription: user % has active subscription until %', user_id, user_profile.subscription_expires_at;
      RETURN true;
    ELSE
      RAISE LOG 'has_active_subscription: user % subscription expired on %', user_id, user_profile.subscription_expires_at;
    END IF;
  END IF;
  
  -- También verificar en la tabla de suscripciones si existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    result := EXISTS (
      SELECT 1 FROM public.user_subscriptions us
      WHERE us.user_id = user_id::text
      AND us.status IN ('active', 'trialing')
      AND us.current_period_end > now()
    );
    
    RAISE LOG 'has_active_subscription: user % subscription table check result: %', user_id, result;
    RETURN result;
  END IF;
  
  RAISE LOG 'has_active_subscription: user % denied access - no valid subscription found', user_id;
  RETURN false;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'has_active_subscription error for user %: %', user_id, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear políticas con mejor lógica
DROP POLICY IF EXISTS "Users with active subscription can read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users with subscription can read products" ON public.products;

CREATE POLICY "Users with active subscription can read products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    -- Permitir acceso si el usuario tiene suscripción activa O es admin
    public.has_active_subscription() OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users with active subscription can read price data" ON public.price_data;
DROP POLICY IF EXISTS "Authenticated users with subscription can read price data" ON public.price_data;

CREATE POLICY "Users with active subscription can read price data"
  ON public.price_data FOR SELECT
  TO authenticated
  USING (
    -- Permitir acceso si el usuario tiene suscripción activa O es admin
    public.has_active_subscription() OR public.is_admin()
  );

-- Asegurar que los admins pueden gestionar todo
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Función para verificar y corregir perfil de usuario
CREATE OR REPLACE FUNCTION public.verify_and_fix_user_profile(
  p_user_id text DEFAULT auth.uid()::text
)
RETURNS jsonb AS $$
DECLARE
  user_profile public.user_profiles%ROWTYPE;
  auth_user auth.users%ROWTYPE;
  result jsonb;
BEGIN
  -- Obtener datos del usuario de auth
  SELECT * INTO auth_user
  FROM auth.users
  WHERE id = p_user_id::uuid;
  
  IF auth_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Usuario no encontrado en auth.users');
  END IF;
  
  -- Obtener perfil del usuario
  SELECT * INTO user_profile
  FROM public.user_profiles
  WHERE user_id = p_user_id;
  
  -- Si no existe el perfil, crearlo
  IF user_profile IS NULL THEN
    INSERT INTO public.user_profiles (user_id, email, name, role, is_active)
    VALUES (
      p_user_id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.email),
      'user',
      true
    )
    RETURNING * INTO user_profile;
    
    result := jsonb_build_object(
      'action', 'created_profile',
      'profile', row_to_json(user_profile)
    );
  ELSE
    result := jsonb_build_object(
      'action', 'profile_exists',
      'profile', row_to_json(user_profile)
    );
  END IF;
  
  -- Agregar información de verificación
  result := result || jsonb_build_object(
    'is_admin', public.is_admin(p_user_id::uuid),
    'has_active_subscription', public.has_active_subscription(p_user_id::uuid),
    'auth_user_exists', (auth_user IS NOT NULL)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permitir a usuarios autenticados ejecutar la función de verificación
GRANT EXECUTE ON FUNCTION public.verify_and_fix_user_profile TO authenticated;

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
  created_at timestamptz
) AS $$
BEGIN
  -- Solo admins pueden ver todos los usuarios
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden ver todos los usuarios';
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
    up.created_at
  FROM public.user_profiles up
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.list_all_users TO authenticated;

-- Asegurar que las políticas permiten a los usuarios leer su propio perfil
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Permitir a los usuarios actualizar su propio perfil (campos limitados)
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (
    auth.uid()::text = user_id AND
    -- Solo permitir actualizar ciertos campos
    (OLD.role = NEW.role OR public.is_admin()) AND
    (OLD.is_active = NEW.is_active OR public.is_admin())
  );

-- Política para permitir inserción de nuevos perfiles (para el trigger)
DROP POLICY IF EXISTS "System can create profiles" ON public.user_profiles;
CREATE POLICY "System can create profiles"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);