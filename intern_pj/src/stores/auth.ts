// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosInstance from '@/utils/axios'
import axios from 'axios'
import { useCompanyStore } from './company'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const userName = computed(() => user.value?.full_name || user.value?.email || 'Guest')

  // Initialize from localStorage
  const initAuth = () => {
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedUser = localStorage.getItem('user')

    if (storedAccessToken && storedUser) {
      accessToken.value = storedAccessToken
      refreshToken.value = storedRefreshToken
      user.value = JSON.parse(storedUser)
    }
  }

  // Login
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string; rateLimited?: boolean; retryAfter?: number }> => {
    isLoading.value = true
    error.value = null

    try {
      // ใช้ axios ตรงๆ สำหรับ login (ไม่ต้องผ่าน interceptor เพราะยังไม่มี token)
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      })

          // ✅ Debug: ตรวจสอบ Response
        console.group('🔐 Login Response Debug')
        console.log('Success:', response.data.success)
        console.log('Has Access Token?', !!response.data.accessToken)
        console.log('Has Refresh Token?', !!response.data.refreshToken)
        console.log('Has User?', !!response.data.user)
        console.log('User ID:', response.data.user?.user_id)
        console.groupEnd()

      if (response.data.success) {
        accessToken.value = response.data.accessToken
        refreshToken.value = response.data.refreshToken
        user.value = response.data.user

        // Save to localStorage
        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        console.log('✅ Login สำเร็จ - Token saved')

        // Save remember preference
        if (credentials.remember) {
          localStorage.setItem('rememberMe', 'true')
        }

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
      // ใช้ axios ตรงๆ สำหรับ register (ไม่ต้องผ่าน interceptor)
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
      if (refreshToken.value) {
        // ใช้ axiosInstance ที่มี interceptor
        await axiosInstance.post('/auth/logout', { refreshToken: refreshToken.value })
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Clear state
      user.value = null
      accessToken.value = null
      refreshToken.value = null

      // Clear localStorage
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('rememberMe')

      // Reset Company Store
      const companyStore = useCompanyStore()
      companyStore.reset()

      isLoading.value = false
    }
  }

  // Fetch Profile
  const fetchProfile = async () => {
  if (!accessToken.value) return

  try {
    // ใช้ axiosInstance - จะ auto refresh token ถ้าหมดอายุ
    const response = await axiosInstance.get('/auth/profile')

    console.log("🔍 Fetch profile result:", response.user)

    if (response.success) {
      user.value = response.user
      localStorage.setItem('user', JSON.stringify(response.user))
    }
  } catch (err: any) {
    console.error('Fetch profile error:', err)
    // axiosInstance จะจัดการ 401 ให้แล้ว ไม่ต้อง logout ที่นี่
  }
}

  // Refresh Access Token (เรียกตรงๆ ไม่ผ่าน interceptor)
  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken.value) return false

    try {
      // ใช้ axios ตรงๆ เพื่อหลีกเลี่ยง infinite loop
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken.value,
      })

      if (response.data.success && response.data.accessToken) {
        accessToken.value = response.data.accessToken
        localStorage.setItem('accessToken', response.data.accessToken)

        // 🔄 Token Rotation: รับ refresh token ใหม่ด้วย
        if (response.data.refreshToken) {
          refreshToken.value = response.data.refreshToken
          localStorage.setItem('refreshToken', response.data.refreshToken)
          console.log('🔐 Refresh token rotated successfully')
        }

        return true
      }
      return false
    } catch (err: any) {
      console.error('Refresh token error:', err)

      // Check for token reuse attack
      if (err.response?.data?.tokenReused) {
        console.error('🚨 Token reuse detected! All sessions invalidated.')
      }

      await logout()
      return false
    }
  }
  // ********** Action: Change Email **********
  const changeEmail = async (data: ChangeEmailData): Promise<{ success: boolean; error?: string }> => {
  isLoading.value = true
  error.value = null
  if (!accessToken.value) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  try {
    // ใช้ axiosInstance - จะ auto refresh token ถ้าหมดอายุ
    const response = await axiosInstance.put('/auth/change-email', data)

    if (response.success) {
      // อัปเดตอีเมลใน Store และ LocalStorage
      if (user.value) {
        user.value.email = response.user.email
        localStorage.setItem('user', JSON.stringify(user.value))
      }
      return { success: true }
    }

    return { success: false, error: response.error || 'เปลี่ยนอีเมลไม่สำเร็จ' }
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนอีเมล'
    return { success: false, error: error.value ?? undefined }
  } finally {
    isLoading.value = false
  }
}

// ********** Action: Change Password **********
const changePassword = async (data: ChangePasswordData): Promise<{ success: boolean; error?: string }> => {
  isLoading.value = true
  error.value = null
  if (!accessToken.value) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  try {
    // ใช้ axiosInstance - จะ auto refresh token ถ้าหมดอายุ
    const response = await axiosInstance.put('/auth/change-password', data)

    if (response.success) {
      // **สำคัญ:** การเปลี่ยนรหัสผ่านจะบังคับ logout ทุกอุปกรณ์
      await logout()
      return { success: true }
    }

    return { success: false, error: response.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' }
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    return { success: false, error: error.value ?? undefined }
  } finally {
    isLoading.value = false
  }
}

const updateProfile = async (data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
  isLoading.value = true
  error.value = null
  if (!accessToken.value) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  try {
    // ใช้ axiosInstance - จะ auto refresh token ถ้าหมดอายุ
    const response = await axiosInstance.put('/auth/update-profile', data)

    if (response.success) {
      // อัปเดตข้อมูลผู้ใช้ใน Store และ LocalStorage ด้วยข้อมูลใหม่ที่ได้รับจาก Backend
      user.value = { ...user.value, ...response.user }
      localStorage.setItem('user', JSON.stringify(user.value))

      return { success: true }
    }

    return { success: false, error: response.error || 'บันทึกข้อมูลไม่สำเร็จ' }
  } catch (err: any) {
    error.value = err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
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
