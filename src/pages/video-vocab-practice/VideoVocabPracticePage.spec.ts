import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCourse,
  getVideoById,
  load,
  pickRandomVideo,
  rateFlashcard,
  rememberCurrentIntroduction,
  push,
} = vi.hoisted(() => ({
  getCourse: vi.fn(),
  getVideoById: vi.fn(),
  load: vi.fn(),
  pickRandomVideo: vi.fn(),
  rateFlashcard: vi.fn(),
  rememberCurrentIntroduction: vi.fn(),
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

vi.mock('./useVideoVocabPractice', () => ({
  useVideoVocabPractice: () => ({
    currentIntroduction: ref(null),
    currentPracticeFlashcard: ref(null),
    currentPromptKey: ref('1'),
    isSavingIntroduction: ref(false),
    load,
    progressUpdatedAt: ref(0),
    rateFlashcard,
    rememberCurrentIntroduction,
    snippets: ref([]),
  }),
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

vi.mock('@/features/flashcard-review/FlashCard.vue', () => ({
  default: {
    props: ['flashcard'],
    template: '<div>Practice {{ flashcard.original }}</div>',
  },
}))

vi.mock('./VocabIntroductionCard.vue', () => ({
  default: {
    props: ['word', 'occurrences'],
    emits: ['remember'],
    template:
      '<button type="button" @click="$emit(\'remember\')">Introduce {{ word.original }} {{ occurrences }}</button>',
  },
}))

import VideoVocabPracticePage from './VideoVocabPracticePage.vue'

afterEach(() => {
  cleanup()
})

describe('VideoVocabPracticePage', () => {
  beforeEach(() => {
    getCourse.mockReset()
    getVideoById.mockReset()
    load.mockReset()
    pickRandomVideo.mockReset()
    rateFlashcard.mockReset()
    rememberCurrentIntroduction.mockReset()
    push.mockReset()

    getCourse.mockResolvedValue({
      languageCode: 'deu',
      label: 'German',
      videos: [{ youtubeId: 'abc123', languageCode: 'deu' }],
    })
    getVideoById.mockResolvedValue({ youtubeId: 'abc123', languageCode: 'deu' })
    pickRandomVideo.mockReturnValue({ youtubeId: 'def456', languageCode: 'deu' })
    load.mockResolvedValue(undefined)
  })

  it('loads the vocab practice session for the route video', async () => {
    render(VideoVocabPracticePage)

    await waitFor(() => {
      expect(getVideoById).toHaveBeenCalledWith('deu', 'abc123')
      expect(load).toHaveBeenCalledWith('abc123')
    })
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
      expect(load).toHaveBeenCalledWith('abc123')
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
