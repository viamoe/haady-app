import { createServerSupabase } from '@/lib/supabase/server'
import { checkUsernameAvailability, updateUser } from '@/server/db/users.repo'
import { successResponse, errorResponse, authErrorResponse, validationErrorResponse } from '@/server/api/response'
import { claimUsernameRequestSchema } from '@/server/api/validation'

/**
 * POST /api/users/claim-username
 * Claim a username for the authenticated user
 * 
 * Request body: { username: string }
 * Response: { ok: true, data: { username: string } } | { ok: false, error: { code, message } }
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

    const validationResult = claimUsernameRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return validationErrorResponse(`Validation failed: ${errors}`, validationResult.error.errors)
    }

    const { username } = validationResult.data
    const normalizedUsername = username.trim().toLowerCase()

    // Check if username is available
    const availabilityResult = await checkUsernameAvailability(normalizedUsername)

    if (availabilityResult.error) {
      return errorResponse(availabilityResult.error)
    }

    if (!availabilityResult.available) {
      return errorResponse({
        code: 'CONFLICT',
        message: 'This username is already taken',
      })
    }

    // Update user with the new username
    const updateResult = await updateUser(user.id, {
      username: normalizedUsername,
    })

    if (updateResult.error) {
      // Check if it's a unique constraint violation (username taken)
      if (updateResult.error.code === 'CONFLICT') {
        return errorResponse({
          code: 'CONFLICT',
          message: 'This username is already taken',
        })
      }
      return errorResponse(updateResult.error)
    }

    return successResponse({ username: normalizedUsername })
  } catch (error) {
    return errorResponse({
      code: 'INTERNAL',
      message: 'An error occurred while processing your request',
    })
  }
}
