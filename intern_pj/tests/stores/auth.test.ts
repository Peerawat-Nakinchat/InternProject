/// <reference types="vitest" />
/**
 * Auth Store Unit Tests
 * ISO 27001 Annex A.8 - Authentication State Management Testing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(() => Promise.reject(new Error('No session'))), // Default: no auth session
    put: vi.fn(),
    defaults: {
      withCredentials: true
    }
  }
}))

// Mock cookie consent
vi.mock('@/utils/cookieConsent', () => ({
  hasEssentialConsent: vi.fn(() => true)
}))

// Mock company store
vi.mock('@/stores/company', () => ({
  useCompanyStore: vi.fn(() => ({
    reset: vi.fn()
  }))
}))

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================
  // INITIAL STATE TESTS
  // ============================================================

  describe('Initial State', () => {
    it('should have null user initially', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
    })

    it('should have null tokens initially', () => {
      const store = useAuthStore()
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
    })

    it('should not be authenticated initially', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should not be loading initially', () => {
      const store = useAuthStore()
      expect(store.isLoading).toBe(false)
    })

    it('should have no error initially', () => {
      const store = useAuthStore()
      expect(store.error).toBeNull()
    })
  })

  // ============================================================
  // COMPUTED PROPERTIES TESTS
  // ============================================================

  describe('Computed Properties', () => {
    it('should return "Guest" for userName when no user', () => {
      const store = useAuthStore()
      expect(store.userName).toBe('Guest')
    })

    it('should return full_name for userName when available', () => {
      const store = useAuthStore()
      store.user = {
        user_id: '123',
        email: 'test@example.com',
        full_name: 'John Doe',
        role_id: 1
      }
      expect(store.userName).toBe('John Doe')
    })

    it('should fallback to email for userName', () => {
      const store = useAuthStore()
      store.user = {
        user_id: '123',
        email: 'test@example.com',
        full_name: '',
        role_id: 1
      }
      expect(store.userName).toBe('test@example.com')
    })

    it('should be authenticated when user exists', () => {
      const store = useAuthStore()
      store.user = {
        user_id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        role_id: 1
      }
      expect(store.isAuthenticated).toBe(true)
    })
  })

  // ============================================================
  // LOGIN TESTS
  // ============================================================

  describe('login', () => {
    it('should set user and tokens on successful login', async () => {
      const mockResponse = {
        data: {
          success: true,
          user: {
            user_id: '123',
            email: 'test@example.com',
            full_name: 'Test User',
            role_id: 1
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      }
      vi.mocked(axios.post).mockResolvedValue(mockResponse)

      const store = useAuthStore()
      const result = await store.login({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      expect(store.user).toEqual(mockResponse.data.user)
      expect(store.accessToken).toBe('access-token')
      expect(store.refreshToken).toBe('refresh-token')
    })

    it('should return error on failed login', async () => {
      const mockError = {
        response: {
          data: { message: 'Invalid credentials' }
        }
      }
      vi.mocked(axios.post).mockRejectedValue(mockError)

      const store = useAuthStore()
      const result = await store.login({
        email: 'test@example.com',
        password: 'wrong'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should handle rate limiting (429)', async () => {
      const mockError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { message: 'Too many attempts' }
        }
      }
      vi.mocked(axios.post).mockRejectedValue(mockError)

      const store = useAuthStore()
      const result = await store.login({
        email: 'test@example.com',
        password: 'password'
      })

      expect(result.success).toBe(false)
      expect(result.rateLimited).toBe(true)
      expect(result.retryAfter).toBe(60)
    })

    it('should set isLoading during login', async () => {
      let loadingDuringRequest = false
      vi.mocked(axios.post).mockImplementation(async () => {
        const store = useAuthStore()
        loadingDuringRequest = store.isLoading
        return { data: { success: true, user: {}, accessToken: '', refreshToken: '' } }
      })

      const store = useAuthStore()
      await store.login({ email: 'test@example.com', password: 'password' })

      expect(loadingDuringRequest).toBe(true)
      expect(store.isLoading).toBe(false)
    })
  })

  // ============================================================
  // REGISTER TESTS
  // ============================================================

  describe('register', () => {
    it('should return success on valid registration', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: true }
      })

      const store = useAuthStore()
      const result = await store.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New',
        surname: 'User',
        sex: 'M'
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('ลงทะเบียนสำเร็จ')
    })

    it('should return error on failed registration', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { message: 'Email already exists' } }
      })

      const store = useAuthStore()
      const result = await store.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test',
        surname: 'User',
        sex: 'M'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })
  })

  // ============================================================
  // LOGOUT TESTS
  // ============================================================

  describe('logout', () => {
    it('should clear user and tokens on logout', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { success: true } })

      const store = useAuthStore()
      store.user = { user_id: '123', email: 'test@example.com', full_name: 'Test', role_id: 1 }
      store.accessToken = 'token'
      store.refreshToken = 'refresh'

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
    })

    it('should clear state even on API error', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('API Error'))

      const store = useAuthStore()
      store.user = { user_id: '123', email: 'test@example.com', full_name: 'Test', role_id: 1 }
      store.accessToken = 'token'

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
    })

    it('should send request with credentials', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { success: true } })

      const store = useAuthStore()
      await store.logout()

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        {},
        expect.objectContaining({ withCredentials: true })
      )
    })
  })

  // ============================================================
  // REFRESH TOKEN TESTS
  // ============================================================

  describe('refreshAccessToken', () => {
    it('should update access token on successful refresh', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          success: true,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBe(true)
      expect(store.accessToken).toBe('new-access-token')
      expect(store.refreshToken).toBe('new-refresh-token')
    })

    it('should logout on failed refresh', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Invalid refresh token'))

      const store = useAuthStore()
      store.user = { user_id: '123', email: 'test@example.com', full_name: 'Test', role_id: 1 }

      const result = await store.refreshAccessToken()

      expect(result).toBe(false)
      expect(store.user).toBeNull()
    })
  })

  // ============================================================
  // FETCH PROFILE TESTS
  // ============================================================

  describe('fetchProfile', () => {
    it('should update user on successful fetch', async () => {
      const mockUser = {
        user_id: '123',
        email: 'test@example.com',
        full_name: 'Updated Name',
        role_id: 1
      }
      vi.mocked(axios.get).mockResolvedValue({
        data: { success: true, user: mockUser }
      })

      const store = useAuthStore()
      await store.fetchProfile()

      expect(store.user).toEqual(mockUser)
    })

    it('should logout on 401 response', async () => {
      vi.mocked(axios.get).mockRejectedValue({
        response: { status: 401 }
      })
      // Mock logout to avoid infinite loop
      vi.mocked(axios.post).mockResolvedValue({ data: { success: true } })

      const store = useAuthStore()
      store.user = { user_id: '123', email: 'test@example.com', full_name: 'Test', role_id: 1 }

      await store.fetchProfile()

      expect(store.user).toBeNull()
    })
  })

  // ============================================================
  // CHANGE EMAIL TESTS
  // ============================================================

  describe('changeEmail', () => {
    it('should update email in store on success', async () => {
      vi.mocked(axios.put).mockResolvedValue({
        data: {
          success: true,
          user: { email: 'new@example.com' }
        }
      })

      const store = useAuthStore()
      // Wait for initAuth to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      store.user = { user_id: '123', email: 'old@example.com', full_name: 'Test', role_id: 1 }

      const result = await store.changeEmail({
        newEmail: 'new@example.com',
        password: 'password'
      })

      expect(result.success).toBe(true)
      expect(store.user?.email).toBe('new@example.com')
    })
  })

  // ============================================================
  // CHANGE PASSWORD TESTS
  // ============================================================

  describe('changePassword', () => {
    it('should logout after successful password change', async () => {
      vi.mocked(axios.put).mockResolvedValue({
        data: { success: true }
      })
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: true }
      })

      const store = useAuthStore()
      store.user = { user_id: '123', email: 'test@example.com', full_name: 'Test', role_id: 1 }

      const result = await store.changePassword({
        oldPassword: 'old',
        newPassword: 'new'
      })

      expect(result.success).toBe(true)
      expect(store.user).toBeNull()
    })
  })

  // ============================================================
  // UPDATE PROFILE TESTS
  // ============================================================

  describe('updateProfile', () => {
    it('should update user data in store', async () => {
      const updatedUser = {
        name: 'Updated',
        surname: 'User',
        full_name: 'Updated User',
        sex: 'M' as const
      }
      vi.mocked(axios.put).mockResolvedValue({
        data: { success: true, user: updatedUser }
      })

      const store = useAuthStore()
      store.user = { user_id: '123', email: 'test@example.com', full_name: 'Old Name', role_id: 1 }

      const result = await store.updateProfile({
        name: 'Updated',
        surname: 'User',
        full_name: 'Updated User',
        sex: 'M',
        user_address_1: '',
        user_address_2: '',
        user_address_3: '',
        profile_image_url: ''
      })

      expect(result.success).toBe(true)
      expect(store.user?.full_name).toBe('Updated User')
    })
  })
})

// ============================================================
// SECURITY COMPLIANCE TESTS
// ============================================================

describe('Auth Store Security Compliance (ISO 27001)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Cookie-based Authentication', () => {
    it('should use withCredentials for all API calls', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: true, user: {}, accessToken: '', refreshToken: '' }
      })

      const store = useAuthStore()
      await store.login({ email: 'test@example.com', password: 'password' })

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ withCredentials: true })
      )
    })
  })

  describe('Token Storage', () => {
    it('should store tokens in memory only (not localStorage)', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          success: true,
          user: { user_id: '123', email: 'test@example.com', full_name: 'Test', role_id: 1 },
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      })

      const store = useAuthStore()
      await store.login({ email: 'test@example.com', password: 'password' })

      // Tokens should be in memory
      expect(store.accessToken).toBe('access-token')
      expect(store.refreshToken).toBe('refresh-token')

      // localStorage should NOT have tokens (they're in HTTP-only cookies)
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })
  })

  describe('Session Cleanup', () => {
    it('should clear all auth state on logout', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { success: true } })

      const store = useAuthStore()
      store.user = { user_id: '123', email: 'test@example.com', full_name: 'Test', role_id: 1 }
      store.accessToken = 'token'
      store.refreshToken = 'refresh'

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })
})
