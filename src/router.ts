import { createRouter, createWebHistory } from 'vue-router';
import VideoView from '@/modules/viewVideo/VideoView.vue';
import VideoListView from '@/modules/viewVideoList/VideoListView.vue';
import SnippetView from '@/modules/viewSnippet/SnippetView.vue';
import TargetLanguageView from '@/modules/targetLanguage/TargetLanguageView.vue';
import FlowView from '@/modules/viewFlow/FlowView.vue';
import { getStoredTargetLanguage } from '@/modules/targetLanguage/targetLanguageStorage';

const routes = [
  {
    path: '/',
    name: 'video-list',
    component: VideoListView,
    beforeEnter: () => {
      if (!getStoredTargetLanguage()) {
        return { name: 'target-language' };
      }

      return true;
    }
  },
  {
    path: '/target-language',
    name: 'target-language',
    component: TargetLanguageView
  },
  {
    path: '/flow',
    name: 'flow',
    component: FlowView,
    beforeEnter: () => {
      if (!getStoredTargetLanguage()) {
        return { name: 'target-language' };
      }

      return true;
    }
  },
  {
    path: '/course/:languageCode/video/:videoId',
    name: 'video',
    component: VideoView
  },
  {
    path: '/course/:languageCode/video/:videoId/snippet/:index',
    name: 'snippet',
    component: SnippetView
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
