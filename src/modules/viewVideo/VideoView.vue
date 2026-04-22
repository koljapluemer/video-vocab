<template>
  <div class="container mx-auto p-4">
    <div class="max-w-2xl mx-auto">
      <div v-if="loadError" class="alert alert-error mb-4">
        <span>{{ loadError }}</span>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <figure>
          <img
            :src="`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`"
            :alt="`Thumbnail for video ${videoId}`"
            class="w-full h-96 object-cover"
          />
        </figure>
        <div class="card-body">
          <h2 class="card-title">Video Details</h2>
          <div class="flex justify-between items-center">
            <div class="text-lg">
              {{ snippetCount }} snippets available
            </div>
            <router-link :to="{ name: 'snippet', params: { languageCode, videoId, index: 0 } }" class="btn btn-primary">
              Start Practice
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getNumberOfSnippetsOfVideo } from '@/modules/spacedRepetitionLearning/api';
import { getVideoById } from '@/modules/spacedRepetitionLearning/exposeVideoList';

const route = useRoute();
const languageCode = route.params.languageCode as string;
const videoId = route.params.videoId as string;
const snippetCount = ref<number>(0);
const loadError = ref<string | null>(null);

onMounted(async () => {
  try {
    const video = await getVideoById(languageCode, videoId);
    if (!video) {
      loadError.value = `Video '${videoId}' was not found in course '${languageCode}'.`;
      return;
    }

    snippetCount.value = await getNumberOfSnippetsOfVideo(languageCode, videoId);
  } catch (error) {
    console.error('Error fetching snippet count:', error);
    loadError.value = `Failed to load video '${videoId}' for course '${languageCode}'.`;
  }
});
</script>
