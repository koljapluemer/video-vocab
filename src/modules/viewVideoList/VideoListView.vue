<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-6">Video Overview</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <router-link
                v-for="video in arzVideos"
                :key="video.youtubeId"
                :to="{ name: 'video', params: { videoId: video.youtubeId }}"
                class="group relative overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105"
            >
                <img
                    :src="`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`"
                    :alt="`Thumbnail for video ${video.youtubeId}`"
                    class="w-full h-48 object-cover"
                />
            </router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

import { getAllVideosWithLanguageCode, type Video } from '@/modules/spacedRepetitionLearning/exposeVideoList';

const arzVideos = ref<Video[]>([]);

onMounted(async () => {
    try {
        const allVideos = await getAllVideosWithLanguageCode('arz');
        arzVideos.value = allVideos;
    } catch (error) {
        console.error('Error loading videos:', error);
    }
});
</script>
