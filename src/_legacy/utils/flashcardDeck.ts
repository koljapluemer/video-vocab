// src/utils/flashcardDeck.ts
import { getInitialCard } from '@/_legacy/fsrs';
import { loadLocalData } from '@/_legacy/composables/useLocalStorage';
import type { WordEntry, FlashcardData } from '@/_legacy/types';

const VOCAB_ITEMS_KEY = 'items';
const VOCAB_BLACKLIST_KEY = 'vocabBlacklist';

function loadBlacklist(): string[] {
    const list = localStorage.getItem(VOCAB_BLACKLIST_KEY);
    return list ? JSON.parse(list) : [];
}

function shuffleArray<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function isDue(card: any): boolean {
    if (!card) return true;
    const dueDate = new Date(card.due);
    return dueDate <= new Date();
}

/**
 * Builds the flashcard deck for the current segment.
 *
 * - Filters words that appear in the current segment (by matching videoId, start, and duration in relevantForVideoSegments).
 * - Excludes words that are blacklisted.
 * - For each matching word, creates a FlashcardData by looking up FSRS data (or creating a new card).
 * - Duplicates flashcards for words that have never been seen (reps === 0); for words that have been seen (reps > 0),
 *   include them only if their FSRS card is due.
 * - Adds extra vocabulary from outside the segment: 30% (by count) of the unique matching words that are due.
 * - Returns the full deck (shuffled).
 *
 * @param videoId The current video ID.
 * @param currentSegment An object with at least { start, duration }.
 * @param words The complete list of vocabulary (WordEntry[]).
 * @returns An array of FlashcardData.
 */
export function buildFlashcardDeck(
    videoId: string,
    currentSegment: { start: number; duration: number },
    words: WordEntry[]
): FlashcardData[] {
    const blacklist = new Set(loadBlacklist());

    // Select words that occur in the current segment.
    const relevantWords: WordEntry[] = words
        .filter(word =>
            word.relevantForVideoSegments.some(seg =>
                seg.videoId === videoId &&
                seg.start === currentSegment.start &&
                seg.duration === currentSegment.duration
            )
        )
        .filter(word => !blacklist.has(word.word));

    const storedItems = loadLocalData(VOCAB_ITEMS_KEY);

    // Map each relevant word to a FlashcardData.
    const uniqueFlashcards: FlashcardData[] = relevantWords.map(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return {
            word: word.word,
            transliteration: word.transliteration,
            relevantForVideoSegments: word.relevantForVideoSegments,
            card: storedCard || getInitialCard(),
        };
    });

    // Duplicate words that have never been seen (reps === 0)
    const neverSeen = uniqueFlashcards.filter(fc => fc.card.reps === 0)
        .flatMap(fc => [fc, fc]);

    // Include seen words only if they are due
    const seenAndDue = uniqueFlashcards.filter(fc => fc.card.reps !== 0 && isDue(fc.card));

    let deck = [...neverSeen, ...seenAndDue];

    // Add extra vocabulary from outside the current segment:
    const extraCount = Math.floor(0.3 * uniqueFlashcards.length);
    const relevantWordSet = new Set(relevantWords.map(word => word.word));
    const extraWords: WordEntry[] = words.filter(word => !relevantWordSet.has(word.word));

    const dueExtraWords = extraWords.filter(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        // only cards actually seen before can be due
        return isDue(storedCard) && storedCard && storedCard.reps > 0;
    });

    const shuffledDueExtra = shuffleArray(dueExtraWords);
    const selectedExtra = shuffledDueExtra.slice(0, extraCount);

    const extraFlashcards: FlashcardData[] = selectedExtra.map(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return {
            word: word.word,
            transliteration: word.transliteration,
            relevantForVideoSegments: word.relevantForVideoSegments,
            card: storedCard || getInitialCard(),
        };
    });

    deck = deck.concat(extraFlashcards);
    return shuffleArray(deck);
}

/**
 * Ensures that the next flashcard in the deck is not the same as the last practiced word.
 *
 * @param deck The current deck of FlashcardData.
 * @param currentIndex The index of the card about to be practiced.
 * @param lastPracticedWord The word that was just practiced.
 * @returns The (possibly modified) deck.
 */
export function ensureNonRepeatingNext(
    deck: FlashcardData[],
    currentIndex: number,
    lastPracticedWord: string | null
): FlashcardData[] {
    if (deck.length > 1 && lastPracticedWord) {
        if (deck[currentIndex].word === lastPracticedWord) {
            for (let i = currentIndex + 1; i < deck.length; i++) {
                if (deck[i].word !== lastPracticedWord) {
                    [deck[currentIndex], deck[i]] = [deck[i], deck[currentIndex]];
                    break;
                }
            }
        }
    }
    return deck;
}
