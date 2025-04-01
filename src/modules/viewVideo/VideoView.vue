<template>
  <div class="container mx-auto p-4">
    <div class="max-w-2xl mx-auto">
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
            <router-link :to="`/flashcards/${videoId}/0`" class="btn btn-primary">
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

const route = useRoute();
const videoId = route.params.videoId as string;
const snippetCount = ref<number>(0);

onMounted(async () => {
  try {
    snippetCount.value = await getNumberOfSnippetsOfVideo(videoId);
  } catch (error) {
    console.error('Error fetching snippet count:', error);
  }
});
</script>
