// src/utils/videoSegmentActions.ts
import { getInitialCard, rateCard } from '@/fsrs';
import { loadLocalData, saveLocalData } from '@/composables/useLocalStorage';
import type { VideoData, VideoSegment } from '@/types';
import { Rating } from 'ts-fsrs';

/**
 * Initializes and returns the FSRS card for a video segment.
 * @param videoId The video ID.
 * @param segmentIndex The index of the segment.
 * @returns An object with { segmentCard, segmentKey }.
 */
export function initSegmentCard(videoId: string, segmentIndex: number): { segmentCard: any; segmentKey: string } {
    const SEGMENT_ITEMS_KEY = 'segments';
    const segmentKey = `segment_${videoId}_${segmentIndex}`;
    const storedSegment = loadLocalData(SEGMENT_ITEMS_KEY)[segmentKey];
    const segmentCard = storedSegment || getInitialCard();
    return { segmentCard, segmentKey };
}

/**
 * Updates the FSRS card for the video segment based on the provided quality rating.
 * Saves the updated card to localStorage.
 * @param segmentCard The current segment FSRS card.
 * @param videoId The video ID.
 * @param segmentIndex The segment index.
 * @param quality The quality rating (0, 1, 2, or 3).
 * @returns The updated segment FSRS card.
 */
export function updateSegmentRating(
    segmentCard: any,
    videoId: string,
    segmentIndex: number,
    quality: number
): any {
    const SEGMENT_ITEMS_KEY = 'segments';
    let rating: Rating;
    switch (quality) {
        case 0: rating = Rating.Again; break;
        case 1: rating = Rating.Hard; break;
        case 2: rating = Rating.Good; break;
        case 3: rating = Rating.Easy; break;
        default: rating = Rating.Good;
    }
    const updatedCard = rateCard(segmentCard, rating);
    const segmentKey = `segment_${videoId}_${segmentIndex}`;
    saveLocalData(SEGMENT_ITEMS_KEY, { [segmentKey]: updatedCard });
    return updatedCard;
}

/**
 * Navigates to the flashcard practice page for repeating the current segment.
 * @param videoId The video ID.
 * @param segmentIndex The segment index.
 * @param router The Vue Router instance.
 */
export function repeatSegment(videoId: string, segmentIndex: number, router: any): void {
    router.push(`/flashcards/${videoId}/${segmentIndex}`);
}

/**
 * Navigates to the flashcard practice page for the next segment in the current video.
 * If no next segment exists, navigates to the completed page.
 * @param video The VideoData for the current video.
 * @param videoId The video ID.
 * @param segmentIndex The current segment index.
 * @param router The Vue Router instance.
 */
export function studyNextSegment(video: VideoData, videoId: string, segmentIndex: number, router: any): void {
    if (segmentIndex < video.segments.length - 1) {
        const nextSegmentIndex = segmentIndex + 1;
        router.push(`/flashcards/${videoId}/${nextSegmentIndex}`);
    } else {
        router.push('/completed');
    }
}

/**
 * Navigates to a scheduled (due) segment from the current video.
 * Searches among segments that have been studied before and are due.
 * If none are found, navigates to the next unstudied segment.
 * @param video The VideoData for the current video.
 * @param videoId The video ID.
 * @param router The Vue Router instance.
 */
export function studyScheduledSegment(video: VideoData, videoId: string, router: any): void {
    const SEGMENT_ITEMS_KEY = 'segments';
    const dueSegments: { segmentIndex: number }[] = [];
    video.segments.forEach((seg, idx) => {
        const key = `segment_${videoId}_${idx}`;
        const stored = loadLocalData(SEGMENT_ITEMS_KEY)[key];
        if (stored && stored.due && new Date(stored.due) <= new Date()) {
            dueSegments.push({ segmentIndex: idx });
        }
    });
    if (dueSegments.length > 0) {
        const randomIndex = Math.floor(Math.random() * dueSegments.length);
        const seg = dueSegments[randomIndex];
        router.push(`/flashcards/${videoId}/${seg.segmentIndex}`);
    } else {
        let nextUnstudied: number | null = null;
        for (let idx = 0; idx < video.segments.length; idx++) {
            const key = `segment_${videoId}_${idx}`;
            const stored = loadLocalData(SEGMENT_ITEMS_KEY)[key];
            if (!stored) {
                nextUnstudied = idx;
                break;
            }
        }
        if (nextUnstudied !== null) {
            router.push(`/flashcards/${videoId}/${nextUnstudied}`);
        } else {
            studyNextSegment(video, videoId, video.segments.length - 1, router);
        }
    }
}
