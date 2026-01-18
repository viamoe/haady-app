import { createServerSupabase } from '@/lib/supabase/server'
import { upsertUser } from '@/server/db'
import { successResponse, errorResponse, authErrorResponse, validationErrorResponse } from '@/server/api/response'
import { profileUpdateRequestSchema } from '@/server/api/validation'

/**
 * POST /api/users/profile/update
 * 
 * Authenticated endpoint to update the current user's profile.
 * Uses server-side Supabase client with proper session handling.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return authErrorResponse('Not authenticated')
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return validationErrorResponse('Invalid JSON in request body')
    }
    
    const validationResult = profileUpdateRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return validationErrorResponse(`Validation failed: ${errors}`, validationResult.error.errors)
    }

    const profileData = validationResult.data

    // Upsert the user profile using repo
    const result = await upsertUser(user.id, profileData)

    if (result.error) {
      return errorResponse(result.error)
    }

    return successResponse(result.data)
  } catch (error) {
    console.error('Unexpected error in profile update API:', error)
    return errorResponse({
      code: 'INTERNAL',
      message: 'An unexpected error occurred',
    })
  }
}
