// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useCompanyStore } from './company'
import { hasEssentialConsent } from '@/utils/cookieConsent'

// ✅ 1. Environment Config (มาตรฐาน)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// --- Interfaces (คงเดิม) ---
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

// ... (Interfaces อื่นๆ คงเดิม) ...
export interface LoginCredentials { email: string; password: string; }
export interface RegisterData { email: string; password: string; name: string; surname: string; sex: "M" | "F" | "O"; user_address_1?: string; user_address_2?: string; user_address_3?: string; }
export interface ChangeEmailData { newEmail: string; password: string; }
export interface ChangePasswordData { oldPassword: string; newPassword: string; }
export interface ProfileUpdateData { name: string; surname: string; full_name: string; sex: string; user_address_1: string; user_address_2: string; user_address_3: string; profile_image_url: string; }

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  // ❌ ลบ refreshToken ออกจาก State เพราะเราใช้ HTTP-Only Cookie (Frontend มองไม่เห็นและไม่ต้องใช้)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const authReady = ref(false)

  // --- Computed ---
  const isAuthenticated = computed(() => !!user.value)
  const userName = computed(() => user.value?.full_name || user.value?.email || 'Guest')

  // ✅ Refresh Access Token - ถูกเรียกจาก axios interceptor
  // ใช้ axios ตรงเพื่อหลีกเลี่ยง circular dependency กับ axiosInstance
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      console.log('🔄 Refreshing access token...')
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      
      if (data.success && data.data?.accessToken) {
        accessToken.value = data.data.accessToken
        console.log('✅ Access token refreshed successfully')
        return true
      }
      return false
    } catch (err) {
      console.error('❌ Failed to refresh token:', err)
      // Clear state on refresh failure
      user.value = null
      accessToken.value = null
      return false
    }
  }

  // --- Actions ---

  // ✅ ใช้ axiosInstance แบบ lazy import เพื่อหลีกเลี่ยง circular dependency
  const getAxios = async () => {
    const { default: axiosInstance } = await import('@/utils/axios')
    return axiosInstance
  }

  // 1. Initialize Auth
  const initAuth = async () => {
    if (authReady.value) return
    try {
      const axiosInstance = await getAxios()
      // เรียก Profile ตรงๆ เลย ถ้า 401 Interceptor จะทำงานให้เอง!
      const response = await axiosInstance.get('/auth/profile')
      if (response.success && response.data?.user) {
        user.value = response.data.user
        console.log('✅ Auth initialized')
      }
    } catch (err) {
      console.log('ℹ️ No valid session found (Guest)')
      user.value = null
      accessToken.value = null
    } finally {
      authReady.value = true
    }
  }

  const waitForAuthReady = async (): Promise<void> => {
    if (authReady.value) return
    await initAuth()
  }

  // 2. Login
  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    error.value = null

    if (!hasEssentialConsent()) {
      isLoading.value = false
      return { success: false, error: 'กรุณายอมรับการใช้คุกกี้ก่อนเข้าสู่ระบบ', needsConsent: true }
    }

    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.post('/auth/login', credentials)

      if (response.success) {
        const data = response.data
        accessToken.value = data.accessToken
        user.value = data.user
        return { success: true }
      }
      return { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      
      // Check for Axios error with response
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; headers?: Record<string, string>; data?: { code?: string; email?: string; error?: string } } }
        
        // Check for EMAIL_NOT_VERIFIED
        if (axiosErr.response?.status === 403 && axiosErr.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
          return { 
            success: false, 
            error: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
            code: 'EMAIL_NOT_VERIFIED',
            email: axiosErr.response.data.email
          }
        }
        
        // Check Rate Limit
        if (axiosErr.response?.status === 429) {
          const retryAfter = axiosErr.response.headers?.['retry-after']
          return { success: false, error: error.value, rateLimited: true, retryAfter }
        }
      }
      
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 3. Register
  const register = async (data: RegisterData) => {
    isLoading.value = true
    error.value = null
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.post('/auth/register', data)
      if (response.success) {
        return { success: true, message: 'ลงทะเบียนสำเร็จ' }
      }
      return { success: false, error: 'ลงทะเบียนไม่สำเร็จ' }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 4. Logout
  const logout = async () => {
    try {
      const axiosInstance = await getAxios()
      await axiosInstance.post('/auth/logout')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      user.value = null
      accessToken.value = null
      
      const companyStore = useCompanyStore()
      companyStore.reset()
    }
  }

  // 5. General Update Methods (Clean Code)
  const fetchProfile = async () => {
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.get('/auth/profile')
      if (response.data?.user) {
        user.value = response.data.user
      }
    } catch (err) {
       // ไม่ต้องทำอะไร Interceptor จัดการ Logout ให้ถ้า Token ตายสนิท
    }
  }

  const changeEmail = async (data: ChangeEmailData) => {
    isLoading.value = true
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.put('/auth/change-email', data)
      if (response.success) {
         if (user.value) user.value.email = data.newEmail
         return { success: true }
      }
      return { success: false, error: response.error }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed' }
    } finally { isLoading.value = false }
  }

  const changePassword = async (data: ChangePasswordData) => {
    isLoading.value = true
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.put('/auth/change-password', data)
      if (response.success) {
        await logout()
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed' }
    } finally { isLoading.value = false }
  }

  const updateProfile = async (data: ProfileUpdateData) => {
    isLoading.value = true
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.put('/auth/update-profile', data)
      if (response.success && response.data?.user) {
        user.value = { ...user.value, ...response.data.user }
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed' }
    } finally { isLoading.value = false }
  }

  // Auto Init
  initAuth()

  return {
    user,
    accessToken,
    isLoading,
    error,
    authReady,
    isAuthenticated,
    userName,
    login,
    register,
    logout,
    fetchProfile,
    initAuth,
    waitForAuthReady,
    changeEmail,
    changePassword,
    updateProfile,
    refreshAccessToken // ✅ Export สำหรับ axios interceptor
  }
})