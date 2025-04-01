import { createRouter, createWebHistory } from 'vue-router';
import VideoView from '@/modules/viewVideo/VideoView.vue';
import VideoListView from '@/modules/viewVideoList/VideoListView.vue';
import SnippetView from '@/modules/viewSnippet/SnippetView.vue';

const routes = [
  {
    path: '/',
    name: 'video-list',
    component: VideoListView
  },
  {
    path: '/video/:videoId',
    name: 'video',
    component: VideoView
  },
  {
    path: '/video/:videoId/snippet/:index',
    name: 'snippet',
    component: SnippetView
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
