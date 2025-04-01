<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-6">Video Overview</h1>
        <div class="flex flex-row gap-2">
            <div v-for="video in arzVideos" :key="video.youtubeId" class="border p-4 rounded shadow-sm flex flex-col gap-2">
                <img :src="`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`" alt="Video thumbnail"
                    class="w-full" />
                <router-link :to="`/video-detail/${video.youtubeId}`" class="btn">
                    View Details
                </router-link>
                <router-link :to="`/flashcards/${video.youtubeId}/0`" class="btn btn-primary">
                    Practice
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAllVideosWithLanguageCode, type Video } from '@/modules/videoData/exposeData';

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
