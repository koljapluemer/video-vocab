export interface Word {
  original: string
  meanings: string[]
}

export interface Snippet {
  words: Word[]
  start: number
  duration: number
}

interface SavedVideoData {
  snippets: Array<{
    start: number
    duration: number
    words: Array<{
      native: string
      translation: string
    }>
  }>
}

async function fetchVideoData(languageCode: string, videoId: string): Promise<SavedVideoData> {
  const response = await fetch(`/data/${languageCode}/videos/${videoId}.json`)
  if (!response.ok) {
    throw new Error(`Failed to load video data for '${languageCode}/${videoId}'`)
  }

  return (await response.json()) as SavedVideoData
}

function toWord(word: SavedVideoData['snippets'][number]['words'][number]): Word {
  return {
    original: word.native,
    meanings: [word.translation],
  }
}

function toSnippet(snippet: SavedVideoData['snippets'][number]): Snippet {
  return {
    words: snippet.words.map(toWord),
    start: snippet.start,
    duration: snippet.duration,
  }
}

export async function getNumberOfSnippetsOfVideo(languageCode: string, videoId: string): Promise<number> {
  const videoData = await fetchVideoData(languageCode, videoId)
  return videoData.snippets.length
}

export async function getSnippetsOfVideo(languageCode: string, videoId: string): Promise<Snippet[]> {
  const videoData = await fetchVideoData(languageCode, videoId)
  return videoData.snippets.map(toSnippet)
}

export async function getWordsOfSnippet(
  languageCode: string,
  videoId: string,
  snippetIndex: number,
): Promise<Word[]> {
  const videoData = await fetchVideoData(languageCode, videoId)
  const snippet = videoData.snippets[snippetIndex]
  if (!snippet) {
    throw new Error(`Snippet '${snippetIndex}' was not found for '${languageCode}/${videoId}'`)
  }

  return snippet.words.map(toWord)
}

export async function getSnippet(languageCode: string, videoId: string, snippetIndex: number): Promise<Snippet> {
  const videoData = await fetchVideoData(languageCode, videoId)
  const snippet = videoData.snippets[snippetIndex]
  if (!snippet) {
    throw new Error(`Snippet '${snippetIndex}' was not found for '${languageCode}/${videoId}'`)
  }

  return toSnippet(snippet)
}
