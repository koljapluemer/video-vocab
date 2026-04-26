import type { FlashcardWord } from '@/entities/flashcard/flashcard'
import { flashcardWasNeverSeenBefore, mergeFlashcardWords, type Flashcard } from '@/entities/flashcard/flashcard'
import type { Snippet } from '@/entities/snippet/snippet'

export interface VideoVocabProgressCounts {
  seenNotDue: number
  seenDue: number
  notPracticedYet: number
  total: number
}

function deduplicateWords(words: FlashcardWord[]): FlashcardWord[] {
  return mergeFlashcardWords(words)
}

export function getUniqueVideoFlashcardWords(snippets: Snippet[]): FlashcardWord[] {
  return deduplicateWords(
    snippets.flatMap((snippet) =>
      snippet.words.map((word) => ({
        original: word.original,
        meanings: word.meanings,
      })),
    ),
  )
}

export function getVideoVocabProgressCounts(
  videoWords: FlashcardWord[],
  savedCards: Flashcard[],
  now: Date,
): VideoVocabProgressCounts {
  let seenNotDue = 0
  let seenDue = 0

  for (const flashcard of savedCards) {
    if (flashcardWasNeverSeenBefore(flashcard)) {
      continue
    }

    if (flashcard.due <= now) {
      seenDue += 1
      continue
    }

    seenNotDue += 1
  }

  const total = videoWords.length

  return {
    seenNotDue,
    seenDue,
    notPracticedYet: total - seenNotDue - seenDue,
    total,
  }
}
