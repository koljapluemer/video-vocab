<template>
    <div class="card shadow-lg p-4 mb-4">
        <p class="text-4xl font-bold mb-2">{{ flashcard.word }}</p>
        <div v-if="showAnswer">
            <p class="text-xl">{{ flashcard.transliteration }}</p>
            <p class="text-lg text-gray-500">{{ flashcard.translation }}</p>
        </div>
        <div class="mt-4">
            <button v-if="!showAnswer" @click="onReveal" class="btn btn-primary mr-2">
                Reveal
            </button>
            <div v-else class="btn-group flex flex-row gap-2">
                <!-- Mapping quality: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy -->
                <button @click="onRating(0)" class="btn btn-warning">Again</button>
                <button @click="onRating(1)" class="btn btn-secondary">Hard</button>
                <button @click="onRating(2)" class="btn btn-success">Good</button>
                <button @click="onRating(3)" class="btn btn-accent">Easy</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { FlashcardData } from '@/types';

const props = defineProps<{
    flashcard: FlashcardData;
    showAnswer: boolean;
}>();

const emit = defineEmits<{
    (e: 'reveal'): void;
    (e: 'rating', quality: number): void;
}>();

function onReveal() {
    emit('reveal');
}

function onRating(quality: number) {
    emit('rating', quality);
}
</script>