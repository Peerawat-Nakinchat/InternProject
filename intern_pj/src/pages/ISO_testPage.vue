<template>
  <div class="flex min-h-screen bg-gray-50 font-sans">
    <Sidebar :rail="railState" />

    <div class="flex flex-col flex-1 transition-all duration-300 ease-in-out">
      <Navbar class="h-16 bg-white shadow-sm z-10" />

      <ToolBar
        class="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between"
      >
        <h1 class="text-xl font-bold text-gray-800 tracking-tight">🌿 ระบบจัดการเอกสาร ISO</h1>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <span>+</span> สร้างเอกสารใหม่
          </button>
        </div>
      </ToolBar>

      <main class="flex-1 p-6 overflow-hidden flex flex-col">
        <div
          class="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden"
        >
          <div class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div class="text-sm text-gray-500">
              รายการเอกสารทั้งหมด
              <span class="font-semibold text-gray-900">{{ rowData.length }}</span> รายการ
            </div>
            <input
              type="text"
              placeholder="🔍 ค้นหาเอกสาร..."
              class="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
              @input="onQuickFilterChanged"
            />
          </div>

          <div class="flex-1 w-full h-full ag-theme-alpine text-sm font-sans">
            <ag-grid-vue
              class="w-full h-full"
              :rowData="rowData"
              :columnDefs="colDefs"
              :defaultColDef="defaultColDef"
              :pagination="true"
              :paginationPageSize="20"
              :animateRows="true"
              :rowSelection="'multiple'"
              @grid-ready="onGridReady"
            >
            </ag-grid-vue>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from 'ag-grid-community'

import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'
import ToolBar from '@/components/ToolBar.vue'

ModuleRegistry.registerModules([AllCommunityModule])

const railState = ref(true)
const toggleRail = () => {
  railState.value = !railState.value
}
provide('railState', railState)
provide('toggleRail', toggleRail)

interface DocumentRow {
  docNo: string
  title: string
  aspect: string
  impact: 'High' | 'Medium' | 'Low'
  department: string
  revision: number
  effectiveDate: string
  status: 'Active' | 'Under Review' | 'Obsolete' | 'Draft'
}

const gridApi = ref<GridApi | null>(null)

const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
  minWidth: 100,
}

const StatusRenderer = (params: any) => {
  const status = params.value as DocumentRow['status']
  let colorClass = 'bg-gray-100 text-gray-600'
  let label: string = status

  switch (status) {
    case 'Active':
      colorClass = 'bg-green-100 text-green-700 border border-green-200'
      label = 'ใช้งานปกติ'
      break
    case 'Under Review':
      colorClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200'
      label = 'กำลังทบทวน'
      break
    case 'Obsolete':
      colorClass = 'bg-red-100 text-red-700 border border-red-200'
      label = 'ยกเลิกแล้ว'
      break
    case 'Draft':
      colorClass = 'bg-blue-100 text-blue-700 border border-blue-200'
      label = 'ร่างเอกสาร'
      break
  }

  return `<span class="px-2 py-1 rounded-full text-xs font-semibold ${colorClass}">${label}</span>`
}

const ImpactRenderer = (params: any) => {
  const impact = params.value as DocumentRow['impact']
  let colorClass = 'text-gray-500'

  if (impact === 'High') colorClass = 'text-red-600 font-bold'
  else if (impact === 'Medium') colorClass = 'text-orange-500 font-medium'
  else if (impact === 'Low') colorClass = 'text-green-600'

  return `<span class="${colorClass}">${impact}</span>`
}

const colDefs = ref<ColDef[]>([
  {
    headerName: 'Document No.',
    field: 'docNo',
    pinned: 'left',
    width: 140,
    checkboxSelection: true,
    headerCheckboxSelection: true,
  },
  { headerName: 'Title', field: 'title', minWidth: 250, flex: 2 },
  { headerName: 'Env. Aspect', field: 'aspect', minWidth: 180 },
  {
    headerName: 'Impact Level',
    field: 'impact',
    width: 130,
    cellRenderer: ImpactRenderer,
  },
  { headerName: 'Department', field: 'department', width: 150 },
  { headerName: 'Rev.', field: 'revision', width: 80, type: 'numericColumn' },
  { headerName: 'Effective Date', field: 'effectiveDate', width: 140 },
  {
    headerName: 'Status',
    field: 'status',
    width: 140,
    cellRenderer: StatusRenderer,
  },
])

// ----------------- Data (3 ตัวอย่าง) -----------------
const rowData = ref<DocumentRow[]>([])

const sampleDocuments: DocumentRow[] = [
  {
    docNo: 'ISO-14-001',
    title: 'Environmental Policy',
    aspect: 'General',
    impact: 'High',
    department: 'Management',
    revision: 5,
    effectiveDate: '2024-01-01',
    status: 'Active',
  },
  {
    docNo: 'ISO-14-004',
    title: 'Energy Consumption Monitoring',
    aspect: 'Resource Depletion',
    impact: 'Medium',
    department: 'Engineering',
    revision: 4,
    effectiveDate: '2024-02-20',
    status: 'Active',
  },
  {
    docNo: 'ISO-14-007',
    title: 'Noise Control Procedure',
    aspect: 'Noise Pollution',
    impact: 'Low',
    department: 'Production',
    revision: 2,
    effectiveDate: '2023-08-15',
    status: 'Obsolete',
  },
]

// ดึงข้อมูลจาก API ตรงนี้นะจ๊ะ
const loadDocuments = async () => {
  rowData.value = sampleDocuments
}

const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api
}

const onQuickFilterChanged = (event: any) => {
  gridApi.value?.setGridOption('quickFilterText', event.target.value)
}

onMounted(() => {
  loadDocuments()
})
</script>
