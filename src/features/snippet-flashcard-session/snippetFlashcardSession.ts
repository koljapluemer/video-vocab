import { mergeFlashcardWords, type FlashcardWord } from '@/entities/flashcard/flashcard'
import { getWordsOfSnippet, type Snippet, type Word } from '@/entities/snippet/snippet'

function deduplicateWords(words: Word[]): Word[] {
  return mergeFlashcardWords(words)
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
