<template>
  <div class="w-full">
    <Listbox v-model="selectedCompany">
      <div class="relative mt-1">
        
        <ListboxButton
          class="relative w-150px sm:w-[220px] cursor-pointer rounded-md text-left shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-purple-600 transition-all duration-300 bg-linear-to-r from-purple-800 to-purple-700 hover:from-purple-700 hover:to-purple-600 text-white
                 h-9 md:h-9  px-4 text-sm md:text-md flex items-center"
        >
          <span class="block truncate font-semibold text-md tracking-wider uppercase">
            บริษัท : {{ selectedCompanyName }}
          </span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg class="h-5 w-5 md:h-6 md:w-6 text-purple-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </span>
        </ListboxButton>

        <transition
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute  max-h-[80vh] w-full overflow-auto rounded-b-md text-sm bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none z-50"
          >
            <template v-for="(group, roleKey) in groupedCompanies" :key="String(roleKey)">
              
              <div 
                @click.stop="toggleRole(String(roleKey))"
                class="sticky top-0 z-10 px-5 py-3 h-12 cursor-pointer flex justify-between items-center select-none shadow-sm transition-colors border-b border-white/10"
                :class="getRoleConfig(roleKey).headerClass"
              >
                <div class="flex items-center gap-3 text-white font-bold uppercase tracking-wider text-xs md:text-sm">
                  <i :class="['mdi text-lg md:text-xl', getRoleConfig(roleKey).icon]"></i>
                  <span>{{ roleKey }} ({{ group.length }})</span>
                </div>
                <svg 
                  class="w-5 h-5 text-white transition-transform duration-200"
                  :class="{ 'rotate-180': expandedRoles[String(roleKey)] }"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <template v-if="expandedRoles[String(roleKey)]">
                <ListboxOption
                  v-for="company in group"
                  :key="company.org_id"
                  :value="company"
                  as="template"
                  v-slot="{ active, selected }"
                >
                  <li
                    class="relative cursor-pointer select-none py-2 pl-5 pr-10 border-l-[6px] transition-all duration-200"
                    :class="[
                      active ? 'bg-purple-50 text-purple-900' : 'text-gray-900',
                      selected ? 'bg-purple-100' : '',
                      getRoleConfig(roleKey).borderClass
                    ]"
                  >
                    <div class="flex flex-col gap-1">
                      <span :class="[selected ? 'font-bold' : 'font-medium', 'block truncate text-sm md:text-base']">
                        {{ company.org_name }}
                      </span>
                      
                      <div class="flex justify-between text-xs md:text-sm text-gray-500">
                        <span class="uppercase tracking-wide font-mono bg-gray-100 px-2 rounded-sm">Code: {{ company.org_code || '-' }}</span>
                        <span class="flex items-center gap-1">
                          <i class="mdi mdi-account-group text-gray-400"></i>
                          {{ company.member_count ?? 0 }}
                        </span>
                      </div>
                    </div>
                    
                    <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-2 text-purple-600">
                      <i class="mdi mdi-check-circle text-xl md:text-2xl"></i>
                    </span>
                  </li>
                </ListboxOption>
              </template>

            </template>

            <div v-if="Object.keys(groupedCompanies).length === 0" class="px-4 py-8 text-center text-gray-500 text-base">
              ไม่พบข้อมูลบริษัท
            </div>

          </ListboxOptions>
        </transition>
      </div>
    </Listbox>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue'
import { useCompanyStore } from '@/stores/company'

// --- Types ---
interface Company {
  org_id: number;
  org_name: string;
  org_code?: string;
  role_id: number;
  role_name?: string;
  member_count?: number;
}

interface RoleTheme {
  headerClass: string;
  borderClass: string;
  icon: string;
}

// --- Config (Single Source of Truth) ---
const ROLE_CONFIG: Record<string, RoleTheme> = {
  OWNER:   { headerClass: 'bg-amber-500 hover:bg-amber-600', borderClass: 'border-amber-500', icon: 'mdi-crown' },
  ADMIN:   { headerClass: 'bg-indigo-600 hover:bg-indigo-700', borderClass: 'border-indigo-600', icon: 'mdi-shield-account' },
  MEMBER:  { headerClass: 'bg-emerald-500 hover:bg-emerald-600', borderClass: 'border-emerald-500', icon: 'mdi-account' },
  VIEWER:  { headerClass: 'bg-slate-500 hover:bg-slate-600', borderClass: 'border-slate-500', icon: 'mdi-eye' },
  AUDITOR: { headerClass: 'bg-teal-600 hover:bg-teal-700', borderClass: 'border-teal-600', icon: 'mdi-file-document-check' },
  DEFAULT: { headerClass: 'bg-purple-700 hover:bg-purple-800', borderClass: 'border-purple-700', icon: 'mdi-help-circle' }
}

const companyStore = useCompanyStore()
const expandedRoles = ref<Record<string, boolean>>({})

// --- Computed ---
const selectedCompany = computed({
  get: () => companyStore.selectedCompany,
  set: (val: Company) => companyStore.setSelectedCompany(val)
})

const selectedCompanyName = computed(() => 
  companyStore.selectedCompany?.org_name || 'เลือกบริษัท'
)

const groupedCompanies = computed(() => {
  const groups: Record<string, Company[]> = {}
  companyStore.companies.forEach((c: any) => {
    const roleLabel = c.role_name?.toUpperCase() || 'UNKNOWN'
    if (!groups[roleLabel]) groups[roleLabel] = []
    groups[roleLabel].push(c)
  })
  return groups
})

// --- Methods ---
const getRoleConfig = (role: unknown): RoleTheme => {
  const roleStr = String(role || '')
  const key = Object.keys(ROLE_CONFIG).find(k => roleStr.toUpperCase().includes(k))
  return (ROLE_CONFIG[key || 'DEFAULT'] ?? ROLE_CONFIG['DEFAULT']) as RoleTheme
}

const toggleRole = (role: string) => {
  if (role) expandedRoles.value[role] = !expandedRoles.value[role]
}

const autoExpandFirstGroup = () => {
  const roles = Object.keys(groupedCompanies.value)
  const firstRole = roles[0]
  if (roles.length > 0 && firstRole && Object.keys(expandedRoles.value).length === 0) {
    expandedRoles.value[firstRole] = true
  }
}

watch(() => companyStore.companies, () => {
  if (companyStore.companies.length > 0) autoExpandFirstGroup()
})

onMounted(async () => {
  await companyStore.fetchCompanies()
})
</script>