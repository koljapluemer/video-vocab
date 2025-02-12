<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">Watch Video Segment {{ segmentIndex + 1 }}</h1>
        <div class="mb-4">
            <iframe :key="replayKey" class="w-full h-64" :src="youtubeEmbedUrl" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
        <div class="flex flex-col items-center space-y-4">
            <button @click="replaySegment" class="btn btn-lg btn-primary w-full">
                Replay Segment
            </button>
            <div>
                <p class="mb-4">How well did you understand this segment?</p>
                <div class="flex flex-row gap-1">
                    <button @click="rateSegment(0)" class="btn btn-warning">Did not understand</button>
                    <button @click="rateSegment(1)" class="btn btn-secondary">Partially understood</button>
                    <button @click="rateSegment(2)" class="btn btn-success">Understood well</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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
    const end = Math.floor(currentSegment.start + currentSegment.duration + 0.5);
    return `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}&autoplay=1`;
});

// A key to force the iframe to reload.
const replayKey = ref(Date.now());

function replaySegment() {
    replayKey.value = Date.now();
}

const VIDEO_PROGRESS_KEY = 'videoProgress';

function rateSegment(quality: number) {
    const videoKey = `${videoId}_${segmentIndex}`;
    saveLocalData(VIDEO_PROGRESS_KEY, { [videoKey]: quality });
    if (segmentIndex < video!.segments.length - 1) {
        const nextSegmentIndex = segmentIndex + 1;
        router.push(`/flashcards/${videoId}/${nextSegmentIndex}`);
    } else {
        router.push('/completed');
    }
}
</script>