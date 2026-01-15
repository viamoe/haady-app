'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

// Component to handle OAuth redirects
function OAuthRedirectHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams?.get('code')
    if (code) {
      // Check for OAuth origin cookie to determine if this is a merchant OAuth
      const cookies = document.cookie.split(';')
      let oauthOriginCookie: string | null = null

      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'haady_oauth_origin') {
          oauthOriginCookie = decodeURIComponent(value)
          break
        }
      }

      // If we have an OAuth code and cookie indicates merchant, redirect to callback
      if (oauthOriginCookie) {
        try {
          const oauthData = JSON.parse(oauthOriginCookie)
          if (oauthData.app_type === 'merchant') {
            // Use the origin from the cookie if available, otherwise fallback to production URL
            const businessOrigin = oauthData.origin || 'https://business.haady.app'
            const callbackUrl = new URL(`${businessOrigin}/auth/callback`)
            callbackUrl.searchParams.set('code', code)
            callbackUrl.searchParams.set('app_type', 'merchant')
            if (oauthData.preferred_country) {
              callbackUrl.searchParams.set('preferred_country', oauthData.preferred_country)
            }
            if (oauthData.preferred_language) {
              callbackUrl.searchParams.set('preferred_language', oauthData.preferred_language)
            }
            console.log('🔵 Redirecting merchant OAuth from root page to:', callbackUrl.toString())
            window.location.href = callbackUrl.toString()
            return
          }
        } catch (e) {
          console.error('Failed to parse OAuth origin cookie:', e)
        }
      }

      // For regular haady.app OAuth, redirect to /auth/callback
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('code', code)
      // Preserve any other query params
      searchParams?.forEach((value, key) => {
        if (key !== 'code') {
          callbackUrl.searchParams.set(key, value)
        }
      })
      console.log('🔵 Redirecting OAuth from root page to /auth/callback:', callbackUrl.toString())
      router.replace(callbackUrl.pathname + callbackUrl.search)
    }
  }, [searchParams, router])

  return null
}

function LandingPageContent() {
  return (
    <>
      <OAuthRedirectHandler />
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Haady Landing Page</h1>
          <p className="text-gray-400">Start building your landing page here</p>
        </div>
      </div>
    </>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>}>
      <LandingPageContent />
    </Suspense>
  )
}
