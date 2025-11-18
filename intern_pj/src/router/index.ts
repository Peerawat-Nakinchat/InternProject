import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import path from 'path'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
  },
  {
    path: '/registerPage',
    name: 'registerPage',
    component: () => import('@/pages/RegisterPage.vue'),
  },
  {
    path: '/company',
    name: 'company',
    component: () => import('@/pages/CompanyPage.vue'),
  },
]
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
