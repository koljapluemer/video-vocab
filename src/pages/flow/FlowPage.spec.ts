import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Rating } from 'ts-fsrs'

const {
  applyRating,
  createCardForWord,
  getCourse,
  getSavedCardsForWords,
  getVideoById,
  getSnippetsOfVideo,
  loadYoutubeIframeApi,
  pickRandomVideo,
  push,
} = vi.hoisted(() => ({
  applyRating: vi.fn(),
  createCardForWord: vi.fn(),
  getCourse: vi.fn(),
  getSavedCardsForWords: vi.fn(),
  getVideoById: vi.fn(),
  getSnippetsOfVideo: vi.fn(),
  loadYoutubeIframeApi: vi.fn(),
  pickRandomVideo: vi.fn(),
  push: vi.fn(),
}))

const { loadVideoByIdMock, destroyMock } = vi.hoisted(() => ({
  loadVideoByIdMock: vi.fn(),
  destroyMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      videoId: 'abc123',
      practiceMode: 'parallel',
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

vi.mock('@/entities/snippet/snippet', () => ({
  getSnippetsOfVideo,
}))

vi.mock('@/entities/flashcard/flashcardStore', () => ({
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
}))

vi.mock('@/features/video-embed/loadYoutubeIframeApi', () => ({
  loadYoutubeIframeApi,
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

import FlowPage from './FlowPage.vue'

afterEach(() => {
  cleanup()
})

describe('FlowPage', () => {
  beforeEach(() => {
    applyRating.mockReset()
    createCardForWord.mockReset()
    push.mockReset()
    getCourse.mockReset()
    getSavedCardsForWords.mockReset()
    getVideoById.mockReset()
    getSnippetsOfVideo.mockReset()
    loadYoutubeIframeApi.mockReset()
    pickRandomVideo.mockReset()
    loadVideoByIdMock.mockReset()
    destroyMock.mockReset()
    getCourse.mockResolvedValue({
      languageCode: 'deu',
      label: 'German',
      videos: [{ youtubeId: 'abc123', languageCode: 'deu' }],
    })
    getSavedCardsForWords.mockResolvedValue([])
    getVideoById.mockResolvedValue({ youtubeId: 'abc123', languageCode: 'deu' })
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 4,
        words: [
          { original: 'hallo', meanings: ['hello'] },
          { original: 'welt', meanings: ['world'] },
        ],
      },
    ])
    loadYoutubeIframeApi.mockResolvedValue(undefined)
    window.YT = {
      PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        ENDED: 0,
      },
      Player: class {
        loadVideoById(...args: unknown[]) {
          loadVideoByIdMock(...args)
        }

        destroy() {
          destroyMock()
        }
      },
    } as unknown as typeof window.YT
  })

  it('shows the first introduction from the active snippet window', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { findByText } = render(FlowPage)

    await waitFor(() => {
      expect(getVideoById).toHaveBeenCalledWith('deu', 'abc123')
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    expect(await findByText('Intro hallo')).toBeTruthy()
    randomSpy.mockRestore()
  })

  it('can show an eligible due saved card from the active snippet window', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
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

    const { findByText } = render(FlowPage)

    expect(await findByText('Review hallo')).toBeTruthy()
    randomSpy.mockRestore()
  })

  it('can prefer a due seen card from elsewhere in the video', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 4,
        words: [{ original: 'hallo', meanings: ['hello'] }],
      },
      {
        start: 4,
        duration: 4,
        words: [{ original: 'welt', meanings: ['world'] }],
      },
      {
        start: 8,
        duration: 4,
        words: [{ original: 'tschuss', meanings: ['bye'] }],
      },
    ])
    getSavedCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::tschuss',
        languageCode: 'deu',
        original: 'tschuss',
        meanings: ['bye'],
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

    const { findByText } = render(FlowPage)

    expect(await findByText('Review tschuss')).toBeTruthy()
    randomSpy.mockRestore()
  })

  it('recomputes the next card immediately after remembering an introduction', async () => {
    const randomValues = [0, 0.9, 0, 0.9, 0]
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift() ?? 0)
    createCardForWord.mockResolvedValue({
      cardId: 'deu::hallo',
      languageCode: 'deu',
      original: 'hallo',
      meanings: ['hello'],
      due: new Date('2026-04-27T10:00:00'),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      learning_steps: 0,
      reps: 0,
      lapses: 0,
      state: 0,
    })
    getSavedCardsForWords
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          cardId: 'deu::hallo',
          languageCode: 'deu',
          original: 'hallo',
          meanings: ['hello'],
          due: new Date('2026-04-27T10:00:00'),
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

    const { findByText, getByRole } = render(FlowPage)

    expect(await findByText('Intro hallo')).toBeTruthy()

    await fireEvent.click(getByRole('button', { name: 'Intro hallo' }))

    expect(await findByText('Intro welt')).toBeTruthy()
    randomSpy.mockRestore()
  })

  it('shows a missing-video error when the route video is not available', async () => {
    getVideoById.mockResolvedValue(undefined)

    const { findByText } = render(FlowPage)

    expect(await findByText('This video could not be found.')).toBeTruthy()
  })

  it('opens a random next video in the same practice mode', async () => {
    getCourse.mockResolvedValue({
      languageCode: 'deu',
      label: 'German',
      videos: [
        { youtubeId: 'abc123', languageCode: 'deu' },
        { youtubeId: 'def456', languageCode: 'deu' },
      ],
    })
    pickRandomVideo.mockReturnValue({ youtubeId: 'def456', languageCode: 'deu' })
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    const { getByRole } = render(FlowPage)

    await waitFor(() => {
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    await fireEvent.click(getByRole('button', { name: 'Switch Video' }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        name: 'video-practice',
        params: { videoId: 'def456', practiceMode: 'parallel' },
      })
    })

    randomSpy.mockRestore()
  })
})
