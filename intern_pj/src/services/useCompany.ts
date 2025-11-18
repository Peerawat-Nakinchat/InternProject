// src/services/companyService.ts
import type { CreateCompanyForm } from '@/types/company' // เดี๋ยวค่อยดูข้อ types ด้านล่าง

export async function createCompany(payload: CreateCompanyForm) {
  const res = await fetch('/api/company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error('ไม่สามารถสร้างบริษัทได้')
  }

  return res.json()
}
