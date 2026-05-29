interface ExportSegment {
  endTimestamp: string
  index: number
  startTimestamp: string
  vocab: Record<string, string>
}

interface ExportVideoFile {
  segments: ExportSegment[]
  videoId: string
}

export interface ContextRound {
  durationSeconds: number
  languageCode: string
  languageLabel: string
  segmentIndex: number
  startSeconds: number
  videoId: string
  words: ContextRoundWord[]
}

const RANDOM_WORD_COUNT = 3

export interface ContextRoundWord {
  translation: string
  word: string
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load '${path}'`)
  }

  return (await response.json()) as T
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load '${path}'`)
  }

  return await response.text()
}

function parseTimestampToSeconds(timestamp: string): number {
  const [hoursPart, minutesPart, secondsPart] = timestamp.split(':')
  const hours = Number(hoursPart)
  const minutes = Number(minutesPart)
  const seconds = Number(secondsPart)

  if ([hours, minutes, seconds].some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid timestamp '${timestamp}'`)
  }

  return hours * 3600 + minutes * 60 + seconds
}

function pickRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: T[]): T[] {
  const nextItems = [...items]

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = nextItems[index]
    nextItems[index] = nextItems[swapIndex]
    nextItems[swapIndex] = currentItem
  }

  return nextItems
}

function getRandomWords(vocab: Record<string, string>): ContextRoundWord[] {
  return shuffle(
    Object.entries(vocab)
      .filter(([word, translation]) => word.trim().length > 0 && translation.trim().length > 0)
      .map(([word, translation]) => ({
        translation,
        word,
      })),
  ).slice(0, RANDOM_WORD_COUNT)
}

function getUsableSegments(videoFile: ExportVideoFile): ExportSegment[] {
  return videoFile.segments.filter((segment) => {
    const words = getRandomWords(segment.vocab)
    const startSeconds = parseTimestampToSeconds(segment.startTimestamp)
    const endSeconds = parseTimestampToSeconds(segment.endTimestamp)

    return words.length > 0 && endSeconds > startSeconds
  })
}

export async function loadRandomContextRound(languageCode: string): Promise<ContextRound> {
  const availableLanguages = await fetchJson<Record<string, string>>(
    '/vv-data/2_export/available_languages.json',
  )
  const languageLabel = availableLanguages[languageCode]

  if (!languageLabel) {
    throw new Error('The selected language is not available in vv-data.')
  }

  const videoIds = (await fetchText(`/vv-data/2_export/${languageCode}/_index.txt`))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (videoIds.length === 0) {
    throw new Error('No videos are available for this language yet.')
  }

  for (const videoId of shuffle(videoIds)) {
    try {
      const videoFile = await fetchJson<ExportVideoFile>(`/vv-data/2_export/${languageCode}/${videoId}.json`)
      const usableSegments = getUsableSegments(videoFile)

      if (usableSegments.length === 0) {
        continue
      }

      const segment = pickRandomItem(usableSegments)
      const startSeconds = parseTimestampToSeconds(segment.startTimestamp)
      const endSeconds = parseTimestampToSeconds(segment.endTimestamp)

      return {
        durationSeconds: endSeconds - startSeconds,
        languageCode,
        languageLabel,
        segmentIndex: segment.index,
        startSeconds,
        videoId: videoFile.videoId,
        words: getRandomWords(segment.vocab),
      }
    } catch (error) {
      console.error(`Failed to load practice round for video '${videoId}':`, error)
    }
  }

  throw new Error('Unable to find a usable segment right now.')
}
