import { NextResponse } from 'next/server'

/**
 * API endpoint to start OAuth flow from business app
 * Sets the origin cookie on haady.app domain and redirects back to business app to start OAuth
 * This works around browser restrictions on third-party cookie setting
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Get the data from query params
  const origin = searchParams.get('origin')
  const appType = searchParams.get('app_type')
  const preferredCountry = searchParams.get('preferred_country') || 'AE'
  const preferredLanguage = searchParams.get('preferred_language') || 'en'
  const returnUrl = searchParams.get('return_url')
  
  if (!origin || !returnUrl) {
    return NextResponse.json(
      { error: 'Missing required parameters: origin, return_url' },
      { status: 400 }
    )
  }
  
  // Create the response that redirects back to business app
  const response = NextResponse.redirect(returnUrl)
  
  // Set the cookie on .haady.app domain
  const cookieData = JSON.stringify({
    app_type: appType || 'merchant',
    preferred_country: preferredCountry,
    preferred_language: preferredLanguage,
    origin: origin,
    timestamp: Date.now(),
  })
  
  response.cookies.set('haady_oauth_origin', encodeURIComponent(cookieData), {
    path: '/',
    maxAge: 600, // 10 minutes
    sameSite: 'lax',
    domain: '.haady.app',
    secure: true,
  })
  
  console.log('Set OAuth origin cookie and redirecting to:', returnUrl)
  
  return response
}

