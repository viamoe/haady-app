import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getNextOnboardingStep, PROFILE_REDIRECT } from '@/lib/onboarding'
import { createServerSupabase } from '@/lib/supabase/server'
import { isAdminUser, getUserWithPreferences, upsertUser, updateUser, getUserById, checkUsernameAvailability } from '@/server/db'

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
    // Note: merchant_users is not in our repo yet, so we'll keep this direct call for now
    const serverSupabase = await createServerSupabase()
    const { data: merchantUser } = await serverSupabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    
    if (merchantUser) {
      // User is a merchant, redirect to business app
      return NextResponse.redirect('https://business.haady.app/dashboard')
    }
    
    // Get username from query params if present (from landing page flow)
    const usernameFromQuery = searchParams.get('username')
    let claimedUsername: string | null = null

    // Create or update user profile
    const { data: existingUser } = await getUserById(user.id)

    if (!existingUser) {
      // New user - create profile with initial onboarding state
      // If username is provided, try to claim it immediately
      if (usernameFromQuery) {
        const normalizedUsername = usernameFromQuery.trim().toLowerCase()
        
        // Check availability and claim username
        const availabilityResult = await checkUsernameAvailability(normalizedUsername)
        
        if (availabilityResult.available && !availabilityResult.error) {
          // Username is available, claim it during profile creation
          const updateResult = await upsertUser(user.id, {
            username: normalizedUsername,
            last_active_at: new Date().toISOString(),
            onboarding_step: 1,
            is_onboarded: false,
          })
          
          if (!updateResult.error) {
            claimedUsername = normalizedUsername
            console.log(`✅ Username "${normalizedUsername}" claimed for user ${user.id}`)
          } else {
            // If username claim failed (e.g., race condition), log and continue
            console.warn(`⚠️ Failed to claim username "${normalizedUsername}" during profile creation:`, updateResult.error)
          }
        } else {
          // Username not available or error checking - log and continue without username
          console.warn(`⚠️ Username "${normalizedUsername}" not available or error:`, availabilityResult.error?.message || 'Username already taken')
        }
      }
      
      // If username wasn't claimed, create profile without it
      if (!claimedUsername) {
        await upsertUser(user.id, {
          last_active_at: new Date().toISOString(),
          onboarding_step: 1,
          is_onboarded: false,
        })
      }
    } else {
      // Existing user - update last active
      // If username is provided and user doesn't have one, try to claim it
      if (usernameFromQuery && !existingUser.username) {
        const normalizedUsername = usernameFromQuery.trim().toLowerCase()
        
        const availabilityResult = await checkUsernameAvailability(normalizedUsername)
        
        if (availabilityResult.available && !availabilityResult.error) {
          const updateResult = await updateUser(user.id, {
            username: normalizedUsername,
          })
          
          if (!updateResult.error) {
            claimedUsername = normalizedUsername
            console.log(`✅ Username "${normalizedUsername}" claimed for existing user ${user.id}`)
          } else {
            console.warn(`⚠️ Failed to claim username "${normalizedUsername}" for existing user:`, updateResult.error)
          }
        } else {
          console.warn(`⚠️ Username "${normalizedUsername}" not available for existing user:`, availabilityResult.error?.message || 'Username already taken')
        }
      }
      
      // Update last active
      await updateUser(user.id, {
        last_active_at: new Date().toISOString(),
      })
    }
    
    // Check if user is an admin first - admins skip onboarding
    const { isAdmin } = await isAdminUser(user.id)
    
    if (isAdmin) {
      return NextResponse.redirect(`${origin}/`)
    }

    // Get fresh user data for onboarding check
    const { data: userDataWithFlags } = await getUserWithPreferences(user.id)
    
    const nextStep = getNextOnboardingStep((userDataWithFlags as unknown as Record<string, unknown>) || {})
    
    // Redirect to the correct onboarding step or profile
    if (nextStep === PROFILE_REDIRECT) {
      const username = (userDataWithFlags as unknown as Record<string, unknown>)?.username as string | null
      return NextResponse.redirect(username ? `${origin}/@${username}` : `${origin}/`)
    }
    return NextResponse.redirect(`${origin}${nextStep}`)
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
