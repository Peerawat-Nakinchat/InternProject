import { ref, reactive } from 'vue'
import { memberService, type MemberRegisterPayload } from '@/services/memberService'
import { useRouter } from 'vue-router'
import type { Router } from 'vue-router'

export interface MemberRegisterForm {
  membership_id: string
  org_id: string
  user_id: string
  role_id: string
  email: string
  password_hash: string
  password_confirm: string
  name: string
  surname: string
  full_name: string
  sex: 'M' | 'F' | 'O' | ''
  user_address_1: string
  user_address_2: string
  user_address_3: string
  join_date: string
  inviteToken?: string
}

export function useMemberRegister(routerInstance?: Router) {
  const router = routerInstance || useRouter()
  const isSubmitting = ref(false)
  const generalError = ref<string | null>(null)

  const getCurrentDate = () => {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }

  const form = reactive<MemberRegisterForm>({
    membership_id: '',
    org_id: '',
    user_id: '',
    role_id: '',
    email: '',
    password_hash: '',
    password_confirm: '',
    name: '',
    surname: '',
    full_name: '',
    sex: '',
    user_address_1: '',
    user_address_2: '',
    user_address_3: '',
    join_date: getCurrentDate(),
    inviteToken: '',
  })

  const resetForm = () => {
    Object.assign(form, {
      membership_id: '',
      org_id: '',
      user_id: '',
      role_id: '',
      email: '',
      password_hash: '',
      password_confirm: '',
      name: '',
      surname: '',
      full_name: '',
      sex: '',
      user_address_1: '',
      user_address_2: '',
      user_address_3: '',
      join_date: getCurrentDate(),
      inviteToken: '',
    })
    generalError.value = null
  }

  const submitRegistration = async (): Promise<boolean> => {
    isSubmitting.value = true
    generalError.value = null

    try {
      form.full_name = `${form.name} ${form.surname}`

      const payload: MemberRegisterPayload = {
        membership_id: form.membership_id,
        org_id: form.org_id,
        user_id: form.user_id,
        role_id: form.role_id,
        email: form.email,
        password_hash: form.password_hash,
        name: form.name,
        surname: form.surname,
        fullname: form.full_name,
        sex: form.sex as 'M' | 'F' | 'O',
        user_address_1: form.user_address_1,
        user_address_2: form.user_address_2,
        user_address_3: form.user_address_3,
        join_date: form.join_date,
      }

      const response = await memberService.register(payload)

      if (response.success) {
        resetForm()
        // Navigate to success page or login
        router.push('/login')
        return true
      } else {
        generalError.value = response.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
        return false
      }
    } catch (error: unknown) {
      generalError.value = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    form,
    isSubmitting,
    generalError,
    submitRegistration,
    resetForm,
  }
}
