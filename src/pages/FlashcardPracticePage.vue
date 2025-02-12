<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">Practice Vocabulary for Segment {{ segmentIndex + 1 }}</h1>
        <div v-if="flashcard" class="card shadow-lg p-4 mb-4">
            <p class="text-4xl font-bold mb-2">{{ flashcard.word }}</p>
            <div v-if="showAnswer">
                <p class="text-xl">{{ flashcard.transliteration }}</p>
                <p class="text-lg text-gray-500">{{ flashcard.translation }}</p>
            </div>
            <div class="mt-4">
                <button v-if="!showAnswer" @click="revealAnswer" class="btn btn-primary mr-2">Reveal</button>
                <div v-else class="btn-group">
                    <button @click="handleRating(0)" class="btn btn-warning">Again</button>
                    <button @click="handleRating(1)" class="btn btn-secondary">Hard</button>
                    <button @click="handleRating(2)" class="btn btn-success">Good</button>
                    <button @click="handleRating(3)" class="btn btn-accent">Easy</button>
                </div>
            </div>
        </div>
        <div v-else>
            <p class="text-xl mb-4">All flashcards for this segment are learned!</p>
            <button @click="goToVideoSegment" class="btn btn-primary">Proceed to Video Segment</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useData } from '@/composables/useData';
import type { VideoData, FlashcardData, WordEntry } from '@/types';
import { loadLocalData, saveLocalData } from '@/composables/useLocalStorage';
import { Rating } from 'ts-fsrs';
import { getInitialCard, rateCard } from '@/composables/useFSRS';

const route = useRoute();
const router = useRouter();

const videoId = route.params.videoId as string;
const segmentIndex = Number(route.params.segmentIndex);

// Load videos and words data.
const { getVideos, getWords } = useData();
const videos = getVideos();
const words = getWords();

// Find the current video and segment.
const video = videos.find(v => v.videoId === videoId);
if (!video) {
    router.push('/');
}
const currentSegment = video!.segments[segmentIndex];

const flashcards = ref<FlashcardData[]>([]);
const currentIndex = ref(0);
const showAnswer = ref(false);

const FLASHCARD_PROGRESS_KEY = 'flashcardProgress';

function buildFlashcardsForSegment() {
    // Filter words that are relevant for the current segment.
    const relevantWords = words.filter(word =>
        word.relevantForVideoSegments.some(seg =>
            seg.videoId === videoId &&
            seg.start === currentSegment.start &&
            seg.duration === currentSegment.duration
        )
    );
    const storedProgress = loadLocalData(FLASHCARD_PROGRESS_KEY);
    flashcards.value = relevantWords.map(word => {
        const cardId = `${videoId}_${currentSegment.start}_${word.word}`;
        const storedCard = storedProgress[cardId];
        return {
            word: word.word,
            transliteration: word.transliteration,
            translation: word.translation,
            card: storedCard || getInitialCard(),
        };
    });
}

onMounted(() => {
    buildFlashcardsForSegment();
});

const flashcard = computed(() => flashcards.value[currentIndex.value] || null);

function revealAnswer() {
    showAnswer.value = true;
}

function handleRating(quality: number) {
    let rating: Rating;
    switch (quality) {
        case 0: rating = Rating.Again; break;
        case 1: rating = Rating.Hard; break;
        case 2: rating = Rating.Good; break;
        case 3: rating = Rating.Easy; break;
        default: rating = Rating.Good;
    }
    if (flashcard.value) {
        const updatedCard = rateCard(flashcard.value.card, rating);
        // Save the updated card state.
        flashcards.value[currentIndex.value].card = updatedCard;
        const cardId = `${videoId}_${currentSegment.start}_${flashcard.value.word}`;
        saveLocalData(FLASHCARD_PROGRESS_KEY, { [cardId]: updatedCard });
        // For this MVP, consider the card “learned” if rated Good or Easy.
        if (rating === Rating.Good || rating === Rating.Easy) {
            flashcards.value.splice(currentIndex.value, 1);
        } else {
            currentIndex.value++;
        }
        showAnswer.value = false;
        // When no cards remain, move to video segment.
        if (flashcards.value.length === 0 || currentIndex.value >= flashcards.value.length) {
            router.push(`/video/${videoId}/${segmentIndex}`);
        }
    }
}

function goToVideoSegment() {
    router.push(`/video/${videoId}/${segmentIndex}`);
}
</script>