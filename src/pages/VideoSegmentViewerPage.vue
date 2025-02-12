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
                <button @click="repeatSegment" class="btn">
                    Repeat Segment
                </button>
                <button @click="studyNextSegment" class="btn">
                    Study Next Segment
                </button>
                <button @click="studyScheduledSegment" class="btn btn-primary">
                    Study Scheduled Segment
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useData } from '@/composables/useData';
import type { VideoData, VideoSegment } from '@/types';
import { getInitialCard, rateCard } from '@/fsrs';
import { loadLocalData, saveLocalData } from '@/composables/useLocalStorage';
import { Rating } from 'ts-fsrs';

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

// FSRS for video segments: use key "segments" in localStorage.
const SEGMENT_ITEMS_KEY = 'segments';
const segmentKey = `segment_${videoId}_${segmentIndex}`;
const storedSegment = loadLocalData(SEGMENT_ITEMS_KEY)[segmentKey];
let segmentCard = storedSegment || getInitialCard();

const replayKey = ref(Date.now());
const segmentRated = ref(false);

function replaySegment() {
    replayKey.value = Date.now();
}

function handleSegmentRating(quality: number) {
    let rating: Rating;
    switch (quality) {
        case 0: rating = Rating.Again; break;
        case 1: rating = Rating.Hard; break;
        case 2: rating = Rating.Good; break;
        case 3: rating = Rating.Easy; break;
        default: rating = Rating.Good;
    }
    const updatedCard = rateCard(segmentCard, rating);
    segmentCard = updatedCard;
    saveLocalData(SEGMENT_ITEMS_KEY, { [segmentKey]: updatedCard });
    segmentRated.value = true;
}

/**  
 * Button Actions:
 * – repeatSegment: repeat the current segment’s vocabulary cycle.
 * – studyNextSegment: go to the next segment in the same video.
 * – studyScheduledSegment: pick a random due segment from across videos.
 */
function repeatSegment() {
    router.push(`/flashcards/${videoId}/${segmentIndex}`);
}

function studyNextSegment() {
    if (segmentIndex < video!.segments.length - 1) {
        const nextSegmentIndex = segmentIndex + 1;
        router.push(`/flashcards/${videoId}/${nextSegmentIndex}`);
    } else {
        router.push('/completed');
    }
}

function studyScheduledSegment() {
    // Look for due segments in the current video that have been studied before.
    const dueSegments: { segmentIndex: number }[] = [];
    video!.segments.forEach((seg, idx) => {
        const key = `segment_${videoId}_${idx}`;
        const stored = loadLocalData(SEGMENT_ITEMS_KEY)[key];
        // Only consider segments that have been studied before (stored exists)
        // and whose due date is now or in the past.
        if (stored && stored.due && new Date(stored.due) <= new Date()) {
            dueSegments.push({ segmentIndex: idx });
        }
    });
    if (dueSegments.length > 0) {
        // Pick one randomly.
        const randomIndex = Math.floor(Math.random() * dueSegments.length);
        const seg = dueSegments[randomIndex];
        router.push(`/flashcards/${videoId}/${seg.segmentIndex}`);
    } else {
        // No due segments that were studied before.
        // Look for the next unstudied segment in order of the current video.
        let nextUnstudied: number | null = null;
        for (let idx = 0; idx < video!.segments.length; idx++) {
            const key = `segment_${videoId}_${idx}`;
            const stored = loadLocalData(SEGMENT_ITEMS_KEY)[key];
            if (!stored) {
                nextUnstudied = idx;
                break;
            }
        }
        if (nextUnstudied !== null) {
            router.push(`/flashcards/${videoId}/${nextUnstudied}`);
        } else {
            // If all segments have been studied but none are due, fall back to the next segment.
            studyNextSegment();
        }
    }
}

</script>