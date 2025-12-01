<template>
  <div class="relative w-full">
    <!-- Dropdown Button -->
    <button @click="toggleDropdown"
      class="w-full h-6 sm:h-7 md:h-8 lg:h-10 px-3 sm:px-4 md:px-5 lg:px-6 uppercase tracking-wider
             bg-linear-to-r from-[#682DB5] to-[#8F3ED0] flex justify-between items-center 
             rounded-md font-semibold backdrop-blur-md shadow-lg text-white 
             hover:from-[#7F39D1] hover:to-[#9B5DE5] hover:text-yellow-400 
             focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-300 text-sm sm:text-base md:text-base lg:text-lg">
      <span class="truncate text-xs sm:text-sm md:text-md lg:text-md">
        บริษัท : {{ selectedCompanyName }}
      </span>

      <svg
        class="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-6 lg:w-6 lg:h-6 text-gray-200 transition-transform duration-300 ml-2"
        :class="{ 'rotate-180': dropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown List -->
    <ul v-if="dropdownOpen" class="absolute left-0 w-full sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px] 
             text-xs sm:text-sm md:text-base lg:text-base rounded-b-md 
             border border-white/30 shadow-xl bg-white backdrop-blur-md z-50 
             max-h-[60vh] sm:max-h-[64vh] md:max-h-[70vh] lg:max-h-[75vh] overflow-auto transition-all duration-300">
      <!-- Loop ตาม role group -->
      <template v-for="(items, role) in groupedCompanies" :key="role">

        <li @click="toggleRole(role)" :class="getRoleClass(role)" class="px-4 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 md:py-3 lg:py-3 tracking-widest
                 font-bold cursor-pointer flex justify-between items-center sticky top-0 z-20 h-10
                 transition-colors text-xs sm:text-xs md:text-sm lg:text-sm border-b border-white/10 shadow-sm">
          <span class="flex items-center gap-2 truncate">
            <i v-if="role.includes('OWNER')" class="mdi mdi-crown text-amber-500 text-base sm:text-lg"></i>
            <i v-else-if="role.includes('ADMIN')" class="mdi mdi-shield-account text-base sm:text-lg"></i>
            <i v-else class="mdi mdi-account text-base sm:text-lg"></i>

            {{ role }} ({{ items.length }})
          </span>

          <svg class="w-3 h-3 sm:w-3 sm:h-3 md:w-3 md:h-4 lg:w-4 lg:h-4 transition-transform duration-200 shrink-0"
            :class="{ 'rotate-180': expandedRoles[role] }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </li>

        <template v-if="expandedRoles[role]">
          <li v-for="company in items" :key="company.org_id" @click="selectCompany(company)" class="px-4 sm:px-5 md:px-6 lg:px-6 py-2 pl-8 border-l-4 cursor-pointer transition-all duration-500
         text-xs sm:text-sm text-gray-700 hover:text-purple-900 hover:bg-purple-50 bg-white border-b border-gray-100"
            :class="{
              'border-amber-500': role.includes('OWNER'),
              'border-indigo-500': role.includes('ADMIN'),
              'border-blue-500': role.includes('USER') || role.includes('VIEWER')
            }">
            <div class="flex flex-col">
              <span class="font-semibold truncate">{{ company.org_name }}</span>

              <span class="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
                CODE: {{ company.org_code || '-' }}
              </span>

              <!-- ✅ แสดงจำนวนสมาชิก -->
              <span class="text-[10px] sm:text-xs text-gray-500">
                สมาชิก: {{ company.member_count ?? 0 }} คน
              </span>
            </div>
          </li>

        </template>

      </template>
    </ul>

    <!-- Loading / Error -->
    <p v-if="companyStore.error" class="text-red-400 text-xs sm:text-sm mt-1">{{ companyStore.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCompanyStore } from '@/stores/company'

const companyStore = useCompanyStore()
const dropdownOpen = ref(false)
const expandedRoles = ref<Record<string, boolean>>({})

const getRoleName = (company: any) => {
  if (company.role_name && company.role_name !== 'UNKNOWN') {
    return company.role_name.toUpperCase()
  }

  // ถ้าไม่มี ให้แปลงจาก role_id
  const roleId = Number(company.role_id)
  switch (roleId) {
    case 1: return 'OWNER'
    case 2: return 'ADMIN'
    case 3: return 'MEMBER'
    case 4: return 'VIEWER'
    case 5: return 'AUDITOR'
    default: return 'UNKNOWN'
  }
}
const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value

  // เปิด role แรกอัตโนมัติเมื่อเปิด dropdown
  if (dropdownOpen.value && Object.keys(expandedRoles.value).length === 0) {
    const firstRole = Object.keys(groupedCompanies.value)[0]
    if (firstRole) expandedRoles.value[firstRole] = true
  }
}

const toggleRole = (role: string) => {
  expandedRoles.value[role] = !expandedRoles.value[role]
}

const selectCompany = (company: any) => {
  companyStore.setSelectedCompany(company)
  dropdownOpen.value = false
}

const getRoleClass = (roleName: string) => {
  // แปลงเป็นตัวพิมพ์ใหญ่เผื่อไว้
  const role = roleName.toUpperCase()

  if (role.includes('OWNER')) {
    return 'bg-[#eddb88] hover:bg-[#D5C472] text-white border-amber-700' // สีทอง/ส้ม
  }
  if (role.includes('ADMIN')) {
    return 'bg-[#1565C0] hover:bg-[#0E54A3] text-white border-indigo-800' // สีม่วงเข้ม
  }
  if (role.includes('MEMBER') || role.includes('พนักงาน')) {
    return 'bg-[#33CC99] hover:bg-[#33CC66] text-white border-blue-700' // สีฟ้า
  }
  if (role.includes('VIEWER')) {
    return 'bg-[#78909C] hover:bg-[#607480] text-white border-slate-700' // สีเทา
  }
  if (role.includes('AUDITOR')) {
    return 'bg-[#F9A825] hover:bg-[#D18F20] text-white border-teal-800' // สีเขียวอมฟ้า
  }

  return 'bg-[#4A137A] hover:bg-[#5A1F8A] text-white'
}

const groupedCompanies = computed(() => {
  const groups: Record<string, any[]> = {}

  companyStore.companies.forEach(c => {
    const roleLabel = c.role_name?.toUpperCase() || 'UNKNOWN'

    if (!groups[roleLabel]) groups[roleLabel] = []
    groups[roleLabel].push(c)
  })

  return groups
})

const selectedCompanyName = computed(() =>
  companyStore.selectedCompany?.org_name || 'เลือกบริษัท'
)

onMounted(async () => {
  await companyStore.fetchCompanies()
})
</script>
