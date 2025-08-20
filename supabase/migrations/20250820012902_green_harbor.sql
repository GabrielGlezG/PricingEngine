/*
  # Corregir lógica de suscripciones

  1. Actualizar función has_active_subscription
  2. Mejorar verificación de usuarios activos
  3. Agregar función para asignar rol de admin
*/

-- Actualizar función para verificar suscripción activa
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  user_profile public.user_profiles%ROWTYPE;
BEGIN
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
  
  -- También verificar en la tabla de suscripciones
  RETURN EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = user_id::text
    AND us.status IN ('active', 'trialing')
    AND us.current_period_end > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para hacer admin a un usuario (solo para otros admins)
CREATE OR REPLACE FUNCTION public.make_user_admin(
  p_user_email text
)
RETURNS void AS $$
DECLARE
  target_user_id text;
BEGIN
  -- Verificar que quien ejecuta es admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden asignar roles de admin';
  END IF;

  -- Buscar el usuario por email
  SELECT auth.users.id::text INTO target_user_id
  FROM auth.users
  WHERE auth.users.email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con email % no encontrado', p_user_email;
  END IF;

  -- Actualizar el perfil del usuario
  UPDATE public.user_profiles 
  SET 
    role = 'admin',
    is_active = true,
    subscription_status = 'active',
    subscription_expires_at = NULL, -- Los admins no tienen expiración
    updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Si no existe el perfil, crearlo
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (user_id, email, name, role, is_active, subscription_status)
    VALUES (
      target_user_id,
      p_user_email,
      p_user_email,
      'admin',
      true,
      'active'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para hacer admin al primer usuario (bootstrap)
CREATE OR REPLACE FUNCTION public.bootstrap_admin(
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
  
  -- Solo permitir si no hay admins o si quien ejecuta ya es admin
  IF admin_count > 0 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Ya existen administradores en el sistema';
  END IF;

  -- Buscar el usuario por email
  SELECT auth.users.id::text INTO target_user_id
  FROM auth.users
  WHERE auth.users.email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con email % no encontrado', p_user_email;
  END IF;

  -- Actualizar o crear el perfil del usuario
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permitir que cualquier usuario autenticado pueda ejecutar bootstrap_admin
-- (solo funcionará si no hay admins existentes)
GRANT EXECUTE ON FUNCTION public.bootstrap_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.make_user_admin TO authenticated;