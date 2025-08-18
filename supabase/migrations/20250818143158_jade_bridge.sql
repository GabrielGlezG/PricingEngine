/*
  # Sistema de Suscripciones Funcional

  1. Nuevas Funciones
    - Función para asignar suscripción manualmente
    - Función para cancelar suscripción
    - Función para extender suscripción

  2. Datos de Prueba
    - Crear algunos usuarios de prueba con suscripciones
    - Asignar roles de administrador

  3. Mejoras
    - Función para obtener fechas de scraping distintas
    - Optimizaciones de rendimiento
*/

-- Función para asignar suscripción manualmente (para admins)
CREATE OR REPLACE FUNCTION public.assign_subscription(
  p_user_id text,
  p_plan_id text,
  p_billing_cycle text DEFAULT 'monthly',
  p_duration_months integer DEFAULT 1
)
RETURNS uuid AS $$
DECLARE
  subscription_id uuid;
  period_end timestamptz;
BEGIN
  -- Solo admins pueden asignar suscripciones
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden asignar suscripciones';
  END IF;

  -- Calcular fecha de vencimiento
  period_end := CURRENT_TIMESTAMP + (p_duration_months || ' months')::interval;

  -- Cancelar suscripción existente si la hay
  UPDATE public.user_subscriptions 
  SET status = 'canceled', updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';

  -- Crear nueva suscripción
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    billing_cycle,
    current_period_start,
    current_period_end,
    stripe_subscription_id,
    stripe_customer_id
  ) VALUES (
    p_user_id,
    p_plan_id,
    'active',
    p_billing_cycle,
    CURRENT_TIMESTAMP,
    period_end,
    'manual_' || gen_random_uuid()::text,
    'manual_customer_' || p_user_id
  ) RETURNING id INTO subscription_id;
  
  -- Actualizar el perfil del usuario
  UPDATE public.user_profiles 
  SET 
    subscription_status = 'active',
    subscription_expires_at = period_end,
    subscription_plan = p_plan_id,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para cancelar suscripción
CREATE OR REPLACE FUNCTION public.cancel_subscription(p_user_id text)
RETURNS void AS $$
BEGIN
  -- Solo admins o el propio usuario pueden cancelar
  IF NOT (public.is_admin() OR auth.uid()::text = p_user_id) THEN
    RAISE EXCEPTION 'No tienes permisos para cancelar esta suscripción';
  END IF;

  -- Actualizar suscripción
  UPDATE public.user_subscriptions 
  SET 
    status = 'canceled',
    cancel_at_period_end = true,
    updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Actualizar perfil del usuario
  UPDATE public.user_profiles 
  SET 
    subscription_status = 'canceled',
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para extender suscripción
CREATE OR REPLACE FUNCTION public.extend_subscription(
  p_user_id text,
  p_months integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
  -- Solo admins pueden extender suscripciones
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden extender suscripciones';
  END IF;

  -- Extender suscripción activa
  UPDATE public.user_subscriptions 
  SET 
    current_period_end = current_period_end + (p_months || ' months')::interval,
    updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Actualizar perfil del usuario
  UPDATE public.user_profiles 
  SET 
    subscription_expires_at = subscription_expires_at + (p_months || ' months')::interval,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para obtener fechas de scraping distintas
CREATE OR REPLACE FUNCTION public.get_distinct_scraping_dates()
RETURNS TABLE(scraping_date date) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT pd.date::date
  FROM public.price_data pd
  ORDER BY pd.date::date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para activar/desactivar usuario
CREATE OR REPLACE FUNCTION public.toggle_user_status(
  p_user_id text,
  p_is_active boolean
)
RETURNS void AS $$
BEGIN
  -- Solo admins pueden cambiar estado de usuarios
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar el estado de usuarios';
  END IF;

  UPDATE public.user_profiles 
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Si se desactiva el usuario, cancelar su suscripción
  IF NOT p_is_active THEN
    UPDATE public.user_subscriptions 
    SET status = 'canceled', updated_at = now()
    WHERE user_id = p_user_id AND status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para cambiar rol de usuario
CREATE OR REPLACE FUNCTION public.change_user_role(
  p_user_id text,
  p_new_role text
)
RETURNS void AS $$
BEGIN
  -- Solo admins pueden cambiar roles
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar roles de usuarios';
  END IF;

  -- Verificar que el rol existe
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE id = p_new_role) THEN
    RAISE EXCEPTION 'El rol especificado no existe';
  END IF;

  UPDATE public.user_profiles 
  SET 
    role = p_new_role,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear un usuario admin por defecto (opcional)
-- Nota: Este usuario se creará cuando alguien se registre con este email
INSERT INTO public.user_profiles (user_id, email, name, role, is_active, subscription_status)
VALUES (
  'admin-placeholder',
  'admin@modelpulse.com',
  'Administrador',
  'admin',
  true,
  'active'
) ON CONFLICT (user_id) DO NOTHING;

-- Índices adicionales para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires ON public.user_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Política adicional para permitir a admins gestionar suscripciones
CREATE POLICY "Admins can manage all subscriptions"
  ON public.user_subscriptions FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage all payments"
  ON public.payment_history FOR ALL
  TO authenticated
  USING (public.is_admin());