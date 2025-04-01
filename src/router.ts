import { createRouter, createWebHistory } from 'vue-router';
import VideoView from '@/modules/viewVideo/VideoView.vue';
import VideoListView from '@/modules/viewVideoList/VideoListView.vue';

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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
