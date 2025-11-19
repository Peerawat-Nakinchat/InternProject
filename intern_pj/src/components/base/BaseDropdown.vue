<template>
  <div
    ref="root"
    class="relative w-full text-left"
    :class="{
      'opacity-60 pointer-events-none': disabled,
    }"
  >
    <div
      ref="trigger"
      class="inline-flex w-full"
      @click="onToggle"
      @keydown.stop.prevent="onTriggerKeydown"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-disabled="disabled"
      tabindex="0"
    >
      <slot name="trigger">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
        >
          ตัวเลือก
          <svg
            class="h-4 w-4 text-neutral-500 transition-transform duration-200"
            :class="{ 'rotate-180': isOpen }"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 011.133.976l-.073.084-4.25 4.25a.75.75 0 01-.976.073l-.084-.073-4.25-4.25a.75.75 0 01.02-1.06z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </slot>
    </div>

    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        ref="panel"
        class="absolute mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg focus:outline-none"
        :class="panelPlacementClass"
        role="menu"
        @keydown.stop="onPanelKeydown"
        @click="onPanelClick"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
    closeOnClick?: boolean
    closeOnEsc?: boolean
    disabled?: boolean
  }>(),
  {
    modelValue: false,
    placement: 'bottom-start',
    closeOnClick: true,
    closeOnEsc: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'open'): void
  (e: 'close'): void
}>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const isOpen = ref<boolean>(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    isOpen.value = v
  },
)

watch(isOpen, async (v) => {
  emit('update:modelValue', v)
  if (v) {
    emit('open')
    await nextTick()
    focusFirstInPanel()
  } else {
    emit('close')
  }
})

const panelPlacementClass = computed(() => {
  switch (props.placement) {
    case 'bottom-end':
      return 'right-0 origin-top-right'
    case 'top-start':
      return 'bottom-full left-0 mb-2 origin-bottom-left'
    case 'top-end':
      return 'bottom-full right-0 mb-2 origin-bottom-right'
    case 'bottom-start':
    default:
      return 'left-0 origin-top-left'
  }
})

function open() {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  trigger.value?.focus()
}

function toggle() {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

function onToggle(e: MouseEvent) {
  e.stopPropagation()
  toggle()
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (props.disabled) return

  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
    e.preventDefault()
    open()
  } else if (e.key === 'Escape' && props.closeOnEsc) {
    e.preventDefault()
    close()
  }
}

function onPanelKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closeOnEsc) {
    e.preventDefault()
    close()
  }
}

function onPanelClick() {
  if (props.closeOnClick) {
    close()
  }
}

function focusFirstInPanel() {
  if (!panel.value) return

  const focusable = panel.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )

  const first = focusable.item(0)
  if (first) {
    first.focus()
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node | null
  if (!root.value || !target) return
  if (!root.value.contains(target)) {
    close()
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape' && props.closeOnEsc) {
    e.preventDefault()
    close()
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>
