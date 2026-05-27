export interface Word {
  original: string
  meanings: string[]
}

export interface Snippet {
  words: Word[]
  start: number
  duration: number
}

export interface MetaSegment {
  start: number
  end: number
  duration: number
  wordCount: number
  snippetStartIndex: number
  snippetEndIndex: number
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

export async function getSnippetsOfVideo(languageCode: string, videoId: string): Promise<Snippet[]> {
  const videoData = await fetchVideoData(languageCode, videoId)
  return videoData.snippets.map(toSnippet)
}

function createMetaSegment(snippet: Snippet, snippetIndex: number): MetaSegment {
  const end = snippet.start + snippet.duration

  return {
    start: snippet.start,
    end,
    duration: end - snippet.start,
    wordCount: snippet.words.length,
    snippetStartIndex: snippetIndex,
    snippetEndIndex: snippetIndex,
  }
}

function appendSnippetToMetaSegment(
  segment: MetaSegment,
  snippet: Snippet,
  snippetIndex: number,
): MetaSegment {
  const nextEnd = Math.max(segment.end, snippet.start + snippet.duration)

  return {
    start: segment.start,
    end: nextEnd,
    duration: nextEnd - segment.start,
    wordCount: segment.wordCount + snippet.words.length,
    snippetStartIndex: segment.snippetStartIndex,
    snippetEndIndex: snippetIndex,
  }
}

export function buildMetaSegments(snippets: Snippet[]): MetaSegment[] {
  const metaSegments: MetaSegment[] = []
  let currentSegment: MetaSegment | null = null

  for (const [snippetIndex, snippet] of snippets.entries()) {
    if (!currentSegment) {
      currentSegment = createMetaSegment(snippet, snippetIndex)
      continue
    }

    const shouldMergeSnippet =
      currentSegment.wordCount < 10 ||
      snippet.start < currentSegment.end

    if (shouldMergeSnippet) {
      currentSegment = appendSnippetToMetaSegment(currentSegment, snippet, snippetIndex)
      continue
    }

    metaSegments.push(currentSegment)
    currentSegment = createMetaSegment(snippet, snippetIndex)
  }

  if (!currentSegment) {
    return metaSegments
  }

  if (currentSegment.wordCount < 10 && metaSegments.length > 0) {
    const previousSegment = metaSegments[metaSegments.length - 1]!
    metaSegments[metaSegments.length - 1] = {
      start: previousSegment.start,
      end: Math.max(previousSegment.end, currentSegment.end),
      duration: Math.max(previousSegment.end, currentSegment.end) - previousSegment.start,
      wordCount: previousSegment.wordCount + currentSegment.wordCount,
      snippetStartIndex: previousSegment.snippetStartIndex,
      snippetEndIndex: currentSegment.snippetEndIndex,
    }
    return metaSegments
  }

  metaSegments.push(currentSegment)
  return metaSegments
}

export async function getMetaSegmentsOfVideo(
  languageCode: string,
  videoId: string,
): Promise<MetaSegment[]> {
  const snippets = await getSnippetsOfVideo(languageCode, videoId)
  return buildMetaSegments(snippets)
}
