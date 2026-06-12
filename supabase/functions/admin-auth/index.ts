import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, email, password, currentPassword, newPassword } = await req.json()
    const trimmedEmail = (email ?? '').trim()

    if (action === 'login' || action === 'verify') {
      const candidatePassword = action === 'login' ? password : currentPassword

      const { data, error } = await supabase
        .from('admin_credentials')
        .select('email')
        .eq('email', trimmedEmail)
        .eq('password', candidatePassword)
        .maybeSingle()

      if (error || !data) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update-password') {
      const { data: match, error: verifyError } = await supabase
        .from('admin_credentials')
        .select('email')
        .eq('email', trimmedEmail)
        .eq('password', currentPassword)
        .maybeSingle()

      if (verifyError || !match) {
        return new Response(JSON.stringify({ success: false, error: 'Current password is incorrect' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error: updateError } = await supabase
        .from('admin_credentials')
        .update({ password: newPassword })
        .eq('email', trimmedEmail)

      if (updateError) {
        return new Response(JSON.stringify({ success: false, error: updateError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
