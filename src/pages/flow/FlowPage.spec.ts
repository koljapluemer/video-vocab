import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getCourse, getOrCreateCardsForWords, getSnippetsOfVideo, loadYoutubeIframeApi, push } = vi.hoisted(() => ({
  getCourse: vi.fn(),
  getOrCreateCardsForWords: vi.fn(),
  getSnippetsOfVideo: vi.fn(),
  loadYoutubeIframeApi: vi.fn(),
  push: vi.fn(),
}))

const { loadVideoByIdMock, destroyMock } = vi.hoisted(() => ({
  loadVideoByIdMock: vi.fn(),
  destroyMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/features/target-language-select/targetLanguageStorage', () => ({
  getStoredTargetLanguage: () => 'deu',
}))

vi.mock('@/entities/course/course', () => ({
  getCourse,
}))

vi.mock('@/entities/snippet/snippet', () => ({
  getSnippetsOfVideo,
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
    getCourse.mockReset()
    getSnippetsOfVideo.mockReset()
    loadYoutubeIframeApi.mockReset()
    loadVideoByIdMock.mockReset()
    destroyMock.mockReset()
    getCourse.mockResolvedValue({
      languageCode: 'deu',
      label: 'German',
      videos: [{ youtubeId: 'abc123', languageCode: 'deu' }],
    })
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
        loadVideoById(...args: unknown[]) {
          loadVideoByIdMock(...args)
        }

        destroy() {
          destroyMock()
        }
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

  it('skips broken random videos and continues with a loadable one', async () => {
    getCourse.mockResolvedValue({
      languageCode: 'vie',
      label: 'Vietnamese',
      videos: [
        { youtubeId: 'missing-video', languageCode: 'vie' },
        { youtubeId: 'working-video', languageCode: 'vie' },
      ],
    })
    getSnippetsOfVideo.mockImplementation(async (_languageCode: string, videoId: string) => {
      if (videoId === 'missing-video') {
        throw new Error('missing JSON payload')
      }

      return [
        {
          start: 0,
          duration: 4,
          words: [
            { original: 'xin chao', meanings: ['hello'] },
            { original: 'ban', meanings: ['friend'] },
          ],
        },
      ]
    })
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0)

    render(FlowPage)

    await waitFor(() => {
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('vie', 'missing-video')
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('vie', 'working-video')
      expect(getOrCreateCardsForWords).toHaveBeenCalledWith('deu', [
        { original: 'xin chao', meanings: ['hello'] },
        { original: 'ban', meanings: ['friend'] },
      ])
    })

    randomSpy.mockRestore()
  })

  it('switches flow videos from the next-video pagination control', async () => {
    getCourse.mockResolvedValue({
      languageCode: 'deu',
      label: 'German',
      videos: [
        { youtubeId: 'abc123', languageCode: 'deu' },
        { youtubeId: 'def456', languageCode: 'deu' },
      ],
    })
    getSnippetsOfVideo.mockImplementation(async (_languageCode: string, videoId: string) => {
      if (videoId === 'def456') {
        return [
          {
            start: 0,
            duration: 4,
            words: [
              { original: 'tschuss', meanings: ['bye'] },
              { original: 'morgen', meanings: ['tomorrow'] },
            ],
          },
        ]
      }

      return [
        {
          start: 0,
          duration: 4,
          words: [
            { original: 'hallo', meanings: ['hello'] },
            { original: 'welt', meanings: ['world'] },
          ],
        },
      ]
    })
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    const { getByRole } = render(FlowPage)

    await waitFor(() => {
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    await fireEvent.click(getByRole('button', { name: 'Next video' }))

    await waitFor(() => {
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'def456')
      expect(getOrCreateCardsForWords).toHaveBeenLastCalledWith('deu', [
        { original: 'tschuss', meanings: ['bye'] },
        { original: 'morgen', meanings: ['tomorrow'] },
      ])
      expect(loadVideoByIdMock).toHaveBeenLastCalledWith({
        videoId: 'def456',
        startSeconds: 0,
      })
    })

    randomSpy.mockRestore()
  })
})
