<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-6">Video Overview</h1>
        <div class="flex flex-row gap-2 ">
            <div v-for="video in videos" :key="video.videoId" class="border p-4 rounded shadow-sm flex flex-col gap-2">
                <!-- <h2 class="text-xl font-semibold mb-2">Video: {{ video.videoId }}</h2> -->
                <img :src="`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`" alt="Video thumbnail"
                    class="w-full" />
                <router-link :to="`/video-detail/${video.videoId}`" class="btn">
                    View Details
                </router-link>
                <router-link :to="`/flashcards/${video.videoId}/0`" class="btn btn-primary">
                    Practice
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