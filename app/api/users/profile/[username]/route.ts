import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'

/**
 * GET /api/users/profile/[username]
 * 
 * Public endpoint to fetch a user's profile by username.
 * Uses service role to bypass RLS and allow unauthenticated users to view public profiles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    
    if (!username) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION', message: 'Username is required' } },
        { status: 400 }
      )
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username
    const normalizedUsername = cleanUsername.toLowerCase().trim()

    if (!normalizedUsername) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION', message: 'Invalid username' } },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS for public profile reads
    const supabase = createServiceRoleSupabase()
    
    // Fetch public profile data (limited fields for privacy)
    const { data: profile, error } = await supabase
      .from('user_profile')
      .select('id, full_name, username, avatar_url, birthdate, country, city')
      .eq('username', normalizedUsername)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return NextResponse.json(
          { ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 }
        )
      }
      
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { ok: false, error: { code: 'INTERNAL', message: 'Failed to fetch profile' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data: profile })
  } catch (error) {
    console.error('Unexpected error in profile API:', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
