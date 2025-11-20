// src/services/useCompany.ts
import { api } from '@/utils/apiClient'
import type { CreateCompanyForm } from '@/types/company'

export async function createCompany(payload: CreateCompanyForm) {
  return api.post('/company', payload)
}

export async function getCompanies() {
  return api.get('/company')
}

export async function getCompanyById(orgId: string) {
  return api.get(`/company/${orgId}`)
}

export async function updateCompany(orgId: string, data: Partial<CreateCompanyForm>) {
  return api.put(`/company/${orgId}`, data)
}

export async function deleteCompany(orgId: string) {
  return api.delete(`/company/${orgId}`)
}