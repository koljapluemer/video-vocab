import { cleanup, render } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { State } from 'ts-fsrs'

vi.mock('@/features/device-stats/deviceStatsStorage', () => ({
  getStatsSnapshot: () => ({
    minutesVideoWatched: 42,
    minutesAppInteracted: 18.5,
    flashcardsFlipped: 9,
    cardsFlippedByDay: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-04-${String(index + 11).padStart(2, '0')}`,
      value: index === 13 ? 9 : 0,
    })),
    minutesInteractedByDay: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-04-${String(index + 11).padStart(2, '0')}`,
      value: index === 13 ? 18.5 : 0,
    })),
  }),
}))

vi.mock('@/entities/flashcard/flashcardStore', () => ({
  getCardStateCounts: () => Promise.resolve({
    [State.New]: 2,
    [State.Learning]: 3,
    [State.Review]: 4,
    [State.Relearning]: 1,
  }),
}))

import StatsPage from './StatsPage.vue'

afterEach(() => {
  cleanup()
})

describe('StatsPage', () => {
  it('renders totals, charts, and card state counts', async () => {
    const { findByText, getAllByText, getByText } = render(StatsPage)

    expect(await findByText('Stats')).toBeTruthy()
    expect(getByText('Device-local progress only. These numbers are stored on this device and are not synced.')).toBeTruthy()
    expect(getByText('42')).toBeTruthy()
    expect(getAllByText('18.50').length).toBeGreaterThan(0)
    expect(getByText('Flashcards flipped')).toBeTruthy()
    expect(await findByText('Review')).toBeTruthy()
    expect(await findByText('4')).toBeTruthy()
    expect(getByText('Cards flipped per day')).toBeTruthy()
    expect(getByText('Minutes interacted per day')).toBeTruthy()
  })
})
