import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCourse,
  getSnippetsOfVideo,
  getVideoById,
  pickRandomVideo,
  push,
} = vi.hoisted(() => ({
  getCourse: vi.fn(),
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

vi.mock('@/meta/flashcard-practice-session/FlashcardPracticeSession.vue', () => ({
  default: {
    props: ['entries'],
    template: '<div>Practice Session {{ entries.length }}</div>',
  },
}))

import VideoVocabPracticePage from './VideoVocabPracticePage.vue'

afterEach(() => {
  cleanup()
})

describe('VideoVocabPracticePage', () => {
  beforeEach(() => {
    getCourse.mockReset()
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
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 4,
        words: [{ original: 'hallo', meanings: ['hello'] }],
      },
    ])
    pickRandomVideo.mockReturnValue({ youtubeId: 'def456', languageCode: 'deu' })
  })

  it('loads practice entries for the route video', async () => {
    const { findByText } = render(VideoVocabPracticePage)

    await waitFor(() => {
      expect(getVideoById).toHaveBeenCalledWith('deu', 'abc123')
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    expect(await findByText('Practice Session 1')).toBeTruthy()
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
