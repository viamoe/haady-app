import { NextResponse } from 'next/server'

// CORS headers for cross-origin requests
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * API endpoint to set the OAuth origin cookie
 * This is needed for preview deployments on non-haady.app domains (e.g., Vercel previews)
 * The cookie is set on .haady.app domain so it can be read by the callback
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  
  try {
    const body = await request.json()
    
    // Validate the data
    if (!body.app_type || !body.origin) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400, headers: corsHeaders(origin) }
      )
    }
    
    // Create the response with CORS headers
    const response = NextResponse.json(
      { success: true },
      { headers: corsHeaders(origin) }
    )
    
    // Set the cookie on .haady.app domain
    const cookieData = JSON.stringify({
      app_type: body.app_type,
      preferred_country: body.preferred_country || 'AE',
      preferred_language: body.preferred_language || 'en',
      origin: body.origin,
      timestamp: Date.now(),
    })
    
    response.cookies.set('haady_oauth_origin', encodeURIComponent(cookieData), {
      path: '/',
      maxAge: 600, // 10 minutes
      sameSite: 'lax',
      domain: '.haady.app',
      secure: true,
    })
    
    console.log('Set OAuth origin cookie for:', body.origin)
    
    return response
  } catch (error) {
    console.error('Error setting OAuth origin cookie:', error)
    return NextResponse.json(
      { error: 'Failed to set cookie' }, 
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}

