import { getItemsFromLocalStorage, type FSRSItem, isCardDue } from './fsrsManager';

/**
 * pickRandomQuestion
 * 
 * 1. Checks how many saved questions are due. If more than 5, pick one of them.
 * 2. Otherwise, pick a question not yet in local storage (if any remain).
 * 3. If no new questions remain, pick from any question.
 * 
 * Returns:
 *   - The chosen question.
 *   - The first word of that question.
 *   - A random first word taken from ALL possible questions.
 */
export function pickRandomQuestion(questions: string[]): {
    question: string;
    firstWord: string;
    randomFirstWord: string;
} {
    const items = getItemsFromLocalStorage();

    // Get the first words from all questions
    const allFirstWords = questions.map((q) => q.split(' ')[0] || '');

    // Which items are currently due?
    const dueItems: FSRSItem[] = items.filter((item) => isCardDue(item.card));

    let chosenQuestion = '';

    if (dueItems.length > 5) {
        console.log('More than 5 items are due. Picking from these.');
        // If more than 5 are due, pick from these
        const randomIndex = Math.floor(Math.random() * dueItems.length);
        chosenQuestion = dueItems[randomIndex].question;
    } else {
        console.log('Less than 5 items are due. Picking a new question.');
        // Otherwise pick a question not yet in 'items'
        const usedQuestions = items.map((i) => i.question);
        const newQuestions = questions.filter((q) => !usedQuestions.includes(q));

        // If there are no new questions left, just pick from all questions
        const candidateList = newQuestions.length > 0 ? newQuestions : questions;
        const randomIndex = Math.floor(Math.random() * candidateList.length);
        chosenQuestion = candidateList[randomIndex];
    }

    const splitChosen = chosenQuestion.split(' ');
    const firstWord = splitChosen[0] || '';

    // Pick a random first word from the entire question list
    const randomFirstWord = allFirstWords[Math.floor(Math.random() * allFirstWords.length)];

    return {
        question: chosenQuestion,
        firstWord,
        randomFirstWord,
    };
}
