import { NextRequest } from 'next/server'
import { getPublicProfileByUsername } from '@/server/db'
import { successResponse, errorResponse, validationErrorResponse } from '@/server/api/response'

/**
 * GET /api/users/profile/[username]
 * 
 * Public endpoint to fetch a user's profile by username.
 * Uses service role (via repo) to bypass RLS for public profile reads.
 * 
 * RLS IMPACT: Bypasses RLS via service role - documented in users.repo.ts
 * Only exposes limited public fields (no sensitive data).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    
    if (!username) {
      return validationErrorResponse('Username is required')
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username

    // Get public profile using repo
    const result = await getPublicProfileByUsername(cleanUsername)

    if (result.error) {
      return errorResponse(result.error)
    }

    if (!result.data) {
      return errorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    return successResponse(result.data)
  } catch (error) {
    console.error('Unexpected error in profile API:', error)
    return errorResponse({
      code: 'INTERNAL',
      message: 'An unexpected error occurred',
    })
  }
}
