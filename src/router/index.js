import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/requests',
      name: 'requests',
      component: () => import('../views/RequestsView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/StatsView.vue'),
    },
    {
      path: '/completed',
      name: 'completed',
      component: () => import('../views/CompletedView.vue'),
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/requests',
    },
  ],
})

// Глобальный guard для авторизации
router.beforeEach((to, from, next) => {
  const isAuth = localStorage.getItem('auth') === '1'
  if (to.name !== 'login' && !isAuth) {
    next({ name: 'login' })
  } else if (to.name === 'login' && isAuth) {
    next({ name: 'requests' })
  } else {
    next()
  }
})

export default router
