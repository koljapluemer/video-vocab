import { createEmptyCard, type Card } from 'ts-fsrs'

export interface Flashcard extends Card {
  cardId: string
  languageCode: string
  original: string
  meanings: string[]
}

export type FlashcardReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface FlashcardWord {
  original: string
  meanings: string[]
}

export function buildFlashcardId(languageCode: string, original: string, meanings: string[]): string {
  return `${languageCode}::${original}::${meanings.join('|')}`
}

export function createFlashcard(
  original: string,
  meanings: string[],
  languageCode = '',
): Flashcard {
  return {
    ...createEmptyCard(),
    cardId: buildFlashcardId(languageCode, original, meanings),
    languageCode,
    original,
    meanings,
  }
}

export function flashcardWasNeverSeenBefore(flashcard: Flashcard): boolean {
  return flashcard.reps === 0
}
