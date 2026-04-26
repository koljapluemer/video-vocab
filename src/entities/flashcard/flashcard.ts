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

export function normalizeMeanings(meanings: string[]): string[] {
  const normalizedMeanings: string[] = []

  for (const meaning of meanings) {
    const trimmedMeaning = meaning.trim()
    if (!trimmedMeaning || normalizedMeanings.includes(trimmedMeaning)) {
      continue
    }

    normalizedMeanings.push(trimmedMeaning)
  }

  return normalizedMeanings
}

export function mergeFlashcardWords<T extends FlashcardWord>(words: T[]): T[] {
  const uniqueWords = new Map<string, T>()

  for (const word of words) {
    const existingWord = uniqueWords.get(word.original)
    if (!existingWord) {
      uniqueWords.set(word.original, {
        ...word,
        meanings: normalizeMeanings(word.meanings),
      })
      continue
    }

    existingWord.meanings = normalizeMeanings([...existingWord.meanings, ...word.meanings])
  }

  return Array.from(uniqueWords.values())
}

export function buildFlashcardId(languageCode: string, original: string): string {
  return `${languageCode}::${original}`
}

export function createFlashcard(
  original: string,
  meanings: string[],
  languageCode = '',
): Flashcard {
  return {
    ...createEmptyCard(),
    cardId: buildFlashcardId(languageCode, original),
    languageCode,
    original,
    meanings: normalizeMeanings(meanings),
  }
}

export function flashcardWasNeverSeenBefore(flashcard: Flashcard): boolean {
  return flashcard.reps === 0
}
