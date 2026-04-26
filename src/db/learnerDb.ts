import Dexie, { type Table } from 'dexie'

export interface SavedFlashcardRecord {
  cardId: string
  languageCode: string
  original: string
  meanings: string[]
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  lastReview: number | null
}

function normalizeMeanings(meanings: string[]): string[] {
  const normalizedMeanings: string[] = []

  for (const meaning of meanings) {
    const trimmedMeaning = meaning.trim()
    if (!trimmedMeaning || normalizedMeanings.includes(trimmedMeaning)) {
      continue
    }

    normalizedMeanings.push(trimmedMeaning)
  }

  return normalizedMeanings
}

function buildFlashcardCardId(languageCode: string, original: string): string {
  return `${languageCode}::${original}`
}

function pickPrimaryRecord(
  currentRecord: SavedFlashcardRecord,
  nextRecord: SavedFlashcardRecord,
): SavedFlashcardRecord {
  const currentReviewTimestamp = currentRecord.lastReview ?? -1
  const nextReviewTimestamp = nextRecord.lastReview ?? -1

  if (nextReviewTimestamp !== currentReviewTimestamp) {
    return nextReviewTimestamp > currentReviewTimestamp ? nextRecord : currentRecord
  }

  if (nextRecord.reps !== currentRecord.reps) {
    return nextRecord.reps > currentRecord.reps ? nextRecord : currentRecord
  }

  return nextRecord.due > currentRecord.due ? nextRecord : currentRecord
}

function mergeDuplicateFlashcards(records: SavedFlashcardRecord[]): SavedFlashcardRecord[] {
  const mergedRecords = new Map<string, SavedFlashcardRecord>()

  for (const record of records) {
    const mergedCardId = buildFlashcardCardId(record.languageCode, record.original)
    const existingRecord = mergedRecords.get(mergedCardId)

    if (!existingRecord) {
      mergedRecords.set(mergedCardId, {
        ...record,
        cardId: mergedCardId,
        meanings: normalizeMeanings(record.meanings),
      })
      continue
    }

    const primaryRecord = pickPrimaryRecord(existingRecord, record)
    const secondaryRecord = primaryRecord === existingRecord ? record : existingRecord

    mergedRecords.set(mergedCardId, {
      ...primaryRecord,
      cardId: mergedCardId,
      meanings: normalizeMeanings([...existingRecord.meanings, ...record.meanings]),
      reps: Math.max(primaryRecord.reps, secondaryRecord.reps),
      lapses: Math.max(primaryRecord.lapses, secondaryRecord.lapses),
    })
  }

  return Array.from(mergedRecords.values())
}

class LearnerDb extends Dexie {
  flashcards!: Table<SavedFlashcardRecord, string>

  constructor() {
    super('videoVocabLearnerDb')

    this.version(1).stores({
      flashcards: '&cardId, languageCode, state, due',
    })

    this.version(2)
      .stores({
        flashcards: '&cardId, languageCode, state, due',
      })
      .upgrade(async (transaction) => {
        const flashcardsTable = transaction.table<SavedFlashcardRecord, string>('flashcards')
        const existingRecords = await flashcardsTable.toArray()
        const mergedRecords = mergeDuplicateFlashcards(existingRecords)

        await flashcardsTable.clear()
        await flashcardsTable.bulkPut(mergedRecords)
      })
  }
}

export const learnerDb = new LearnerDb()
