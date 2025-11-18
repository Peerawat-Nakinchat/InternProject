// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export interface User {
  user_id: string
  email: string
  full_name: string
  name?: string
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
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      })

      if (response.data.success) {
        accessToken.value = response.data.accessToken
        refreshToken.value = response.data.refreshToken
        user.value = response.data.user

        // Save to localStorage
        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('user', JSON.stringify(response.data.user))

        // Save remember preference
        if (credentials.remember) {
          localStorage.setItem('rememberMe', 'true')
        }

        return { success: true }
      }
      
      return { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
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
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          { refreshToken: refreshToken.value },
          {
            headers: {
              Authorization: `Bearer ${accessToken.value}`,
            },
          }
        )
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

      isLoading.value = false
    }
  }

  // Fetch Profile
  const fetchProfile = async () => {
    if (!accessToken.value) return

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
      })

      if (response.data.success) {
        user.value = response.data.user
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
    } catch (err: any) {
      console.error('Fetch profile error:', err)
      if (err.response?.status === 401) {
        // Token expired, try refresh or logout
        await logout()
      }
    }
  }

  // Refresh Access Token
  const refreshAccessToken = async () => {
    if (!refreshToken.value) return false

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/token`, {
        refreshToken: refreshToken.value,
      })

      if (response.data.success) {
        accessToken.value = response.data.accessToken
        localStorage.setItem('accessToken', response.data.accessToken)
        return true
      }
    } catch (err) {
      console.error('Refresh token error:', err)
      await logout()
      return false
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
  }
})