import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  full_name: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  onboarding_step: z.number().optional(),
  is_onboarded: z.boolean().optional(),
})

/**
 * POST /api/users/profile/update
 * 
 * Authenticated endpoint to update the current user's profile.
 * Uses server-side Supabase client with proper session handling.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: { code: 'AUTH', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = profileUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION', message: 'Invalid profile data', details: validationResult.error.errors } },
        { status: 400 }
      )
    }

    const profileData = validationResult.data

    // Upsert the user profile
    const { data: profile, error: upsertError } = await supabase
      .from('user_profile')
      .upsert({
        id: user.id,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting profile:', upsertError)
      return NextResponse.json(
        { ok: false, error: { code: 'INTERNAL', message: 'Failed to update profile', details: upsertError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data: profile })
  } catch (error) {
    console.error('Unexpected error in profile update API:', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
