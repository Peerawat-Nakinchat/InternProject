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
      path: '/registerPage',
      name: 'registerPage',
      component: () => import('@/pages/RegisterPage.vue'),
      meta: { requiresGuest: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const loading = useAppLoading()

  // เริ่มแสดง Loading เมื่อเริ่มเปลี่ยนหน้า
  loading.start()

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
