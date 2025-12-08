// src/utils/axios.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast' // ✅ Import toast for global error handling

// 🔥 ใช้ environment variable หรือกำหนดตรงๆ
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// ✅ สำหรับจัดการ refresh token ที่กำลังทำงานอยู่
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

// ✅ ประมวลผล queue หลัง refresh สำเร็จ/ล้มเหลว
const processQueue = (error: Error | null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

const axiosInstance = axios.create({
  baseURL: API_URL, // เปลี่ยนจาก '/api' เป็น full URL
  headers: {
    'Content-Type': 'application/json',
  },
  // ✅ สำคัญ: ต้องเปิด withCredentials เพื่อส่ง cookies ข้าม origin
  withCredentials: true,
})

// Request Interceptor - เพิ่ม token อัตโนมัติ (fallback สำหรับ non-cookie requests)
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ ไม่จำเป็นต้องเพิ่ม token ใน header อีกต่อไป
    // เพราะ cookies จะถูกส่งไปอัตโนมัติ
    // แต่ยังคงไว้สำหรับ backward compatibility
    const auth = useAuthStore()
    const token = auth.accessToken

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }

    console.log('📤 Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('❌ Request error:', error)
    return Promise.reject(error)
  }
)

// Response Interceptor - จัดการ error และ auto refresh token
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, response.status)
    return response.data
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number }

    console.error('❌ Response error:', error.response?.status, error.config?.url)

    // ✅ ถ้าได้ 401 และยังไม่เคย retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // ❌ ไม่ต้อง refresh ถ้าเป็น request ไปที่ /auth/refresh หรือ /auth/login
      const url = originalRequest.url || ''
      if (url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/logout')) {
        return Promise.reject(error)
      }

      // ✅ ถ้ากำลัง refresh อยู่ ให้รอ promise เดียวกัน
      if (isRefreshing && refreshPromise) {
        try {
          const refreshed = await refreshPromise
          if (refreshed) {
            // ✅ รอให้ cookies ถูก set สมบูรณ์ก่อน retry
            await new Promise(resolve => setTimeout(resolve, 50))
            // ✅ อัปเดต header ด้วย token ใหม่ก่อน retry
            const auth = useAuthStore()
            const newToken = auth.accessToken
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            // retry request เดิมหลัง refresh สำเร็จ
            return axiosInstance(originalRequest)
          }
        } catch (err) {
          return Promise.reject(err)
        }
        return Promise.reject(new Error('Refresh token failed'))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const auth = useAuthStore()
        console.log('🔄 Token expired, trying to refresh...')

        // ✅ เก็บ promise เพื่อให้ request อื่นรอใช้ร่วมกัน
        refreshPromise = auth.refreshAccessToken()
        const refreshed = await refreshPromise

        if (refreshed) {
          console.log('✅ Token refreshed successfully, retrying request...')
          processQueue(null)

          // ✅ สำคัญ: รอให้ cookies ถูก set สมบูรณ์ก่อน retry
          // ช่วยให้ browser มีเวลา process cookies ก่อนส่ง request ใหม่
          await new Promise(resolve => setTimeout(resolve, 50))

          // ✅ อัปเดต header ด้วย token ใหม่ก่อน retry
          const newToken = auth.accessToken
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
          }

          // retry request เดิม
          return axiosInstance(originalRequest)
        } else {
          // refresh ไม่สำเร็จ - logout และ redirect
          console.log('❌ Refresh failed, user logged out')
          processQueue(new Error('Refresh token expired'))
          await auth.logout()
          const currentPath = window.location.pathname
          if (currentPath !== '/login') {
            window.location.href = '/login'
          }
          return Promise.reject(error)
        }
      } catch (refreshError) {
        console.error('❌ Refresh error:', refreshError)
        processQueue(refreshError as Error)
        const auth = useAuthStore()
        await auth.logout()
        const currentPath = window.location.pathname
        if (currentPath !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
        refreshPromise = null
      }
    }

    const responseData = error.response?.data as { 
      error?: string; 
      message?: string; 
      code?: string;
      email?: string;
    } | undefined

    const message = responseData?.error
      || responseData?.message
      || error.message
      || 'เกิดข้อผิดพลาด'

    // ✅ Global Toast Error - แสดง toast สำหรับ errors ที่ควรแจ้งผู้ใช้
    const status = error.response?.status
    const url = originalRequest?.url || ''
    
    // Skip toast for specific cases:
    // - 401 (handled by refresh logic above)
    // - Auth routes (login/logout/refresh)
    // - Silent requests (marked with _silent flag)
    // - EMAIL_NOT_VERIFIED (handled by login page)
    const isEmailNotVerified = responseData?.code === 'EMAIL_NOT_VERIFIED'
    
    const shouldShowToast = (
      status !== 401 &&
      !isEmailNotVerified &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/logout') &&
      !url.includes('/auth/refresh') &&
      !(originalRequest as InternalAxiosRequestConfig & { _silent?: boolean })?._silent
    )

    if (shouldShowToast) {
      // Show different errors based on status code
      if (status === 403) {
        toast.error('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
      } else if (status === 404) {
        toast.error('ไม่พบข้อมูลที่ร้องขอ')
      } else if (status === 422 || status === 400) {
        toast.warning(message)
      } else if (status === 500) {
        toast.error('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่ภายหลัง')
      } else if (status && status >= 500) {
        toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
      } else if (!navigator.onLine) {
        toast.error('ไม่มีการเชื่อมต่ออินเทอร์เน็ต')
      }
      // For other errors, components should handle themselves
    }

    // ✅ Create enhanced error with response data
    const enhancedError = new Error(message) as Error & { 
      response?: { data?: typeof responseData; status?: number }
      code?: string
      email?: string
    }
    enhancedError.response = { data: responseData, status }
    if (responseData?.code) enhancedError.code = responseData.code
    if (responseData?.email) enhancedError.email = responseData.email

    return Promise.reject(enhancedError)
  }
)

export default axiosInstance
