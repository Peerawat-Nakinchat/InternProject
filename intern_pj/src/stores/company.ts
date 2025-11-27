// src/stores/company.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} from '@/services/useCompany'

export const useCompanyStore = defineStore('company', () => {
  const companies = ref<any[]>([])
  const selectedCompany = ref<any | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ---------------------------
  // Fetch all companies for user
  // ---------------------------
  const fetchCompanies = async () => {
    try {
      loading.value = true
      error.value = null

      const res = await getCompanies()

      companies.value = res.data.map((c: any) => ({
        ...c,
        member_count: c.member_count ?? 0  
      }))

      // set default company
      if (!selectedCompany.value && companies.value.length > 0) {
        selectedCompany.value = companies.value[0]
      }
    } catch (err: any) {
      error.value = err?.message || 'Failed to load companies'
    } finally {
      loading.value = false
    }
  }


  // ---------------------------
  // Fetch single company by ID
  // ---------------------------
  const fetchCompanyById = async (id: string) => {
    try {
      loading.value = true
      const res = await getCompanyById(id)
      selectedCompany.value = res.data
    } catch (err) {
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  // ---------------------------
  // Set selected company (UI use)
  // ---------------------------
  const setSelectedCompany = (company: any) => {
    selectedCompany.value = company
  }



  // ---------------------------
  // Create new company
  // ---------------------------
  const createNewCompany = async (payload: any) => {
    const res = await createCompany(payload)
    await fetchCompanies()
    return res
  }

  // ---------------------------
  // Update
  // ---------------------------
  const updateCompanyById = async (id: string, data: any) => {
    const res = await updateCompany(id, data)
    await fetchCompanies()
    return res
  }

  // ---------------------------
  // Delete
  // ---------------------------
  const deleteCompanyById = async (id: string) => {
    const res = await deleteCompany(id)
    await fetchCompanies()
    return res
  }

  // ---------------------------
  // Reset State
  // ---------------------------
  const reset = () => {
    companies.value = []
    selectedCompany.value = null
    loading.value = false
    error.value = null
  }

  return {
    companies,
    selectedCompany,
    loading,
    error,
    fetchCompanies,
    fetchCompanyById,
    setSelectedCompany,
    createNewCompany,
    updateCompanyById,
    deleteCompanyById,
    reset
  }
})
