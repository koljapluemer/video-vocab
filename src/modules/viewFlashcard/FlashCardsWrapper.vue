<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Flashcard } from '@/shared/types/domainTypes'
import { Rating } from 'ts-fsrs'
import FlashCard from './FlashCard.vue'
import { useFlashCardStackHandler } from './flashCardStackHandler'
import { FlashCardButtonLabel } from '@/shared/types/uiTypes'
import IndexCard from './IndexCard.vue'

const props = defineProps<{
  flashcards: Flashcard[]
}>()

console.info('FlashcardsWrapper mounted with props:', {
  flashcardsCount: props.flashcards.length,
  flashcards: props.flashcards
})

const emit = defineEmits<{
  (e: 'single-flashcard-rated', flashcard: Flashcard, rating: Rating): void
  (e: 'all-flashcards-completed'): void
}>()

const { rateFlashcardAndGetNext, getNextFlashcard } = useFlashCardStackHandler(props.flashcards)

const currentFlashcard = ref<Flashcard | undefined>(undefined)

// Initialize with first flashcard
currentFlashcard.value = getNextFlashcard()

const handleSingleFlashcardRated = (rating: Rating) => {
  if (!currentFlashcard.value) return

  // Convert Rating to FlashCardButtonLabel
  const buttonLabel: FlashCardButtonLabel = rating === Rating.Again ? 'again' :
    rating === Rating.Hard ? 'hard' :
    rating === Rating.Good ? 'good' :
    'easy'

  // Handle the flashcard evaluation
  currentFlashcard.value  = rateFlashcardAndGetNext(currentFlashcard.value, buttonLabel)
}

// Watch for when we've gone through all flashcards
watch(currentFlashcard, (newFlashcard) => {
  if (!newFlashcard) {
    emit('all-flashcards-completed')
  }
})
</script>

<template>
  <div class="flex min-h-[32rem] w-full flex-col items-center justify-center gap-6">
    <FlashCard
      v-if="currentFlashcard"
      :flashcard="currentFlashcard"
      @single-flashcard-rated="handleSingleFlashcardRated"
    />
    <div v-else class="mx-auto w-full max-w-2xl">
      <IndexCard
        :rows="[
          { type: 'text', text: 'Done for now', size: 'auto' },
          { type: 'divider' },
          { type: 'text', text: 'No more flashcards to review.', size: 'normal' },
        ]"
      />
    </div>
  </div>
</template>
