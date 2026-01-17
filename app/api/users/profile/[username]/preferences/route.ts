import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'

/**
 * GET /api/users/profile/[username]/preferences
 * 
 * Public endpoint to fetch a user's preferences (traits, brands, colors) by username.
 * Uses service role to bypass RLS and allow unauthenticated users to view public profile preferences.
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
    
    // First get the user ID from username
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('id')
      .eq('username', normalizedUsername)
      .single()

    if (profileError || !profile) {
      if (profileError?.code === 'PGRST116') {
        return NextResponse.json(
          { ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 }
        )
      }
      console.error('Error fetching profile for preferences:', profileError)
      return NextResponse.json(
        { ok: false, error: { code: 'INTERNAL', message: 'Failed to fetch user' } },
        { status: 500 }
      )
    }

    const userId = profile.id

    // Fetch all master data and user selections in parallel
    const [
      traitsResult,
      brandsResult,
      colorsResult,
      userTraitsResult,
      userBrandsResult,
      userColorsResult,
    ] = await Promise.all([
      supabase.from('traits_master').select('id, name, emoji').eq('is_active', true),
      supabase.from('brands_master').select('id, name, logo_url'),
      supabase.from('colors_master').select('id, name, hex').eq('is_active', true),
      supabase.from('user_traits').select('trait_id').eq('user_id', userId),
      supabase.from('user_brands').select('brand_id').eq('user_id', userId),
      supabase.from('user_colors').select('color_id').eq('user_id', userId),
    ])

    // Map user selections to full data
    const userTraitIds = new Set(userTraitsResult.data?.map(t => t.trait_id) || [])
    const userBrandIds = new Set(userBrandsResult.data?.map(b => b.brand_id) || [])
    const userColorIds = new Set(userColorsResult.data?.map(c => c.color_id) || [])

    const traits = (traitsResult.data || []).filter(t => userTraitIds.has(t.id))
    const brands = (brandsResult.data || []).filter(b => userBrandIds.has(b.id))
    const colors = (colorsResult.data || []).filter(c => userColorIds.has(c.id))

    return NextResponse.json({
      ok: true,
      data: {
        traits,
        brands,
        colors,
      }
    })
  } catch (error) {
    console.error('Unexpected error in preferences API:', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
