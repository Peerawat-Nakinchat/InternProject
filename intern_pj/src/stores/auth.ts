// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useCompanyStore } from './company'
import { hasEssentialConsent } from '@/utils/cookieConsent'

const API_BASE_URL = '/api'

// ✅ สำคัญ: ต้องตั้งค่า axios ให้ส่ง cookies
axios.defaults.withCredentials = true

export interface User {
  user_id: string
  email: string
  full_name: string
  name?: string
  sex?: "M" | "F" | "O"
  user_address_1?: string
  user_address_2?: string
  user_address_3?: string
  surname?: string
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

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  // ✅ Tokens ยังคงเก็บใน memory สำหรับ state management
  // แต่ไม่ได้เก็บใน localStorage อีกต่อไป (cookies จะจัดการ)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => !!user.value)
  const userName = computed(() => user.value?.full_name || user.value?.email || 'Guest')

  // ✅ Initialize from server (ไม่ใช่ localStorage อีกต่อไป)
  // เราจะ check auth status จาก backend โดยใช้ cookies
  const initAuth = async () => {
    try {
      // ลอง fetch profile เพื่อ check ว่า cookies ยัง valid อยู่ไหม
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        withCredentials: true
      })

      if (response.data.success && response.data.user) {
        user.value = response.data.user
        console.log('✅ Auth initialized from cookies - user found')
      }
    } catch (err) {
      // ถ้า error แปลว่า ไม่มี valid session
      console.log('ℹ️ No valid session found')
      user.value = null
      accessToken.value = null
      refreshToken.value = null
    }
  }

  // Login
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string; rateLimited?: boolean; retryAfter?: number; needsConsent?: boolean }> => {
    isLoading.value = true
    error.value = null

    // ✅ ตรวจสอบ Cookie Consent ก่อน login
    if (!hasEssentialConsent()) {
      isLoading.value = false
      return {
        success: false,
        error: 'กรุณายอมรับการใช้คุกกี้ก่อนเข้าสู่ระบบ',
        needsConsent: true
      }
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      }, {
        withCredentials: true // ✅ สำคัญ: เพื่อให้ browser เก็บ cookies
      })

          // ✅ Debug: ตรวจสอบ Response
        console.group('🔐 Login Response Debug')
        console.log('Success:', response.data.success)
        console.log('Has User?', !!response.data.user)
        console.log('User ID:', response.data.user?.user_id)
        console.log('🍪 Cookies will be set automatically by browser')
        console.groupEnd()

      if (response.data.success) {
        // ✅ เก็บใน memory state เท่านั้น (ไม่เก็บใน localStorage อีกต่อไป)
        // Tokens จะถูกเก็บใน HTTP-Only cookies โดย backend
        accessToken.value = response.data.accessToken
        refreshToken.value = response.data.refreshToken
        user.value = response.data.user

        // ✅ ไม่ใช้ localStorage อีกต่อไป - ใช้ cookies แทน
        // localStorage.setItem('accessToken', response.data.accessToken)
        // localStorage.setItem('refreshToken', response.data.refreshToken)
        // localStorage.setItem('user', JSON.stringify(response.data.user))
        console.log('✅ Login สำเร็จ - Tokens stored in HTTP-Only cookies')

        return { success: true }
      }

      return { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' }
    } catch (err: unknown) {
      // Check for rate limit (429)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; headers?: Record<string, string>; data?: { message?: string } } }

        if (axiosErr.response?.status === 429) {
          const retryAfter = axiosErr.response.headers?.['retry-after']
          error.value = 'คุณพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่'
          return {
            success: false,
            error: error.value ?? undefined,
            rateLimited: true,
            retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
          }
        }

        error.value = axiosErr.response?.data?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      } else {
        error.value = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      }
      return { success: false, error: error.value ?? undefined }
    } finally {
      isLoading.value = false
    }
  }

  // Register
  const register = async (data: RegisterData): Promise<{ success: boolean; message?: string; error?: string }> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email: data.email,
        password: data.password,
        name: data.name,
        surname: data.surname,
        sex: data.sex,
        user_address_1: data.user_address_1,
        user_address_2: data.user_address_2,
        user_address_3: data.user_address_3,
      })

      if (response.data.success) {
        return { success: true, message: 'ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ' }
      }

      return { success: false, error: 'ลงทะเบียนไม่สำเร็จ' }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน'
      return { success: false, error: error.value ?? undefined }
    } finally {
      isLoading.value = false
    }
  }

  // Logout
  const logout = async () => {
    isLoading.value = true

    try {
      // ✅ ส่ง request ไป logout โดยไม่ต้องส่ง refreshToken ใน body
      // เพราะ backend จะอ่านจาก cookies
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {}, // ไม่ต้องส่ง body
        {
          withCredentials: true, // ✅ ส่ง cookies ไปด้วย
        }
      )
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Clear state
      user.value = null
      accessToken.value = null
      refreshToken.value = null

      // ✅ ไม่ใช้ localStorage อีกต่อไป - cookies จะถูก clear โดย backend
      // localStorage.removeItem('accessToken')
      // localStorage.removeItem('refreshToken')
      // localStorage.removeItem('user')
      // localStorage.removeItem('rememberMe')
      console.log('✅ Logout สำเร็จ - Cookies cleared by backend')

      // Reset Company Store
      const companyStore = useCompanyStore()
      companyStore.reset()

      isLoading.value = false
    }
  }

  // Fetch Profile
  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        withCredentials: true // ✅ ใช้ cookies แทน Authorization header
      })

      console.log("🔍 Fetch profile result:", response.data.user)

      if (response.data.success) {
        user.value = response.data.user
        // ✅ ไม่เก็บใน localStorage อีกต่อไป
        // localStorage.setItem('user', JSON.stringify(response.data.user))
      }
    } catch (err: unknown) {
      console.error('Fetch profile error:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr.response?.status === 401) {
          await logout()
        }
      }
    }
  }

  // Refresh Access Token
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      // ✅ ไม่ต้องส่ง refreshToken ใน body อีกต่อไป - ใช้ cookies
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
        withCredentials: true
      })

      if (response.data.success && response.data.accessToken) {
        accessToken.value = response.data.accessToken
        // ✅ ไม่เก็บใน localStorage อีกต่อไป
        // localStorage.setItem('accessToken', response.data.accessToken)

        // อัปเดต refresh token ใหม่ถ้ามี (token rotation)
        if (response.data.refreshToken) {
          refreshToken.value = response.data.refreshToken
          // localStorage.setItem('refreshToken', response.data.refreshToken)
        }

        return true
      }
      return false
    } catch (err) {
      console.error('Refresh token error:', err)
      await logout()
      return false
    }
  }
  // ********** Action: Change Email **********
  const changeEmail = async (data: ChangeEmailData): Promise<{ success: boolean; error?: string }> => {
  isLoading.value = true
  error.value = null

  try {
    const response = await axios.put(`${API_BASE_URL}/auth/change-email`, data, {
      withCredentials: true // ✅ ใช้ cookies แทน Authorization header
    })

    if (response.data.success) {
      // อัปเดตอีเมลใน Store เท่านั้น (ไม่ใช้ localStorage)
      if (user.value) {
        user.value.email = response.data.user.email
        // ✅ ไม่เก็บใน localStorage อีกต่อไป
        // localStorage.setItem('user', JSON.stringify(user.value))
      }
      return { success: true }
    }

    return { success: false, error: response.data.error || 'เปลี่ยนอีเมลไม่สำเร็จ' }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      error.value = axiosErr.response?.data?.error || 'เกิดข้อผิดพลาดในการเปลี่ยนอีเมล'
    } else {
      error.value = 'เกิดข้อผิดพลาดในการเปลี่ยนอีเมล'
    }
    return { success: false, error: error.value ?? undefined }
  } finally {
    isLoading.value = false
  }
}

// ********** Action: Change Password **********
const changePassword = async (data: ChangePasswordData): Promise<{ success: boolean; error?: string }> => {
  isLoading.value = true
  error.value = null

  try {
    const response = await axios.put(`${API_BASE_URL}/auth/change-password`, data, {
      withCredentials: true // ✅ ใช้ cookies แทน Authorization header
    })

    if (response.data.success) {
      // **สำคัญ:** การเปลี่ยนรหัสผ่านจะบังคับ logout ทุกอุปกรณ์
      await logout()
      return { success: true }
    }

    return { success: false, error: response.data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      error.value = axiosErr.response?.data?.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    } else {
      error.value = 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    }
    return { success: false, error: error.value ?? undefined }
  } finally {
    isLoading.value = false
  }
}

const updateProfile = async (data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
  isLoading.value = true
  error.value = null

  try {
    const response = await axios.put(`${API_BASE_URL}/auth/update-profile`, data, {
      withCredentials: true // ✅ ใช้ cookies แทน Authorization header
    })

    if (response.data.success) {
      // อัปเดตข้อมูลผู้ใช้ใน Store เท่านั้น (ไม่ใช้ localStorage)
      user.value = { ...user.value, ...response.data.user }
      // ✅ ไม่เก็บใน localStorage อีกต่อไป
      // localStorage.setItem('user', JSON.stringify(user.value))

      return { success: true }
    }

    return { success: false, error: response.data.error || 'บันทึกข้อมูลไม่สำเร็จ' }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      error.value = axiosErr.response?.data?.error || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
    } else {
      error.value = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
    }
    return { success: false, error: error.value ?? undefined }
  } finally {
    isLoading.value = false
  }
}

  // Initialize on store creation
  initAuth()

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isLoading,
    error,
    // Computed
    isAuthenticated,
    userName,
    // Actions
    login,
    register,
    logout,
    fetchProfile,
    refreshAccessToken,
    initAuth,
    changeEmail,
    changePassword,
    updateProfile
  }
})
