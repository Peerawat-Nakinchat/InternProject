<template>
  <RouterView />
  <!-- Cookie Consent Banner -->
  <CookieConsent />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import CookieConsent from '@/components/CookieConsent.vue'
</script>
<style scoped></style>
