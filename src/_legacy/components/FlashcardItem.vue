<template>
    <div class="card shadow-lg p-4 mb-4">
        <div>
            <p class="text-4xl font-bold mb-2">{{ flashcard.word }}</p>
            <p class="text-xl mb-2">{{ flashcard.transliteration }}</p>
        </div>
        <!-- Display aggregated meanings -->
        <div v-if="revealed" class="mt-4">
            <ul>
                <li v-for="(meaning, index) in aggregatedMeanings" :key="index"
                    class="odd:bg-gray-500 even:bg-gray-600 p-2" :class="{ 'font-bold': meaning.isPrimary }">
                    <p class="text-lg">{{ meaning.translation }}</p>
                </li>
            </ul>
        </div>
        <div v-else class="mt-4">
            <button class="btn btn-primary" @click="$emit('reveal')">Reveal</button>
        </div>
        <div v-if="revealed" class="mt-4">
            <div class="btn-group flex flex-row gap-2">
                <button class="btn btn-warning" @click="$emit('rating', Rating.Again)">Again</button>
                <button class="btn btn-secondary" @click="$emit('rating', Rating.Hard)">Hard</button>
                <button class="btn btn-success" @click="$emit('rating', Rating.Good)">Good</button>
                <button class="btn btn-accent" @click="$emit('rating', Rating.Easy)">Easy</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import type { FlashcardData, AggregatedMeaning } from '@/_legacy/types';
import { Rating } from 'ts-fsrs';

const props = defineProps<{
    flashcard: FlashcardData;
    aggregatedMeanings: AggregatedMeaning[];
    primaryMeaning: AggregatedMeaning | null;
    revealed: boolean;
}>();
</script>
