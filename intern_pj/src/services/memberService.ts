import { api } from '@/utils/apiClient'

export interface MemberRegisterPayload {
  membership_id: string
  org_id: string
  user_id: string
  role_id: string
  email: string
  password_hash: string
  name: string
  surname: string
  fullname: string
  sex: 'M' | 'F' | 'O'
  user_address_1: string
  user_address_2: string
  user_address_3: string
  join_date: string
}

export interface MemberRegisterResponse {
  success: boolean
  message: string
  data?: {
    membership_id: string
    user_id: string
    email: string
  }
}

export const memberService = {
  async register(payload: MemberRegisterPayload): Promise<MemberRegisterResponse> {
  try {
    const response = await api.post<MemberRegisterResponse>('/api/members/register', payload)
    return response
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      (error as any).response?.data?.message
    ) {
      throw new Error((error as any).response.data.message)
    }
    throw new Error('เกิดข้อผิดพลาดในการสมัครสมาชิก')
  }
},

  async checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await api.get<{ exists: boolean }>(
      `/api/members/check-email?email=${encodeURIComponent(email)}`,
    )
    return response.exists
  } catch {
    return false
  }
}
,
  async getMember(memberId: string) {
    try {
      const response = await api.get(`/api/members/${memberId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'ไม่สามารถดึงข้อมูลสมาชิกได้')
    }
  },
  async updateMember(memberId: string, payload: Partial<MemberRegisterPayload>) {
    try {
      const response = await api.put(`/api/members/${memberId}`, payload)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'ไม่สามารถอัพเดทข้อมูลสมาชิกได้')
    }
  },
  async deleteMember(memberId: string) {
    try {
      const response = await api.delete(`/api/members/${memberId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'ไม่สามารถลบสมาชิกได้')
    }
  }
}
