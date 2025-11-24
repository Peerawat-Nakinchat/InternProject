<template>
  <Teleport to="body">
    <transition name="fade-overlay">
      <div
        v-show="showModal"
        class="fixed inset-0 w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
        @click.self="$emit('close')"
      >
        <div class="w-full max-w-lg px-4 sm:px-0">
          <!-- Transition Content -->
          <transition name="fade-modal-up" mode="out-in">
            <!-- Loading State -->
            <div
              v-if="loading"
              key="loading-state"
              class="flex items-center justify-center w-full min-h-[300px]"
            >
              <BaseLoadingSpinner />
            </div>

            <!-- Actual Modal Content -->
            <div
              v-else
              key="content-state"
              class="bg-linear-to-r from-[#682DB5] to-[#8F3ED0] rounded-2xl shadow-2xl w-full p-6 sm:p-8"
            >
              <!-- Header -->
              <header class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-white flex items-center gap-2">
                  <i class="mdi mdi-email-plus text-3xl"></i>
                  ส่งคำเชิญ
                </h2>

                <button
                  @click="$emit('close')"
                  class="text-white opacity-75 hover:opacity-100 transition-opacity"
                >
                  <i class="mdi mdi-close text-3xl"></i>
                </button>
              </header>

              <!-- BODY -->
              <div class="space-y-6">
                <!-- Email Input -->
                <!-- Email Input (Custom) -->
                <div class="w-full">
                  <label class="block text-sm font-medium text-white mb-1"> อีเมลผู้รับเชิญ </label>

                  <div class="relative">
                    <input
                      type="email"
                      v-model="form.email"
                      @blur="validateEmail"
                      @input="validateEmail"
                      placeholder="example@email.com"
                      class="w-full rounded-md border px-3 py-2 pr-12 text-sm bg-transparent text-white border-white/60 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                    />

                    <!-- ICON -->
                    <i
                      class="mdi mdi-email-edit-outline absolute inset-y-0 right-3 flex items-center text-white text-xl pointer-events-none"
                    ></i>
                  </div>

                  <!-- ERROR -->
                  <p v-if="errors.email" class="text-red-300 text-xs mt-1">
                    {{ errors.email }}
                  </p>
                </div>

                <!-- Role Selector -->
                <div>
                  <label class="block text-sm font-medium text-white mb-1">ตำแหน่ง</label>

                  <BaseDropdown v-model="isInviteOpen" close-on-click class="w-full">
                    <template #trigger>
                      <button
                        type="button"
                        class="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm transition-colors"
                        :class="[
                          errors.role
                            ? 'border-red-500 bg-red-50 hover:bg-red-100 text-red-700'
                            : 'border-white/50 bg-white/20 text-white backdrop-blur hover:bg-white/30',
                        ]"
                        :aria-expanded="isInviteOpen"
                      >
                        <span>
                          {{ selectedInvite ? selectedInvite.label : 'เลือกบทบาทผู้ใช้' }}
                        </span>

                        <i
                          class="mdi mdi-chevron-down transition-transform duration-300"
                          :class="{
                            'rotate-180 text-white': isInviteOpen,
                            'text-red-500': errors.role,
                          }"
                        ></i>
                      </button>
                    </template>

                    <div class="py-1 bg-white/95 rounded-md shadow">
                      <button
                        v-for="option in InviteOption"
                        :key="option.value"
                        type="button"
                        class="flex w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-200 transition-colors"
                        @click="onSelectInvite(option)"
                      >
                        {{ option.label }} {{ option.value }}
                      </button>
                    </div>
                  </BaseDropdown>

                  <p v-if="errors.role" class="text-red-300 text-xs mt-1">{{ errors.role }}</p>
                </div>

                <!-- Submit Button -->
                <button
                  type="submit"
                  @click="submitInvitation"
                  :disabled="!isFormValid || sending"
                  class="w-full bg-linear-to-tr from-[#1C244B] to-[#682DB5] hover:from-[#2A3570] hover:to-[#8A4BE3] active:from-[#4354b7] active:to-[#7f23ff] text-white font-semibold py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-0 outline-none focus:outline-none focus:ring-0 active:outline-none active:ring-0"
                >
                  {{ sending ? 'กำลังส่ง...' : 'ส่งคำเชิญ' }}
                </button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import BaseLoadingSpinner from '@/components/base/BaseLoadingSpinner.vue'
import BaseDropdown from '@/components/base/BaseDropdown.vue'
import { useCompanyStore } from '@/stores/company'
import { sendInvitation } from '@/services/useInvitation'

const emit = defineEmits(['close', 'submit'])

/* ------------------------------
   STATE
------------------------------ */
const showModal = ref(true)
const loading = ref(true)
const sending = ref(false) // New state for API call

const companyStore = useCompanyStore()

const form = ref({
  email: '',
  role: '',
})

const errors = ref({
  email: '',
  role: '',
})

interface InviteOption {
  label: string
  value: string
  roleId: number // Add roleId mapping
}

const InviteOption: InviteOption[] = [
  { label: 'เจ้าของ', value: '(owner)', roleId: 1 },
  { label: 'ผู้ดูแลระบบ', value: '(admin)', roleId: 2 },
  { label: 'สมาชิก', value: '(member)', roleId: 3 },
  { label: 'ผู้เยี่ยมชม', value: '(view)', roleId: 4 },
  { label: 'ผู้ตรวจสอบ', value: '(auditor)', roleId: 5 },
]

const isInviteOpen = ref(false)
const selectedInviteValue = ref<string>('(member)') // Default value matches one of the options

const selectedInvite = computed(
  () => InviteOption.find((opt) => opt.value === selectedInviteValue.value) ?? null,
)

/* ------------------------------
   VALIDATION
------------------------------ */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateEmail = () => {
  if (!form.value.email) errors.value.email = 'กรุณากรอกอีเมลผู้รับเชิญ'
  else if (!emailRegex.test(form.value.email)) errors.value.email = 'รูปแบบอีเมลไม่ถูกต้อง'
  else errors.value.email = ''
}

const validateRole = () => {
  if (!form.value.role) errors.value.role = 'กรุณาเลือกตำแหน่งของผู้รับเชิญ'
  else errors.value.role = ''
}

watch(() => form.value.role, validateRole)

const isFormValid = computed(
  () =>
    !errors.value.email &&
    !errors.value.role &&
    form.value.email.length > 0 &&
    form.value.role.length > 0,
)

/* ------------------------------
   ACTIONS
------------------------------ */
const onSelectInvite = (option: InviteOption) => {
  selectedInviteValue.value = option.value
  form.value.role = option.value
  isInviteOpen.value = false
  validateRole()
}

const submitInvitation = async () => {
  validateEmail()
  validateRole()

  if (!isFormValid.value) return

  const selectedRole = InviteOption.find((opt) => opt.value === form.value.role)
  if (!selectedRole) {
    errors.value.role = 'Invalid role'
    return
  }

  const orgId = companyStore.selectedCompany?.org_id
  if (!orgId) {
    alert('กรุณาเลือกบริษัทก่อนส่งคำเชิญ')
    return
  }

  sending.value = true
  try {
    await sendInvitation(form.value.email, orgId, selectedRole.roleId)
    alert('ส่งคำเชิญเรียบร้อยแล้ว')
    emit('submit', form.value)
    emit('close')
  } catch (error: any) {
    console.error('Send invite error:', error)
    alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำเชิญ')
  } finally {
    sending.value = false
  }
}

/* ------------------------------
   LIFECYCLE
------------------------------ */
onMounted(() => {
  form.value.role = selectedInviteValue.value
  validateRole()

  setTimeout(() => {
    loading.value = false
  }, 900)
})
</script>

<style scoped>
/* Overlay Fade */
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

/* Modal Fade Up */
.fade-modal-up-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-modal-up-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-modal-up-enter-from,
.fade-modal-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}
</style>
