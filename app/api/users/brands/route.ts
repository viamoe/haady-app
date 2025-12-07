import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * POST /api/users/brands
 * Bulk save user brands (favorite brands)
 * 
 * Request body: { brands: string[] } - Array of brand_id UUIDs
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
    const { brands } = await request.json()

    // Validate request body
    if (!Array.isArray(brands)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected brands array.' },
        { status: 400 }
      )
    }

    // Validate brand IDs (must be UUIDs and exist in brands_master)
    if (brands.length > 0) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const invalidIds = brands.filter(id => !uuidRegex.test(id))
      
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid brand IDs: ${invalidIds.join(', ')}` },
          { status: 400 }
        )
      }

      // Validate brand IDs exist in brands_master
      const { data: existingBrands, error: checkError } = await supabase
        .from('brands_master')
        .select('id')
        .in('id', brands)

      if (checkError) {
        return NextResponse.json(
          { error: 'Failed to validate brands: ' + checkError.message },
          { status: 500 }
        )
      }

      const existingBrandIds = existingBrands?.map(b => b.id) || []
      const missingIds = brands.filter(id => !existingBrandIds.includes(id))

      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `Brand IDs not found in master table: ${missingIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Delete existing user_brands for this user (RLS will ensure user can only delete their own)
    const { error: deleteError } = await supabase
      .from('user_brands')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete existing brands: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Bulk insert new user_brands (RLS will ensure user can only insert their own)
    if (brands.length > 0) {
      const brandsToInsert = brands.map(brandId => ({
        user_id: user.id,
        brand_id: brandId,
      }))

      const { error: insertError } = await supabase
        .from('user_brands')
        .insert(brandsToInsert)

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to save brands: ' + insertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      count: brands.length,
      message: `Successfully saved ${brands.length} brand(s)`,
    })
  } catch (error: any) {
    console.error('Error saving user brands:', error)
    return NextResponse.json(
      { error: 'Failed to save brands: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

