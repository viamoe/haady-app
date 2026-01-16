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

  const supabaseError = error as { code?: string; message?: string; details?: string };

  // Map known Supabase error codes
  if (supabaseError.code === 'PGRST116' || supabaseError.code === '23505') {
    return {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    };
  }

  if (supabaseError.code === '23505') {
    return {
      code: 'CONFLICT',
      message: 'This resource already exists',
    };
  }

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
