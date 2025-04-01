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

export async function extractNumberOfSnippetsOfVideo(videoId: string): Promise<number> {
    const videoData = await import(`@/data/out/${videoId}.json`);
    return videoData.snippets.length;
}

export async function extractSnippetsOfVideo(videoId: string): Promise<Snippet[]> {
    const videoData = await import(`@/data/out/${videoId}.json`);
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
    const videoData = await import(`@/data/out/${videoId}.json`);
    return videoData.snippets.map((snippet: any) => snippet.words).flat();
}

export async function extractWordsOfSnippet(videoId: string, snippetIndex: number): Promise<Word[]> {
    const videoData = await import(`@/data/out/${videoId}.json`);
    return videoData.snippets[snippetIndex].words;
}
