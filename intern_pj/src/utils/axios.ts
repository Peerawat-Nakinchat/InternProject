// src/utils/axios.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

// 🔥 ใช้ environment variable หรือกำหนดตรงๆ
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Flag เพื่อป้องกันการเรียก refresh token ซ้ำซ้อน
let isRefreshing = false
// Queue สำหรับเก็บ request ที่รอ token ใหม่
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

// ฟังก์ชันประมวลผล queue หลัง refresh สำเร็จ
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
})

// Request Interceptor - เพิ่ม token อัตโนมัติ
axiosInstance.interceptors.request.use(
  (config) => {
    const auth = useAuthStore()
    const token = auth.accessToken

    if (token) {
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
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    console.error('❌ Response error:', error.response?.status, error.config?.url)

    // 🔄 Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      // ถ้าเป็น request ไปที่ /auth/refresh แล้ว fail = logout เลย
      if (originalRequest.url?.includes('/auth/refresh')) {
        const auth = useAuthStore()
        await auth.logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // ถ้ากำลัง refresh อยู่ ให้รอใน queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(axiosInstance(originalRequest))
            },
            reject: (err: Error) => {
              reject(err)
            },
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const auth = useAuthStore()

        console.log('🔄 Token expired, attempting refresh...')

        // เรียก refresh token API โดยตรง (ไม่ผ่าน interceptor นี้)
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: auth.refreshToken,
        })

        if (response.data.success) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data

          // อัปเดต tokens ใน store และ localStorage
          auth.accessToken = newAccessToken
          localStorage.setItem('accessToken', newAccessToken)

          // 🔄 Token Rotation: รับ refresh token ใหม่ด้วย
          if (newRefreshToken) {
            auth.refreshToken = newRefreshToken
            localStorage.setItem('refreshToken', newRefreshToken)
            console.log('🔐 New refresh token received and saved')
          }

          console.log('✅ Token refreshed successfully')

          // ประมวลผล queue ที่รออยู่
          processQueue(null, newAccessToken)

          // Retry original request ด้วย token ใหม่
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return axiosInstance(originalRequest)
        } else {
          throw new Error('Refresh failed')
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)

        // Check if it's a token reuse attack
        const errorData = (refreshError as any)?.response?.data
        if (errorData?.tokenReused) {
          console.error('🚨 Token reuse detected! Possible security breach.')
        }

        processQueue(refreshError as Error, null)

        // Logout user
        const auth = useAuthStore()
        await auth.logout()
        window.location.href = '/login?reason=session_expired'

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Handle other errors
    const message =
      (error.response?.data as any)?.error ||
      (error.response?.data as any)?.message ||
      error.message ||
      'เกิดข้อผิดพลาด'

    return Promise.reject(new Error(message))
  }
)

export default axiosInstance
