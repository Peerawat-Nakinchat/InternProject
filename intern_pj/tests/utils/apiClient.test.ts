/// <reference types="vitest" />
/**
 * API Client Unit Tests
 * ISO 27001 Annex A.8 - API Security Testing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock the auth store before importing api client
const mockAuthStore = {
  accessToken: null as string | null,
  refreshAccessToken: vi.fn(),
  logout: vi.fn()
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn()
  }))
}))

// We need to test the API client logic
describe('API Client', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthStore.accessToken = null
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================
  // REQUEST CONFIGURATION TESTS
  // ============================================================

  describe('Request Configuration', () => {
    it('should include credentials in all requests', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      // Import after mocking
      const { api } = await import('@/utils/apiClient')
      await api.get('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include'
        })
      )
    })

    it('should include Content-Type header', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.post('/test', { data: 'value' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should include Authorization header when token exists', async () => {
      mockAuthStore.accessToken = 'test-token'
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.get('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })
  })

  // ============================================================
  // HTTP METHODS TESTS
  // ============================================================

  describe('HTTP Methods', () => {
    it('should use GET method for get()', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.get('/endpoint')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should use POST method for post()', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.post('/endpoint', { key: 'value' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'value' })
        })
      )
    })

    it('should use PUT method for put()', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.put('/endpoint', { key: 'value' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('should use DELETE method for delete()', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.delete('/endpoint')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should use PATCH method for patch()', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.patch('/endpoint', { key: 'value' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('Error Handling', () => {
    it('should throw error on non-ok response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ message: 'Bad request' }),
        headers: new Headers()
      } as Response)

      const { api } = await import('@/utils/apiClient')

      await expect(api.get('/test')).rejects.toThrow('Bad request')
    })

    it('should attempt token refresh on 401', async () => {
      mockAuthStore.refreshAccessToken.mockResolvedValue(true)

      let callCount = 0
      vi.mocked(global.fetch).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ message: 'Unauthorized' }),
            headers: new Headers()
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
      })

      const { api } = await import('@/utils/apiClient')
      await api.get('/test')

      expect(mockAuthStore.refreshAccessToken).toHaveBeenCalled()
    })

    it('should logout if token refresh fails', async () => {
      mockAuthStore.refreshAccessToken.mockResolvedValue(false)

      // Mock window.location
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      })

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
        headers: new Headers()
      } as Response)

      const { api } = await import('@/utils/apiClient')

      try {
        await api.get('/test')
      } catch {
        // Expected to throw
      }

      expect(mockAuthStore.logout).toHaveBeenCalled()

      // Restore window.location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true
      })
    })

    it('should include retryAfter from 429 response', async () => {
      const headers = new Headers()
      headers.set('retry-after', '60')

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ message: 'Rate limited' }),
        headers
      } as Response)

      const { api } = await import('@/utils/apiClient')

      try {
        await api.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as { retryAfter?: number }).retryAfter).toBe(60)
      }
    })
  })
})

// ============================================================
// SECURITY COMPLIANCE TESTS
// ============================================================

describe('API Client Security Compliance (ISO 27001)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('CORS and Credentials', () => {
    it('should always send credentials for cross-origin requests', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.get('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include'
        })
      )
    })
  })

  describe('Token Transmission', () => {
    it('should send token in Authorization header (backup for cookies)', async () => {
      mockAuthStore.accessToken = 'secure-token'
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const { api } = await import('@/utils/apiClient')
      await api.get('/protected-resource')

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      expect(callArgs).toBeDefined()
      const headers = (callArgs![1] as RequestInit).headers as Record<string, string>

      expect(headers['Authorization']).toBe('Bearer secure-token')
    })
  })

  describe('Error Information Exposure', () => {
    it('should not expose sensitive information in errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({
          message: 'An error occurred',
          // Server should not send these, but client should not expose them either
          stack: 'Error stack trace...',
          internalDetails: 'Database connection failed'
        }),
        headers: new Headers()
      } as Response)

      const { api } = await import('@/utils/apiClient')

      try {
        await api.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        // Error message should be user-friendly, not expose internals
        expect((error as Error).message).toBe('An error occurred')
      }
    })
  })
})
