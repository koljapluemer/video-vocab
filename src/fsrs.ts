// src/fsrs.ts
import { type Card, createEmptyCard, FSRS, type Grade, Rating } from "ts-fsrs";

/**
 * Creates and returns an initial card.
 *
 * @param date - (Optional) The date to use for initialization; defaults to the current system time.
 * @returns A new Card instance.
 */
export function getInitialCard(date: Date = new Date()): Card {
    return createEmptyCard(date);
}

/**
 * Rates a card using the ts-fsrs scheduling algorithm and returns the updated card.
 *
 * @param card - The Card instance to be rated.
 * @param rating - The user rating. Use the Rating enum provided by ts-fsrs (e.g., Rating.Again, Rating.Hard, Rating.Good, Rating.Easy).
 * @returns The updated Card instance scheduled for the next review.
 *
 * @example
 * import { getInitialCard, rateCard } from './fsrs';
 * import { Rating } from 'ts-fsrs';
 * 
 * let card = getInitialCard();
 * // Later, when the user rates the card as "Good":
 * card = rateCard(card, Rating.Good);
 */
export function rateCard(card: Card, rating: Grade): Card {
    const fsrs = new FSRS({});
    // Use fsrs.next to get a scheduling record log based on the current card, the current time, and the user rating.
    const recordLog = fsrs.next(card, new Date(), rating);
    // Return the updated card corresponding to the user rating.
    return recordLog.card;
}
