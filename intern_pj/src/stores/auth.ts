// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useCompanyStore } from './company'
import { hasEssentialConsent } from '@/utils/cookieConsent'

// ✅ 1. Environment Config (มาตรฐาน)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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

// --- 🛠 Axios Setup (Enterprise Pattern) ---
// สร้าง Instance แยก เพื่อไม่ให้กระทบ global axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ส่ง Cookies อัตโนมัติ
  headers: {
    'Content-Type': 'application/json'
  }
})

// ตัวแปรสำหรับจัดการ Refresh Token Concurrency
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

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

  // --- 🛡 Interceptor Logic ---
  // 1. Request Interceptor: แนบ Access Token (ถ้ามี)
  api.interceptors.request.use((config) => {
    if (accessToken.value) {
      config.headers.Authorization = `Bearer ${accessToken.value}`
    }
    return config
  })

  // 2. Response Interceptor: จัดการ 401 และ Refresh Token
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      // ถ้าเจอ 401 และยังไม่ได้ลอง Retry
      if (error.response?.status === 401 && !originalRequest._retry) {
        
        // ถ้ากำลัง Refresh อยู่ ให้เข้าคิวรอ (ป้องกัน Race Condition)
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject })
          }).then(() => {
            return api(originalRequest)
          }).catch(err => {
            return Promise.reject(err)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          // เรียก Refresh Token Endpoint
          // หมายเหตุ: Endpoint นี้จะอ่าน Refresh Token จาก Cookie และ Set Access Token ใหม่กลับมา
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
          
          if (data.success && data.data?.accessToken) {
            const newToken = data.data.accessToken
            accessToken.value = newToken
            
            // update header สำหรับ request ที่ค้างอยู่
            api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken
            
            // ปล่อยคิวที่รออยู่
            processQueue(null, newToken)
            
            // Retry request เดิม
            return api(originalRequest)
          } else {
            throw new Error('Refresh failed')
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null)
          await logout() // ถ้า Refresh ไม่ผ่าน คือจบข่าว Logout ทันที
          return Promise.reject(refreshErr)
        } finally {
          isRefreshing = false
        }
      }

      return Promise.reject(error)
    }
  )

  // --- Actions ---

  // 1. Initialize Auth
  const initAuth = async () => {
    if (authReady.value) return
    try {
      // เรียก Profile ตรงๆ เลย ถ้า 401 Interceptor จะทำงานให้เอง!
      const response = await api.get('/auth/profile')
      if (response.data.success && response.data.data?.user) {
        user.value = response.data.data.user
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
      // ใช้ api instance แทน axios ธรรมดา
      const response = await api.post('/auth/login', credentials)

      if (response.data.success) {
        const data = response.data.data
        accessToken.value = data.accessToken
        user.value = data.user
        // ไม่ต้องเก็บ refreshToken ใน state
        return { success: true }
      }
      return { success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' }
    } catch (err: any) {
      // จัดการ Error แบบรวมศูนย์
      error.value = err.response?.data?.error || err.response?.data?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      
      // Check Rate Limit
      if (err.response?.status === 429) {
          const retryAfter = err.response.headers['retry-after']
          return { success: false, error: error.value, rateLimited: true, retryAfter }
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
      const response = await api.post('/auth/register', data)
      if (response.data.success) {
        return { success: true, message: 'ลงทะเบียนสำเร็จ' }
      }
      return { success: false, error: 'ลงทะเบียนไม่สำเร็จ' }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'เกิดข้อผิดพลาด'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 4. Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      user.value = null
      accessToken.value = null
      
      const companyStore = useCompanyStore()
      companyStore.reset()
      
      // Redirect หรือ reload page ถ้าจำเป็น
      // window.location.href = '/login' 
    }
  }

  // 5. General Update Methods (Clean Code)
  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile')
      if (response.data.data?.user) {
        user.value = response.data.data.user
      }
    } catch (err) {
       // ไม่ต้องทำอะไร Interceptor จัดการ Logout ให้ถ้า Token ตายสนิท
    }
  }

  const changeEmail = async (data: ChangeEmailData) => {
    isLoading.value = true
    try {
      const response = await api.put('/auth/change-email', data)
      if (response.data.success) {
         if (user.value) user.value.email = data.newEmail
         return { success: true }
      }
      return { success: false, error: response.data.error }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed' }
    } finally { isLoading.value = false }
  }

  const changePassword = async (data: ChangePasswordData) => {
    isLoading.value = true
    try {
      const response = await api.put('/auth/change-password', data)
      if (response.data.success) {
        await logout()
        return { success: true }
      }
      return { success: false, error: response.data.error }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed' }
    } finally { isLoading.value = false }
  }

  const updateProfile = async (data: ProfileUpdateData) => {
    isLoading.value = true
    try {
      const response = await api.put('/auth/update-profile', data)
      if (response.data.success && response.data.data?.user) {
        user.value = { ...user.value, ...response.data.data.user }
        return { success: true }
      }
      return { success: false, error: response.data.error }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed' }
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
    api 
  }
})