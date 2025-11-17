<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100">
    <div class="w-full max-w-md mx-4">
      <div class="mb-6 text-center">
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">MANGO ISO</h1>
        <p class="text-xs text-slate-500">Login Page</p>
      </div>

      <div class="bg-white rounded-2xl shadow-lg p-6">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
