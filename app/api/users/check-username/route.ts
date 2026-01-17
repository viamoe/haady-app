import { checkUsernameAvailability } from '@/server/db/users.repo'
import { successResponse, errorResponse, validationErrorResponse } from '@/server/api/response'
import { z } from 'zod'

const checkUsernameSchema = z.object({
  username: z.string().min(1, 'Username is required').max(30, 'Username is too long'),
})

/**
 * GET /api/users/check-username?username=xxx
 * Check if a username is available (public endpoint, no auth required)
 * 
 * Query params: { username: string }
 * Response: { ok: true, data: { available: boolean } } | { ok: false, error: { code, message } }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return validationErrorResponse('Username query parameter is required')
    }

    const validationResult = checkUsernameSchema.safeParse({ username })

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return validationErrorResponse(`Validation failed: ${errors}`, validationResult.error.errors)
    }

    const normalizedUsername = username.trim().toLowerCase()

    // Check if username is available
    const availabilityResult = await checkUsernameAvailability(normalizedUsername)

    if (availabilityResult.error) {
      // If it's a validation error, return it
      if (availabilityResult.error.code === 'VALIDATION') {
        return validationErrorResponse(availabilityResult.error.message)
      }
      // For other errors, log but still return availability status if we have it
      console.error('Error checking username availability:', {
        code: availabilityResult.error.code,
        message: availabilityResult.error.message,
        details: availabilityResult.error.details,
      })
      // If we got an error but don't know availability, return error
      // But if the error is just a DB query issue, we might still want to return available: false
      return errorResponse(availabilityResult.error)
    }

    return successResponse({ available: availabilityResult.available })
  } catch (error) {
    console.error('Unexpected error in check-username endpoint:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    return errorResponse({
      code: 'INTERNAL',
      message: 'An error occurred while processing your request',
    })
  }
}
