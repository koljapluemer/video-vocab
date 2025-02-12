<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">Select a Video</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <router-link v-for="video in videos" :key="video.videoId" :to="`/flashcards/${video.videoId}/0`"
                class="card shadow-lg p-4 hover:bg-primary hover:text-primary-content transition-colors">
                <h2 class="text-xl font-semibold">Video: {{ video.videoId }}</h2>
            </router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useData } from '@/composables/useData';
import type { VideoData } from '@/types';

const { getVideos } = useData();
const videos = ref<VideoData[]>(getVideos());
</script>