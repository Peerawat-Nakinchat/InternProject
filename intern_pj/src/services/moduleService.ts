// src/services/moduleService.ts
import { api } from '@/utils/apiClient'

export interface Module {
  module_id: string
  module_code: string
  module_name: string
  standard_version: string | null
  description: string | null
  module_point: string | null
  is_active: string
  create_date: string
  update_date: string
}

export interface ModuleListResponse {
  success: boolean
  message: string
  data: {
    modules: Module[]
    total: number
    page: number
    totalPages: number
  }
}

export interface ModuleResponse {
  success: boolean
  message: string
  data: Module
}

export const moduleService = {
  /**
   * Get all modules
   */
  async getAll(options?: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
    isActive?: boolean
  }): Promise<ModuleListResponse['data']> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', String(options.page))
    if (options?.limit) params.append('limit', String(options.limit))
    if (options?.sortBy) params.append('sortBy', options.sortBy)
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder)
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive))

    const queryString = params.toString()
    const url = queryString ? `/modules?${queryString}` : '/modules'

    const response = await api.get<ModuleListResponse>(url)
    return response.data
  },

  /**
   * Get active modules only
   */
  async getActive(): Promise<Module[]> {
    const response = await api.get<{ success: boolean; data: Module[] }>('/modules/active')
    return response.data
  },

  /**
   * Get module by ID
   */
  async getById(moduleId: string): Promise<Module> {
    const response = await api.get<ModuleResponse>(`/modules/${moduleId}`)
    return response.data
  },

  /**
   * Get module by code
   */
  async getByCode(moduleCode: string): Promise<Module> {
    const response = await api.get<ModuleResponse>(`/modules/code/${moduleCode}`)
    return response.data
  },

  /**
   * Create new module
   */
  async create(moduleData: Partial<Module>): Promise<Module> {
    const response = await api.post<ModuleResponse>('/modules', moduleData)
    return response.data
  },

  /**
   * Update module
   */
  async update(moduleId: string, updates: Partial<Module>): Promise<Module> {
    const response = await api.put<ModuleResponse>(`/modules/${moduleId}`, updates)
    return response.data
  },

  /**
   * Delete module
   */
  async delete(moduleId: string): Promise<void> {
    await api.delete(`/modules/${moduleId}`)
  },

  /**
   * Search modules
   */
  async search(
    searchTerm: string,
    options?: { page?: number; limit?: number },
  ): Promise<ModuleListResponse['data']> {
    const params = new URLSearchParams()
    params.append('q', searchTerm)
    if (options?.page) params.append('page', String(options.page))
    if (options?.limit) params.append('limit', String(options.limit))

    const response = await api.get<ModuleListResponse>(`/modules/search?${params.toString()}`)
    return response.data
  },
}

export default moduleService
