import { cleanup, render, waitFor } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getOrCreateCardsForWords, loadYoutubeIframeApi, push } = vi.hoisted(() => ({
  getOrCreateCardsForWords: vi.fn(),
  loadYoutubeIframeApi: vi.fn(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/features/target-language-select/targetLanguageStorage', () => ({
  getStoredTargetLanguage: () => 'deu',
}))

vi.mock('@/entities/course/course', () => ({
  getCourse: () => Promise.resolve({
    languageCode: 'deu',
    label: 'German',
    videos: [{ youtubeId: 'abc123', languageCode: 'deu' }],
  }),
}))

vi.mock('@/entities/snippet/snippet', () => ({
  getSnippetsOfVideo: () => Promise.resolve([
    {
      start: 0,
      duration: 4,
      words: [
        { original: 'hallo', meanings: ['hello'] },
        { original: 'welt', meanings: ['world'] },
      ],
    },
  ]),
}))

vi.mock('@/entities/flashcard/flashcardStore', () => ({
  getOrCreateCardsForWords,
  applyRating: vi.fn(),
}))

vi.mock('@/features/video-embed/loadYoutubeIframeApi', () => ({
  loadYoutubeIframeApi,
}))

import FlowPage from './FlowPage.vue'

afterEach(() => {
  cleanup()
})

describe('FlowPage', () => {
  beforeEach(() => {
    push.mockReset()
    getOrCreateCardsForWords.mockReset()
    loadYoutubeIframeApi.mockReset()
    getOrCreateCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::hallo::hello',
        languageCode: 'deu',
        original: 'hallo',
        meanings: ['hello'],
        due: new Date('2026-04-24T10:00:00'),
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
    loadYoutubeIframeApi.mockResolvedValue(undefined)
    window.YT = {
      PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        ENDED: 0,
      },
      Player: class {
        loadVideoById() {}

        destroy() {}
      },
    } as unknown as typeof window.YT
  })

  it('hydrates the flow deck from persisted cards', async () => {
    render(FlowPage)

    await waitFor(() => {
      expect(getOrCreateCardsForWords).toHaveBeenCalledWith('deu', [
        { original: 'hallo', meanings: ['hello'] },
        { original: 'welt', meanings: ['world'] },
      ])
    })
  })
})
