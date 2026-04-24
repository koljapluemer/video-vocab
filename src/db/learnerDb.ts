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

class LearnerDb extends Dexie {
  flashcards!: Table<SavedFlashcardRecord, string>

  constructor() {
    super('videoVocabLearnerDb')

    this.version(1).stores({
      flashcards: '&cardId, languageCode, state, due',
    })
  }
}

export const learnerDb = new LearnerDb()
