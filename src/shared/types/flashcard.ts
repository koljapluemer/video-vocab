import { Card } from "ts-fsrs";

export interface Flashcard extends Card {
    original: string;
    meanings: string[];
}