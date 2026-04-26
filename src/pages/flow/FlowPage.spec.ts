import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCourse,
  getVideoById,
  getSnippetsOfVideo,
  loadYoutubeIframeApi,
  pickRandomVideo,
  push,
} = vi.hoisted(() => ({
  getCourse: vi.fn(),
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

vi.mock('@/meta/flashcard-practice-session/FlashcardPracticeSession.vue', () => ({
  default: {
    props: ['entries'],
    template: '<div>Practice {{ entries.map((entry) => entry.word.original).join(\',\') }}</div>',
  },
}))

import FlowPage from './FlowPage.vue'

afterEach(() => {
  cleanup()
})

describe('FlowPage', () => {
  beforeEach(() => {
    push.mockReset()
    getCourse.mockReset()
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

  it('builds the parallel practice deck from the active snippet window', async () => {
    const { findByText } = render(FlowPage)

    await waitFor(() => {
      expect(getVideoById).toHaveBeenCalledWith('deu', 'abc123')
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    expect(await findByText('Practice hallo,welt')).toBeTruthy()
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
