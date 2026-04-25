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

interface CourseJson {
  languageCode: string
  label: string
  subtitleLanguage: string
  direction: 'ltr' | 'rtl'
  videos: Array<{ id: string }>
}

interface CourseIndexJson {
  courses: string[]
}

async function fetchCourseFile(languageCode: string): Promise<CourseJson> {
  const response = await fetch(`/data/${languageCode}/course.json`)
  if (!response.ok) {
    throw new Error(`Failed to load course '${languageCode}'`)
  }

  return (await response.json()) as CourseJson
}

function toCourse(data: CourseJson): Course {
  return {
    languageCode: data.languageCode,
    label: data.label,
    subtitleLanguage: data.subtitleLanguage,
    direction: data.direction,
    videos: data.videos.map((video) => ({
      youtubeId: video.id,
      languageCode: data.languageCode,
    })),
  }
}

export async function getAvailableCourseCodes(): Promise<string[]> {
  const response = await fetch('/data/index.json')
  if (!response.ok) {
    throw new Error('Failed to load course index')
  }

  const data = (await response.json()) as CourseIndexJson
  return data.courses
}

export async function getCourse(languageCode: string): Promise<Course> {
  return toCourse(await fetchCourseFile(languageCode))
}

export async function getAllCourses(): Promise<Course[]> {
  const courseCodes = await getAvailableCourseCodes()
  return Promise.all(courseCodes.map((languageCode) => getCourse(languageCode)))
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
