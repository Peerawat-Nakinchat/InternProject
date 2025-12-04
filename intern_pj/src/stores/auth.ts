// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useCompanyStore } from './company'
import { hasEssentialConsent } from '@/utils/cookieConsent'

const API_BASE_URL = '/api'

// ✅ สำคัญ: ต้องตั้งค่า axios ให้ส่ง cookies
axios.defaults.withCredentials = true

// --- Interfaces ---
export interface User {
  user_id: string
  email: string
  full_name: string
  name?: string
  surname?: string
  sex?: "M" | "F" | "O"
  user_address_1?: string
  user_address_2?: string
  user_address_3?: string
  role_id: number
  profile_image_url?: string
  is_active?: boolean
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterData {
  email: string
  password: string
  name: string
  surname: string
  sex: "M" | "F" | "O"
  user_address_1?: string
  user_address_2?: string
  user_address_3?: string
}

export interface ChangeEmailData {
  newEmail: string
  password: string
}

export interface ChangePasswordData {
  oldPassword: string
  newPassword: string
}

export interface ProfileUpdateData {
    name: string
    surname: string
    full_name: string
    sex: "M" | "F" | "O" | string
    user_address_1: string
    user_address_2: string
    user_address_3: string
    profile_image_url: string
}

// ✅ Promise สำหรับรอ initAuth เสร็จ (ใช้ใน router guard)
let initAuthPromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const authReady = ref(false)

  // --- Computed ---
  const isAuthenticated = computed(() => !!user.value)
  const userName = computed(() => user.value?.full_name || user.value?.email || 'Guest')

  // --- Actions ---

  // 1. Initialize Auth
  const initAuth = async () => {
    if (authReady.value) return

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        withCredentials: true
      })

      // ✅ แก้ไข: เจาะเข้า data.data.user
      if (response.data.success && response.data.data?.user) {
        user.value = response.data.data.user
        console.log('✅ Auth initialized from cookies - user found')
      }
    } catch (err: unknown) {
      // ถ้า 401 ลอง refresh token ก่อน
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr.response?.status === 401) {
          console.log('ℹ️ Access token expired, trying refresh...')
          const refreshed = await tryRefreshOnInit()
          if (refreshed) return
        }
      }
      // ถ้าไม่เจอ user หรือ refresh ไม่ได้
      console.log('ℹ️ No valid session found')
      user.value = null
      accessToken.value = null
      refreshToken.value = null
    } finally {
      authReady.value = true
    }
  }

  // 2. Try Refresh on Init
  const tryRefreshOnInit = async (): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
        withCredentials: true
      })

      // ✅ แก้ไข: ดึงจาก response.data.data
      const data = response.data.data
      if (response.data.success && data) {
        accessToken.value = data.accessToken
        if (data.refreshToken) {
          refreshToken.value = data.refreshToken
        }

        // Fetch profile again
        const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
          withCredentials: true
        })

        // ✅ แก้ไข: เจาะเข้า data.data.user
        if (profileResponse.data.success && profileResponse.data.data?.user) {
          user.value = profileResponse.data.data.user
          console.log('✅ Auth restored via refresh token')
          authReady.value = true
          return true
        }
      }
      return false
    } catch (err) {
      return false
    }
  }

  const waitForAuthReady = (): Promise<void> => {
    if (authReady.value) return Promise.resolve()
    if (!initAuthPromise) initAuthPromise = initAuth()
    return initAuthPromise
  }

  // 3. Login
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string; rateLimited?: boolean; retryAfter?: number; needsConsent?: boolean }> => {
    isLoading.value = true
    error.value = null

    if (!hasEssentialConsent()) {
      isLoading.value = false
      return { success: false, error: 'กรุณายอมรับการใช้คุกกี้ก่อนเข้าสู่ระบบ', needsConsent: true }
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      }, { withCredentials: true })

      if (response.data.success) {
        // ✅ แก้ไข: ดึงข้อมูลจากชั้น .data
        const responseData = response.data.data
        
        accessToken.value = responseData.accessToken
        refreshToken.value = responseData.refreshToken
        user.value = responseData.user

        console.log('✅ Login สำเร็จ')
        return { success: true }
      }

      return { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; headers?: Record<string, string>; data?: { message?: string; error?: string } } }

        // Handle Rate Limit
        if (axiosErr.response?.status === 429) {
          const retryAfter = axiosErr.response.headers?.['retry-after']
          error.value = 'คุณพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่'
          return {
            success: false,
            error: error.value,
            rateLimited: true,
            retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
          }
        }

        // Handle Other Errors (Backend now sends error inside 'error' property)
        error.value = axiosErr.response?.data?.error || axiosErr.response?.data?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      } else {
        error.value = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      }
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 4. Register
  const register = async (data: RegisterData): Promise<{ success: boolean; message?: string; error?: string }> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, data)

      if (response.data.success) {
        return { success: true, message: 'ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ' }
      }

      return { success: false, error: 'ลงทะเบียนไม่สำเร็จ' }
    } catch (err: any) {
      error.value = err.response?.data?.error || err.response?.data?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 5. Logout
  const logout = async () => {
    isLoading.value = true
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      
      const companyStore = useCompanyStore()
      companyStore.reset()
      
      console.log('✅ Logout สำเร็จ')
      isLoading.value = false
    }
  }

  // 6. Fetch Profile
  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, { withCredentials: true })

      // ✅ แก้ไข: เจาะเข้า data.data.user
      if (response.data.success && response.data.data?.user) {
        user.value = response.data.data.user
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr.response?.status === 401) {
          await logout()
        }
      }
    }
  }

  // 7. Refresh Access Token
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      
      // ✅ แก้ไข: ดึง data ออกมาก่อน
      const data = response.data.data

      if (response.data.success && data?.accessToken) {
        accessToken.value = data.accessToken
        if (data.refreshToken) {
          refreshToken.value = data.refreshToken
        }
        console.log('✅ Token refreshed successfully')
        return true
      }
      return false
    } catch (err) {
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      return false
    }
  }

  // 8. Update Profile & Change Email/Password
  const changeEmail = async (data: ChangeEmailData): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    error.value = null
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/change-email`, data, { withCredentials: true })

      if (response.data.success) {
        // ✅ แก้ไข: data.data.user
        if (user.value && response.data.data?.user) {
          user.value.email = response.data.data.user.email
        }
        return { success: true }
      }
      return { success: false, error: response.data.error || 'เปลี่ยนอีเมลไม่สำเร็จ' }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'เกิดข้อผิดพลาด'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const changePassword = async (data: ChangePasswordData): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    error.value = null
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/change-password`, data, { withCredentials: true })

      if (response.data.success) {
        await logout()
        return { success: true }
      }
      return { success: false, error: response.data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'เกิดข้อผิดพลาด'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const updateProfile = async (data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    error.value = null
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/update-profile`, data, { withCredentials: true })

      if (response.data.success) {
        // ✅ แก้ไข: data.data.user
        if (response.data.data?.user) {
          user.value = { ...user.value, ...response.data.data.user }
        }
        return { success: true }
      }
      return { success: false, error: response.data.error || 'บันทึกข้อมูลไม่สำเร็จ' }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  initAuthPromise = initAuth()

  return {
    user,
    accessToken,
    refreshToken,
    isLoading,
    error,
    authReady,
    isAuthenticated,
    userName,
    login,
    register,
    logout,
    fetchProfile,
    refreshAccessToken,
    initAuth,
    waitForAuthReady,
    changeEmail,
    changePassword,
    updateProfile
  }
})