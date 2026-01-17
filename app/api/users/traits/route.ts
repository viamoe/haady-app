import { createServerSupabase } from '@/lib/supabase/server'
import { replaceUserTraits } from '@/server/db/user-traits.repo'
import { successResponse, errorResponse, authErrorResponse, validationErrorResponse } from '@/server/api/response'
import { traitsRequestSchema } from '@/server/api/validation'

/**
 * POST /api/users/traits
 * Bulk save user traits (personality traits)
 * 
 * Request body: { traits: string[] } - Array of trait_id UUIDs
 * Response: { ok: true, data: { count: number } } | { ok: false, error: { code, message } }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return authErrorResponse('Authentication required')
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return validationErrorResponse('Invalid JSON in request body')
    }

    const validationResult = traitsRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return validationErrorResponse(`Validation failed: ${errors}`, validationResult.error.errors)
    }

    const { traits } = validationResult.data

    // Replace user traits using repository
    const result = await replaceUserTraits(user.id, traits)

    if (result.error) {
      return errorResponse(result.error)
    }

    return successResponse({ count: result.data.count })
  } catch (error) {
    return errorResponse({
      code: 'INTERNAL',
      message: 'An error occurred while processing your request',
    })
  }
}

