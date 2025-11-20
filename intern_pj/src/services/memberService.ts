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
  sex: 'M' | 'F' | 'O' | ''
  user_address_1: string
  user_address_2: string
  user_address_3: string
  join_date: string
}

export async function registerMember(payload: MemberRegisterPayload) {
  const res = await fetch('/api/members/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    // ถ้า backend ส่งข้อความ error มา อาจจะอ่านจาก res.json() เพิ่มได้
    throw new Error('ไม่สามารถสมัครสมาชิกได้')
  }

  return res.json()
}
