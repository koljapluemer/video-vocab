import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deviceStatsStorageInternals,
  getStatsSnapshot,
  recordFlashcardFlip,
  recordInteractionSlice,
  recordVideoWatchSlice,
} from './deviceStatsStorage'

describe('deviceStatsStorage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
      },
    })
    vi.useRealTimers()
  })

  it('records totals and daily counters', () => {
    const now = new Date('2026-04-24T12:00:00')

    recordFlashcardFlip(now)
    recordInteractionSlice(new Date('2026-04-24T12:00:00'), new Date('2026-04-24T12:30:00'))
    recordVideoWatchSlice(new Date('2026-04-24T12:00:00'), new Date('2026-04-24T12:12:00'))

    const snapshot = getStatsSnapshot(now)

    expect(snapshot.flashcardsFlipped).toBe(1)
    expect(snapshot.minutesAppInteracted).toBe(30)
    expect(snapshot.minutesVideoWatched).toBe(12)
    expect(snapshot.cardsFlippedByDay[snapshot.cardsFlippedByDay.length - 1]).toEqual({
      date: '2026-04-24',
      value: 1,
    })
    expect(snapshot.minutesInteractedByDay[snapshot.minutesInteractedByDay.length - 1]).toEqual({
      date: '2026-04-24',
      value: 30,
    })
  })

  it('keeps only the last 14 days and zero-fills missing dates', () => {
    const referenceDate = new Date('2026-04-24T09:00:00')

    window.localStorage.setItem('video-vocab-device-stats', JSON.stringify({
      minutesVideoWatched: 0,
      minutesAppInteracted: 0,
      flashcardsFlipped: 0,
      cardsFlippedByDay: {
        '2026-04-01': 9,
        '2026-04-20': 3,
      },
      minutesInteractedByDay: {
        '2026-04-18': 7.5,
      },
    }))

    const snapshot = getStatsSnapshot(referenceDate)
    const expectedKeys = deviceStatsStorageInternals.getLast14DayKeys(referenceDate)

    expect(snapshot.cardsFlippedByDay).toHaveLength(14)
    expect(snapshot.cardsFlippedByDay.map((point) => point.date)).toEqual(expectedKeys)
    expect(snapshot.cardsFlippedByDay[0]?.date).toBe('2026-04-11')
    expect(snapshot.cardsFlippedByDay[0]?.value).toBe(0)
    expect(snapshot.cardsFlippedByDay[9]?.date).toBe('2026-04-20')
    expect(snapshot.cardsFlippedByDay[9]?.value).toBe(3)
    expect(snapshot.minutesInteractedByDay[7]?.date).toBe('2026-04-18')
    expect(snapshot.minutesInteractedByDay[7]?.value).toBe(7.5)
  })
})
