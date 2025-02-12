<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">
            Practice Vocabulary for Segment {{ segmentIndex + 1 }}
        </h1>
        <div class="mb-10">
            <button class="btn btn-sm" @click="skipVocabulary">Hide this word</button>
        </div>
        <div v-if="currentFlashcard">
            <FlashcardItem :flashcard="currentFlashcard" :showAnswer="showAnswer" @reveal="revealAnswer"
                @rating="handleRating" />
        </div>
        <div v-else>
            <p class="text-xl mb-4">All flashcards for this segment are learned!</p>
            <button @click="goToVideoSegment" class="btn btn-primary">
                Proceed to Video Segment
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useData } from '@/composables/useData';
import type { VideoData, FlashcardData, WordEntry } from '@/types';
import { getInitialCard, rateCard } from '@/fsrs';
import { loadLocalData, saveLocalData } from '@/composables/useLocalStorage';
import { Rating } from 'ts-fsrs';
import { buildFlashcardDeck, ensureNonRepeatingNext } from '@/utils/flashcardDeck';
import FlashcardItem from '@/components/FlashcardItem.vue';

const route = useRoute();
const router = useRouter();

const videoId = route.params.videoId as string;
const segmentIndex = Number(route.params.segmentIndex);

const { getVideos, getWords } = useData();
const videos = getVideos();
const words = getWords();

const video = videos.find(v => v.videoId === videoId);
if (!video) router.push('/');
const currentSegment = video!.segments[segmentIndex];

const flashcards = ref<FlashcardData[]>([]);
const currentIndex = ref(0);
const showAnswer = ref(false);
const lastPracticedWord = ref<string | null>(null);

onMounted(() => {
    flashcards.value = buildFlashcardDeck(videoId, currentSegment, words);
});

const currentFlashcard = computed(() => flashcards.value[currentIndex.value] || null);

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
    if (currentFlashcard.value) {
        const updatedCard = rateCard(currentFlashcard.value.card, rating);
        flashcards.value[currentIndex.value].card = updatedCard;
        const cardKey = `card_${currentFlashcard.value.word}`;
        saveLocalData('items', { [cardKey]: updatedCard });
        lastPracticedWord.value = currentFlashcard.value.word;
        flashcards.value.splice(currentIndex.value, 1);
        showAnswer.value = false;
        currentIndex.value = 0;
        flashcards.value = ensureNonRepeatingNext(flashcards.value, currentIndex.value, lastPracticedWord.value);
        if (flashcards.value.length === 0) {
            router.push(`/video/${videoId}/${segmentIndex}`);
        }
    }
}

function skipVocabulary() {
    if (currentFlashcard.value) {
        const blacklistKey = 'vocabBlacklist';
        const list = localStorage.getItem(blacklistKey);
        const blacklist = list ? new Set(JSON.parse(list)) : new Set<string>();
        blacklist.add(currentFlashcard.value.word);
        localStorage.setItem(blacklistKey, JSON.stringify(Array.from(blacklist)));
        flashcards.value.splice(currentIndex.value, 1);
        flashcards.value = ensureNonRepeatingNext(flashcards.value, currentIndex.value, lastPracticedWord.value);
        if (flashcards.value.length === 0) {
            router.push(`/video/${videoId}/${segmentIndex}`);
        }
    }
}

function goToVideoSegment() {
    router.push(`/video/${videoId}/${segmentIndex}`);
}
</script>
