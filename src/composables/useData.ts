import videosData from '@/assets/videos.json';
import wordsData from '@/assets/words.json';
import type { VideoData, WordEntry } from '@/types';

export function useData() {
    const getVideos = (): VideoData[] => videosData;
    const getWords = (): WordEntry[] => wordsData;
    return { getVideos, getWords };
}
