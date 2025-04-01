<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">
            Practice Vocabulary for Segment {{ segmentIndex + 1 }}
        </h1>
        <div class="mb-10">
            <button class="btn btn-sm" @click="skipVocabulary">Hide this word</button>
        </div>
        <div v-if="currentFlashcard">
            <FlashcardItem :flashcard="currentFlashcard" :aggregatedMeanings="aggregatedData.aggregatedMeanings"
                :primaryMeaning="aggregatedData.primaryMeaning" :revealed="showAnswer" @reveal="revealAnswer"
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
import type { VideoData, FlashcardData, VideoSegment, AggregatedMeaning } from '@/types';
import { rateCard } from '@/fsrs';
import { loadLocalData, saveLocalData } from '@/composables/useLocalStorage';
import { buildFlashcardDeck, ensureNonRepeatingNext } from '@/utils/flashcardDeck';
import FlashcardItem from '@/components/FlashcardItem.vue';

const route = useRoute();
const router = useRouter();

const videoId = route.params.videoId as string;
const segmentIndex = Number(route.params.segmentIndex);

const { getVideos, getWords } = useData();
const videos: VideoData[] = getVideos();
const words = getWords();

const video: VideoData | undefined = videos.find(v => v.videoId === videoId);
if (!video) router.push('/');
const currentSegment: VideoSegment = video!.segments[segmentIndex];

const flashcards = ref<FlashcardData[]>([]);
const currentIndex = ref(0);
const showAnswer = ref(false);
const lastPracticedWord = ref<string | null>(null);

// Build the deck using our utility (adapted to the new structure).
onMounted(() => {
    flashcards.value = buildFlashcardDeck(videoId, currentSegment, words);
});

const currentFlashcard = computed(() => flashcards.value[currentIndex.value] || null);

/**
 * Aggregates meanings for a given flashcard.
 * Deduplicates by comparing the normalized translation.
 * Marks as primary if any occurrence exactly matches the current segment.
 */
function aggregateMeaningsForFlashcard(
    flashcard: FlashcardData,
    currentVideoId: string,
    currentSegment: { start: number; duration: number }
): { aggregatedMeanings: AggregatedMeaning[]; primaryMeaning: AggregatedMeaning | null } {
    const map = new Map<string, AggregatedMeaning>();
    flashcard.relevantForVideoSegments.forEach(occ => {
        const key = occ.translation.trim().toLowerCase();
        if (!map.has(key)) {
            map.set(key, {
                transliteration: flashcard.transliteration,
                translation: occ.translation,
                isPrimary: false
            });
        }
        if (
            occ.videoId === currentVideoId &&
            occ.start === currentSegment.start &&
            occ.duration === currentSegment.duration
        ) {
            const entry = map.get(key);
            if (entry) entry.isPrimary = true;
        }
    });
    const aggregatedMeanings = Array.from(map.values());
    aggregatedMeanings.sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : 0));
    const primaryMeaning = aggregatedMeanings.find(m => m.isPrimary) || null;
    return { aggregatedMeanings, primaryMeaning };
}

// Compute aggregated data for the current flashcard.
const aggregatedData = computed(() => {
    if (!currentFlashcard.value) return { aggregatedMeanings: [] as AggregatedMeaning[], primaryMeaning: null };
    return aggregateMeaningsForFlashcard(currentFlashcard.value, videoId, currentSegment);
});

function revealAnswer() {
    showAnswer.value = true;
}

function handleRating(quality: number) {
    let rating: number;
    switch (quality) {
        case 0: rating = 0; break;
        case 1: rating = 1; break;
        case 2: rating = 2; break;
        case 3: rating = 3; break;
        default: rating = 2;
    }
    if (currentFlashcard.value) {
        const updatedCard = rateCard(currentFlashcard.value.card, rating);
        currentFlashcard.value.card = updatedCard;
        const cardKey = `card_${currentFlashcard.value.word}`;
        saveLocalData('items', { [cardKey]: updatedCard });
        lastPracticedWord.value = currentFlashcard.value.word;
        flashcards.value.splice(currentIndex.value, 1);
        showAnswer.value = false;
        currentIndex.value = 0;
        flashcards.value = ensureNonRepeatingNext(
            flashcards.value,
            currentIndex.value,
            lastPracticedWord.value
        );
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
        flashcards.value = ensureNonRepeatingNext(
            flashcards.value,
            currentIndex.value,
            lastPracticedWord.value
        );
        if (flashcards.value.length === 0) {
            router.push(`/video/${videoId}/${segmentIndex}`);
        }
    }
}

function goToVideoSegment() {
    router.push(`/video/${videoId}/${segmentIndex}`);
}
</script>