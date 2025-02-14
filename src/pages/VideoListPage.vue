<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-6">Video Overview</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="video in videos" :key="video.videoId" class="border p-4 rounded shadow-sm">
                <h2 class="text-xl font-semibold mb-2">Video: {{ video.videoId }}</h2>
                <router-link :to="`/video-detail/${video.videoId}`" class="btn btn-sm btn-primary">
                    View Details
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { VideoData } from '@/types';
import { useData } from '@/composables/useData';

const { getVideos } = useData();
const videos = ref<VideoData[]>([]);
onMounted(() => {
    videos.value = getVideos();
});
</script>