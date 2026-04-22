export interface Video {
  youtubeId: string;
  languageCode: string;
  coverSubtitles: boolean;
}

export interface Course {
  languageCode: string;
  label: string;
  subtitleLanguage: string;
  direction: 'ltr' | 'rtl';
  videos: Video[];
}

interface CourseJson {
  languageCode: string;
  label: string;
  subtitleLanguage: string;
  direction: 'ltr' | 'rtl';
  videos: Array<{ id: string; coverSubtitles?: boolean }>;
}

interface IndexJson {
  courses: string[];
}

async function fetchCourse(languageCode: string): Promise<Course> {
  const response = await fetch(`/data/${languageCode}/course.json`);
  if (!response.ok) {
    throw new Error(`Failed to load course '${languageCode}'`);
  }

  const data = await response.json() as CourseJson;
  return {
    languageCode: data.languageCode,
    label: data.label,
    subtitleLanguage: data.subtitleLanguage,
    direction: data.direction,
    videos: data.videos.map((video) => ({
      youtubeId: video.id,
      languageCode: data.languageCode,
      coverSubtitles: video.coverSubtitles ?? false,
    })),
  };
}

export async function getAvailableCourseCodes(): Promise<string[]> {
  const response = await fetch('/data/index.json');
  if (!response.ok) {
    throw new Error('Failed to load course index');
  }

  const data = await response.json() as IndexJson;
  return data.courses;
}

export async function getAllCourses(): Promise<Course[]> {
  const courseCodes = await getAvailableCourseCodes();
  return Promise.all(courseCodes.map((languageCode) => fetchCourse(languageCode)));
}

export async function getCourse(languageCode: string): Promise<Course> {
  return fetchCourse(languageCode);
}

export async function getAllVideos(): Promise<Video[]> {
  const courses = await getAllCourses();
  return courses.flatMap((course) => course.videos);
}

export async function getAllVideosWithLanguageCode(languageCode: string): Promise<Video[]> {
  const course = await getCourse(languageCode);
  return course.videos;
}

export async function getVideoById(languageCode: string, videoId: string): Promise<Video | undefined> {
  const videos = await getAllVideosWithLanguageCode(languageCode);
  return videos.find((video) => video.youtubeId === videoId);
}
