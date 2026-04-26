import { fsrs, Rating, State } from 'ts-fsrs'

import { learnerDb, type SavedFlashcardRecord } from '@/db/learnerDb'

import {
  buildFlashcardId,
  createFlashcard,
  mergeFlashcardWords,
  normalizeMeanings,
  type Flashcard,
  type FlashcardWord,
} from './flashcard'

const scheduler = fsrs()

export interface LanguageWordStats {
  languageCode: string
  total: number
  stateCounts: Record<State, number>
}

function toPlainMeanings(meanings: string[]): string[] {
  return [...normalizeMeanings(meanings)]
}

function toSavedFlashcardRecord(flashcard: Flashcard): SavedFlashcardRecord {
  return {
    cardId: flashcard.cardId,
    languageCode: flashcard.languageCode,
    original: flashcard.original,
    meanings: toPlainMeanings(flashcard.meanings),
    due: flashcard.due.getTime(),
    stability: flashcard.stability,
    difficulty: flashcard.difficulty,
    elapsed_days: flashcard.elapsed_days,
    scheduled_days: flashcard.scheduled_days,
    learning_steps: flashcard.learning_steps,
    reps: flashcard.reps,
    lapses: flashcard.lapses,
    state: flashcard.state,
    lastReview: flashcard.last_review?.getTime() ?? null,
  }
}

function toFlashcard(record: SavedFlashcardRecord): Flashcard {
  return {
    cardId: record.cardId,
    languageCode: record.languageCode,
    original: record.original,
    meanings: toPlainMeanings(record.meanings),
    due: new Date(record.due),
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsed_days,
    scheduled_days: record.scheduled_days,
    learning_steps: record.learning_steps,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state as State,
    last_review: record.lastReview === null ? undefined : new Date(record.lastReview),
  }
}

function deduplicateWords(words: FlashcardWord[]): FlashcardWord[] {
  return mergeFlashcardWords(words)
}

function createPersistedFlashcard(languageCode: string, word: FlashcardWord): Flashcard {
  return createFlashcard(word.original, toPlainMeanings(word.meanings), languageCode)
}

export async function createCardForWord(
  languageCode: string,
  word: FlashcardWord,
): Promise<Flashcard> {
  const cardId = buildFlashcardId(languageCode, word.original)
  const existingCard = await learnerDb.flashcards.get(cardId)

  if (existingCard) {
    const mergedMeanings = toPlainMeanings([...existingCard.meanings, ...word.meanings])
    if (mergedMeanings.join('|') !== existingCard.meanings.join('|')) {
      const updatedCard = {
        ...existingCard,
        meanings: mergedMeanings,
      }
      await learnerDb.flashcards.put(updatedCard)
      return toFlashcard(updatedCard)
    }

    return toFlashcard(existingCard)
  }

  const freshCard = createPersistedFlashcard(languageCode, word)
  await learnerDb.flashcards.put(toSavedFlashcardRecord(freshCard))
  return freshCard
}

export async function getOrCreateCardsForWords(
  languageCode: string,
  words: FlashcardWord[],
): Promise<Flashcard[]> {
  const uniqueWords = deduplicateWords(words)
  const cardIds = uniqueWords.map((word) => buildFlashcardId(languageCode, word.original))
  const savedCards = await learnerDb.flashcards.bulkGet(cardIds)
  const flashcards: Flashcard[] = []
  const recordsToCreate: SavedFlashcardRecord[] = []
  const recordsToUpdate: SavedFlashcardRecord[] = []

  uniqueWords.forEach((word, index) => {
    const savedCard = savedCards[index]
    if (savedCard) {
      const mergedMeanings = toPlainMeanings([...savedCard.meanings, ...word.meanings])
      if (mergedMeanings.join('|') !== savedCard.meanings.join('|')) {
        const updatedRecord = {
          ...savedCard,
          meanings: mergedMeanings,
        }
        flashcards.push(toFlashcard(updatedRecord))
        recordsToUpdate.push(updatedRecord)
        return
      }

      flashcards.push(toFlashcard(savedCard))
      return
    }

    const freshCard = createPersistedFlashcard(languageCode, word)
    flashcards.push(freshCard)
    recordsToCreate.push(toSavedFlashcardRecord(freshCard))
  })

  const recordsToPersist = [...recordsToCreate, ...recordsToUpdate]
  if (recordsToPersist.length > 0) {
    await learnerDb.flashcards.bulkPut(recordsToPersist)
  }

  return flashcards
}

export async function getSavedCardsForWords(
  languageCode: string,
  words: FlashcardWord[],
): Promise<Flashcard[]> {
  const uniqueWords = deduplicateWords(words)
  const cardIds = uniqueWords.map((word) => buildFlashcardId(languageCode, word.original))
  const savedCards = await learnerDb.flashcards.bulkGet(cardIds)

  return savedCards.flatMap((savedCard) => (savedCard ? [toFlashcard(savedCard)] : []))
}

export async function applyRating(cardId: string, rating: Rating, reviewedAt: Date): Promise<Flashcard> {
  const savedCard = await learnerDb.flashcards.get(cardId)
  if (!savedCard) {
    throw new Error(`Flashcard '${cardId}' was not found in learner storage`)
  }

  const result = scheduler.next(toFlashcard(savedCard), reviewedAt, rating as 1 | 2 | 3 | 4)
  const updatedCard: Flashcard = {
    ...result.card,
    cardId: savedCard.cardId,
    languageCode: savedCard.languageCode,
    original: savedCard.original,
    meanings: savedCard.meanings,
  }

  await learnerDb.flashcards.put(toSavedFlashcardRecord(updatedCard))

  return updatedCard
}

export async function getCardStateCounts(): Promise<Record<State, number>> {
  const counts: Record<State, number> = {
    [State.New]: 0,
    [State.Learning]: 0,
    [State.Review]: 0,
    [State.Relearning]: 0,
  }

  const savedCards = await learnerDb.flashcards.toArray()
  for (const card of savedCards) {
    const state = card.state as State
    counts[state] += 1
  }

  return counts
}

export async function getWordStatsByLanguage(): Promise<LanguageWordStats[]> {
  const statsByLanguage = new Map<string, LanguageWordStats>()
  const savedCards = await learnerDb.flashcards.toArray()

  for (const card of savedCards) {
    const existingStats = statsByLanguage.get(card.languageCode) ?? {
      languageCode: card.languageCode,
      total: 0,
      stateCounts: {
        [State.New]: 0,
        [State.Learning]: 0,
        [State.Review]: 0,
        [State.Relearning]: 0,
      },
    }

    existingStats.total += 1
    existingStats.stateCounts[card.state as State] += 1
    statsByLanguage.set(card.languageCode, existingStats)
  }

  return Array.from(statsByLanguage.values()).sort((left, right) =>
    left.languageCode.localeCompare(right.languageCode),
  )
}

export const flashcardStoreInternals = {
  deduplicateWords,
  toFlashcard,
  toSavedFlashcardRecord,
}
