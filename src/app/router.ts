import { createRouter, createWebHistory } from 'vue-router'

import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import FlowPage from '@/pages/flow/FlowPage.vue'
import SnippetPracticePage from '@/pages/snippet-practice/SnippetPracticePage.vue'
import TargetLanguagePage from '@/pages/target-language/TargetLanguagePage.vue'
import VideoDetailPage from '@/pages/video-detail/VideoDetailPage.vue'
import VideoListPage from '@/pages/video-list/VideoListPage.vue'

const routes = [
  {
    path: '/',
    name: 'video-list',
    component: VideoListPage,
    beforeEnter: () => {
      if (!getStoredTargetLanguage()) {
        return { name: 'target-language' }
      }

      return true
    },
  },
  {
    path: '/target-language',
    name: 'target-language',
    component: TargetLanguagePage,
  },
  {
    path: '/flow',
    name: 'flow',
    component: FlowPage,
    beforeEnter: () => {
      if (!getStoredTargetLanguage()) {
        return { name: 'target-language' }
      }

      return true
    },
  },
  {
    path: '/course/:languageCode/video/:videoId',
    name: 'video',
    component: VideoDetailPage,
  },
  {
    path: '/course/:languageCode/video/:videoId/snippet/:index',
    name: 'snippet',
    component: SnippetPracticePage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
