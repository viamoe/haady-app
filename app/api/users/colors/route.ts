import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/users/colors
 * Bulk save user colors (favorite colors)
 * 
 * Request body: { colors: string[] } - Array of color_id UUIDs
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
    const { colors } = await request.json()

    // Validate request body
    if (!Array.isArray(colors)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected colors array.' },
        { status: 400 }
      )
    }

    // Validate color IDs (must be UUIDs and exist in colors_master)
    if (colors.length > 0) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const invalidIds = colors.filter(id => !uuidRegex.test(id))
      
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid color IDs: ${invalidIds.join(', ')}` },
          { status: 400 }
        )
      }

      // Validate color IDs exist in colors_master
      const { data: existingColors, error: checkError } = await supabase
        .from('colors_master')
        .select('id')
        .in('id', colors)

      if (checkError) {
        return NextResponse.json(
          { error: 'Failed to validate colors: ' + checkError.message },
          { status: 500 }
        )
      }

      const existingColorIds = existingColors?.map(c => c.id) || []
      const missingIds = colors.filter(id => !existingColorIds.includes(id))

      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `Color IDs not found in master table: ${missingIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Delete existing user_colors for this user (RLS will ensure user can only delete their own)
    const { error: deleteError } = await supabase
      .from('user_colors')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete existing colors: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Bulk insert new user_colors (RLS will ensure user can only insert their own)
    if (colors.length > 0) {
      const colorsToInsert = colors.map(colorId => ({
        user_id: user.id,
        color_id: colorId,
      }))

      const { error: insertError } = await supabase
        .from('user_colors')
        .insert(colorsToInsert)

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to save colors: ' + insertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      count: colors.length,
      message: `Successfully saved ${colors.length} color(s)`,
    })
  } catch (error: any) {
    console.error('Error saving user colors:', error)
    return NextResponse.json(
      { error: 'Failed to save colors: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

