import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getNextOnboardingStep } from '@/lib/onboarding'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const appType = searchParams.get('app_type')
  
  const cookieStore = await cookies()
  
  // Check for OAuth origin cookie set by business.haady.app
  // This is the most reliable way to detect if OAuth started from the business app
  const oauthOriginCookie = cookieStore.get('haady_oauth_origin')
  let oauthOriginData: { app_type?: string; preferred_country?: string; preferred_language?: string; origin?: string } | null = null
  
  if (oauthOriginCookie) {
    try {
      oauthOriginData = JSON.parse(decodeURIComponent(oauthOriginCookie.value))
      console.log('Found OAuth origin cookie:', oauthOriginData)
    } catch (e) {
      console.error('Failed to parse OAuth origin cookie:', e)
    }
  }
  
  // Redirect to business app if:
  // 1. OAuth origin cookie indicates merchant app
  // 2. OR app_type query param is 'merchant'
  const isMerchantOAuth = oauthOriginData?.app_type === 'merchant' || appType === 'merchant'
  
  if (code && isMerchantOAuth) {
    // Use the origin from the cookie if available, otherwise fallback to production URL
    const businessOrigin = oauthOriginData?.origin || 'https://business.haady.app'
    const businessCallbackUrl = new URL(`${businessOrigin}/auth/callback`)
    businessCallbackUrl.searchParams.set('code', code)
    businessCallbackUrl.searchParams.set('app_type', 'merchant')
    
    // Get preferences from cookie or query params
    const preferredCountry = oauthOriginData?.preferred_country || searchParams.get('preferred_country')
    const preferredLanguage = oauthOriginData?.preferred_language || searchParams.get('preferred_language')
    if (preferredCountry) businessCallbackUrl.searchParams.set('preferred_country', preferredCountry)
    if (preferredLanguage) businessCallbackUrl.searchParams.set('preferred_language', preferredLanguage)
    businessCallbackUrl.searchParams.set('next', '/dashboard')
    
    // Create response with redirect and clear the OAuth origin cookie
    const response = NextResponse.redirect(businessCallbackUrl)
    response.cookies.set('haady_oauth_origin', '', {
      path: '/',
      domain: '.haady.app',
      maxAge: 0, // Delete the cookie
    })
    
    console.log('Redirecting merchant OAuth to:', businessCallbackUrl.toString())
    return response
  }
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
      
      // Check user metadata for app_type BEFORE processing as regular user
      // This handles cases where Supabase redirects to haady.app instead of business.haady.app
      const userAppType = data.user.user_metadata?.app_type || data.user.app_metadata?.app_type;
      
      if (userAppType === 'merchant') {
        // Code already exchanged, redirect to business app dashboard (not callback)
        // since the session is already set on this domain
        return NextResponse.redirect('https://business.haady.app/dashboard')
      }
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
    // Check if user has a merchant account - if so, they might have come from business.haady.app
    // Redirect them to the business app dashboard
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    
    if (merchantUser) {
      // User is a merchant, redirect to business app
      return NextResponse.redirect('https://business.haady.app/dashboard')
    }
    
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
      return NextResponse.redirect(`${origin}/home`)
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
    return NextResponse.redirect(`${origin}${nextStep}`)
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
