// src/services/isoMenuService.ts
import { api } from '@/utils/apiClient'

export interface IsoMenu {
  menu_ref_id: string
  module_code: string
  h_menu_id: string
  menu_id: string
  parent_menu_id: string | null
  menu_label: string
  web_route_path: string | null
  web_icon_name: string | null
  is_active: boolean
  create_date: string
  update_date: string
}

export interface HierarchicalMenu extends IsoMenu {
  children: IsoMenu[]
}

export interface MenusByTypeResponse {
  success: boolean
  message: string
  data: {
    module_code: string
    menu_type: string
    menus: HierarchicalMenu[]
  }
}

export interface MenusResponse {
  success: boolean
  message: string
  data: IsoMenu[]
}

export const isoMenuService = {
  /**
   * Get all menus for a module
   */
  async getByModule(moduleCode: string): Promise<IsoMenu[]> {
    const response = await api.get<MenusResponse>(`/iso-menus/${moduleCode}`)
    return response.data
  },

  /**
   * Get hierarchical menus by module and type
   * @param moduleCode - e.g. "ISO27001"
   * @param menuType - M=Master, T=Transaction, R=Report
   */
  async getByType(moduleCode: string, menuType: 'M' | 'T' | 'R'): Promise<HierarchicalMenu[]> {
    const response = await api.get<MenusByTypeResponse>(`/iso-menus/${moduleCode}/${menuType}`)
    return response.data.menus
  },

  /**
   * Get menu by ID
   */
  async getById(menuRefId: string): Promise<IsoMenu> {
    const response = await api.get<{ success: boolean; data: IsoMenu }>(`/iso-menus/detail/${menuRefId}`)
    return response.data
  },

  /**
   * Create new menu
   */
  async create(menuData: Partial<IsoMenu>): Promise<IsoMenu> {
    const response = await api.post<{ success: boolean; data: IsoMenu }>('/iso-menus', menuData)
    return response.data
  },

  /**
   * Update menu
   */
  async update(menuRefId: string, updates: Partial<IsoMenu>): Promise<IsoMenu> {
    const response = await api.put<{ success: boolean; data: IsoMenu }>(`/iso-menus/${menuRefId}`, updates)
    return response.data
  },

  /**
   * Delete menu
   */
  async delete(menuRefId: string): Promise<void> {
    await api.delete(`/iso-menus/${menuRefId}`)
  },
}

export default isoMenuService
