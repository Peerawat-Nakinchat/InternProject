import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppLoading } from '@/stores/appLoading'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/HomePage.vue')
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/pages/ProfilePage.vue')
        },
        {
          path: 'company',
          name: 'company',
          component: () => import('@/pages/CompanyPage.vue')
        },
        {
          path: 'invite',
          name: 'invite',
          component: () => import('@/pages/InvitePage.vue')
        }
      ]
    },

    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { requiresGuest: true }
    },

    {
      path: '/accept-invite',
      name: 'accept-invite',
      component: () => import('@/pages/AcceptInvitePage.vue')
    },

    {
      path: '/registerPage',
      name: 'registerPage',
      component: () => import('@/pages/RegisterPage.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/reset-password',
      redirect: (to) => {
        return {
          path: '/login',
          query: { token: to.query.token }
        }
      }
    }
  ]
})

// ✅ ใช้ async guard เพื่อรอ auth check ก่อน
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const loading = useAppLoading()

  // เริ่มแสดง Loading เมื่อเริ่มเปลี่ยนหน้า
  loading.start()

  // ✅ รอให้ auth check เสร็จก่อน (ป้องกัน redirect ไป login ก่อนที่จะ check cookies เสร็จ)
  await authStore.waitForAuthReady()

  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next('/login')
  }
  if (to.meta.requiresGuest && isAuthenticated) {
    return next('/')
  }

  next()
})

router.afterEach(() => {
  const loading = useAppLoading()

  // ดีเลย์เพื่อความ smooth
  setTimeout(() => {
    loading.stop()
  }, 500)
})

export default router
