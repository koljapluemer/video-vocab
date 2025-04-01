export interface Video {
  youtubeId: string;
  languageCode: string;
}

export async function getAllVideos(): Promise<Video[]> {
  const response = await fetch('/data/out/videos.json');
  const data = await response.json();

  const videos: Video[] = [];
  for (const [languageCode, videoIds] of Object.entries(data)) {
    for (const youtubeId of videoIds as string[]) {
      videos.push({ youtubeId, languageCode });
    }
  }

  return videos;
}

export async function getAllVideosWithLanguageCode(languageCode: string): Promise<Video[]> {
  const videos = await getAllVideos();
  return videos.filter((video) => video.languageCode === languageCode);
}


