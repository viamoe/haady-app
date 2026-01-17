import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Public API route for fetching cities
 * No authentication required - uses anonymous key for public access
 * 
 * Query parameters:
 * - country: ISO2 country code (e.g., "SA", "AE") - optional, filters cities by country
 * 
 * If country is provided, returns cities for that country only
 * If country is not provided, returns all active cities
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('country')

    // Create a public Supabase client using anonymous key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Build query - join with countries table to get country code
    let query = supabase
      .from('cities')
      .select(`
        id,
        name,
        name_ar,
        slug,
        country_id,
        countries!inner(iso2, name)
      `)
      .eq('is_active', true)

    // Filter by country if provided
    if (countryCode) {
      query = query.eq('countries.iso2', countryCode.toUpperCase())
    }

    // Order by name
    query = query.order('name', { ascending: true })

    const { data: cities, error } = await query

    if (error) {
      console.error('Error fetching cities from cities table:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cities', details: error.message },
        { status: 500 }
      )
    }

    // Transform the response to include country_code
    const transformedCities = (cities || []).map((city: any) => ({
      id: city.id,
      name: city.name,
      nameAr: city.name_ar || null,
      slug: city.slug || null,
      countryCode: city.countries?.iso2 || null,
      countryId: city.country_id,
    }))

    console.log(`Cities fetched: ${transformedCities.length}${countryCode ? ` for country ${countryCode}` : ''}`)
    return NextResponse.json(
      { cities: transformedCities },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  } catch (error: any) {
    console.error('Error in cities API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
