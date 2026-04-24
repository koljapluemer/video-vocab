import type { FlashcardWord } from '@/entities/flashcard/flashcard'
import type { Snippet } from '@/entities/snippet/snippet'
import { buildFlashcardWords } from '@/features/snippet-flashcard-session/snippetFlashcardSession'

export function buildFlowDeckWords(snippets: Snippet[], snippetIndex: number): FlashcardWord[] {
  const words = [
    ...(snippets[snippetIndex]?.words ?? []),
    ...(snippets[snippetIndex + 1]?.words ?? []),
  ]

  return buildFlashcardWords(words)
}
