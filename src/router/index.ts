// src/router.ts
import { createRouter, createWebHistory } from 'vue-router';
import VideoSelectorPage from '@/pages/VideoSelectorPage.vue';
import FlashcardPracticePage from '@/pages/FlashcardPracticePage.vue';
import VideoSegmentViewerPage from '@/pages/VideoSegmentViewerPage.vue';
import CompletedPage from '@/pages/CompletedPage.vue';

const routes = [
  {
    path: '/flashcards/:videoId/:segmentIndex',
    name: 'FlashcardPractice',
    component: FlashcardPracticePage,
    props: true,
  },
  {
    path: '/video/:videoId/:segmentIndex',
    name: 'VideoSegmentViewer',
    component: VideoSegmentViewerPage,
    props: true,
  },
  {
    path: '/completed',
    name: 'Completed',
    component: CompletedPage,
  },
  {
    path: '/',
    name: 'VideoList',
    component: () => import('@/pages/VideoListPage.vue'),
  },
  {
    path: '/video-detail/:videoId',
    name: 'VideoDetails',
    component: () => import('@/pages/VideoDetailPage.vue'),
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
