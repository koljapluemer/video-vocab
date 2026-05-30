export interface Video {
  youtubeId: string
  languageCode: string
}

export interface Course {
  languageCode: string
  label: string
  subtitleLanguage: string
  direction: 'ltr' | 'rtl'
  videos: Video[]
}

type AvailableLanguagesJson = Record<string, string>

const EXPORT_ROOT = '/vv-data/2_export'
const RTL_LANGUAGE_CODES = new Set(['arz', 'ara', 'fas', 'heb', 'urd'])

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

async function getAvailableLanguages(): Promise<AvailableLanguagesJson> {
  return fetchJson<AvailableLanguagesJson>(`${EXPORT_ROOT}/available_languages.json`)
}

async function getVideoIds(languageCode: string): Promise<string[]> {
  return (await fetchText(`${EXPORT_ROOT}/${languageCode}/_index.txt`))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function toCourse(languageCode: string, label: string, videoIds: string[]): Course {
  return {
    languageCode,
    label,
    subtitleLanguage: 'en',
    direction: RTL_LANGUAGE_CODES.has(languageCode) ? 'rtl' : 'ltr',
    videos: videoIds.map((videoId) => ({
      youtubeId: videoId,
      languageCode,
    })),
  }
}

export async function getAvailableCourseCodes(): Promise<string[]> {
  return Object.keys(await getAvailableLanguages())
}

export async function getCourse(languageCode: string): Promise<Course> {
  const availableLanguages = await getAvailableLanguages()
  const label = availableLanguages[languageCode]

  if (!label) {
    throw new Error(`Unknown language '${languageCode}'`)
  }

  return toCourse(languageCode, label, await getVideoIds(languageCode))
}

export async function getAllCourses(): Promise<Course[]> {
  const availableLanguages = await getAvailableLanguages()
  const courseCodes = Object.keys(availableLanguages)

  return Promise.all(
    courseCodes.map(async (languageCode) =>
      toCourse(languageCode, availableLanguages[languageCode], await getVideoIds(languageCode)),
    ),
  )
}

export async function getAllVideosWithLanguageCode(languageCode: string): Promise<Video[]> {
  const course = await getCourse(languageCode)
  return course.videos
}

export async function getVideoById(languageCode: string, videoId: string): Promise<Video | undefined> {
  const videos = await getAllVideosWithLanguageCode(languageCode)
  return videos.find((video) => video.youtubeId === videoId)
}

export function pickRandomVideo(course: Course, excludeVideoId?: string): Video {
  const availableVideos = course.videos.filter((video) => video.youtubeId !== excludeVideoId)
  const source = availableVideos.length > 0 ? availableVideos : course.videos
  return source[Math.floor(Math.random() * source.length)]
}
