import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomePage from '@/pages/HomePage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { requiresAuth: true }, // ต้องเข้าสู่ระบบ
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresGuest: true }, // เฉพาะคนที่ยังไม่ได้ล็อกอิน
  },
  {
    path: '/registerPage',
    name: 'registerPage',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { requiresGuest: true }, // เฉพาะคนที่ยังไม่ได้ล็อกอิน
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { requiresAuth: true }, // ต้องเข้าสู่ระบบ
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // ตรวจสอบว่ามี token และ user หรือไม่
  const isAuthenticated = authStore.isAuthenticated

  // หน้าที่ต้อง login
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  // หน้าที่ไม่ควรให้คนที่ login แล้วเข้าถึง (เช่น login, register)
  if (to.meta.requiresGuest && isAuthenticated) {
    next('/')
    return
  }

  next()
})

export default router