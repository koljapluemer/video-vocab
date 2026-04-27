export interface VideoVocabWord {
  original: string
  meanings: string[]
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
