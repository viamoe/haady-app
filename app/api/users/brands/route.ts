import { createServerSupabase } from '@/lib/supabase/server'
import { replaceUserBrands } from '@/server/db/user-brands.repo'
import { successResponse, errorResponse, authErrorResponse, validationErrorResponse } from '@/server/api/response'
import { brandsRequestSchema } from '@/server/api/validation'

/**
 * POST /api/users/brands
 * Bulk save user brands (favorite brands)
 * 
 * Request body: { brands: string[] } - Array of brand_id UUIDs
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

    const validationResult = brandsRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return validationErrorResponse(`Validation failed: ${errors}`, validationResult.error.errors)
    }

    const { brands } = validationResult.data

    // Replace user brands using repository
    const result = await replaceUserBrands(user.id, brands)

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

