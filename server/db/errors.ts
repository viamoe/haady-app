/**
 * Standardized error codes for repository layer
 * Maps to engineering-standards error handling requirements
 */
export type ErrorCode = 
  | 'VALIDATION'
  | 'AUTH'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL'
  | 'FORBIDDEN';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Maps Supabase errors to standardized error codes
 * Never leaks raw DB error messages to UI
 */
export function mapSupabaseError(error: unknown): AppError {
  if (!error || typeof error !== 'object') {
    return {
      code: 'INTERNAL',
      message: 'An unexpected error occurred',
    };
  }

  const supabaseError = error as { code?: string; message?: string; details?: string; status?: number; statusCode?: number };

  // Handle HTTP status codes (404 = not found)
  const httpStatus = supabaseError.status || supabaseError.statusCode
  if (httpStatus === 404) {
    return {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    };
  }

  // Map known Supabase error codes
  // PGRST116 = "The result contains 0 rows" (not found)
  if (supabaseError.code === 'PGRST116') {
    return {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    };
  }

  // 23505 = unique_violation (conflict)
  if (supabaseError.code === '23505') {
    return {
      code: 'CONFLICT',
      message: 'This resource already exists',
    };
  }

  // 42501 = insufficient_privilege (forbidden)
  if (supabaseError.code === '42501' || supabaseError.message?.includes('permission') || supabaseError.message?.includes('RLS')) {
    return {
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    };
  }

  // Handle PGRST301 (RLS policy violation)
  if (supabaseError.code === 'PGRST301' || supabaseError.message?.includes('new row violates row-level security policy')) {
    return {
      code: 'FORBIDDEN',
      message: 'Access denied by security policy',
    };
  }

  // Handle PGRST205 (table not found in schema cache)
  if (supabaseError.code === 'PGRST205' || supabaseError.message?.includes('Could not find the table')) {
    return {
      code: 'INTERNAL',
      message: 'Database table not found. Please ensure migrations are applied.',
    };
  }

  // Log unknown error codes for debugging (but don't expose to user)
  if (supabaseError.code) {
    console.warn('Unmapped Supabase error code:', JSON.stringify({
      code: supabaseError.code,
      message: supabaseError.message,
      details: supabaseError.details,
    }, null, 2))
  }

  // Default to internal error - never expose raw DB messages
  return {
    code: 'INTERNAL',
    message: 'An error occurred while processing your request',
  };
}

/**
 * Creates a validation error
 */
export function createValidationError(message: string, details?: unknown): AppError {
  return {
    code: 'VALIDATION',
    message,
    details,
  };
}

/**
 * Creates an auth error
 */
export function createAuthError(message: string = 'Authentication required'): AppError {
  return {
    code: 'AUTH',
    message,
  };
}
