<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">
            Practice Vocabulary for Segment {{ segmentIndex + 1 }}
        </h1>
        <div v-if="flashcard" class="card shadow-lg p-4 mb-4">
            <p class="text-4xl font-bold mb-2">{{ flashcard.word }}</p>
            <div v-if="showAnswer">
                <p class="text-xl">{{ flashcard.transliteration }}</p>
                <p class="text-lg text-gray-500">{{ flashcard.translation }}</p>
            </div>
            <div class="mt-4">
                <button v-if="!showAnswer" @click="revealAnswer" class="btn btn-primary mr-2">
                    Reveal
                </button>
                <div v-else class="flex flex-row gap-1">
                    <!-- Mapping quality: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy -->
                    <button @click="handleRating(0)" class="btn btn-warning">Again</button>
                    <button @click="handleRating(1)" class="btn btn-secondary">Hard</button>
                    <button @click="handleRating(2)" class="btn btn-success">Good</button>
                    <button @click="handleRating(3)" class="btn btn-accent">Easy</button>
                </div>
            </div>
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
import { loadLocalData, saveLocalData } from '@/composables/useLocalStorage';
import { Rating } from 'ts-fsrs';
import { getInitialCard, rateCard } from '@/fsrs';

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
const lastPracticedWord = ref<string | null>(null);

// Use a localStorage key "items" for vocabulary progress.
const VOCAB_ITEMS_KEY = 'items';

/**
 * Fisher-Yates shuffle function.
 */
function shuffleArray<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Build flashcards for the current segment.
 * Each unique word is added twice, then the deck is shuffled.
 */
function buildFlashcardsForSegment() {
    const relevantWords: WordEntry[] = words.filter(word =>
        word.relevantForVideoSegments.some(seg =>
            seg.videoId === videoId &&
            seg.start === currentSegment.start &&
            seg.duration === currentSegment.duration
        )
    );

    // For each unique word, create a flashcard object using stored vocab from localStorage.
    const storedItems = loadLocalData(VOCAB_ITEMS_KEY);
    const uniqueFlashcards: FlashcardData[] = relevantWords.map(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return {
            word: word.word,
            transliteration: word.transliteration,
            translation: word.translation,
            card: storedCard || getInitialCard(),
        };
    });

    // Duplicate the flashcards so each word appears twice.
    const deck = [...uniqueFlashcards, ...uniqueFlashcards.map(fc => ({ ...fc }))];
    flashcards.value = shuffleArray(deck);
}

onMounted(() => {
    buildFlashcardsForSegment();
});

const flashcard = computed(() => flashcards.value[currentIndex.value] || null);

function revealAnswer() {
    showAnswer.value = true;
}

/**
 * Ensure that the next flashcard is not the same as the one just learned.
 */
function ensureNonRepeatingNext() {
    if (flashcards.value.length > 1 && lastPracticedWord.value) {
        if (flashcards.value[currentIndex.value].word === lastPracticedWord.value) {
            for (let i = currentIndex.value + 1; i < flashcards.value.length; i++) {
                if (flashcards.value[i].word !== lastPracticedWord.value) {
                    [flashcards.value[currentIndex.value], flashcards.value[i]] =
                        [flashcards.value[i], flashcards.value[currentIndex.value]];
                    break;
                }
            }
        }
    }
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
        flashcards.value[currentIndex.value].card = updatedCard;
        // Save the updated card state using a key that depends only on the word.
        const cardKey = `card_${flashcard.value.word}`;
        saveLocalData(VOCAB_ITEMS_KEY, { [cardKey]: updatedCard });
        lastPracticedWord.value = flashcard.value.word;
        // Remove the current flashcard from the deck.
        flashcards.value.splice(currentIndex.value, 1);
        showAnswer.value = false;
        // Reset index and ensure the next card isn’t the same as the one just practiced.
        currentIndex.value = 0;
        ensureNonRepeatingNext();
        if (flashcards.value.length === 0) {
            router.push(`/video/${videoId}/${segmentIndex}`);
        }
    }
}

function goToVideoSegment() {
    router.push(`/video/${videoId}/${segmentIndex}`);
}
</script>