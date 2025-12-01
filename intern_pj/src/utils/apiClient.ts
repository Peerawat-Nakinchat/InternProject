// src/utils/apiClient.ts
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const auth = useAuthStore()
    const token = auth.accessToken

        // ✅ Debug: ตรวจสอบ Token ก่อนส่ง
    console.group('📡 API Request Debug')
    console.log('Endpoint:', endpoint)
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')
    console.groupEnd()

    // ตั้งค่า headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    // ✅ เพิ่ม Authorization token ถ้ามี (สำหรับ backward compatibility)
    // ในอนาคตสามารถลบออกได้เมื่อใช้ cookies เต็มรูปแบบแล้ว
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // ✅ สำคัญ: เพื่อส่ง cookies ข้าม origin
    }
        console.log('Request Headers:', headers)

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)

      console.log('Response Status:', response.status)

          // ถ้าไม่ OK ให้ throw error
          if (!response.ok) {
            // พยายามอ่าน error message จาก response
            const errorData = await response.json().catch(() => ({}))
            // อ่านค่า Retry-After header (seconds)
            const retryAfterHeader = response.headers.get('retry-after')
            const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined

            // ถ้า 401 = token หมดอายุ
            if (response.status === 401) {
              // ลอง refresh token
              const refreshed = await auth.refreshAccessToken()

              if (refreshed) {
                // ลองเรียก API อีกครั้งด้วย token ใหม่
                return this.request<T>(endpoint, options)
              } else {
                // Refresh ไม่ได้ = ต้อง logout
                await auth.logout()
                window.location.href = '/login'
              }
            }

            const error = new Error(
              errorData.message ||
              errorData.error ||
              `HTTP Error: ${response.status} ${response.statusText}`
            )
            // เพิ่มข้อมูล retryAfter ถ้ามี
            ;(error as any).retryAfter = retryAfter
            throw error
          }

      // ถ้าสำเร็จ return JSON
      return response.json()
    } catch (error: any) {
      console.error('API Request Error:', error)
      throw error
    }
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient(API_BASE_URL)
