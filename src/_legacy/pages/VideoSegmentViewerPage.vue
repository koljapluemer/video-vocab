<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">Watch Video Segment {{ segmentIndex + 1 }}</h1>
        <div class="mb-4">
            <iframe :key="replayKey" class="w-full h-64" :src="youtubeEmbedUrl" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
        <div v-if="!segmentRated" class="flex flex-col items-center space-y-4">
            <button @click="replaySegment" class="btn btn-sm flex-start">
                Replay Segment
            </button>
            <div>
                <p class="mb-4 mt-10">How well did you understand this segment?</p>
                <div class="flex flex-row gap-2">
                    <button @click="handleSegmentRating(0)" class="btn btn-warning">
                        Did not understand
                    </button>
                    <button @click="handleSegmentRating(1)" class="btn btn-secondary">
                        Partially understood
                    </button>
                    <button @click="handleSegmentRating(2)" class="btn btn-success">
                        Understood well
                    </button>
                </div>
            </div>
        </div>
        <div v-else class="flex flex-col items-center space-y-4">
            <p class="text-xl mb-4">Choose your next action:</p>
            <div class="btn-group gap-2 flex flex-col md:flex-row">
                <button @click="onRepeatSegment" class="btn">
                    Repeat Segment
                </button>
                <button @click="onStudyNextSegment" class="btn">
                    Study Next Segment
                </button>
                <button @click="onStudyScheduledSegment" class="btn btn-primary">
                    Study Scheduled Segment
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { VideoData, VideoSegment } from '@/_legacy/types';
import { initSegmentCard, updateSegmentRating, repeatSegment, studyNextSegment, studyScheduledSegment } from '@/_legacy/utils/videoSegmentActions';

const route = useRoute();
const router = useRouter();

const videoId = route.params.videoId as string;
const segmentIndex = Number(route.params.segmentIndex);

const { getVideos } = useData();
const videos = getVideos();
const video = videos.find(v => v.videoId === videoId);
if (!video) router.push('/');
const currentSegment: VideoSegment = video!.segments[segmentIndex];

const youtubeEmbedUrl = computed(() => {
    const start = Math.floor(currentSegment.start);
    const end = Math.floor(currentSegment.start + currentSegment.duration + 0.6);
    return `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}&autoplay=1`;
});

const replayKey = ref(Date.now());
const segmentRated = ref(false);

function replaySegment() {
    replayKey.value = Date.now();
}

let { segmentCard, segmentKey } = initSegmentCard(videoId, segmentIndex);

function handleSegmentRating(quality: number) {
    segmentCard = updateSegmentRating(segmentCard, videoId, segmentIndex, quality);
    segmentRated.value = true;
}

function onRepeatSegment() {
    repeatSegment(videoId, segmentIndex, router);
}

function onStudyNextSegment() {
    studyNextSegment(video!, videoId, segmentIndex, router);
}

function onStudyScheduledSegment() {
    studyScheduledSegment(video!, videoId, router);
}
</script>
