<template>
  <Transition name="slide-up">
    <div
      v-if="showBanner"
      class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
    >
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <!-- Cookie Icon & Text -->
          <div class="flex items-start gap-3 flex-1">
            <div class="text-3xl">🍪</div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900">
                เว็บไซต์นี้ใช้คุกกี้
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                เราใช้คุกกี้ที่จำเป็นสำหรับการยืนยันตัวตนและความปลอดภัยของบัญชีผู้ใช้
                คุกกี้เหล่านี้มีความจำเป็นต่อการทำงานของระบบและไม่สามารถปิดได้
                <button
                  @click="showDetails = !showDetails"
                  class="text-purple-600 hover:underline ml-1"
                >
                  {{ showDetails ? 'ซ่อนรายละเอียด' : 'อ่านเพิ่มเติม' }}
                </button>
              </p>

              <!-- Detailed Info -->
              <Transition name="fade">
                <div v-if="showDetails" class="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <h4 class="font-medium text-gray-900 mb-2">คุกกี้ที่เราใช้:</h4>
                  <ul class="space-y-2 text-gray-600">
                    <li class="flex items-start gap-2">
                      <span class="text-green-500 mt-0.5">✓</span>
                      <div>
                        <span class="font-medium">คุกกี้การยืนยันตัวตน</span>
                        <span class="text-gray-500"> - ใช้สำหรับเข้าสู่ระบบและรักษาสถานะการใช้งาน</span>
                      </div>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="text-green-500 mt-0.5">✓</span>
                      <div>
                        <span class="font-medium">คุกกี้ความปลอดภัย</span>
                        <span class="text-gray-500"> - ป้องกันการโจมตีและรักษาความปลอดภัยของข้อมูล</span>
                      </div>
                    </li>
                  </ul>
                  <p class="mt-3 text-xs text-gray-500">
                    คุกกี้เหล่านี้จะถูกลบเมื่อคุณออกจากระบบ หรือหมดอายุตามที่กำหนด
                    เราไม่ใช้คุกกี้เพื่อการโฆษณาหรือติดตามพฤติกรรมข้ามเว็บไซต์
                  </p>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 w-full sm:w-auto">
            <button
              @click="acceptCookies"
              class="flex-1 sm:flex-none px-6 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              ยอมรับ
            </button>
            <button
              @click="acceptEssentialOnly"
              class="flex-1 sm:flex-none px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              ยอมรับเฉพาะที่จำเป็น
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const CONSENT_KEY = 'cookie_consent'
const CONSENT_VERSION = '1.0' // เพิ่ม version เพื่อบังคับขอความยินยอมใหม่เมื่อเปลี่ยน policy

const showBanner = ref(false)
const showDetails = ref(false)

// Check if user has already consented
onMounted(() => {
  const consent = localStorage.getItem(CONSENT_KEY)
  if (!consent) {
    showBanner.value = true
  } else {
    try {
      const parsed = JSON.parse(consent)
      // Show banner again if consent version is different
      if (parsed.version !== CONSENT_VERSION) {
        showBanner.value = true
      }
    } catch {
      showBanner.value = true
    }
  }
})

const saveConsent = (type: 'all' | 'essential') => {
  const consent = {
    type,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  showBanner.value = false
}

const acceptCookies = () => {
  saveConsent('all')
  console.log('✅ Cookie consent: All cookies accepted')
}

const acceptEssentialOnly = () => {
  saveConsent('essential')
  console.log('✅ Cookie consent: Essential cookies only')
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
