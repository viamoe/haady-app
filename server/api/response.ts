import { NextResponse } from 'next/server';
import type { AppError, ErrorCode } from '@/server/db/errors';

/**
 * Standardized API response format
 * All API routes must use this format: { ok: true, data } or { ok: false, error }
 */
export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

/**
 * Creates an error response from AppError
 */
export function errorResponse(error: AppError, status?: number): NextResponse<ApiErrorResponse> {
  const httpStatus = status || getHttpStatusFromErrorCode(error.code);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: httpStatus }
  );
}

/**
 * Maps error code to HTTP status
 */
function getHttpStatusFromErrorCode(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION':
      return 400;
    case 'AUTH':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'INTERNAL':
    default:
      return 500;
  }
}

/**
 * Creates an auth error response
 */
export function authErrorResponse(message: string = 'Authentication required'): NextResponse<ApiErrorResponse> {
  return errorResponse({ code: 'AUTH', message }, 401);
}

/**
 * Creates a validation error response
 */
export function validationErrorResponse(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
  return errorResponse({ code: 'VALIDATION', message, details }, 400);
}
