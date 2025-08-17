/*
  # Sistema de Suscripciones

  1. Nuevas Tablas
    - `subscription_plans` - Planes de suscripción disponibles
    - `user_subscriptions` - Suscripciones activas de usuarios
    - `payment_history` - Historial de pagos

  2. Seguridad
    - Habilita RLS en todas las tablas nuevas
    - Políticas para usuarios y administradores

  3. Funciones
    - Función para verificar suscripción activa
    - Función para crear suscripción
    - Función para cancelar suscripción
*/

-- Crear tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2),
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de suscripciones de usuarios
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de historial de pagos
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'mxn',
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled', 'refunded')),
  stripe_payment_intent_id text UNIQUE,
  stripe_invoice_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insertar planes de suscripción por defecto
INSERT INTO public.subscription_plans (id, name, description, price_monthly, price_yearly, features) VALUES
  ('basic', 'Plan Básico', 'Acceso completo a análisis de precios automotrices', 299.00, 2990.00, 
   '["Acceso al dashboard", "Comparador de vehículos", "Insights automáticos", "Soporte por email"]'::jsonb),
  ('premium', 'Plan Premium', 'Incluye todas las funciones básicas más análisis avanzados', 499.00, 4990.00,
   '["Todo del Plan Básico", "Análisis históricos avanzados", "Alertas de precios", "Reportes personalizados", "Soporte prioritario"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_plans
CREATE POLICY "Anyone can read active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Políticas para user_subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can read all subscriptions"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "System can manage subscriptions"
  ON public.user_subscriptions FOR ALL
  TO service_role
  USING (true);

-- Políticas para payment_history
CREATE POLICY "Users can read own payment history"
  ON public.payment_history FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can read all payment history"
  ON public.payment_history FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "System can manage payment history"
  ON public.payment_history FOR ALL
  TO service_role
  USING (true);

-- Función para verificar suscripción activa (actualizada)
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  -- Los admins siempre tienen acceso
  IF public.is_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- Verificar suscripción activa
  RETURN EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = user_id::text
    AND us.status IN ('active', 'trialing')
    AND us.current_period_end > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para crear suscripción
CREATE OR REPLACE FUNCTION public.create_subscription(
  p_user_id text,
  p_plan_id text,
  p_billing_cycle text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz
)
RETURNS uuid AS $$
DECLARE
  subscription_id uuid;
BEGIN
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
    p_current_period_start,
    p_current_period_end,
    p_stripe_subscription_id,
    p_stripe_customer_id
  ) RETURNING id INTO subscription_id;
  
  -- Actualizar el perfil del usuario
  UPDATE public.user_profiles 
  SET 
    subscription_status = 'active',
    subscription_expires_at = p_current_period_end,
    subscription_plan = p_plan_id,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para actualizar estado de suscripción
CREATE OR REPLACE FUNCTION public.update_subscription_status(
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_end timestamptz DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  sub_user_id text;
  sub_plan_id text;
BEGIN
  -- Obtener información de la suscripción
  SELECT user_id, plan_id INTO sub_user_id, sub_plan_id
  FROM public.user_subscriptions
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  -- Actualizar suscripción
  UPDATE public.user_subscriptions 
  SET 
    status = p_status,
    current_period_end = COALESCE(p_current_period_end, current_period_end),
    updated_at = now()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  -- Actualizar perfil del usuario
  UPDATE public.user_profiles 
  SET 
    subscription_status = p_status,
    subscription_expires_at = COALESCE(p_current_period_end, subscription_expires_at),
    updated_at = now()
  WHERE user_id = sub_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para registrar pago
CREATE OR REPLACE FUNCTION public.record_payment(
  p_user_id text,
  p_subscription_id uuid,
  p_amount numeric,
  p_currency text,
  p_status text,
  p_stripe_payment_intent_id text,
  p_stripe_invoice_id text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  payment_id uuid;
BEGIN
  INSERT INTO public.payment_history (
    user_id,
    subscription_id,
    amount,
    currency,
    status,
    stripe_payment_intent_id,
    stripe_invoice_id,
    description
  ) VALUES (
    p_user_id,
    p_subscription_id,
    p_amount,
    p_currency,
    p_status,
    p_stripe_payment_intent_id,
    p_stripe_invoice_id,
    p_description
  ) RETURNING id INTO payment_id;
  
  RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers para actualizar timestamps
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id ON public.user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON public.payment_history(subscription_id);