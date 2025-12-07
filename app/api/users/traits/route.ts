import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/users/traits
 * Bulk save user traits (personality traits)
 * 
 * Request body: { traits: string[] } - Array of trait_id UUIDs
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
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
              // Ignore cookie setting errors in route handlers
            }
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // Parse request body
    const { traits } = await request.json()

    // Validate request body
    if (!Array.isArray(traits)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected traits array.' },
        { status: 400 }
      )
    }

    // Validate trait IDs (must be UUIDs and exist in traits_master)
    if (traits.length > 0) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const invalidIds = traits.filter(id => !uuidRegex.test(id))
      
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid trait IDs: ${invalidIds.join(', ')}` },
          { status: 400 }
        )
      }

      // Validate trait IDs exist in traits_master
      const { data: existingTraits, error: checkError } = await supabase
        .from('traits_master')
        .select('id')
        .in('id', traits)

      if (checkError) {
        return NextResponse.json(
          { error: 'Failed to validate traits: ' + checkError.message },
          { status: 500 }
        )
      }

      const existingTraitIds = existingTraits?.map(t => t.id) || []
      const missingIds = traits.filter(id => !existingTraitIds.includes(id))

      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `Trait IDs not found in master table: ${missingIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Delete existing user_traits for this user (RLS will ensure user can only delete their own)
    const { error: deleteError } = await supabase
      .from('user_traits')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete existing traits: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Bulk insert new user_traits (RLS will ensure user can only insert their own)
    if (traits.length > 0) {
      const traitsToInsert = traits.map(traitId => ({
        user_id: user.id,
        trait_id: traitId,
      }))

      const { error: insertError } = await supabase
        .from('user_traits')
        .insert(traitsToInsert)

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to save traits: ' + insertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      count: traits.length,
      message: `Successfully saved ${traits.length} trait(s)`,
    })
  } catch (error: any) {
    console.error('Error saving user traits:', error)
    return NextResponse.json(
      { error: 'Failed to save traits: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

