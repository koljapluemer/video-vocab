import { ref } from 'vue'

import type { Flashcard, FlashcardReviewRating } from '@/entities/flashcard/flashcard'
import { shuffleArray } from '@/dumb/shuffleArray'

export function useFlashCardStackHandler(initialFlashcards: Flashcard[]) {
  const flashCardStack = ref<Flashcard[]>(initialFlashcards)
  flashCardStack.value = shuffleArray(flashCardStack.value)

  function rateFlashcardAndGetNext(
    flashcard: Flashcard,
    rating: FlashcardReviewRating,
  ): Flashcard | undefined {
    handleFlashcardEvaluated(flashcard, rating)
    return getNextFlashcard()
  }

  function getNextFlashcard(): Flashcard | undefined {
    return flashCardStack.value.shift()
  }

  function handleFlashcardEvaluated(flashcard: Flashcard, rating: FlashcardReviewRating) {
    if (rating === 'again') {
      if (flashCardStack.value.length <= 1) {
        return
      }

      const randomIndex = Math.floor(Math.random() * (flashCardStack.value.length - 1)) + 1
      flashCardStack.value.splice(randomIndex, 0, flashcard)
    } else if (rating === 'hard') {
      flashCardStack.value.push(flashcard)
    }
  }

  return {
    flashCardStack,
    getNextFlashcard,
    handleFlashcardEvaluated,
    rateFlashcardAndGetNext,
  }
}
