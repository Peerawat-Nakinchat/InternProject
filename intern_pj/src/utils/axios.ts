// src/utils/axios.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

// 🔥 ใช้ environment variable หรือกำหนดตรงๆ
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const axiosInstance = axios.create({
  baseURL: API_URL, // เปลี่ยนจาก '/api' เป็น full URL
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response Interceptor - จัดการ error
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, response.status)
    return response.data
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.config?.url)
    
    const message = error.response?.data?.error 
      || error.response?.data?.message 
      || error.message 
      || 'เกิดข้อผิดพลาด'
    
    return Promise.reject(new Error(message))
  }
)

export default axiosInstance