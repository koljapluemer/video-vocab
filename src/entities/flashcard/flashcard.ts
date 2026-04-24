import { createEmptyCard, type Card } from 'ts-fsrs'

export interface Flashcard extends Card {
  original: string
  meanings: string[]
}

export type FlashcardReviewRating = 'again' | 'hard' | 'good' | 'easy'

export function createFlashcard(original: string, meanings: string[]): Flashcard {
  return {
    ...createEmptyCard(),
    original,
    meanings,
  }
}

export function flashcardWasNeverSeenBefore(flashcard: Flashcard): boolean {
  return flashcard.reps === 0
}
