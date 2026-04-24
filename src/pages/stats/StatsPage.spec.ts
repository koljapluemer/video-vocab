import { cleanup, render } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { State } from 'ts-fsrs'

vi.mock('vue-chartjs', () => ({
  Bar: {
    template: '<div data-testid="chart"></div>',
  },
}))

vi.mock('@/features/device-stats/deviceStatsStorage', () => ({
  getStatsSnapshot: () => ({
    languages: [
      {
        languageCode: 'deu',
        minutesVideoWatched: 42,
        minutesAppInteracted: 18.5,
        flashcardsFlipped: 9,
      },
      {
        languageCode: 'spa',
        minutesVideoWatched: 8,
        minutesAppInteracted: 6.5,
        flashcardsFlipped: 4,
      },
    ],
    cardsFlippedByDay: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-04-${String(index + 11).padStart(2, '0')}`,
      values: {
        deu: index === 13 ? 9 : 0,
        spa: index === 13 ? 4 : 0,
      },
    })),
    minutesInteractedByDay: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-04-${String(index + 11).padStart(2, '0')}`,
      values: {
        deu: index === 13 ? 18.5 : 0,
        spa: index === 13 ? 6.5 : 0,
      },
    })),
  }),
}))

vi.mock('@/entities/flashcard/flashcardStore', () => ({
  getWordStatsByLanguage: () => Promise.resolve([
    {
      languageCode: 'deu',
      total: 9,
      stateCounts: {
        [State.New]: 2,
        [State.Learning]: 3,
        [State.Review]: 4,
        [State.Relearning]: 0,
      },
    },
    {
      languageCode: 'spa',
      total: 4,
      stateCounts: {
        [State.New]: 1,
        [State.Learning]: 1,
        [State.Review]: 2,
        [State.Relearning]: 0,
      },
    },
  ]),
}))

vi.mock('@/entities/course/course', () => ({
  getAllCourses: () => Promise.resolve([
    { languageCode: 'deu', label: 'German', subtitleLanguage: 'en', direction: 'ltr', videos: [] },
    { languageCode: 'spa', label: 'Spanish', subtitleLanguage: 'en', direction: 'ltr', videos: [] },
  ]),
}))

import StatsPage from './StatsPage.vue'

afterEach(() => {
  cleanup()
})

describe('StatsPage', () => {
  it('renders totals, language word stats, and stacked chart sections', async () => {
    const { findByText, getAllByText, getByText } = render(StatsPage)

    expect(await findByText('Stats')).toBeTruthy()
    expect(getByText('Device-local progress only. These numbers are stored on this device and are not synced.')).toBeTruthy()
    expect(await findByText('Words by language')).toBeTruthy()
    expect(await findByText('German')).toBeTruthy()
    expect(await findByText('Spanish')).toBeTruthy()
    expect(getByText('Words saved')).toBeTruthy()
    expect(getAllByText('13').length).toBeGreaterThan(0)
    expect(getByText('Minutes video watched')).toBeTruthy()
    expect(getByText('50')).toBeTruthy()
    expect(getByText('Cards flipped per day')).toBeTruthy()
    expect(getByText('Minutes interacted per day')).toBeTruthy()
  })
})
