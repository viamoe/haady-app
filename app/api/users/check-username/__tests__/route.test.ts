/**
 * Unit tests for /api/users/check-username route handler
 * 
 * These tests mock the repository function to test the route handler logic.
 * Run with: pnpm test route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { checkUsernameAvailability } from '@/server/db/users.repo'
import { NextRequest } from 'next/server'

// Mock the repository function
vi.mock('@/server/db/users.repo', () => ({
  checkUsernameAvailability: vi.fn(),
}))

describe('GET /api/users/check-username', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('input validation', () => {
    it('should return 400 when username parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3001/api/users/check-username')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Username query parameter is required',
        },
      })
      expect(checkUsernameAvailability).not.toHaveBeenCalled()
    })

    it('should return 400 when username is empty string', async () => {
      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.ok).toBe(false)
      expect(data.error.code).toBe('VALIDATION')
      expect(checkUsernameAvailability).not.toHaveBeenCalled()
    })

    it('should return 400 when username is too long', async () => {
      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=' + 'a'.repeat(31))
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.ok).toBe(false)
      expect(data.error.code).toBe('VALIDATION')
      expect(data.error.message).toContain('too long')
    })
  })

  describe('successful responses', () => {
    it('should return 200 with available=true when username is available', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: true,
        error: null,
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=testuser')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        ok: true,
        data: {
          available: true,
        },
      })
      expect(checkUsernameAvailability).toHaveBeenCalledWith('testuser')
    })

    it('should return 200 with available=false when username is taken', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: false,
        error: null,
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=takenuser')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        ok: true,
        data: {
          available: false,
        },
      })
      expect(checkUsernameAvailability).toHaveBeenCalledWith('takenuser')
    })

    it('should normalize username (lowercase, trim)', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: true,
        error: null,
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=  TESTUSER  ')
      
      await GET(request)

      expect(checkUsernameAvailability).toHaveBeenCalledWith('testuser')
    })
  })

  describe('error responses', () => {
    it('should return 400 for validation errors from repository', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: false,
        error: {
          code: 'VALIDATION',
          message: 'Username must be at least 4 characters',
        },
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=abc')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Username must be at least 4 characters',
        },
      })
    })

    it('should return 500 for internal errors from repository', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: false,
        error: {
          code: 'INTERNAL',
          message: 'Database connection failed',
        },
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=testuser')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL',
          message: 'Database connection failed',
        },
      })
    })

    it('should return 500 for forbidden errors from repository', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=testuser')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data).toEqual({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      })
    })

    it('should return 500 for unexpected errors', async () => {
      vi.mocked(checkUsernameAvailability).mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=testuser')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL',
          message: 'An error occurred while processing your request',
        },
      })
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in username parameter', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: true,
        error: null,
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=user%20name')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(checkUsernameAvailability).toHaveBeenCalledWith('user name')
    })

    it('should handle multiple username parameters (takes first)', async () => {
      vi.mocked(checkUsernameAvailability).mockResolvedValue({
        available: true,
        error: null,
      })

      const request = new NextRequest('http://localhost:3001/api/users/check-username?username=first&username=second')
      
      await GET(request)

      expect(checkUsernameAvailability).toHaveBeenCalledWith('first')
    })
  })
})
