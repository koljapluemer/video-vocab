import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'learn',
      component: () => import('../views/MainView.vue'),
    },
  ],
})

export default router
