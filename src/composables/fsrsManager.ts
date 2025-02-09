import {
    type Card,
    createEmptyCard,
    generatorParameters,
    type FSRSParameters,
    FSRS,
    type RecordLog,
    Rating,
} from 'ts-fsrs';

/**
 * FSRSItem ties a question to its FSRS Card data.
 */
export interface FSRSItem {
    question: string;
    card: Card;
}

/**
 * Helper: parse the dates in a stored Card so `card.due` and optionally
 * `card.last_review` are real Date objects again.
 */
function parseCardDates(card: Card): Card {
    card.due = new Date(card.due);
    if (card.last_review) {
        card.last_review = new Date(card.last_review);
    }
    return card;
}

/**
 * Retrieve FSRS items from localStorage. If none, return an empty array.
 */
export function getItemsFromLocalStorage(): FSRSItem[] {
    const data = localStorage.getItem('items');
    if (!data) return [];
    try {
        const items = JSON.parse(data) as FSRSItem[];
        // Make sure we convert 'due' and 'last_review' to Date objects
        return items.map((item) => {
            parseCardDates(item.card);
            return item;
        });
    } catch {
        // If JSON parsing fails, return empty
        return [];
    }
}

/**
 * Save FSRS items to localStorage.
 * (Will not remove other localStorage keys, only updates 'items'.)
 */
export function setItemsToLocalStorage(items: FSRSItem[]): void {
    localStorage.setItem('items', JSON.stringify(items));
}

/**
 * Check whether a card is due by comparing its 'due' date to now.
 */
export function isCardDue(card: Card): boolean {
    const now = new Date();
    return card.due.getTime() <= now.getTime();
}

/**
 * The user can optionally configure FSRS parameters.
 * For example, you could do:
 *
 *   const params: FSRSParameters = generatorParameters({ maximum_interval: 1000 });
 *
 * and then pass `params` to new FSRS(params).
 *
 * Below, we're not using any special config, but you can adapt as needed.
 */
const params: FSRSParameters = generatorParameters({ /* e.g., maximum_interval: 1000 */ });
const f: FSRS = new FSRS(params);

/**
 * scoreQuestion
 *
 * 1. Looks up an existing FSRS item (by question) or creates a new one.
 * 2. Invokes `f.repeat` to get scheduling info for the current review.
 * 3. Depending on isCorrect, picks the appropriate rating from the resulting RecordLog.
 * 4. Stores the updated Card back into local storage.
 *
 * @param question The question being scored
 * @param isCorrect true if user got it correct, false otherwise
 */
export function scoreQuestion(question: string, isCorrect: boolean): void {
    const items = getItemsFromLocalStorage();

    // Attempt to find existing item by question
    let fsrsItem = items.find((item) => item.question === question);

    // If not found, create a new Card
    if (!fsrsItem) {
        const newCard = createEmptyCard(); // current date by default
        fsrsItem = { question, card: newCard };
        items.push(fsrsItem);
    }

    // Update the scheduling based on the current date
    const scheduling_cards: RecordLog = f.repeat(fsrsItem.card, new Date());

    // Map isCorrect => a rating
    // For simplicity, assume "correct" => Good, "wrong" => Again
    const chosenRating = isCorrect ? Rating.Good : Rating.Again;

    // Grab the newly scheduled card from the record
    const newCard: Card = scheduling_cards[chosenRating].card;

    // Update the item
    fsrsItem.card = newCard;

    // Save to localStorage
    setItemsToLocalStorage(items);
}
