import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { Rating, State } from 'ts-fsrs'

import { createFlashcard } from './flashcard'

const { flashcardTable } = vi.hoisted(() => ({
  flashcardTable: {
    bulkGet: vi.fn(),
    bulkPut: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    toArray: vi.fn(),
  },
}))

vi.mock('@/db/learnerDb', () => ({
  learnerDb: {
    flashcards: flashcardTable,
  },
}))

import {
  applyRating,
  createCardForWord,
  flashcardStoreInternals,
  getCardStateCounts,
} from './flashcardStore'

describe('flashcardStore', () => {
  beforeEach(() => {
    flashcardTable.bulkGet.mockReset()
    flashcardTable.bulkPut.mockReset()
    flashcardTable.get.mockReset()
    flashcardTable.put.mockReset()
    flashcardTable.toArray.mockReset()
  })

  it('strips Vue proxies before persisting new cards', async () => {
    flashcardTable.get.mockResolvedValue(undefined)
    flashcardTable.put.mockResolvedValue(undefined)

    const reactiveWord = reactive({ original: 'salut', meanings: ['hi'] })

    await createCardForWord('fra', reactiveWord)

    const savedRecord = flashcardTable.put.mock.calls[0]?.[0]
    expect(Array.isArray(savedRecord.meanings)).toBe(true)
    expect(savedRecord.meanings).toEqual(['hi'])
    expect(savedRecord.meanings).not.toBe(reactiveWord.meanings)
  })

  it('creates a card only when explicitly requested', async () => {
    flashcardTable.get.mockResolvedValue(undefined)
    flashcardTable.put.mockResolvedValue(undefined)

    const createdCard = await createCardForWord('fra', { original: 'salut', meanings: ['hi'] })

    expect(createdCard.cardId).toBe('fra::salut')
    expect(flashcardTable.put).toHaveBeenCalledTimes(1)
    expect(flashcardTable.bulkPut).not.toHaveBeenCalled()
  })

  it('applies ratings and persists the updated card', async () => {
    const savedCard = flashcardStoreInternals.toSavedFlashcardRecord(
      createFlashcard('hola', ['hello'], 'spa'),
    )
    flashcardTable.get.mockResolvedValue(savedCard)
    flashcardTable.put.mockResolvedValue(undefined)

    const updatedCard = await applyRating(savedCard.cardId, Rating.Good, new Date('2026-04-24T12:00:00'))

    expect(updatedCard.reps).toBe(1)
    expect(updatedCard.last_review).toEqual(new Date('2026-04-24T12:00:00'))
    expect(flashcardTable.put).toHaveBeenCalledTimes(1)
  })

  it('returns counts grouped by card state', async () => {
    const newCard = flashcardStoreInternals.toSavedFlashcardRecord(createFlashcard('one', ['uno'], 'eng'))
    const reviewCard = flashcardStoreInternals.toSavedFlashcardRecord(createFlashcard('two', ['dos'], 'eng'))
    reviewCard.state = State.Review
    flashcardTable.toArray.mockResolvedValue([newCard, reviewCard])

    const counts = await getCardStateCounts()

    expect(counts[State.New]).toBe(1)
    expect(counts[State.Review]).toBe(1)
    expect(counts[State.Learning]).toBe(0)
    expect(counts[State.Relearning]).toBe(0)
  })
})
