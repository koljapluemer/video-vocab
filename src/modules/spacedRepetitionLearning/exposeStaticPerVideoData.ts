// this is the file that speaks with the per-video data in public/data/out
// every such JSON corresponds to a video, and data looks like:



// {
//   "snippets": [
//       {
//           "start": 0.08,
//           "duration": 5.04,
//           "words": [
//               {
//                   "native": "تعمل",
//                   "translation": "work"
//               },
//               {
//                   "native": "ايه",
//                   "translation": "what"
//               }
//           ]
//       },
//       {
//           "start": 2.919,
//           "duration": 4.44,
//           "words": [
//               {
//                   "native": "لا",
//                   "translation": "no"
//               }
//           ]
//       }
//   ]
// }

// this data should never be spoken to, except via the functions below


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

async function fetchVideoData(videoId: string): Promise<SavedVideoData> {
    const response = await fetch(`/data/out/${videoId}.json`);
    return response.json();
}

export async function extractNumberOfSnippetsOfVideo(videoId: string): Promise<number> {
    const videoData = await fetchVideoData(videoId);
    console.log(`extracted numberOfSnippetsOfVideo for ${videoId}: ${videoData.snippets.length}`)
    return videoData.snippets.length;
}

export async function extractSnippetsOfVideo(videoId: string): Promise<Snippet[]> {
    const videoData = await fetchVideoData(videoId);
    // we need data conversion here.
    // looking at the data above, the word list is not actually Word[]
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

export async function extractAllWordsOfVideo(videoId: string): Promise<Word[]> {
    const videoData = await fetchVideoData(videoId);
    return videoData.snippets
        .map((snippet) => snippet.words)
        .flat()
        .map(word => ({ original: word.native, meanings: [word.translation] }));
}

export async function extractWordsOfSnippet(videoId: string, snippetIndex: number): Promise<Word[]> {
    const videoData = await fetchVideoData(videoId);
    return videoData.snippets[snippetIndex].words.map(word => ({
        original: word.native,
        meanings: [word.translation]
    }));
}
