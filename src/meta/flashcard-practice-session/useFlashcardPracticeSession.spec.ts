import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Rating } from 'ts-fsrs'

const {
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
} = vi.hoisted(() => ({
  applyRating: vi.fn(),
  createCardForWord: vi.fn(),
  getSavedCardsForWords: vi.fn(),
}))

vi.mock('@/entities/flashcard/flashcardStore', () => ({
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
}))

import { useFlashcardPracticeSession } from './useFlashcardPracticeSession'

describe('useFlashcardPracticeSession', () => {
  beforeEach(() => {
    applyRating.mockReset()
    createCardForWord.mockReset()
    getSavedCardsForWords.mockReset()
  })

  it('prioritizes due seen cards before any new introductions', async () => {
    getSavedCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::hallo',
        languageCode: 'deu',
        original: 'hallo',
        meanings: ['hello'],
        due: new Date('2026-04-20T10:00:00'),
        stability: 1,
        difficulty: 1,
        elapsed_days: 1,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 2,
        lapses: 0,
        state: 2,
      },
    ])

    const practice = useFlashcardPracticeSession('deu')
    await practice.load([
      {
        word: { original: 'hallo', meanings: ['hello'] },
        occurrences: 1,
      },
      {
        word: { original: 'welt', meanings: ['world'] },
        occurrences: 1,
      },
    ])

    expect(practice.currentPracticeFlashcard.value?.original).toBe('hallo')
    expect(practice.currentIntroduction.value).toBeNull()
  })

  it('introduces the most frequent unseen word once no cards are due', async () => {
    getSavedCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::hallo',
        languageCode: 'deu',
        original: 'hallo',
        meanings: ['hello'],
        due: new Date('2026-04-30T10:00:00'),
        stability: 1,
        difficulty: 1,
        elapsed_days: 1,
        scheduled_days: 5,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
      },
    ])

    const practice = useFlashcardPracticeSession('deu')
    await practice.load([
      {
        word: { original: 'welt', meanings: ['world', 'earth'] },
        occurrences: 2,
      },
      {
        word: { original: 'hallo', meanings: ['hello'] },
        occurrences: 1,
      },
    ])

    expect(practice.currentIntroduction.value?.word.original).toBe('welt')
    expect(practice.currentPracticeFlashcard.value).toBeNull()
  })

  it('does not immediately practice the card that was just introduced', async () => {
    getSavedCardsForWords.mockResolvedValue([])
    createCardForWord.mockResolvedValue({
      cardId: 'deu::welt',
      languageCode: 'deu',
      original: 'welt',
      meanings: ['world', 'earth'],
      due: new Date('2026-04-20T10:00:00'),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      learning_steps: 0,
      reps: 0,
      lapses: 0,
      state: 0,
    })

    const practice = useFlashcardPracticeSession('deu')
    await practice.load([
      {
        word: { original: 'welt', meanings: ['world', 'earth'] },
        occurrences: 2,
      },
      {
        word: { original: 'hallo', meanings: ['hello'] },
        occurrences: 1,
      },
    ])
    await practice.rememberCurrentIntroduction()

    expect(createCardForWord).toHaveBeenCalledWith('deu', {
      original: 'welt',
      meanings: ['world', 'earth'],
    })
    expect(practice.currentIntroduction.value?.word.original).toBe('hallo')
    expect(practice.currentPracticeFlashcard.value).toBeNull()
  })

  it('updates progress and advances to the next introduction after rating the current card', async () => {
    getSavedCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::hallo',
        languageCode: 'deu',
        original: 'hallo',
        meanings: ['hello'],
        due: new Date('2026-04-20T10:00:00'),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
      },
    ])

    const practice = useFlashcardPracticeSession('deu')
    await practice.load([
      {
        word: { original: 'hallo', meanings: ['hello'] },
        occurrences: 1,
      },
      {
        word: { original: 'welt', meanings: ['world'] },
        occurrences: 1,
      },
    ])

    const flashcard = practice.currentPracticeFlashcard.value!

    applyRating.mockResolvedValue({
      ...flashcard,
      due: new Date('2026-04-30T12:00:00'),
      reps: 1,
      last_review: new Date('2026-04-26T12:00:00'),
    })

    await practice.rateFlashcard(flashcard, Rating.Good)

    expect(applyRating).toHaveBeenCalledWith(
      'deu::hallo',
      Rating.Good,
      expect.any(Date),
    )
    expect(flashcard.reps).toBe(1)
    expect(practice.currentIntroduction.value?.word.original).toBe('welt')
    expect(practice.currentPracticeFlashcard.value).toBeNull()
    expect(practice.progressUpdatedAt.value).toBeGreaterThan(0)
  })
})
