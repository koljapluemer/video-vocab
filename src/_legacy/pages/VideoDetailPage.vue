<template>
    <div class="container mx-auto p-4" v-if="video">
        <h1 class="text-3xl font-bold mb-4">Video Details: {{ video.videoId }}</h1>
        <div class="mb-4">
            <p class="text-lg">
                Overall Progress:
                <span v-if="overallProgress !== null">{{ overallProgress }}</span>
                <span v-else>Not practiced yet</span>
            </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="(segment, idx) in video.segments" :key="idx" class="border p-4 rounded shadow-sm">
                <h2 class="text-xl font-semibold">Segment {{ idx + 1 }}</h2>
                <p class="text-sm">Start: {{ segment.start }}s, Duration: {{ segment.duration }}s</p>
                <p class="text-sm mb-2">
                    Practice History:
                    <span v-if="getSegmentHistory(video.videoId, idx)">{{ getSegmentHistory(video.videoId, idx)
                        }}</span>
                    <span v-else>Not practiced</span>
                </p>
                <div class="flex gap-2">
                    <router-link :to="`/flashcards/${video.videoId}/${idx}`" class="btn btn-sm btn-primary">
                        Practice
                    </router-link>
                    <router-link :to="`/video/${video.videoId}/${idx}`" class="btn btn-sm btn-secondary">
                        Watch Segment
                    </router-link>
                </div>
            </div>
        </div>
    </div>
    <div v-else class="container mx-auto p-4">
        <p class="text-xl">Loading video details…</p>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { VideoData } from '@/_legacy/types';
import { useData } from '@/composables/useData';

const route = useRoute();
const router = useRouter();
const videoId = route.params.videoId as string;

const { getVideos } = useData();
const videos = ref<VideoData[]>([]);

onMounted(() => {
    videos.value = getVideos();
    // Redirect if no matching video is found.
    if (!videos.value.find(v => v.videoId === videoId)) {
        router.push('/');
    }
});

// Since we redirect if video is not found, we can assert non-null.
const video = computed(() => videos.value.find(v => v.videoId === videoId)!);

// Load progress from localStorage.
const videoProgress = ref<Record<string, any>>({});
onMounted(() => {
    const vp = localStorage.getItem('videoProgress');
    videoProgress.value = vp ? JSON.parse(vp) : {};
});

function getSegmentHistory(videoId: string, segmentIndex: number): string | null {
    const key = `${videoId}_${segmentIndex}`;
    const progress = videoProgress.value[key];
    return progress !== undefined ? `Rating: ${progress}` : null;
}

const overallProgress = computed(() => {
    if (!video.value) return null;
    const practiced = video.value.segments.filter((_, idx) => {
        const key = `${video.value.videoId}_${idx}`;
        return videoProgress.value[key] !== undefined;
    }).length;
    return `${practiced}/${video.value.segments.length} segments practiced`;
});
</script>
