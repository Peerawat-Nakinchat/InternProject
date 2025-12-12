<template>
  <FormCard
    :title="cardTitle"
    :subtitle="cardSubtitle"
    :loading="isLoading"
    :saving="isSaving"
    :view-mode="isViewMode"
    :disabled="!!modulePointError"
    :submit-text="isAddMode ? 'เพิ่ม Module' : 'บันทึกการแก้ไข'"
    :submit-icon="isAddMode ? 'mdi mdi-plus' : 'mdi mdi-content-save'"
    @back="goBack"
    @submit="handleSubmit"
  >
    <!-- Row 1: Code & Name -->
    <FormRow>
      <FormInput
        v-model="form.module_code"
        label="รหัส Module"
        placeholder="เช่น ISO-14001"
        icon="mdi mdi-identifier"
        :required="true"
        :disabled="isViewMode"
        :maxlength="50"
        :error="errors.module_code"
      />
      <FormInput
        v-model="form.module_name"
        label="ชื่อ Module"
        placeholder="ชื่อ Module"
        icon="mdi mdi-tag-text-outline"
        :required="true"
        :disabled="isViewMode"
        :maxlength="255"
        :error="errors.module_name"
      />
    </FormRow>

    <!-- Row 2: Version & Point -->
    <FormRow>
      <FormInput
        v-model="form.standard_version"
        label="เวอร์ชันมาตรฐาน"
        placeholder="เช่น 2015"
        icon="mdi mdi-history"
        :disabled="isViewMode"
        :maxlength="20"
      />
      <FormInput
        v-model="form.module_point"
        label="Module Point"
        placeholder="เช่น 01"
        :icon="modulePointError ? 'mdi mdi-alert-circle' : 'mdi mdi-numeric'"
        :disabled="isViewMode"
        :maxlength="2"
        :loading="isCheckingPoint"
        :error="modulePointError"
        @blur="checkModulePoint"
      />
    </FormRow>

    <!-- Row 3: Description -->
    <FormTextarea
      v-model="form.description"
      label="รายละเอียด"
      placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับ Module นี้..."
      :disabled="isViewMode"
      :rows="4"
    />

    <!-- Row 4: Status -->
    <FormSelect
      v-model="form.is_active"
      label="สถานะ"
      :options="statusOptions"
      :disabled="isViewMode"
    />

    <!-- Timestamps (View Mode Only) -->
    <div
      v-if="isViewMode && form.create_date"
      class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100"
    >
      <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
        <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <i class="mdi mdi-calendar-plus text-emerald-600"></i>
        </div>
        <div>
          <p class="text-xs text-slate-500">วันที่สร้าง</p>
          <p class="text-sm font-medium text-slate-700">{{ formatDate(form.create_date) }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-4">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <i class="mdi mdi-calendar-edit text-blue-600"></i>
        </div>
        <div>
          <p class="text-xs text-slate-500">วันที่แก้ไขล่าสุด</p>
          <p class="text-sm font-medium text-slate-700">{{ formatDate(form.update_date) }}</p>
        </div>
      </div>
    </div>
  </FormCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { moduleService, type Module } from '@/services/moduleService'
import { FormCard, FormInput, FormTextarea, FormSelect, FormRow } from '@/components/form'
import { toast } from '@/utils/toast' // ✅ ใช้ Toast Utility

const route = useRoute()
const router = useRouter()

// Mode detection
const mode = computed(() => (route.query.mode as string) || 'view')
const moduleId = computed(() => route.query.id as string)

const isAddMode = computed(() => mode.value === 'add')
const isViewMode = computed(() => mode.value === 'view')

// Card titles
const cardTitle = computed(() => {
  if (isAddMode.value) return 'ข้อมูล Module ใหม่'
  return form.value.module_code || 'Module'
})

const cardSubtitle = computed(() => {
  if (isAddMode.value) return 'กรุณากรอกข้อมูลให้ครบถ้วน'
  return form.value.module_name || ''
})

// Status options
const statusOptions = [
  { value: 't', label: '🟢 เปิดใช้งาน' },
  { value: 'f', label: '🔴 ปิดใช้งาน' },
]

// Form state
const form = ref({
  module_id: '',
  module_code: '',
  module_name: '',
  standard_version: '',
  description: '',
  module_point: '',
  is_active: 't',
  create_date: '',
  update_date: '',
})

const errors = ref<Record<string, string>>({})
const isLoading = ref(false)
const isSaving = ref(false)
const isCheckingPoint = ref(false)
const modulePointError = ref('')

// Methods
const goBack = () => {
  router.push({ name: 'system-config-module' })
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

const showToast = (type: 'success' | 'error', message: string) => {
  if (type === 'success') {
    toast.success(message)
  } else {
    toast.error(message)
  }
}

// Normalize module point - remove leading zeros (01 -> 1, 002 -> 2, 030 -> 30)
const normalizeModulePoint = (point: string): string => {
  if (!point) return ''
  const normalized = parseInt(point, 10)
  return isNaN(normalized) ? point : String(normalized)
}

const checkModulePoint = async () => {
  if (!form.value.module_point || isViewMode.value) {
    modulePointError.value = ''
    return
  }

  isCheckingPoint.value = true
  try {
    const normalizedInput = normalizeModulePoint(form.value.module_point)
    const result = await moduleService.getAll({ limit: 100 })
    const existing = result.modules.find((m: Module) => {
      const normalizedExisting = normalizeModulePoint(m.module_point || '')
      return normalizedExisting === normalizedInput && m.module_id !== form.value.module_id
    })

    if (existing) {
      modulePointError.value = `Module Point "${form.value.module_point}" (${normalizedInput}) ถูกใช้งานแล้วโดย ${existing.module_code}`
    } else {
      modulePointError.value = ''
    }
  } catch (err) {
    console.error('Error checking module point:', err)
  } finally {
    isCheckingPoint.value = false
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!form.value.module_code.trim()) {
    errors.value.module_code = 'กรุณากรอกรหัส Module'
  }

  if (!form.value.module_name.trim()) {
    errors.value.module_name = 'กรุณากรอกชื่อ Module'
  }

  return Object.keys(errors.value).length === 0 && !modulePointError.value
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isSaving.value = true
  try {
    const normalizedModulePoint = form.value.module_point
      ? normalizeModulePoint(form.value.module_point)
      : null

    const payload = {
      module_code: form.value.module_code,
      module_name: form.value.module_name,
      standard_version: form.value.standard_version || null,
      description: form.value.description || null,
      module_point: normalizedModulePoint,
      is_active: form.value.is_active,
    }

    if (isAddMode.value) {
      await moduleService.create(payload)
      showToast('success', 'เพิ่ม Module สำเร็จ!')
    } else {
      await moduleService.update(form.value.module_id, payload)
      showToast('success', 'บันทึกการแก้ไขสำเร็จ!')
    }

    setTimeout(() => goBack(), 1500)
  } catch (err: unknown) {
    console.error('Error saving module:', err)
    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก'
    showToast('error', errorMessage)
  } finally {
    isSaving.value = false
  }
}

const loadModule = async () => {
  if (!moduleId.value || isAddMode.value) return

  isLoading.value = true
  try {
    const module = await moduleService.getById(moduleId.value)
    form.value = {
      module_id: module.module_id,
      module_code: module.module_code,
      module_name: module.module_name,
      standard_version: module.standard_version || '',
      description: module.description || '',
      module_point: module.module_point || '',
      // Convert boolean/string to 't'/'f' string for dropdown
      is_active: String(module.is_active) === 'true' || module.is_active === 't' ? 't' : 'f',
      create_date: module.create_date,
      update_date: module.update_date,
    }
  } catch (err) {
    console.error('Error loading module:', err)
    showToast('error', 'ไม่สามารถโหลดข้อมูล Module ได้')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadModule()
})
</script>
