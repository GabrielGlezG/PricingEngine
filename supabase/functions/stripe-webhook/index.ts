import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      throw new Error('Missing signature or webhook secret');
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('Webhook event type:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const customerEmail = (customer as Stripe.Customer).email;

        if (!customerEmail) {
          throw new Error('Customer email not found');
        }

        // Find user by email
        const { data: user, error: userError } = await supabaseClient.auth.admin.listUsers();
        if (userError) throw userError;

        const targetUser = user.users.find(u => u.email === customerEmail);
        if (!targetUser) {
          throw new Error('User not found');
        }

        // Get plan ID from subscription metadata or price
        const priceId = subscription.items.data[0].price.id;
        const { data: plan } = await supabaseClient
          .from('subscription_plans')
          .select('id')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single();

        if (!plan) {
          throw new Error('Plan not found for price ID: ' + priceId);
        }

        const billingCycle = subscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly';

        // Create or update subscription
        const { error: subError } = await supabaseClient.rpc('create_subscription', {
          p_user_id: targetUser.id,
          p_plan_id: plan.id,
          p_billing_cycle: billingCycle,
          p_stripe_subscription_id: subscription.id,
          p_stripe_customer_id: subscription.customer as string,
          p_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        });

        if (subError) throw subError;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabaseClient.rpc('update_subscription_status', {
          p_stripe_subscription_id: subscription.id,
          p_status: 'canceled'
        });

        if (error) throw error;
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Get subscription details
          const { data: subscription } = await supabaseClient
            .from('user_subscriptions')
            .select('id, user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (subscription) {
            // Record payment
            const { error } = await supabaseClient.rpc('record_payment', {
              p_user_id: subscription.user_id,
              p_subscription_id: subscription.id,
              p_amount: invoice.amount_paid / 100, // Convert from cents
              p_currency: invoice.currency,
              p_status: 'succeeded',
              p_stripe_payment_intent_id: invoice.payment_intent as string,
              p_stripe_invoice_id: invoice.id,
              p_description: invoice.description || 'Subscription payment'
            });

            if (error) throw error;
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Update subscription status to past_due
          const { error } = await supabaseClient.rpc('update_subscription_status', {
            p_stripe_subscription_id: invoice.subscription as string,
            p_status: 'past_due'
          });

          if (error) throw error;

          // Record failed payment
          const { data: subscription } = await supabaseClient
            .from('user_subscriptions')
            .select('id, user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (subscription) {
            const { error: paymentError } = await supabaseClient.rpc('record_payment', {
              p_user_id: subscription.user_id,
              p_subscription_id: subscription.id,
              p_amount: invoice.amount_due / 100,
              p_currency: invoice.currency,
              p_status: 'failed',
              p_stripe_payment_intent_id: invoice.payment_intent as string,
              p_stripe_invoice_id: invoice.id,
              p_description: 'Failed subscription payment'
            });

            if (paymentError) throw paymentError;
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});