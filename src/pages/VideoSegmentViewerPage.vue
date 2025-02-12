<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">Watch Video Segment {{ segmentIndex + 1 }}</h1>
        <div class="mb-4">
            <iframe class="w-full h-64" :src="youtubeEmbedUrl" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
        <div>
            <p class="mb-4">How well did you understand this segment?</p>
            <div class="btn-group">
                <button @click="rateSegment(0)" class="btn btn-warning">Did not understand</button>
                <button @click="rateSegment(1)" class="btn btn-secondary">Partially understood</button>
                <button @click="rateSegment(2)" class="btn btn-success">Understood well</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useData } from '@/composables/useData';
import type { VideoData, VideoSegment } from '@/types';
import { saveLocalData } from '@/composables/useLocalStorage';

const route = useRoute();
const router = useRouter();

const videoId = route.params.videoId as string;
const segmentIndex = Number(route.params.segmentIndex);

const { getVideos } = useData();
const videos = getVideos();
const video = videos.find(v => v.videoId === videoId);
if (!video) {
    router.push('/');
}

const currentSegment: VideoSegment = video!.segments[segmentIndex];

const youtubeEmbedUrl = computed(() => {
    const start = Math.floor(currentSegment.start);
    const end = Math.floor(currentSegment.start + currentSegment.duration);
    return `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}&autoplay=1`;
});

const VIDEO_PROGRESS_KEY = 'videoProgress';

function rateSegment(quality: number) {
    // Save the segment rating in localStorage.
    const videoKey = `${videoId}_${segmentIndex}`;
    saveLocalData(VIDEO_PROGRESS_KEY, { [videoKey]: quality });
    // Navigate: if there is another segment, start its flashcard practice; otherwise, go to Completed.
    if (segmentIndex < video!.segments.length - 1) {
        const nextSegmentIndex = segmentIndex + 1;
        router.push(`/flashcards/${videoId}/${nextSegmentIndex}`);
    } else {
        router.push('/completed');
    }
}
</script>