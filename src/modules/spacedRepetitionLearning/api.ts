import { Flashcard, Snippet } from "@/shared/types/domainTypes";
import { extractNumberOfSnippetsOfVideo, extractSnippet, extractSnippetsOfVideo, extractWordsOfSnippet } from "./exposeStaticPerVideoData";
import { Card, createEmptyCard } from "ts-fsrs";

export async function getSnippetsOfVideo(languageCode: string, videoId: string): Promise<Snippet[]> {
    const snippets = await extractSnippetsOfVideo(languageCode, videoId);
    return snippets;
}

export async function getNumberOfSnippetsOfVideo(languageCode: string, videoId: string): Promise<number> {
    const numberOfSnippets = await extractNumberOfSnippetsOfVideo(languageCode, videoId);
    return numberOfSnippets;
}

export async function getFlashcardsForSnippet(languageCode: string, videoId: string, snippetIndex: number): Promise<Flashcard[]> {
    const words = await extractWordsOfSnippet(languageCode, videoId, snippetIndex);
    const flashcards: Flashcard[] = [];
    for (const word of words) {
        const card: Card = createEmptyCard();
        flashcards.push({
            ...card,
            original: word.original,
            meanings: word.meanings,
        });
    }
    return flashcards;
}

export async function getSnippet(languageCode: string, videoId: string, snippetIndex: number): Promise<Snippet> {
    const snippet = await extractSnippet(languageCode, videoId, snippetIndex);
    return snippet;
}

export function flashCardWasNeverSeenBefore(flashcard: Flashcard) {
  return flashcard.reps === 0
}
