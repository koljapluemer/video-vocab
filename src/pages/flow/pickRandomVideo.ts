import type { Course, Video } from '@/entities/course/course'

export function pickRandomVideo(course: Course, excludeVideoId?: string): Video {
  const availableVideos = course.videos.filter((video) => video.youtubeId !== excludeVideoId)
  const source = availableVideos.length > 0 ? availableVideos : course.videos
  return source[Math.floor(Math.random() * source.length)]
}
