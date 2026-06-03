export interface LazySegment {
  index: number
  startSeconds: number
  endSeconds: number
  vocab: Record<string, string>
}

export interface LazyVideo {
  aspectRatio: number
  videoId: string
  languageCode: string
  segments: LazySegment[]
}

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

async function fetchAspectRatio(videoId: string): Promise<number> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    )
    if (!res.ok) return 16 / 9
    const data = (await res.json()) as { width: number; height: number }
    return data.width / data.height
  } catch {
    return 16 / 9
  }
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

  if ([hours, minutes, seconds].some((v) => Number.isNaN(v))) {
    throw new Error(`Invalid timestamp '${timestamp}'`)
  }

  return hours * 3600 + minutes * 60 + seconds
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

function parseSegments(videoFile: ExportVideoFile): LazySegment[] {
  return videoFile.segments
    .map((seg) => {
      const startSeconds = parseTimestampToSeconds(seg.startTimestamp)
      const endSeconds = parseTimestampToSeconds(seg.endTimestamp)
      return { index: seg.index, startSeconds, endSeconds, vocab: seg.vocab }
    })
    .filter(
      (seg) =>
        seg.endSeconds > seg.startSeconds &&
        Object.keys(seg.vocab).some((w) => w.trim() && seg.vocab[w].trim()),
    )
}

export async function loadLazyVideoById(languageCode: string, videoId: string): Promise<LazyVideo> {
  const videoFile = await fetchJson<ExportVideoFile>(`/vv-data/2_export/${languageCode}/${videoId}.json`)
  const segments = parseSegments(videoFile)
  if (segments.length === 0) throw new Error(`No valid segments in video '${videoId}'.`)
  const aspectRatio = await fetchAspectRatio(videoFile.videoId)
  return { aspectRatio, videoId: videoFile.videoId, languageCode, segments }
}

export async function loadRandomLazyVideo(languageCode: string): Promise<LazyVideo> {
  const videoIds = (await fetchText(`/vv-data/2_export/${languageCode}/_index.txt`))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (videoIds.length === 0) {
    throw new Error('No videos.')
  }

  for (const videoId of shuffle(videoIds)) {
    try {
      const videoFile = await fetchJson<ExportVideoFile>(
        `/vv-data/2_export/${languageCode}/${videoId}.json`,
      )
      const segments = parseSegments(videoFile)

      if (segments.length === 0) {
        continue
      }

      const aspectRatio = await fetchAspectRatio(videoFile.videoId)
      return { aspectRatio, videoId: videoFile.videoId, languageCode, segments }
    } catch (error) {
      console.error(`Failed to load lazy video '${videoId}':`, error)
    }
  }

  throw new Error('No video available.')
}
