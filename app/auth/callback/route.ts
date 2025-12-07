import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getNextOnboardingStep } from '@/lib/onboarding'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )

  let user = null

  // Handle OAuth code exchange (Google, Apple, etc.)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      user = data.user
    }
  }
  
  // Handle magic link / email OTP token
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'magiclink' | 'signup' | 'recovery',
    })
    if (!error && data.user) {
      user = data.user
    }
  }

  if (user) {
    // Create or update user profile
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, full_name, username, onboarding_step, is_onboarded')
      .eq('id', user.id)
      .single()

    if (!existingUser) {
      // New user - create profile with initial onboarding state
      await supabase
        .from('users')
        .insert({
          id: user.id,
          last_active_at: new Date().toISOString(),
          onboarding_step: 1,
          is_onboarded: false,
        })
    } else {
      // Existing user - update last active
      await supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    
    // Check if user is an admin first - admins skip onboarding
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()
    
    if (adminData) {
      return NextResponse.redirect(`${origin}/app/home`)
    }

    // Get fresh user data for onboarding check
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, username, onboarding_step, is_onboarded')
      .eq('id', user.id)
      .single()
    
    // Check junction tables for completion flags
    const { data: traitsData } = await supabase
      .from('user_traits')
      .select('trait_id')
      .eq('user_id', user.id)
    
    const { data: brandsData } = await supabase
      .from('user_brands')
      .select('brand_id')
      .eq('user_id', user.id)
    
    const { data: colorsData } = await supabase
      .from('user_colors')
      .select('color_id')
      .eq('user_id', user.id)
    
    const userDataWithFlags = {
      ...userData,
      has_personality_traits: (traitsData?.length || 0) > 0,
      has_favorite_brands: (brandsData?.length || 0) > 0,
      has_favorite_colors: (colorsData?.length || 0) > 0,
    }
    
    const nextStep = getNextOnboardingStep(userDataWithFlags || {})
    
    // Redirect to the correct onboarding step
    return NextResponse.redirect(`${origin}/app${nextStep}`)
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/app/auth/auth-code-error`)
}
