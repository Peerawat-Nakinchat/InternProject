<template>
  <div class="flex min-h-screen font-sans">
    <main class="flex-1 p-6 overflow-hidden flex flex-col">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-gray-500">กำลังโหลดข้อมูลสมาชิก...</p>
        </div>
      </div>
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button @click="fetchMembers" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          ลองใหม่
        </button>
      </div>
      <DataTable
        v-else
        :row-data="rowData"
        :column-defs="colDefs"
        header-text="รายชื่อสมาชิก"
        search-placeholder="🔍 ค้นหาสมาชิก..."
        @grid-ready="onGridReady"
        @row-clicked="onRowClicked"
        @selection-changed="onSelectionChanged"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { memberService } from '@/services/memberService'
import { toast } from '@/utils/toast'
import DataTable, { type TableColumn } from '@/components/base/DataTable.vue'
import type { GridApi } from 'ag-grid-community'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const loading = ref(false)
const error = ref<string | null>(null)
const members = ref<any[]>([])

const selectedCompany = computed(() => companyStore.selectedCompany)
const currentOrgId = computed(() => selectedCompany.value?.org_id)

const gridApi = ref<GridApi | null>(null)
const selectedMember = ref<any | null>(null)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    toast.error('กรุณาเข้าสู่ระบบก่อนใช้งาน')
    router.push('/login')
    return
  }
  if (currentOrgId.value) {
    await fetchMembers()
  }
})

watch(currentOrgId, async (newVal) => {
  if (newVal) {
    await fetchMembers()
  } else {
    members.value = []
  }
})

const fetchMembers = async () => {
  if (!currentOrgId.value) return
  loading.value = true
  error.value = null
  try {
    const response = await memberService.getMembersByOrganization(currentOrgId.value)
    if (response.success && Array.isArray(response.data)) {
      members.value = response.data
    } else if (Array.isArray(response)) {
      members.value = response
    } else {
      members.value = []
    }
  } catch (err: any) {
    error.value = err.message || 'ไม่สามารถโหลดข้อมูลได้/คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
    members.value = []
  } finally {
    loading.value = false
  }
}

const showCheckbox = computed(() => {
  const roleId = selectedCompany.value?.role_id
  return roleId === 1 || roleId === 2
})

const colDefs: TableColumn[] = [
  {
    headerName: 'ชื่อ - นามสกุล',
    field: 'fullname',
    minWidth: 200,
    flex: 2,
    checkboxSelection: showCheckbox.value, // ✅ เงื่อนไข
    headerCheckboxSelection: showCheckbox.value,
    pinned: 'left',
  },
  { headerName: 'อีเมล', field: 'email', minWidth: 220, flex: 2 },
  { headerName: 'สถานะ / Role', field: 'role_name', minWidth: 120, flex: 1 },
  { headerName: 'วันที่เข้าร่วม', field: 'joined_date', minWidth: 180, flex: 1 },
]

// เตรียมข้อมูลให้ตรงกับ colDefs (mapping field จาก API จริง)
const rowData = computed(() =>
  members.value.map((m: any) => ({
    fullname: m.user?.full_name || `${m.user?.name || ''} ${m.user?.surname || ''}`.trim() || '-',
    email: m.user?.email || '-',
    role_name: m.role?.role_name || '-', // ถ้าไม่มี m.role ให้ fallback
    joined_date: m.joined_date ? dayjs(m.joined_date).locale('th').format('DD/MM/YYYY HH:mm') : '-',
  }))
)

// Event handler (ตาม pattern ModulePage.vue)
const onGridReady = (api: GridApi) => {
  gridApi.value = api
}
const onRowClicked = (data: Record<string, unknown>) => {
  selectedMember.value = data
}
const onSelectionChanged = (selectedRows: Record<string, unknown>[]) => {
  if (selectedRows.length > 0) {
    selectedMember.value = selectedRows[0]
  } else {
    selectedMember.value = null
  }
}

onMounted(() => {
  window.addEventListener('module-action', handleToolbarEvent as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('module-action', handleToolbarEvent as EventListener)
})

const handleToolbarEvent = (event: CustomEvent) => {
  switch (event.detail) {
    case 'add':
      // handle add
      break
    case 'edit':
      // handle edit
      break
    case 'delete':
      // handle delete
      break
    case 'menuRights':
      // handle menuRights
      break
  }
}
</script>