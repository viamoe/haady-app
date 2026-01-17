import { createServerSupabase } from '@/lib/supabase/server'
import { replaceUserColors } from '@/server/db/user-colors.repo'
import { successResponse, errorResponse, authErrorResponse, validationErrorResponse } from '@/server/api/response'
import { colorsRequestSchema } from '@/server/api/validation'

/**
 * POST /api/users/colors
 * Bulk save user colors (favorite colors)
 * 
 * Request body: { colors: string[] } - Array of color_id UUIDs
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

    const validationResult = colorsRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return validationErrorResponse(`Validation failed: ${errors}`, validationResult.error.errors)
    }

    const { colors } = validationResult.data

    // Replace user colors using repository
    const result = await replaceUserColors(user.id, colors)

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

