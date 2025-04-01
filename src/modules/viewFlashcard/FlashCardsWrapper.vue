<template>
  <div class="flex flex-col gap-4">
    <FlashCard
      v-if="currentFlashcard"
      :flashcard="currentFlashcard"
      @single-flashcard-rated="handleSingleFlashcardRated"
    />
    <div v-else class="text-center">
      <p class="text-xl">No more flashcards to review!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Flashcard } from '@/shared/types/domainTypes'
import { Rating } from 'ts-fsrs'
import FlashCard from './FlashCard.vue'

const props = defineProps<{
  flashcards: Flashcard[]
}>()

const emit = defineEmits<{
  (e: 'single-flashcard-rated', flashcard: Flashcard, rating: Rating): void
  (e: 'all-flashcards-completed'): void
}>()

const currentIndex = ref(0)

const currentFlashcard = computed(() => {
  return props.flashcards[currentIndex.value] || null
})

const handleSingleFlashcardRated = (rating: Rating) => {
  if (!currentFlashcard.value) return

  emit('single-flashcard-rated', currentFlashcard.value, rating)

  // Move to next flashcard
  currentIndex.value++
}

// Watch for when we've gone through all flashcards
watch(currentIndex, (newIndex) => {
  if (newIndex >= props.flashcards.length) {
    emit('all-flashcards-completed')
  }
})
</script>
