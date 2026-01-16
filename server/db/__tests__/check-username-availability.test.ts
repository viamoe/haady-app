/**
 * Unit tests for checkUsernameAvailability repository function
 * 
 * These tests mock the Supabase client to test the logic without requiring a database.
 * Run with: pnpm test check-username-availability.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkUsernameAvailability } from '../users.repo'
import { createPublicSupabase } from '@/lib/supabase/server'

// Mock the Supabase client creation
vi.mock('@/lib/supabase/server', () => ({
  createPublicSupabase: vi.fn(),
}))

describe('checkUsernameAvailability', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Create a fresh mock Supabase client for each test
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
    }
    
    vi.mocked(createPublicSupabase).mockReturnValue(mockSupabase as any)
  })

  describe('input validation', () => {
    it('should return validation error for empty username', async () => {
      const result = await checkUsernameAvailability('')
      
      expect(result).toEqual({
        available: false,
        error: {
          code: 'VALIDATION',
          message: 'Username is required',
        },
      })
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('should return validation error for whitespace-only username', async () => {
      const result = await checkUsernameAvailability('   ')
      
      expect(result).toEqual({
        available: false,
        error: {
          code: 'VALIDATION',
          message: 'Username is required',
        },
      })
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('RPC function success', () => {
    it('should return available=true when username is available', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { available: true, username: 'testuser' },
        error: null,
      })

      const result = await checkUsernameAvailability('testuser')

      expect(result).toEqual({
        available: true,
        error: null,
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_username_availability', {
        check_username: 'testuser',
      })
    })

    it('should return available=false when username is taken', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { available: false, username: 'takenuser' },
        error: null,
      })

      const result = await checkUsernameAvailability('takenuser')

      expect(result).toEqual({
        available: false,
        error: null,
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_username_availability', {
        check_username: 'takenuser',
      })
    })

    it('should normalize username (lowercase, trim)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { available: true, username: 'testuser' },
        error: null,
      })

      await checkUsernameAvailability('  TESTUSER  ')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_username_availability', {
        check_username: 'testuser',
      })
    })

    it('should handle RPC function returning error in response data', async () => {
      // RPC function executed but returned error in JSONB response
      mockSupabase.rpc.mockResolvedValue({
        data: { available: false, error: 'Database error occurred' },
        error: null,
      })

      // Should fallback to direct query
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await checkUsernameAvailability('testuser')

      // Should fallback to direct query
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profile')
      expect(mockSupabase.select).toHaveBeenCalledWith('id')
      expect(mockSupabase.eq).toHaveBeenCalledWith('username', 'testuser')
      expect(mockSupabase.maybeSingle).toHaveBeenCalled()
    })
  })

  describe('RPC function errors', () => {
    it('should fallback to direct query when RPC function does not exist', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: {
          code: '42883',
          message: 'function check_username_availability does not exist',
        },
      })

      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await checkUsernameAvailability('testuser')

      expect(result).toEqual({
        available: true,
        error: null,
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profile')
    })

    it('should return error for non-existent function error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: {
          code: '42883',
          message: 'function does not exist',
        },
      })

      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'RLS policy violation' },
      })

      const result = await checkUsernameAvailability('testuser')

      expect(result.available).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('FORBIDDEN')
    })

    it('should return error for other RPC errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST301',
          message: 'Some other error',
        },
      })

      const result = await checkUsernameAvailability('testuser')

      expect(result.available).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockSupabase.from).not.toHaveBeenCalled() // Should not fallback for non-42883 errors
    })
  })

  describe('fallback direct query', () => {
    it('should return available=true when direct query finds no user', async () => {
      // RPC returns unexpected format, falls back to direct query
      mockSupabase.rpc.mockResolvedValue({
        data: null, // Unexpected format
        error: null,
      })

      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await checkUsernameAvailability('availableuser')

      expect(result).toEqual({
        available: true,
        error: null,
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profile')
    })

    it('should return available=false when direct query finds existing user', async () => {
      // RPC returns unexpected format, falls back to direct query
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: 'user-id-123' },
        error: null,
      })

      const result = await checkUsernameAvailability('takenuser')

      expect(result).toEqual({
        available: false,
        error: null,
      })
    })

    it('should handle PGRST116 error (not found) as available', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const result = await checkUsernameAvailability('availableuser')

      expect(result).toEqual({
        available: true,
        error: null,
      })
    })

    it('should return error for other direct query errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'RLS policy violation' },
      })

      const result = await checkUsernameAvailability('testuser')

      expect(result.available).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('FORBIDDEN')
    })
  })

  describe('client creation errors', () => {
    it('should return error when Supabase client creation fails', async () => {
      vi.mocked(createPublicSupabase).mockImplementation(() => {
        throw new Error('Missing environment variables')
      })

      const result = await checkUsernameAvailability('testuser')

      expect(result).toEqual({
        available: false,
        error: {
          code: 'INTERNAL',
          message: 'Failed to initialize database connection',
        },
      })
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle unexpected RPC response format', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { unexpected: 'format' }, // Missing 'available' key
        error: null,
      })

      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await checkUsernameAvailability('testuser')

      // Should fallback to direct query
      expect(mockSupabase.from).toHaveBeenCalled()
      expect(result.available).toBe(true)
    })

    it('should handle exceptions during RPC call', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'))

      const result = await checkUsernameAvailability('testuser')

      expect(result.available).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INTERNAL')
    })
  })
})
