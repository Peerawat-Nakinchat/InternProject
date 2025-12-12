<template>
  <div
    class="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden"
  >
    <!-- Header Section -->
    <div class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
      <div class="text-sm text-gray-500">
        <slot name="header-left">
          {{ headerText }}
          <span class="font-semibold text-gray-900">{{ rowData.length }}</span> รายการ
        </slot>
      </div>
      <div class="flex items-center gap-3">
        <input
          v-if="showSearch"
          type="text"
          :placeholder="searchPlaceholder"
          class="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
          @input="onQuickFilterChanged"
        />
        <slot name="header-right"></slot>
      </div>
    </div>

    <!-- AG Grid Table -->
    <div class="flex-1 w-full h-full ag-theme-alpine text-sm font-sans">
      <ag-grid-vue
        class="w-full h-full"
        :rowData="rowData"
        :columnDefs="processedColumnDefs"
        :defaultColDef="mergedDefaultColDef"
        :pagination="pagination"
        :paginationPageSize="paginationPageSize"
        :rowSelection="rowSelection"
        @grid-ready="onGridReady"
        @row-clicked="onRowClicked"
        @selection-changed="onSelectionChanged"
      >
      </ag-grid-vue>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

// ============ Type Definitions ============
export interface TableColumn {
  headerName: string
  field: string
  width?: number
  minWidth?: number
  maxWidth?: number
  flex?: number
  pinned?: 'left' | 'right' | boolean
  sortable?: boolean
  filter?: boolean
  resizable?: boolean
  checkboxSelection?: boolean
  headerCheckboxSelection?: boolean
  type?: string
  cellRenderer?: (params: { value: unknown; data: Record<string, unknown> }) => string
  cellClass?: string | string[] | ((params: { value: unknown }) => string | string[])
  valueFormatter?: (params: { value: unknown }) => string
  hide?: boolean
}

// ============ Built-in Cell Renderers ============
// Status renderer - สำหรับแสดงสถานะต่างๆ
const statusColorMap: Record<string, { class: string; label?: string }> = {
  // English statuses
  Active: { class: 'bg-green-100 text-green-700 border border-green-200', label: 'ใช้งานปกติ' },
  'Under Review': {
    class: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    label: 'กำลังทบทวน',
  },
  Obsolete: { class: 'bg-red-100 text-red-700 border border-red-200', label: 'ยกเลิกแล้ว' },
  Draft: { class: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'ร่างเอกสาร' },
  Pending: {
    class: 'bg-orange-100 text-orange-700 border border-orange-200',
    label: 'รอดำเนินการ',
  },
  Approved: { class: 'bg-green-100 text-green-700 border border-green-200', label: 'อนุมัติแล้ว' },
  Rejected: { class: 'bg-red-100 text-red-700 border border-red-200', label: 'ปฏิเสธ' },
  // Thai statuses
  ใช้งานปกติ: { class: 'bg-green-100 text-green-700 border border-green-200' },
  กำลังทบทวน: { class: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  ยกเลิกแล้ว: { class: 'bg-red-100 text-red-700 border border-red-200' },
  ร่างเอกสาร: { class: 'bg-blue-100 text-blue-700 border border-blue-200' },
}

const createStatusRenderer = (params: { value: unknown }) => {
  const status = params.value as string
  const config = statusColorMap[status] || { class: 'bg-gray-100 text-gray-600', label: status }
  const label = config.label || status
  return `<span class="px-2 py-1 rounded-full text-xs font-semibold ${config.class}">${label}</span>`
}

// Impact level renderer - สำหรับแสดงระดับผลกระทบ
const createImpactRenderer = (params: { value: unknown }) => {
  const impact = params.value as string
  let colorClass = 'text-gray-500'

  if (impact === 'High' || impact === 'สูง') colorClass = 'text-red-600 font-bold'
  else if (impact === 'Medium' || impact === 'ปานกลาง') colorClass = 'text-orange-500 font-medium'
  else if (impact === 'Low' || impact === 'ต่ำ') colorClass = 'text-green-600'

  return `<span class="${colorClass}">${impact}</span>`
}

// Priority renderer - สำหรับแสดงความสำคัญ
const createPriorityRenderer = (params: { value: unknown }) => {
  const priority = params.value as string
  let bgClass = 'bg-gray-100 text-gray-700'

  if (priority === 'Critical' || priority === 'วิกฤต') {
    bgClass = 'bg-red-500 text-white'
  } else if (priority === 'High' || priority === 'สูง') {
    bgClass = 'bg-orange-100 text-orange-700 border border-orange-200'
  } else if (priority === 'Medium' || priority === 'ปานกลาง') {
    bgClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  } else if (priority === 'Low' || priority === 'ต่ำ') {
    bgClass = 'bg-green-100 text-green-700 border border-green-200'
  }

  return `<span class="px-2 py-1 rounded-full text-xs font-semibold ${bgClass}">${priority}</span>`
}

// ============ Props ============
interface Props {
  // Data
  rowData: Record<string, unknown>[]
  columnDefs: TableColumn[]

  // Header
  headerText?: string
  showSearch?: boolean
  searchPlaceholder?: string

  // Grid options
  pagination?: boolean
  paginationPageSize?: number
  animateRows?: boolean
  rowSelection?: 'single' | 'multiple'

  // Default column settings
  defaultColDef?: Partial<ColDef>

  // Built-in renderers - specify which columns should use built-in renderers
  statusFields?: string[]
  impactFields?: string[]
  priorityFields?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  headerText: 'รายการทั้งหมด',
  showSearch: true,
  searchPlaceholder: '🔍 ค้นหา...',
  pagination: true,
  paginationPageSize: 20,
  animateRows: true,
  rowSelection: 'multiple',
  defaultColDef: () => ({}),
  statusFields: () => ['status'],
  impactFields: () => ['impact'],
  priorityFields: () => ['priority'],
})

// ============ Emits ============
const emit = defineEmits<{
  (e: 'gridReady', api: GridApi): void
  (e: 'rowClicked', data: Record<string, unknown>): void
  (e: 'selectionChanged', selectedRows: Record<string, unknown>[]): void
}>()

// ============ Refs ============
const gridApi = ref<GridApi | null>(null)

// ============ Computed ============
const mergedDefaultColDef = computed<ColDef>(() => ({
  sortable: true,
  filter: false,
  resizable: true,
  flex: 1,
  minWidth: 100,
  suppressMenu: true,
  suppressHeaderMenuButton: true,
  ...props.defaultColDef,
}))

// Process column definitions and apply built-in renderers
const processedColumnDefs = computed<ColDef[]>(() => {
  return props.columnDefs.map((col) => {
    const processedCol: ColDef = { ...col }

    // Apply built-in status renderer
    if (props.statusFields.includes(col.field) && !col.cellRenderer) {
      processedCol.cellRenderer = createStatusRenderer
    }

    // Apply built-in impact renderer
    if (props.impactFields.includes(col.field) && !col.cellRenderer) {
      processedCol.cellRenderer = createImpactRenderer
    }

    // Apply built-in priority renderer
    if (props.priorityFields.includes(col.field) && !col.cellRenderer) {
      processedCol.cellRenderer = createPriorityRenderer
    }

    return processedCol
  })
})

// ============ Methods ============
const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api
  emit('gridReady', params.api)
}

const onQuickFilterChanged = (event: Event) => {
  const target = event.target as HTMLInputElement
  gridApi.value?.setGridOption('quickFilterText', target.value)
}

const onRowClicked = (event: { data: Record<string, unknown> }) => {
  emit('rowClicked', event.data)
}

const onSelectionChanged = () => {
  const selectedRows = gridApi.value?.getSelectedRows() || []
  emit('selectionChanged', selectedRows)
}

// ============ Expose Methods ============
defineExpose({
  getGridApi: () => gridApi.value,
  setQuickFilter: (text: string) => gridApi.value?.setGridOption('quickFilterText', text),
  getSelectedRows: () => gridApi.value?.getSelectedRows() || [],
  deselectAll: () => gridApi.value?.deselectAll(),
  refreshCells: () => gridApi.value?.refreshCells(),
})
</script>

<style scoped>
/* Additional styles for enhanced appearance */
:deep(.ag-theme-alpine) {
  --ag-header-background-color: #f9fafb;
  --ag-header-foreground-color: #374151;
  --ag-row-hover-color: #f0fdf4;
  --ag-selected-row-background-color: #dcfce7;
  --ag-border-color: #e5e7eb;
  --ag-font-family: inherit;
  --ag-header-column-separator-display: block;
  --ag-header-column-separator-color: #e5e7eb;
  --ag-header-column-separator-width: 1px;
  --ag-header-column-separator-height: 60%;
  --ag-pinned-column-border-color: transparent;
}

:deep(.ag-header-cell-text) {
  font-weight: 600;
  font-size: 0.875rem;
}

/* Header cell layout - push sort icon to the right */
:deep(.ag-header-cell-label) {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

:deep(.ag-header-cell-text) {
  flex: 1;
}

/* Hide all default sort icons */
:deep(.ag-sort-indicator-container) {
  display: none !important;
}

/* Create custom double chevron sort indicator */
:deep(.ag-header-cell[aria-sort]) .ag-header-cell-label::after {
  content: '';
  width: 14px;
  height: 18px;
  margin-left: auto;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 18' fill='none'%3E%3Cpath d='M7 1L12 6H2L7 1Z' fill='%239ca3af'/%3E%3Cpath d='M7 17L2 12H12L7 17Z' fill='%239ca3af'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.6;
}

/* Ascending - highlight top arrow */
:deep(.ag-header-cell[aria-sort='ascending']) .ag-header-cell-label::after {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 18' fill='none'%3E%3Cpath d='M7 1L12 6H2L7 1Z' fill='%2310b981'/%3E%3Cpath d='M7 17L2 12H12L7 17Z' fill='%23d1d5db'/%3E%3C/svg%3E");
  opacity: 1;
  transform: scale(1.1);
}

/* Descending - highlight bottom arrow */
:deep(.ag-header-cell[aria-sort='descending']) .ag-header-cell-label::after {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 18' fill='none'%3E%3Cpath d='M7 1L12 6H2L7 1Z' fill='%23d1d5db'/%3E%3Cpath d='M7 17L2 12H12L7 17Z' fill='%2310b981'/%3E%3C/svg%3E");
  opacity: 1;
  transform: scale(1.1);
}

/* Hover effect */
:deep(.ag-header-cell:hover) .ag-header-cell-label::after {
  opacity: 0.9;
  transform: scale(1.05);
}

:deep(.ag-header-cell[aria-sort='ascending']:hover) .ag-header-cell-label::after,
:deep(.ag-header-cell[aria-sort='descending']:hover) .ag-header-cell-label::after {
  transform: scale(1.15);
}

:deep(.ag-cell) {
  display: flex;
  align-items: center;
  border-right: 1px solid #e5e7eb;
}

:deep(.ag-cell:last-child) {
  border-right: none;
}

/* Hide pinned column separator */
:deep(.ag-pinned-left-header),
:deep(.ag-pinned-left-cols-container) {
  border-right: none !important;
}

/* Hide the filter menu icon (3 lines) */
:deep(.ag-header-cell-menu-button) {
  display: none !important;
}

:deep(.ag-paging-panel) {
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}
</style>
