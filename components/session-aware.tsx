'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * Session Awareness Component
 * 
 * This component helps detect when a different account is logged in
 * and warns the user about potential session conflicts.
 * 
 * Note: For best results, use different browser profiles or subdomains
 * to avoid session conflicts between admin and user accounts.
 */
export function SessionAware() {
  const [sessionInfo, setSessionInfo] = useState<{
    email: string | null
    userId: string | null
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setSessionInfo({
          email: session.user.email || null,
          userId: session.user.id,
        })
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkSession()
      }
      
      if (session?.user) {
        setSessionInfo({
          email: session.user.email || null,
          userId: session.user.id,
        })
      } else {
        setSessionInfo(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // This component doesn't render anything, it's just for session awareness
  // You can extend it to show warnings or session info if needed
  return null
}

