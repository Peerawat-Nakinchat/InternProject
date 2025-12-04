// src/utils/axios.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

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

          // retry request เดิม
          return axiosInstance(originalRequest)
        } else {
          // refresh ไม่สำเร็จ - logout แล้ว
          console.log('❌ Refresh failed, user logged out')
          processQueue(new Error('Refresh token expired'))
          // ✅ ใช้ router.push แทน window.location เพื่อไม่ให้หน้า reload
          const currentPath = window.location.pathname
          if (currentPath !== '/login') {
            window.location.href = '/login'
          }
          return Promise.reject(error)
        }
      } catch (refreshError) {
        console.error('❌ Refresh error:', refreshError)
        processQueue(refreshError as Error)
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

    const message = (error.response?.data as { error?: string; message?: string })?.error
      || (error.response?.data as { error?: string; message?: string })?.message
      || error.message
      || 'เกิดข้อผิดพลาด'

    return Promise.reject(new Error(message))
  }
)

export default axiosInstance
