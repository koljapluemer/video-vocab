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
import type { VideoData, FlashcardData, VideoSegment, AggregatedMeaning } from '@/_legacy/types';
import { rateCard } from '@/_legacy/fsrs';
import { ensureNonRepeatingNext } from '@/_legacy/utils/flashcardDeck';
import FlashcardItem from '@/components/FlashcardItem.vue';

const route = useRoute();
const router = useRouter();

const videoId = route.params.videoId as string;
const segmentIndex = Number(route.params.segmentIndex);

interface VideoWord {
    native: string;
    translation: string;
}

interface VideoSnippet {
    start: number;
    duration: number;
    words: VideoWord[];
}

interface VideoJson {
    snippets: VideoSnippet[];
}

const videoData = ref<VideoJson | null>(null);
const flashcards = ref<FlashcardData[]>([]);
const currentIndex = ref(0);
const showAnswer = ref(false);
const lastPracticedWord = ref<string | null>(null);

// Load video data and build flashcards
onMounted(async () => {
    try {
        const response = await fetch(`/data/out/${videoId}.json`);
        videoData.value = await response.json();

        if (!videoData.value || !videoData.value.snippets[segmentIndex]) {
            console.error('Video or segment not found');
            router.push('/');
            return;
        }

        const currentSnippet = videoData.value.snippets[segmentIndex];

        // Transform words into flashcards
        flashcards.value = currentSnippet.words.map(word => ({
            word: word.native,
            transliteration: '', // We don't have transliteration in the new format
            relevantForVideoSegments: [{
                videoId,
                start: currentSnippet.start,
                duration: currentSnippet.duration,
                translation: word.translation
            }],
            card: { // Simple card state
                due: new Date(),
                stability: 0,
                difficulty: 0,
                elapsedDays: 0,
                scheduledDays: 0,
                reps: 0,
                lapses: 0
            }
        }));
    } catch (error) {
        console.error('Error loading video data:', error);
        router.push('/');
    }
});

const currentFlashcard = computed(() => flashcards.value[currentIndex.value] || null);

/**
 * Aggregates meanings for a given flashcard.
 * In the new format, we only have one meaning per word per segment.
 */
function aggregateMeaningsForFlashcard(
    flashcard: FlashcardData,
    currentVideoId: string,
    currentSegment: { start: number; duration: number }
): { aggregatedMeanings: AggregatedMeaning[]; primaryMeaning: AggregatedMeaning | null } {
    const meaning = flashcard.relevantForVideoSegments[0];
    const aggregatedMeaning: AggregatedMeaning = {
        transliteration: flashcard.transliteration,
        translation: meaning.translation,
        isPrimary: true
    };
    return {
        aggregatedMeanings: [aggregatedMeaning],
        primaryMeaning: aggregatedMeaning
    };
}

// Compute aggregated data for the current flashcard.
const aggregatedData = computed(() => {
    if (!currentFlashcard.value || !videoData.value) {
        return { aggregatedMeanings: [] as AggregatedMeaning[], primaryMeaning: null };
    }
    const currentSnippet = videoData.value.snippets[segmentIndex];
    return aggregateMeaningsForFlashcard(
        currentFlashcard.value,
        videoId,
        { start: currentSnippet.start, duration: currentSnippet.duration }
    );
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
