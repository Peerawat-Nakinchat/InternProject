<template>
  <Navbar/>
  <RouterView />
  <login-page/>
  <register-page/>
</template>

<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import { RouterView } from 'vue-router'
import RegisterPage from './pages/RegisterPage.vue';
</script>
<style scoped></style>
