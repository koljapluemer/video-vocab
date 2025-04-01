// src/router.ts
import { createRouter, createWebHistory } from 'vue-router';
import VideoListView from '@/modules/videoListView/VideoListView.vue';
const routes = [
  {
    path: '/',
    name: 'video-list',
    component: VideoListView
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
