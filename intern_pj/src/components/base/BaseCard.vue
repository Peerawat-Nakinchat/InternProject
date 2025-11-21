<template>
  <div
    :class="[
      'border rounded-lg shadow transition bg-white overflow-hidden',
      clickable ? 'cursor-pointer hover:shadow-lg' : '',
      cardClass
    ]"
    @click="handleClick"
  >
    <!-- Header Section -->
    <div v-if="$slots.header" :class="['px-4 pt-4', headerClass]">
      <slot name="header" />
    </div>

    <!-- Main Content -->
    <div :class="['p-4', contentClass]">
      <slot />
    </div>

    <!-- Badge/Status Section -->
    <div v-if="$slots.badge" :class="['px-4 pb-4', badgeClass]">
      <slot name="badge" />
    </div>

    <!-- Footer Section -->
    <div
      v-if="$slots.footer"
      :class="['px-4 py-3 bg-gray-50 border-t border-gray-200', footerClass]"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  clickable?: boolean
  cardClass?: string
  headerClass?: string
  contentClass?: string
  badgeClass?: string
  footerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  cardClass: '',
  headerClass: '',
  contentClass: '',
  badgeClass: '',
  footerClass: ''
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>
