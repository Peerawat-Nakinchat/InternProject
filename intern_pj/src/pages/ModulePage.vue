<template>
  <div class="flex min-h-screen font-sans">
    <main class="flex-1 p-6 overflow-hidden flex flex-col">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div
            class="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          ></div>
          <p class="text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="loadModules"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          ลองใหม่
        </button>
      </div>

      <!-- Data Table -->
      <DataTable
        v-else
        :row-data="rowData"
        :column-defs="colDefs"
        header-text="รายการ Module"
        search-placeholder="🔍 ค้นหา Module..."
        @grid-ready="onGridReady"
        @row-clicked="onRowClicked"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'
import type { GridApi } from 'ag-grid-community'

import DataTable, { type TableColumn } from '@/components/base/DataTable.vue'
import { moduleService, type Module } from '@/services/moduleService'

const railState = ref(true)
const toggleRail = () => {
  railState.value = !railState.value
}
provide('railState', railState)
provide('toggleRail', toggleRail)

// Interface สำหรับแสดงใน table
interface ModuleRow {
  module_id: string
  module_code: string
  module_name: string
  standard_version: string
  description: string
  is_active: string
  create_date: string
  update_date: string
}

const gridApi = ref<GridApi | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// กำหนด columns สำหรับหน้านี้
const colDefs: TableColumn[] = [
  {
    headerName: 'รหัส Module',
    field: 'module_code',
    pinned: 'left',
    width: 180,
    checkboxSelection: true,
    headerCheckboxSelection: true,
  },
  { headerName: 'ชื่อ Module', field: 'module_name', minWidth: 300, flex: 2 },
  { headerName: 'รายละเอียด', field: 'description', minWidth: 400, flex: 3 },
  { headerName: 'เวอร์ชัน', field: 'standard_version', minWidth: 50, flex: 1 },
  { headerName: 'วันที่สร้าง', field: 'create_date', minWidth: 50 ,flex: 1 },
]

// ----------------- Data -----------------
const rowData = ref<ModuleRow[]>([])

// Format date สำหรับแสดงผล
const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

// Format is_active สำหรับแสดงผล
const formatActive = (isActive: string): string => {
  return isActive === 't' ? 'ใช้งาน' : 'ปิดใช้งาน'
}

// ดึงข้อมูลจาก API
const loadModules = async () => {
  isLoading.value = true
  error.value = null

  try {
    const result = await moduleService.getAll({
      sortBy: 'module_point',
      sortOrder: 'ASC',
    })

    // Transform data สำหรับแสดงใน table
    rowData.value = result.modules.map((module: Module) => ({
      module_id: module.module_id,
      module_code: module.module_code,
      module_name: module.module_name,
      standard_version: module.standard_version || '-',
      description: module.description || '-',
      is_active: formatActive(module.is_active),
      create_date: formatDate(module.create_date),
      update_date: formatDate(module.update_date),
    }))
  } catch (err) {
    console.error('Error loading modules:', err)
    error.value = 'ไม่สามารถโหลดข้อมูล Module ได้ กรุณาลองใหม่อีกครั้ง'
  } finally {
    isLoading.value = false
  }
}

const onGridReady = (api: GridApi) => {
  gridApi.value = api
}

const onRowClicked = (data: Record<string, unknown>) => {
  const moduleData = data as unknown as ModuleRow
  console.log('Row clicked:', moduleData)
}

onMounted(() => {
  loadModules()
})
</script>
