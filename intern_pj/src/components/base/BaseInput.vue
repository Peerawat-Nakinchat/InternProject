<template>
  <div class="space-y-1 w-full">
    <label v-if="label" class="block text-sm font-medium text-neutral-700">
      {{ label }}
    </label>

    <div class="relative">
      <input
        v-bind="$attrs"
        :type="actualType"
        v-model="innerValue"
        @input="handleInput"
        class="w-full rounded-md border px-3 py-2 text-sm
               border-neutral-300 bg-white h-10
               focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500
               placeholder:text-slate-400
               disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-300
               pr-10"
      />

      <!-- 👁 Password Toggle Icon -->
      <div
        v-if="isPassword && hasValue"
        class="absolute inset-y-0 right-3 flex items-center cursor-pointer select-none "
        @click="togglePassword"
      >
        <i
          :class="showPassword ? 'mdi mdi-eye-off' : 'mdi mdi-eye'"
          class="text-slate-500 text-md"
        ></i>
      </div>

      <!-- append slot -->
      <div
        v-else-if="$slots.append"
        class="absolute inset-y-0 right-3 flex items-center cursor-pointer select-none"
      >
        <slot name="append" />
      </div>
    </div>

    <!-- ❗ Password Thai Warning -->
    <p
      v-if="thaiWarning && isPassword"
      class="text-xs text-red-500 mt-0.5"
    >
      ไม่อนุญาตให้ใช้ตัวอักษรภาษาไทยในรหัสผ่าน
    </p>

    <!-- Error Message (จาก props) -->
    <p v-if="error" class="text-xs text-red-500 mt-0.5">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue?: string
  label?: string
  error?: string | null
  type?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// Internal v-model
const innerValue = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})

const hasValue = computed(() => innerValue.value.length > 0)

// ------------------------------------
// 👁 Password Toggle
// ------------------------------------
const showPassword = ref(false)
const isPassword = computed(() => props.type === 'password')

const actualType = computed(() =>
  isPassword.value ? (showPassword.value ? 'text' : 'password') : props.type
)

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// ------------------------------------
// 🚫 Block Thai Characters + Warning
// ------------------------------------
const thaiWarning = ref(false)

const handleInput = (e: Event) => {
  if (!isPassword.value) return

  const input = e.target as HTMLInputElement
  const containsThai = /[\u0E00-\u0E7F]/.test(input.value)

  if (containsThai) {
    thaiWarning.value = true
    // ลบตัวอักษรไทยออก
    const cleaned = input.value.replace(/[\u0E00-\u0E7F]/g, '')
    input.value = cleaned
    emit('update:modelValue', cleaned)
  } else {
    thaiWarning.value = false
    emit('update:modelValue', input.value)
  }
}
</script>
