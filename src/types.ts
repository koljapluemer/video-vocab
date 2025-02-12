// src/types.ts
export interface VideoSegment {
    text: string;
    start: number;
    duration: number;
}

export interface VideoData {
    videoId: string;
    segments: VideoSegment[];
}

export interface WordSegmentReference {
    videoId: string;
    start: number;
    duration: number;
}

export interface WordEntry {
    word: string;
    transliteration: string;
    translation: string;
    relevantForVideoSegments: WordSegmentReference[];
}

export interface FlashcardData {
    word: string;
    transliteration: string;
    translation: string;
    card: any; // ts-fsrs Card object
}
