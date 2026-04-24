import type { FlashcardWord } from '@/entities/flashcard/flashcard'
import { getWordsOfSnippet, type Snippet, type Word } from '@/entities/snippet/snippet'

function deduplicateWords(words: Word[]): Word[] {
  const uniqueWords = new Map<string, Word>()

  for (const word of words) {
    const key = `${word.original}::${word.meanings.join('|')}`
    if (!uniqueWords.has(key)) {
      uniqueWords.set(key, word)
    }
  }

  return Array.from(uniqueWords.values())
}

export function buildFlashcardWords(words: Word[]): FlashcardWord[] {
  return deduplicateWords(words).map((word) => ({
    original: word.original,
    meanings: word.meanings,
  }))
}

export function buildFlashcardWordsFromSnippets(snippets: Snippet[]): FlashcardWord[] {
  return buildFlashcardWords(snippets.flatMap((snippet) => snippet.words))
}

export async function getFlashcardWordsForSnippet(
  languageCode: string,
  videoId: string,
  snippetIndex: number,
): Promise<FlashcardWord[]> {
  const words = await getWordsOfSnippet(languageCode, videoId, snippetIndex)
  return buildFlashcardWords(words)
}
