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

const { routeHolder } = vi.hoisted(() => ({
  routeHolder: {
    current: null as null | {
      params: { videoId: string }
      query: { snippet: string }
    },
  },
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')

  routeHolder.current = reactive({
    params: {
      videoId: 'abc123',
    },
    query: {
      snippet: '0',
    },
  })

  return {
    useRoute: () => routeHolder.current,
    useRouter: () => ({ push }),
    RouterLink: {
      props: ['to'],
      template: '<a><slot /></a>',
    },
  }
})

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

vi.mock('./WatchSnippet.vue', () => ({
  default: {
    props: ['start'],
    template:
      '<button type="button" @click="$emit(\'study-again\')">Watch the Snippet {{ start }}</button>',
  },
}))

import SnippetPracticePage from './SnippetPracticePage.vue'

function renderSnippetPracticePage() {
  return render(SnippetPracticePage, {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
      },
    },
  })
}

afterEach(() => {
  cleanup()
})

describe('SnippetPracticePage', () => {
  beforeEach(() => {
    applyRating.mockReset()
    createCardForWord.mockReset()
    getCourse.mockReset()
    getSavedCardsForWords.mockReset()
    getSnippetsOfVideo.mockReset()
    getVideoById.mockReset()
    pickRandomVideo.mockReset()
    push.mockReset()
    routeHolder.current!.params.videoId = 'abc123'
    routeHolder.current!.query.snippet = '0'

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

  it('shows an introduction for an unseen snippet word', async () => {
    const { findByText } = renderSnippetPracticePage()

    await waitFor(() => {
      expect(getVideoById).toHaveBeenCalledWith('deu', 'abc123')
      expect(getSnippetsOfVideo).toHaveBeenCalledWith('deu', 'abc123')
    })

    expect(await findByText('Intro hallo')).toBeTruthy()
  })

  it('shows a due seen card from the snippet', async () => {
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

    const { findByText } = renderSnippetPracticePage()

    expect(await findByText('Review hallo')).toBeTruthy()
  })

  it('switches to watch mode when no snippet card is eligible', async () => {
    getSavedCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::hallo',
        languageCode: 'deu',
        original: 'hallo',
        meanings: ['hello'],
        due: new Date('2026-05-20T12:00:00'),
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

    const { findByText } = renderSnippetPracticePage()

    expect(await findByText('Watch the Snippet 0')).toBeTruthy()
  })

  it('shows an introduced card as a normal review card when practice resumes', async () => {
    createCardForWord.mockResolvedValue({
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
          due: new Date('2026-04-20T12:00:00'),
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
      .mockResolvedValueOnce([
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
          reps: 0,
          lapses: 0,
          state: 0,
        },
      ])

    const { findByText, getByRole } = renderSnippetPracticePage()

    expect(await findByText('Intro hallo')).toBeTruthy()

    await fireEvent.click(getByRole('button', { name: 'Intro hallo' }))
    expect(await findByText('Watch the Snippet 0')).toBeTruthy()

    await fireEvent.click(getByRole('button', { name: 'Watch the Snippet 0' }))
    expect(await findByText('Review hallo')).toBeTruthy()
  })

  it('reloads the active snippet when the snippet query changes', async () => {
    getSavedCardsForWords.mockResolvedValue([
      {
        cardId: 'deu::hallo',
        languageCode: 'deu',
        original: 'hallo',
        meanings: ['hello'],
        due: new Date('2026-05-20T12:00:00'),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
      },
      {
        cardId: 'deu::welt',
        languageCode: 'deu',
        original: 'welt',
        meanings: ['world'],
        due: new Date('2026-05-20T12:00:00'),
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
    getSnippetsOfVideo.mockResolvedValue([
      {
        start: 0,
        duration: 4,
        words: [{ original: 'hallo', meanings: ['hello'] }],
      },
      {
        start: 5,
        duration: 3,
        words: [{ original: 'welt', meanings: ['world'] }],
      },
    ])

    const { findByText } = renderSnippetPracticePage()

    expect(await findByText('Watch the Snippet 0')).toBeTruthy()

    routeHolder.current!.query.snippet = '1'

    expect(await findByText('Watch the Snippet 5')).toBeTruthy()
    await waitFor(() => {
      expect(getSavedCardsForWords).toHaveBeenLastCalledWith('deu', [
        {
          meanings: ['world'],
          original: 'welt',
        },
      ])
    })
  })
})
