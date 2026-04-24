<script setup lang="ts">
import { ref, watch } from 'vue'
import { Rating } from 'ts-fsrs'

import type { Flashcard, FlashcardReviewRating } from '@/entities/flashcard/flashcard'
import IndexCard from '@/dumb/index-card/IndexCard.vue'

import FlashCard from './FlashCard.vue'
import { useFlashCardStackHandler } from './flashcardStackHandler'

const props = defineProps<{
  flashcards: Flashcard[]
}>()

const emit = defineEmits<{
  (e: 'single-flashcard-rated', flashcard: Flashcard, rating: Rating): void
  (e: 'all-flashcards-completed'): void
}>()

const { rateFlashcardAndGetNext, getNextFlashcard } = useFlashCardStackHandler(props.flashcards)

const currentFlashcard = ref<Flashcard | undefined>(undefined)

currentFlashcard.value = getNextFlashcard()

const handleSingleFlashcardRated = (rating: Rating) => {
  if (!currentFlashcard.value) return

  const reviewRating: FlashcardReviewRating = rating === Rating.Again ? 'again' :
    rating === Rating.Hard ? 'hard' :
    rating === Rating.Good ? 'good' :
    'easy'

  emit('single-flashcard-rated', currentFlashcard.value, rating)
  currentFlashcard.value = rateFlashcardAndGetNext(currentFlashcard.value, reviewRating)
}

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
