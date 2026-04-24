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
  flashcardStoreInternals,
  getCardStateCounts,
  getOrCreateCardsForWords,
} from './flashcardStore'

describe('flashcardStore', () => {
  beforeEach(() => {
    flashcardTable.bulkGet.mockReset()
    flashcardTable.bulkPut.mockReset()
    flashcardTable.get.mockReset()
    flashcardTable.put.mockReset()
    flashcardTable.toArray.mockReset()
  })

  it('creates empty cards when none are persisted yet', async () => {
    flashcardTable.bulkGet.mockResolvedValue([undefined])
    flashcardTable.bulkPut.mockResolvedValue(undefined)

    const cards = await getOrCreateCardsForWords('deu', [{ original: 'hallo', meanings: ['hello'] }])

    expect(cards).toHaveLength(1)
    expect(cards[0]?.original).toBe('hallo')
    expect(cards[0]?.languageCode).toBe('deu')
    expect(cards[0]?.state).toBe(State.New)
    expect(flashcardTable.bulkPut).toHaveBeenCalledTimes(1)
  })

  it('reuses persisted cards when they exist', async () => {
    const savedCard = flashcardStoreInternals.toSavedFlashcardRecord(
      createFlashcard('ciao', ['hello'], 'ita'),
    )
    savedCard.reps = 4
    flashcardTable.bulkGet.mockResolvedValue([savedCard])

    const cards = await getOrCreateCardsForWords('ita', [{ original: 'ciao', meanings: ['hello'] }])

    expect(cards[0]?.reps).toBe(4)
    expect(flashcardTable.bulkPut).not.toHaveBeenCalled()
  })

  it('strips Vue proxies before persisting new cards', async () => {
    flashcardTable.bulkGet.mockResolvedValue([undefined])
    flashcardTable.bulkPut.mockResolvedValue(undefined)

    const reactiveWord = reactive({ original: 'salut', meanings: ['hi'] })

    await getOrCreateCardsForWords('fra', [reactiveWord])

    const savedRecord = flashcardTable.bulkPut.mock.calls[0]?.[0]?.[0]
    expect(Array.isArray(savedRecord.meanings)).toBe(true)
    expect(savedRecord.meanings).toEqual(['hi'])
    expect(savedRecord.meanings).not.toBe(reactiveWord.meanings)
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
