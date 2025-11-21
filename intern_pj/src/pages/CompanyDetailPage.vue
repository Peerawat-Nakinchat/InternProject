<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- Sidebar -->
    <Sidebar :rail="railState" />

    <!-- Right Column -->
    <div class="flex flex-col flex-1">
      <!-- Navbar -->
      <Navbar class="h-12" />

      <!-- Toolbar -->
      <ToolBar class="h-12">
        <CompanySelector />
      </ToolBar>

      <!-- Main Content -->
      <main class="flex-1 p-6 overflow-auto">
        <!-- Loading State -->
        <div v-if="loading" class="bg-white shadow rounded-lg p-6">
          <AdvancedSkeleton :rows="skeletonRows" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-white shadow rounded-lg p-6">
          <div class="text-center py-12">
            <p class="text-red-500 text-lg mb-4">❌ {{ error }}</p>
            <BaseButton @click="router.push('/')">กลับไปหน้าหลัก</BaseButton>
          </div>
        </div>

        <!-- Company Detail -->
        <div v-else-if="company" class="space-y-6">
          <!-- Header -->
          <div class="bg-white shadow rounded-lg p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">
                  {{ company.org_name }}
                </h1>
                <p class="text-gray-500">
                  รหัสบริษัท: <span class="font-medium text-gray-700">{{ company.org_code }}</span>
                </p>
              </div>
              <div class="flex gap-2">
                <BaseButton variant="ghost" @click="router.push('/')">← กลับ</BaseButton>
                <BaseButton @click="handleEdit">✏️ แก้ไข</BaseButton>
              </div>
            </div>

            <!-- สถานะการเชื่อมต่อ -->
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'px-3 py-1.5 text-sm rounded-full font-medium',
                  company.org_integrate === 'Y'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                ]"
              >
                {{ company.org_integrate === 'Y' ? '🔗 เชื่อมต่อระบบภายนอก' : '📴 ไม่เชื่อมต่อ' }}
              </span>
            </div>
          </div>

          <!-- ข้อมูลทั่วไป -->
          <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">ข้อมูลทั่วไป</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">ชื่อบริษัท</label>
                <p class="text-gray-900">{{ company.org_name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">รหัสบริษัท</label>
                <p class="text-gray-900">{{ company.org_code }}</p>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-600 mb-1">เจ้าของบริษัท</label>
                <p :class="company.owner_user_id ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.owner_user_id || 'ไม่ระบุ' }}
                </p>
              </div>
            </div>
          </div>

          <!-- ที่อยู่บริษัท -->
          <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">ที่อยู่บริษัท</h2>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">ที่อยู่ 1</label>
                <p :class="company.org_address_1 ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.org_address_1 || 'ไม่ระบุ' }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">ที่อยู่ 2</label>
                <p :class="company.org_address_2 ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.org_address_2 || 'ไม่ระบุ' }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">ที่อยู่ 3</label>
                <p :class="company.org_address_3 ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.org_address_3 || 'ไม่ระบุ' }}
                </p>
              </div>
            </div>
          </div>

          <!-- ข้อมูลการเชื่อมต่อ -->
          <div v-if="company.org_integrate === 'Y'" class="bg-white shadow rounded-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">ข้อมูลการเชื่อมต่อระบบ</h2>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Integration URL</label>
                <p :class="company.org_integrate_url ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.org_integrate_url || 'ไม่ระบุ' }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Provider ID</label>
                <p :class="company.org_integrate_provider_id ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.org_integrate_provider_id || 'ไม่ระบุ' }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Passcode</label>
                <p :class="company.org_integrate_passcode ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.org_integrate_passcode ? '••••••••' : 'ไม่ระบุ' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">ข้อมูลระบบ</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">วันที่สร้าง</label>
                <p :class="company.created_date ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ formatDate(company.created_date) }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">ผู้สร้าง</label>
                <p :class="company.created_by ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.created_by || 'ไม่ระบุ' }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">แก้ไขล่าสุด</label>
                <p :class="company.updated_date ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ formatDate(company.updated_date) }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">ผู้แก้ไข</label>
                <p :class="company.updated_by ? 'text-gray-900' : 'text-gray-400 italic'">
                  {{ company.updated_by || 'ไม่ระบุ' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import Navbar from '@/components/Navbar.vue'
import ToolBar from '@/components/ToolBar.vue'
import CompanySelector from '@/components/CompanySelector.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import AdvancedSkeleton from '@/components/loading/AdvancedSkeleton.vue'
import { getCompanyById } from '@/services/useCompany'

interface Company {
  org_id: string
  org_name: string
  org_code: string
  owner_user_id?: string
  org_address_1?: string
  org_address_2?: string
  org_address_3?: string
  org_integrate: string
  org_integrate_url?: string
  org_integrate_provider_id?: string
  org_integrate_passcode?: string
  created_date?: string
  created_by?: string
  updated_date?: string
  updated_by?: string
}

const router = useRouter()
const route = useRoute()

const company = ref<Company | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Sidebar rail state
const railState = ref(true)
const toggleRail = () => {
  railState.value = !railState.value
}

// Skeleton configuration
const skeletonRows = [
  { width: '60%', height: '2.5rem', class: 'bg-gray-300 rounded mb-4' },
  { width: '40%', height: '1.5rem', class: 'bg-gray-200 rounded mb-6' },
  { width: '100%', height: '1rem', class: 'bg-gray-200 rounded mb-2' },
  { width: '100%', height: '1rem', class: 'bg-gray-200 rounded mb-2' },
  { width: '80%', height: '1rem', class: 'bg-gray-200 rounded' }
]

// Fetch company data
const fetchCompany = async () => {
  loading.value = true
  error.value = null

  try {
    const orgId = route.params.id as string

    if (!orgId) {
      error.value = 'ไม่พบรหัสบริษัท'
      return
    }

    console.log('🔍 Fetching company:', orgId)
    const response = await getCompanyById(orgId)

    if (response && response.data) {
      company.value = response.data
      console.log('✅ Company data loaded:', company.value)
    } else {
      error.value = 'ไม่พบข้อมูลบริษัท'
    }
  } catch (err) {
    console.error('❌ Error fetching company:', err)
    error.value = (err as Error).message || 'ไม่สามารถโหลดข้อมูลบริษัทได้'
  } finally {
    loading.value = false
  }
}

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'ไม่ระบุ'

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

// Handle edit
const handleEdit = () => {
  // TODO: Navigate to edit page or open edit modal
  console.log('Edit company:', company.value?.org_id)
  alert('ฟีเจอร์แก้ไขยังไม่พร้อมใช้งาน')
}

onMounted(() => {
  fetchCompany()
})

// Provide rail state for child components
provide('railState', railState)
provide('toggleRail', toggleRail)
</script>
