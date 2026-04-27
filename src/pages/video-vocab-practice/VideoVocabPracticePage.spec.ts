import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Rating } from 'ts-fsrs'

const {
  applyRating,
  createCardForWord,
  getCourse,
  getSavedCardsForWords,
  getSnippetsOfVideo,
  getVideoById,
  pickRandomVideo,
  push,
} = vi.hoisted(() => ({
  applyRating: vi.fn(),
  createCardForWord: vi.fn(),
  getCourse: vi.fn(),
  getSavedCardsForWords: vi.fn(),
  getSnippetsOfVideo: vi.fn(),
  getVideoById: vi.fn(),
  pickRandomVideo: vi.fn(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      videoId: 'abc123',
    },
  }),
  useRouter: () => ({ push }),
  RouterLink: {
    props: ['to'],
    template: '<a><slot /></a>',
  },
}))

vi.mock('@/features/target-language-select/targetLanguageStorage', () => ({
  getStoredTargetLanguage: () => 'deu',
}))

vi.mock('@/entities/course/course', () => ({
  getCourse,
  getVideoById,
  pickRandomVideo,
}))

vi.mock('@/entities/flashcard/flashcardStore', () => ({
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
}))

vi.mock('@/entities/snippet/snippet', () => ({
  getSnippetsOfVideo,
}))

vi.mock('@/features/device-stats/deviceStatsStorage', () => ({
  recordFlashcardFlip: vi.fn(),
}))

vi.mock('@/dumb/VideoPracticeLayout.vue', () => ({
  default: {
    template: '<div><slot /></div>',
  },
}))

vi.mock('@/features/video-vocab-progress/VideoVocabProgressBar.vue', () => ({
  default: {
    template: '<div>Progress</div>',
  },
}))

vi.mock('@/features/flashcard-review/FlashcardIntroductionCard.vue', () => ({
  default: {
    props: ['word'],
    template: '<button type="button" @click="$emit(\'remember\')">Intro {{ word.original }}</button>',
  },
}))

vi.mock('@/features/flashcard-review/FlashCard.vue', () => ({
  default: {
    props: ['flashcard'],
    template: `
      <div>
        <span>Review {{ flashcard.original }}</span>
        <button type="button" @click="$emit('single-flashcard-rated', ${Rating.Good})">Rate Good</button>
      </div>
    `,
  },
}))

import VideoVocabPracticePage from './VideoVocabPracticePage.vue'

afterEach(() => {
  cleanup()
})

describe('VideoVocabPracticePage', () => {
  beforeEach(() => {
    applyRating.mockReset()
    createCardForWord.mockReset()
    getCourse.mockReset()
    getSavedCardsForWords.mockReset()
    getSnippetsOfVideo.mockReset()
    getVideoById.mockReset()
    pickRandomVideo.mockReset()
    push.mockReset()

    getCourse.mockResolvedValue({
      languageCode: 'deu',
      label: 'German',
      videos: [{ youtubeId: 'abc123', languageCode: 'deu' }],
    })
    getVideoById.mockResolvedValue({ youtubeId: 'abc123', languageCode: 'deu' })
    getSavedCardsForWords.mockResolvedValue([])
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 4,
        words: [{ original: 'hallo', meanings: ['hello'] }],
      },
    ])
    pickRandomVideo.mockReturnValue({ youtubeId: 'def456', languageCode: 'deu' })
  })

  it('shows the most common unseen word as the next introduction', async () => {
    const { findByText } = render(VideoVocabPracticePage)

    await waitFor(() => {
      expect(getVideoById).toHaveBeenCalledWith('deu', 'abc123')
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    expect(await findByText('Intro hallo')).toBeTruthy()
  })

  it('prioritizes due seen cards before unseen words', async () => {
    getSavedCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::hallo',
        languageCode: 'deu',
        original: 'hallo',
        meanings: ['hello'],
        due: new Date('2026-04-20T12:00:00'),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
      },
    ])

    const { findByText } = render(VideoVocabPracticePage)

    expect(await findByText('Review hallo')).toBeTruthy()
  })

  it('opens a random next video in vocab mode', async () => {
    getCourse.mockResolvedValue({
      languageCode: 'deu',
      label: 'German',
      videos: [
        { youtubeId: 'abc123', languageCode: 'deu' },
        { youtubeId: 'def456', languageCode: 'deu' },
      ],
    })

    const { getByRole } = render(VideoVocabPracticePage)

    await waitFor(() => {
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    await fireEvent.click(getByRole('button', { name: 'Switch Video' }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        name: 'video-vocab-practice',
        params: { videoId: 'def456' },
      })
    })
  })
})
