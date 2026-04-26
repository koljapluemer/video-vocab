export interface VideoVocabWord {
  original: string
  meanings: string[]
}

export interface VideoVocabEntry {
  word: VideoVocabWord
  occurrences: number
}

interface VideoVocabSourceSnippet {
  words: VideoVocabWord[]
}

function normalizeMeanings(meanings: string[]): string[] {
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

function mergeWords(words: VideoVocabWord[]): VideoVocabWord[] {
  const uniqueWords = new Map<string, VideoVocabWord>()

  for (const word of words) {
    const existingWord = uniqueWords.get(word.original)
    if (!existingWord) {
      uniqueWords.set(word.original, {
        original: word.original,
        meanings: normalizeMeanings(word.meanings),
      })
      continue
    }

    existingWord.meanings = normalizeMeanings([...existingWord.meanings, ...word.meanings])
  }

  return Array.from(uniqueWords.values())
}

export function getUniqueVideoVocabWords(snippets: VideoVocabSourceSnippet[]): VideoVocabWord[] {
  return mergeWords(
    snippets.flatMap((snippet) =>
      snippet.words.map((word) => ({
        original: word.original,
        meanings: [...word.meanings],
      })),
    ),
  )
}

export function buildVideoVocabEntries(snippets: VideoVocabSourceSnippet[]): VideoVocabEntry[] {
  const entries = new Map<string, VideoVocabEntry>()

  for (const snippet of snippets) {
    for (const snippetWord of snippet.words) {
      const existingEntry = entries.get(snippetWord.original)

      if (existingEntry) {
        existingEntry.occurrences += 1
        existingEntry.word.meanings = mergeWords([
          existingEntry.word,
          {
            original: snippetWord.original,
            meanings: [...snippetWord.meanings],
          },
        ])[0]!.meanings
        continue
      }

      entries.set(snippetWord.original, {
        word: {
          original: snippetWord.original,
          meanings: normalizeMeanings(snippetWord.meanings),
        },
        occurrences: 1,
      })
    }
  }

  return Array.from(entries.values()).sort((left, right) => {
    if (right.occurrences !== left.occurrences) {
      return right.occurrences - left.occurrences
    }

    return left.word.original.localeCompare(right.word.original)
  })
}
