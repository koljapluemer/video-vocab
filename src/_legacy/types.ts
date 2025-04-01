// src/types.ts

// A single occurrence of a word in a video segment.
export interface WordSegmentReference {
    videoId: string;
    start: number;
    duration: number;
    translation: string;
}

// A learning item for an Arabic word.  
// If there are multiple meanings for the same Arabic string, they are stored as separate items using composite keys.
export interface WordEntry {
    word: string; // May include a composite suffix, e.g. "تعرفي__0"
    transliteration: string;
    relevantForVideoSegments: WordSegmentReference[];
}

// A flashcard extends a WordEntry by adding FSRS state.
export interface FlashcardData extends WordEntry {
    card: any; // FSRS Card object (from ts-fsrs)
}

// A video segment (from the transcript).
export interface VideoSegment {
    text: string;
    start: number;
    duration: number;
}

// Overall video data.
export interface VideoData {
    videoId: string;
    segments: VideoSegment[];
}

// For display purposes, an aggregated meaning for a word.
export interface AggregatedMeaning {
    transliteration: string;
    translation: string;
    isPrimary: boolean;
}
