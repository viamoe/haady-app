'use client'
import { supabase } from './client'
import type { User } from '@supabase/supabase-js'

/**
 * Safely get the current user, handling session errors gracefully
 * Returns null if there's no session instead of throwing an error
 */
export async function getCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
  try {
    // Try getSession first (less strict than getUser)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      // If getSession fails, try getUser as fallback
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        // Check if it's a session missing error
        if (userError.message?.includes('session') || 
            userError.message?.includes('JWT') || 
            userError.message?.includes('Auth session missing') ||
            userError.name === 'AuthSessionMissingError') {
          // This is expected when there's no session - return null user
          return { user: null, error: null }
        }
        // Other errors should be returned
        return { user: null, error: userError as Error }
      }
      
      return { user: user || null, error: null }
    }
    
    return { user: session?.user || null, error: null }
  } catch (error: any) {
    // Catch any unexpected errors
    if (error?.message?.includes('session') || 
        error?.message?.includes('JWT') || 
        error?.message?.includes('Auth session missing') ||
        error?.name === 'AuthSessionMissingError') {
      // Session missing is not an error - just return null user
      return { user: null, error: null }
    }
    
    return { user: null, error: error as Error }
  }
}

