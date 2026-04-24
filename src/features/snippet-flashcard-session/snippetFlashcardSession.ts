import { createFlashcard, type Flashcard } from '@/entities/flashcard/flashcard'
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

export function buildFlashcardsFromWords(words: Word[]): Flashcard[] {
  return deduplicateWords(words).map((word) => createFlashcard(word.original, word.meanings))
}

export function buildFlashcardsFromSnippets(snippets: Snippet[]): Flashcard[] {
  return buildFlashcardsFromWords(snippets.flatMap((snippet) => snippet.words))
}

export async function getFlashcardsForSnippet(
  languageCode: string,
  videoId: string,
  snippetIndex: number,
): Promise<Flashcard[]> {
  const words = await getWordsOfSnippet(languageCode, videoId, snippetIndex)
  return buildFlashcardsFromWords(words)
}
