import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * Check if user has a business profile
 * Used to determine if we should create a regular user profile for business users
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION', message: 'User ID is required' } },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabase()

    // Check if user has a business profile
    const { data: businessProfile, error: businessError } = await supabase
      .from('business_profile')
      .select('id, business_id, store_id')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (businessError && businessError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error checking business profile:', businessError)
      return NextResponse.json(
        { ok: false, error: { code: 'INTERNAL', message: 'Failed to check business profile' } },
        { status: 500 }
      )
    }

    const hasBusinessProfile = !!businessProfile

    return NextResponse.json({
      ok: true,
      data: {
        hasBusinessProfile,
        businessProfile: businessProfile || null,
      },
    })
  } catch (error) {
    console.error('Error in check-business-profile:', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}
