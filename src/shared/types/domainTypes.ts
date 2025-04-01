import { Card } from "ts-fsrs";

export interface Word {
    original: string;
    meanings: string[];
}

export interface Flashcard extends Card, Word {
}

export interface Snippet {
    words: Word[];
    start: number;
    duration: number;
}


