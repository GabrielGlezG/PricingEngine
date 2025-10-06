import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string
  password: string
  name: string
  role?: 'user' | 'admin'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, name, role = 'user' }: CreateUserRequest = await req.json()

    console.log('Creating user with email:', email)

    // Create user in auth
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name
      }
    })

    if (signUpError) {
      console.error('Error creating auth user:', signUpError)
      throw signUpError
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned')
    }

    console.log('Auth user created with ID:', authData.user.id)

    // Create user profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email,
        name,
        role
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Try to delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    console.log('User profile created successfully')

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        profile: profileData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
