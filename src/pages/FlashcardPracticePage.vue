<template>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">
            Practice Vocabulary for Segment {{ segmentIndex + 1 }}
        </h1>
        <div class="">
            <div class="mb-10">
                <button class="btn btn-sm" @click="skipVocabulary">Hide this word</button>
            </div>
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
                    <div v-else class="btn-group flex flex-row gap-2">
                        <!-- Mapping quality: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy -->
                        <button @click="handleRating(0)" class="btn btn-warning">
                            Again
                        </button>
                        <button @click="handleRating(1)" class="btn btn-secondary">
                            Hard
                        </button>
                        <button @click="handleRating(2)" class="btn btn-success">
                            Good
                        </button>
                        <button @click="handleRating(3)" class="btn btn-accent">
                            Easy
                        </button>
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

const route = useRoute();
const router = useRouter();

const videoId = route.params.videoId as string;
const segmentIndex = Number(route.params.segmentIndex);

const { getVideos, getWords } = useData();
const videos = getVideos();
const words = getWords();

const video = videos.find(v => v.videoId === videoId);
if (!video) {
    router.push('/');
}
const currentSegment = video!.segments[segmentIndex];

const flashcards = ref<FlashcardData[]>([]);
const currentIndex = ref(0);
const showAnswer = ref(false);
const lastPracticedWord = ref<string | null>(null);

const VOCAB_ITEMS_KEY = 'items';
const VOCAB_BLACKLIST_KEY = 'vocabBlacklist';

function loadBlacklist(): string[] {
    const list = localStorage.getItem(VOCAB_BLACKLIST_KEY);
    return list ? JSON.parse(list) : [];
}

function saveBlacklist(list: string[]) {
    localStorage.setItem(VOCAB_BLACKLIST_KEY, JSON.stringify(list));
}

function shuffleArray<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function isDue(card: any): boolean {
    if (!card) return true;
    const dueDate = new Date(card.due);
    return dueDate <= new Date();
}

function buildFlashcardsForSegment() {
    const blacklist = new Set(loadBlacklist());
    const relevantWords: WordEntry[] = words
        .filter(word =>
            word.relevantForVideoSegments.some(seg =>
                seg.videoId === videoId &&
                seg.start === currentSegment.start &&
                seg.duration === currentSegment.duration
            )
        )
        .filter(word => !blacklist.has(word.word));

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


    // Duplicate for twice practice.
    // change: duplicate only flashcards that have never been seen before
    let deck = [...uniqueFlashcards, ...uniqueFlashcards.filter(fc => !fc.card.lastSeen).map(fc => ({ ...fc }))];

    const extraCount = Math.floor(0.3 * uniqueFlashcards.length);
    const relevantWordSet = new Set(relevantWords.map(word => word.word));
    const extraWords: WordEntry[] = words.filter(word => !relevantWordSet.has(word.word));
    const dueExtraWords = extraWords.filter(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return isDue(storedCard);
    });

    const shuffledDueExtra = shuffleArray(dueExtraWords);
    const selectedExtra = shuffledDueExtra.slice(0, extraCount);
    const extraFlashcards: FlashcardData[] = selectedExtra.map(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return {
            word: word.word,
            transliteration: word.transliteration,
            translation: word.translation,
            card: storedCard || getInitialCard(),
        };
    });

    deck = deck.concat(extraFlashcards);
    flashcards.value = shuffleArray(deck);
}

onMounted(() => {
    buildFlashcardsForSegment();
});

const flashcard = computed(() => flashcards.value[currentIndex.value] || null);

function revealAnswer() {
    showAnswer.value = true;
}

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
        const cardKey = `card_${flashcard.value.word}`;
        saveLocalData(VOCAB_ITEMS_KEY, { [cardKey]: updatedCard });
        lastPracticedWord.value = flashcard.value.word;
        flashcards.value.splice(currentIndex.value, 1);
        showAnswer.value = false;
        currentIndex.value = 0;
        ensureNonRepeatingNext();
        if (flashcards.value.length === 0) {
            router.push(`/video/${videoId}/${segmentIndex}`);
        }
    }
}

function skipVocabulary() {
    if (flashcard.value) {
        const blacklist = new Set(loadBlacklist());
        blacklist.add(flashcard.value.word);
        saveBlacklist(Array.from(blacklist));
        flashcards.value.splice(currentIndex.value, 1);
        if (flashcards.value.length === 0) {
            router.push(`/video/${videoId}/${segmentIndex}`);
        }
        // go to next
        ensureNonRepeatingNext();
    }
}

function goToVideoSegment() {
    router.push(`/video/${videoId}/${segmentIndex}`);
}
</script>
