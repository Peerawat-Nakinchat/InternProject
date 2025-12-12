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
        @selection-changed="onSelectionChanged"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { GridApi } from 'ag-grid-community'

import DataTable, { type TableColumn } from '@/components/base/DataTable.vue'
import { moduleService, type Module } from '@/services/moduleService'
import { toast } from '@/utils/toast' // ✅ ใช้ Toast Utility เหมือนหน้าอื่นๆ

const router = useRouter()

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
const selectedModule = ref<ModuleRow | null>(null)

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
  { headerName: 'วันที่สร้าง', field: 'create_date', minWidth: 50, flex: 1 },
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

// Format is_active สำหรับแสดงผล (รองรับทั้ง boolean และ string)
const formatActive = (isActive: string | boolean): string => {
  // Handle boolean true/false
  if (isActive === true || isActive === 't' || String(isActive) === 'true') {
    return 'ใช้งาน'
  }
  return 'ปิดใช้งาน'
}

// เก็บข้อมูลทั้งหมดไว้สำหรับ filter
const allModules = ref<ModuleRow[]>([])
const currentFilter = ref<string>('all')

// Apply filter
const applyFilter = () => {
  if (currentFilter.value === 'all') {
    rowData.value = [...allModules.value]
  } else if (currentFilter.value === 'active') {
    rowData.value = allModules.value.filter((m) => m.is_active === 'ใช้งาน')
  } else if (currentFilter.value === 'inactive') {
    rowData.value = allModules.value.filter((m) => m.is_active === 'ปิดใช้งาน')
  }
}

// Handle filter change from ToolBar
const handleFilterChange = (filter: string) => {
  currentFilter.value = filter
  applyFilter()
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
    allModules.value = result.modules.map((module: Module) => ({
      module_id: module.module_id,
      module_code: module.module_code,
      module_name: module.module_name,
      standard_version: module.standard_version || '-',
      description: module.description || '-',
      is_active: formatActive(module.is_active),
      create_date: formatDate(module.create_date),
      update_date: formatDate(module.update_date),
    }))

    // Apply current filter
    applyFilter()
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
  selectedModule.value = moduleData
  console.log('Row clicked:', moduleData)
}

const onSelectionChanged = (selectedRows: Record<string, unknown>[]) => {
  if (selectedRows.length > 0) {
    selectedModule.value = selectedRows[0] as unknown as ModuleRow
  } else {
    selectedModule.value = null
  }
}

// Toolbar action handlers
const handleAddModule = () => {
  router.push({ name: 'ModuleManagement', query: { mode: 'add' } })
}

const handleEditModule = () => {
  if (!selectedModule.value) {
    toast.warning('กรุณาเลือก Module ที่ต้องการแก้ไข')
    return
  }
  router.push({
    name: 'ModuleManagement',
    query: { mode: 'edit', id: selectedModule.value.module_id },
  })
}

const handleViewModule = () => {
  if (!selectedModule.value) {
    toast.warning('กรุณาเลือก Module ที่ต้องการดูรายละเอียด')
    return
  }
  router.push({
    name: 'ModuleManagement',
    query: { mode: 'view', id: selectedModule.value.module_id },
  })
}

const handleDeleteModule = async () => {
  if (!selectedModule.value) {
    toast.warning('กรุณาเลือก Module ที่ต้องการลบ')
    return
  }

  // ใช้ confirmDelete จาก toast utility
  const confirmed = await toast.confirmDelete(selectedModule.value.module_code)

  if (confirmed) {
    try {
      await moduleService.delete(selectedModule.value.module_id)
      await loadModules()
      selectedModule.value = null
      toast.success('ลบ Module สำเร็จ')
    } catch (err) {
      console.error('Error deleting module:', err)
      toast.error('ไม่สามารถลบ Module ได้')
    }
  }
}

// Provide handlers for ToolBar
provide('addModule', handleAddModule)
provide('editModule', handleEditModule)
provide('viewModule', handleViewModule)
provide('deleteModule', handleDeleteModule)

// Listen for toolbar events via custom events
const handleToolbarEvent = (event: CustomEvent) => {
  switch (event.detail) {
    case 'add':
      handleAddModule()
      break
    case 'edit':
      handleEditModule()
      break
    case 'view':
      handleViewModule()
      break
    case 'delete':
      handleDeleteModule()
      break
  }
}

onMounted(() => {
  loadModules()
  window.addEventListener('module-action', handleToolbarEvent as EventListener)
  window.addEventListener('filter-change', ((event: CustomEvent) => {
    handleFilterChange(event.detail)
  }) as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('module-action', handleToolbarEvent as EventListener)
})
</script>
