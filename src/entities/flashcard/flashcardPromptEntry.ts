import { normalizeMeanings, type FlashcardWord } from './flashcard'

export interface FlashcardPromptEntry {
  word: FlashcardWord
  occurrences: number
}

export function buildFlashcardPromptEntries(words: FlashcardWord[]): FlashcardPromptEntry[] {
  const entries = new Map<string, FlashcardPromptEntry>()

  for (const word of words) {
    const existingEntry = entries.get(word.original)

    if (existingEntry) {
      existingEntry.occurrences += 1
      existingEntry.word.meanings = normalizeMeanings([
        ...existingEntry.word.meanings,
        ...word.meanings,
      ])
      continue
    }

    entries.set(word.original, {
      word: {
        original: word.original,
        meanings: normalizeMeanings(word.meanings),
      },
      occurrences: 1,
    })
  }

  return Array.from(entries.values()).sort((left, right) => {
    if (right.occurrences !== left.occurrences) {
      return right.occurrences - left.occurrences
    }

    return left.word.original.localeCompare(right.word.original)
  })
}
