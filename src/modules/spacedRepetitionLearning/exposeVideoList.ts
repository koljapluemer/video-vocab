export interface Video {
  youtubeId: string;
  languageCode: string;
}

interface VideoData {
  subtitle_language: string;
  videos: Array<{ id: string }>;
}

interface VideosJson {
  [languageCode: string]: VideoData;
}

export async function getAllVideos(): Promise<Video[]> {
  const response = await fetch('/data/videos.json');
  const data = await response.json() as VideosJson;

  const videos: Video[] = [];
  for (const [languageCode, languageData] of Object.entries(data)) {
    for (const video of languageData.videos) {
      videos.push({ youtubeId: video.id, languageCode });
    }
  }

  return videos;
}

export async function getAllVideosWithLanguageCode(languageCode: string): Promise<Video[]> {
  const videos = await getAllVideos();
  return videos.filter((video) => video.languageCode === languageCode);
}


