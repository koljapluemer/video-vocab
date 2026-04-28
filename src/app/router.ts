import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'

import { isVideoPracticeMode } from '@/dumb/videoPracticeMode'
import {
  getStoredTargetLanguage,
  setStoredTargetLanguage,
} from '@/features/target-language-select/targetLanguageStorage'
import FlowPage from '@/pages/flow/FlowPage.vue'
import SnippetPracticePage from '@/pages/snippet-practice/SnippetPracticePage.vue'
import StatsPage from '@/pages/stats/StatsPage.vue'
import TargetLanguagePage from '@/pages/target-language/TargetLanguagePage.vue'
import VideoListPage from '@/pages/video-list/VideoListPage.vue'
import VideoVocabPracticePage from '@/pages/video-vocab-practice/VideoVocabPracticePage.vue'

const routes: RouteRecordRaw[] = [
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
    path: '/target-language/:languageCode',
    name: 'set-target-language',
    redirect: (to) => {
      const languageCode = String(to.params.languageCode ?? '').trim()
      if (!languageCode) {
        return { name: 'target-language' }
      }

      setStoredTargetLanguage(languageCode)
      return { name: 'video-list' }
    },
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsPage,
  },
  {
    path: '/video/:videoId/snippet',
    name: 'video-snippet-practice',
    component: SnippetPracticePage,
    beforeEnter: () => {
      if (!getStoredTargetLanguage()) {
        return { name: 'target-language' }
      }

      return true
    },
  },
  {
    path: '/video/:videoId/vocab',
    name: 'video-vocab-practice',
    component: VideoVocabPracticePage,
    beforeEnter: () => {
      if (!getStoredTargetLanguage()) {
        return { name: 'target-language' }
      }

      return true
    },
  },
  {
    path: '/video/:videoId/:practiceMode',
    name: 'video-practice',
    component: FlowPage,
    beforeEnter: (to: RouteLocationNormalized) => {
      if (!getStoredTargetLanguage()) {
        return { name: 'target-language' }
      }

      if (
        !isVideoPracticeMode(to.params.practiceMode) ||
        to.params.practiceMode === 'snippet' ||
        to.params.practiceMode === 'vocab'
      ) {
        return { name: 'video-list' }
      }

      return true
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
