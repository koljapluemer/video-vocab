import type { Flashcard } from '@/entities/flashcard/flashcard'
import type { Snippet } from '@/entities/snippet/snippet'
import { buildFlashcardsFromWords } from '@/features/snippet-flashcard-session/snippetFlashcardSession'

export function buildFlowDeck(snippets: Snippet[], snippetIndex: number): Flashcard[] {
  const words = [
    ...(snippets[snippetIndex]?.words ?? []),
    ...(snippets[snippetIndex + 1]?.words ?? []),
  ]

  return buildFlashcardsFromWords(words)
}
