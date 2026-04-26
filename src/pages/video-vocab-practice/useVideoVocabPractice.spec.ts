import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Rating } from 'ts-fsrs'

const {
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
  getSnippetsOfVideo,
} = vi.hoisted(() => ({
  applyRating: vi.fn(),
  createCardForWord: vi.fn(),
  getSavedCardsForWords: vi.fn(),
  getSnippetsOfVideo: vi.fn(),
}))

vi.mock('@/entities/snippet/snippet', () => ({
  getSnippetsOfVideo,
}))

vi.mock('@/entities/flashcard/flashcardStore', () => ({
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
}))

import { useVideoVocabPractice } from './useVideoVocabPractice'

describe('useVideoVocabPractice', () => {
  beforeEach(() => {
    applyRating.mockReset()
    createCardForWord.mockReset()
    getSavedCardsForWords.mockReset()
    getSnippetsOfVideo.mockReset()
  })

  it('prioritizes due seen cards before any new introductions', async () => {
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 2,
        words: [
          { original: 'hallo', meanings: ['hello'] },
          { original: 'welt', meanings: ['world'] },
        ],
      },
    ])
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

    const practice = useVideoVocabPractice('deu')
    await practice.load('abc123')

    expect(practice.currentPracticeFlashcard.value?.original).toBe('hallo')
    expect(practice.currentIntroduction.value).toBeNull()
  })

  it('introduces the most frequent unseen word once no cards are due', async () => {
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 2,
        words: [
          { original: 'welt', meanings: ['world'] },
          { original: 'hallo', meanings: ['hello'] },
        ],
      },
      {
        start: 2,
        duration: 2,
        words: [
          { original: 'welt', meanings: ['earth'] },
        ],
      },
    ])
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

    const practice = useVideoVocabPractice('deu')
    await practice.load('abc123')

    expect(practice.currentIntroduction.value?.word.original).toBe('welt')
    expect(practice.currentPracticeFlashcard.value).toBeNull()
  })

  it('does not immediately practice the card that was just introduced', async () => {
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 2,
        words: [
          { original: 'welt', meanings: ['world'] },
          { original: 'hallo', meanings: ['hello'] },
        ],
      },
      {
        start: 2,
        duration: 2,
        words: [
          { original: 'welt', meanings: ['earth'] },
        ],
      },
    ])
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

    const practice = useVideoVocabPractice('deu')
    await practice.load('abc123')
    await practice.rememberCurrentIntroduction()

    expect(createCardForWord).toHaveBeenCalledWith('deu', {
      original: 'welt',
      meanings: ['world', 'earth'],
    })
    expect(practice.currentIntroduction.value?.word.original).toBe('hallo')
    expect(practice.currentPracticeFlashcard.value).toBeNull()
  })

  it('updates progress and advances to the next introduction after rating the current card', async () => {
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 2,
        words: [
          { original: 'hallo', meanings: ['hello'] },
          { original: 'welt', meanings: ['world'] },
        ],
      },
    ])
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

    const practice = useVideoVocabPractice('deu')
    await practice.load('abc123')

    const flashcard = practice.currentPracticeFlashcard.value!

    applyRating.mockResolvedValue({
      ...flashcard,
      due: new Date('2026-04-30T12:00:00'),
      reps: 1,
      last_review: new Date('2026-04-26T12:00:00'),
    })

    await practice.rateFlashcard(flashcard, Rating.Good)

    expect(applyRating).toHaveBeenCalledWith('deu::hallo', Rating.Good, expect.any(Date))
    expect(flashcard.reps).toBe(1)
    expect(practice.currentIntroduction.value?.word.original).toBe('welt')
    expect(practice.currentPracticeFlashcard.value).toBeNull()
    expect(practice.progressUpdatedAt.value).toBeGreaterThan(0)
  })
})
