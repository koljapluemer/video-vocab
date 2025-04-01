// this is the file that connects learning logic with the rest of the app
// it's responsible for combining the static per-video data with the learning logic
// and per-user data which will we be storing in a remote database (supabase)

import { Flashcard, Snippet } from "@/shared/types/domainTypes";
import { extractNumberOfSnippetsOfVideo, extractSnippetsOfVideo, extractWordsOfSnippet } from "./exposeStaticPerVideoData";
import { Card, createEmptyCard } from "ts-fsrs";

export async function getSnippetsOfVideo(videoId: string): Promise<Snippet[]> {
    const snippets = await extractSnippetsOfVideo(videoId);
    return snippets;
}

export async function getNumberOfSnippetsOfVideo(videoId: string): Promise<number> {
    const numberOfSnippets = await extractNumberOfSnippetsOfVideo(videoId);
    return numberOfSnippets;
}

export async function getFlashcardsForSnippet(videoId: string, snippetIndex: number): Promise<Flashcard[]> {
    const words = await extractWordsOfSnippet(videoId, snippetIndex);
    const flashcards: Flashcard[] = [];
    for (const word of words) {
        // for now, just use a new fsrs card; later we're going need to fetch from remote db
        const card: Card = createEmptyCard();
        flashcards.push({
            ...card,
            original: word.original,
            meanings: word.meanings,
        });
    }
    return flashcards;
}

