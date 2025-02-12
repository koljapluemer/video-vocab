// src/utils/flashcardDeck.ts
import { getInitialCard } from '@/fsrs';
import { loadLocalData } from '@/composables/useLocalStorage';
import type { WordEntry, FlashcardData } from '@/types';

const VOCAB_ITEMS_KEY = 'items';
const VOCAB_BLACKLIST_KEY = 'vocabBlacklist';

/**
 * Loads the blacklist (array of words) from localStorage.
 */
function loadBlacklist(): string[] {
    const list = localStorage.getItem(VOCAB_BLACKLIST_KEY);
    return list ? JSON.parse(list) : [];
}

/**
 * Shuffles an array using the Fisher–Yates algorithm.
 * @param array Array to shuffle.
 * @returns A new, shuffled array.
 */
function shuffleArray<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Checks if a given FSRS card is due for review.
 * @param card FSRS card object.
 * @returns True if the card is due or has no due date.
 */
function isDue(card: any): boolean {
    if (!card) return true;
    const dueDate = new Date(card.due);
    const isDue = dueDate <= new Date();
    return isDue;
}

/**
 * Builds the flashcard deck for the current segment.
 *
 * - Uses only words from the current segment (filtered by videoId, start, duration).
 * - Excludes words that appear on the blacklist.
 * - Duplicates words that have never been seen before.
 * - Adds an extra 30% (by count) of due vocabulary from outside the segment.
 * - Shuffles the resulting deck.
 *
 * @param videoId The current video ID.
 * @param currentSegment An object with at least `start` and `duration` properties.
 * @param words The complete list of vocabulary words.
 * @returns An array of FlashcardData.
 */
export function buildFlashcardDeck(
    videoId: string,
    currentSegment: { start: number; duration: number },
    words: WordEntry[]
): FlashcardData[] {
    const blacklist = new Set(loadBlacklist());
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
    const uniqueFlashcards: FlashcardData[] = relevantWords.map(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return {
            word: word.word,
            transliteration: word.transliteration,
            translation: word.translation,
            card: storedCard || getInitialCard(),
        };
    });

    // every new card is learned twice
    const neverSeen = uniqueFlashcards.filter(fc => fc.card.reps === 0).flatMap(fc => [{ ...fc }, { ...fc }]);
    // old cards are only lerned if they are due
    const seenAndDue = uniqueFlashcards.filter(fc => fc.card.reps !== 0 && isDue(fc.card));
    // const seenAndDue = uniqueFlashcards.filter(fc => fc.card.reps !== 0);
    let deck = [...neverSeen, ...seenAndDue];


    // Add extra vocab: 30% (of the unique count) from outside the segment that is due.
    const extraCount = Math.floor(0.3 * uniqueFlashcards.length);
    const relevantWordSet = new Set(relevantWords.map(word => word.word));
    const extraWords: WordEntry[] = words.filter(word => !relevantWordSet.has(word.word));
    const dueExtraWords = extraWords.filter(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return isDue(storedCard);
    });
    const shuffledDueExtra = shuffleArray(dueExtraWords);
    const selectedExtra = shuffledDueExtra.slice(0, extraCount);
    const extraFlashcards: FlashcardData[] = selectedExtra.map(word => {
        const cardKey = `card_${word.word}`;
        const storedCard = storedItems[cardKey];
        return {
            word: word.word,
            transliteration: word.transliteration,
            translation: word.translation,
            card: storedCard || getInitialCard(),
        };
    });
    deck = deck.concat(extraFlashcards);

    return shuffleArray(deck);
}

/**
 * Ensures that the next flashcard is not the same as the one just practiced.
 *
 * If the flashcard at the current index matches the last practiced word,
 * this function swaps it with another flashcard later in the deck.
 *
 * @param deck The deck of flashcards.
 * @param currentIndex The current index in the deck.
 * @param lastPracticedWord The last practiced word.
 * @returns The (potentially modified) deck.
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
