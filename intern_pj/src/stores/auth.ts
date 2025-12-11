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
  mfa_enabled?: boolean
}

// ... (Interfaces อื่นๆ คงเดิม) ...
export interface LoginCredentials { email: string; password: string; }
export interface RegisterData { email: string; password: string; name: string; surname: string; sex: "M" | "F" | "O"; user_address_1?: string; user_address_2?: string; user_address_3?: string; }
export interface ChangeEmailData { newEmail: string; password: string; }
export interface ChangePasswordData { oldPassword: string; newPassword: string; }
export interface ProfileUpdateData { name: string; surname: string; full_name: string; sex: string; user_address_1: string; user_address_2: string; user_address_3: string; profile_image_url: string; }

// API Response format (axios interceptor returns response.data directly)
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  // ❌ ลบ refreshToken ออกจาก State เพราะเราใช้ HTTP-Only Cookie (Frontend มองไม่เห็นและไม่ต้องใช้)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const authReady = ref(false)
  
  // ✅ Proactive Token Refresh Timer
  let refreshTimerId: ReturnType<typeof setInterval> | null = null
  const TOKEN_REFRESH_INTERVAL = 12 * 60 * 1000 // 12 minutes (refresh before 15 min expiry)

  // --- Computed ---
  const isAuthenticated = computed(() => !!user.value)
  const userName = computed(() => user.value?.full_name || user.value?.email || 'Guest')

  // ✅ Refresh Access Token - ถูกเรียกจาก axios interceptor
  // ใช้ axios ตรงเพื่อหลีกเลี่ยง circular dependency กับ axiosInstance
  // ✅ เพิ่ม lock เพื่อป้องกัน concurrent refresh requests
  let isRefreshing = false
  let refreshPromise: Promise<boolean> | null = null
  
  const refreshAccessToken = async (): Promise<boolean> => {
    // ✅ ถ้ากำลัง refresh อยู่ ให้รอ promise เดิม (ป้องกัน race condition)
    if (isRefreshing && refreshPromise) {
      console.log('⏳ Waiting for existing refresh request...')
      return refreshPromise
    }
    
    isRefreshing = true
    refreshPromise = (async () => {
      try {
        console.log('🔄 Refreshing access token...')
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
        
        console.log('🔄 Refresh response:', data)
        
        // ✅ FIX: accessToken อยู่ที่ root level (data.accessToken) ไม่ใช่ data.data.accessToken
        if (data.success && (data.accessToken || data.data?.accessToken)) {
          accessToken.value = data.accessToken || data.data.accessToken
          console.log('✅ Access token refreshed successfully')
          return true
        }
        console.log('⚠️ Refresh returned success=false or no accessToken')
        return false
      } catch (err) {
        console.error('❌ Failed to refresh token:', err)
        // ✅ อย่า clear state ที่นี่ - ให้ caller จัดการ
        return false
      } finally {
        isRefreshing = false
        refreshPromise = null
      }
    })()
    
    return refreshPromise
  }

  // ✅ Proactive Token Refresh - เริ่ม timer สำหรับ refresh token อัตโนมัติ
  const startTokenRefreshTimer = () => {
    // หยุด timer เดิมก่อน (ถ้ามี)
    stopTokenRefreshTimer()
    
    console.log('⏰ Starting proactive token refresh timer (every 12 minutes)')
    
    refreshTimerId = setInterval(async () => {
      if (user.value && accessToken.value) {
        console.log('⏰ Proactive token refresh triggered')
        const success = await refreshAccessToken()
        if (!success) {
          console.log('⚠️ Proactive refresh failed, will retry on next interval or 401')
        }
      } else {
        console.log('⏰ Skipping proactive refresh - no active session')
      }
    }, TOKEN_REFRESH_INTERVAL)
  }

  // ✅ หยุด timer เมื่อ logout หรือปิด app
  const stopTokenRefreshTimer = () => {
    if (refreshTimerId) {
      console.log('⏹️ Stopping token refresh timer')
      clearInterval(refreshTimerId)
      refreshTimerId = null
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

      // ✅ ลอง refresh token ก่อน (ใช้ axios ตรงเพื่อหลีกเลี่ยง circular dependency)
      // ถ้า refresh สำเร็จ จะได้ access token ใหม่ + cookies ถูก set
      const refreshed = await refreshAccessToken()
      
      if (refreshed) {
        // ถ้า refresh สำเร็จ ลองดึง profile
        const axiosInstance = await getAxios()
        const response = await axiosInstance.get('/auth/profile', {
          _silent: true
        } as import('axios').AxiosRequestConfig & { _silent?: boolean })
        
        if (response.success && response.data?.user) {
          user.value = response.data.user
          console.log('✅ Auth initialized (session restored)')
          // ✅ เริ่ม proactive token refresh timer
          startTokenRefreshTimer()
        }
      } else {
        // ถ้า refresh ไม่ได้ แสดงว่าไม่มี valid session
        console.log('ℹ️ No valid session found (Guest)')
        user.value = null
        accessToken.value = null

      }
    } catch (err) {
      console.log('ℹ️ No valid session found (Guest)')
      user.value = null
      accessToken.value = null
    } finally {
      authReady.value = true
    }
  }

  // ✅ รอให้ auth initialization เสร็จสมบูรณ์
  const waitForAuthReady = async (): Promise<void> => {
    // ถ้า auth ready แล้ว return ทันที
    if (authReady.value) return
    
    // เริ่ม initAuth (ถ้ายังไม่เริ่ม)
    initAuth()
    
    // รอจนกว่า authReady จะเป็น true (polling)
    let attempts = 0
    const maxAttempts = 50 // 5 วินาที (50 * 100ms)
    
    while (!authReady.value && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    console.log(`🔒 Auth ready after ${attempts * 100}ms`)
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
      const response = await axiosInstance.post('/auth/login', credentials) as ApiResponse<{ accessToken: string; user: User }>

      if (response.success) {

        // ✅ Check if MFA is required (response is flat after axios interceptor)
        if (response.mfaRequired && response.tempToken) {
          console.log('[DEBUG] MFA required, tempToken:', response.tempToken?.substring(0, 20) + '...')
          return { 
            success: false, 
            mfaRequired: true, 
            tempToken: response.tempToken,
            message: response.message 
          }
        }
        
        // Normal login success (data is nested in response.data for non-MFA)
        const data = response.data || response
        accessToken.value = data.accessToken
        user.value = data.user
        
        // ✅ เริ่ม proactive token refresh timer
        startTokenRefreshTimer()
        
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

  // 2.1 Verify MFA Login (after initial login with MFA)
  const verifyMfaLogin = async (tempToken: string, otp: string) => {
    isLoading.value = true
    error.value = null

    try {
      // Use direct axios to set custom Authorization header with temp token
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/login/mfa`, 
        { otp },
        { 
          headers: { Authorization: `Bearer ${tempToken}` },
          withCredentials: true 
        }
      )
      
      if (data.success) {
        accessToken.value = data.data.accessToken
        user.value = data.data.user
        // ✅ เริ่ม proactive token refresh timer
        startTokenRefreshTimer()
        return { success: true }
      }
      return { success: false, error: data.error || 'การยืนยัน OTP ล้มเหลว' }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'รหัส OTP ไม่ถูกต้อง'
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
      const response = await axiosInstance.post('/auth/register', data) as ApiResponse
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
      // ✅ Skip API call if already logged out (no token = no need to call logout API)
      if (accessToken.value || user.value) {
        const axiosInstance = await getAxios()
        await axiosInstance.post('/auth/logout')
      } else {
        console.log('ℹ️ Already logged out, skipping API call')
      }
    } catch (err) {
      // ✅ Ignore logout errors - just clear local state
      console.log('ℹ️ Logout API failed (session may already be expired)')
    } finally {
      // ✅ หยุด proactive token refresh timer
      stopTokenRefreshTimer()
      
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
      const response = await axiosInstance.get('/auth/profile') as ApiResponse<{ user: User }>
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
      const response = await axiosInstance.put('/auth/change-email', data) as ApiResponse
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
      const response = await axiosInstance.put('/auth/change-password', data) as ApiResponse
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
      const response = await axiosInstance.put('/auth/update-profile', data) as ApiResponse<{ user: User }>
      if (response.success && response.data?.user) {
        user.value = { ...user.value, ...response.data.user }
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed' }
    } finally { isLoading.value = false }
  }

  // ==================== MFA Actions ====================
  
  const getMfaStatus = async () => {
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.get('/auth/mfa/status')
      if (response.success && response.data) {
        if (user.value) {
          user.value.mfa_enabled = response.data.mfa_enabled
        }
        return { success: true, mfa_enabled: response.data.mfa_enabled }
      }
      return { success: false, mfa_enabled: false }
    } catch (err: unknown) {
      return { success: false, mfa_enabled: false, error: err instanceof Error ? err.message : 'Failed' }
    }
  }

  const setupMfa = async () => {
    isLoading.value = true
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.get('/auth/mfa/setup')
      if (response.success && response.data) {
        return { success: true, secret: response.data.secret, qrCodeUrl: response.data.qrCodeUrl }
      }
      return { success: false, error: 'Setup failed' }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed' }
    } finally { isLoading.value = false }
  }

  const enableMfa = async (otp: string) => {
    isLoading.value = true
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.post('/auth/mfa/enable', { otp })
      if (response.success) {
        if (user.value) {
          user.value.mfa_enabled = true
        }
        return { success: true }
      }
      return { success: false, error: response.error || 'Enable failed' }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed' }
    } finally { isLoading.value = false }
  }

  const disableMfa = async (otp: string) => {
    isLoading.value = true
    try {
      const axiosInstance = await getAxios()
      const response = await axiosInstance.post('/auth/mfa/disable', { otp })
      if (response.success) {
        if (user.value) {
          user.value.mfa_enabled = false
        }
        return { success: true }
      }
      return { success: false, error: response.error || 'Disable failed' }
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
    verifyMfaLogin,
    register,
    logout,
    fetchProfile,
    initAuth,
    waitForAuthReady,
    changeEmail,
    changePassword,
    updateProfile,
    // MFA
    getMfaStatus,
    setupMfa,
    enableMfa,
    disableMfa,
    refreshAccessToken // ✅ Export สำหรับ axios interceptor
  }
})