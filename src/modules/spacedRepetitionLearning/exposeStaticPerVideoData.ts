import { Snippet, Word } from "@/shared/types/domainTypes";

interface SavedVideoData {
    snippets: Array<{
        start: number;
        duration: number;
        words: Array<{
            native: string;
            translation: string;
        }>;
    }>;
}

async function fetchVideoData(languageCode: string, videoId: string): Promise<SavedVideoData> {
    const response = await fetch(`/data/${languageCode}/videos/${videoId}.json`);
    if (!response.ok) {
        throw new Error(`Failed to load video data for '${languageCode}/${videoId}'`);
    }

    return response.json();
}

export async function extractNumberOfSnippetsOfVideo(languageCode: string, videoId: string): Promise<number> {
    const videoData = await fetchVideoData(languageCode, videoId);
    console.log(`extracted numberOfSnippetsOfVideo for ${languageCode}/${videoId}: ${videoData.snippets.length}`)
    return videoData.snippets.length;
}

export async function extractSnippetsOfVideo(languageCode: string, videoId: string): Promise<Snippet[]> {
    const videoData = await fetchVideoData(languageCode, videoId);
    const snippets: Snippet[] = [];
    for (const snippet of videoData.snippets) {
        const words: Word[] = [];
        for (const word of snippet.words) {
            words.push({ original: word.native, meanings: [word.translation] });
        }
        snippets.push({ words, start: snippet.start, duration: snippet.duration });
    }
    return snippets
}

export async function extractAllWordsOfVideo(languageCode: string, videoId: string): Promise<Word[]> {
    const videoData = await fetchVideoData(languageCode, videoId);
    return videoData.snippets
        .map((snippet) => snippet.words)
        .flat()
        .map(word => ({ original: word.native, meanings: [word.translation] }));
}

export async function extractWordsOfSnippet(languageCode: string, videoId: string, snippetIndex: number): Promise<Word[]> {
    const videoData = await fetchVideoData(languageCode, videoId);
    return videoData.snippets[snippetIndex].words.map(word => ({
        original: word.native,
        meanings: [word.translation]
    }));
}

export async function extractSnippet(languageCode: string, videoId: string, snippetIndex: number): Promise<Snippet> {
    const videoData = await fetchVideoData(languageCode, videoId);
    const words: Word[] = videoData.snippets[snippetIndex].words.map(word => ({
        original: word.native,
        meanings: [word.translation]
    }));
    return { words, start: videoData.snippets[snippetIndex].start, duration: videoData.snippets[snippetIndex].duration };
}
