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

  it('records totals and daily counters per language', () => {
    const now = new Date('2026-04-24T12:00:00')

    recordFlashcardFlip('deu', now)
    recordInteractionSlice('deu', new Date('2026-04-24T12:00:00'), new Date('2026-04-24T12:30:00'))
    recordVideoWatchSlice('deu', new Date('2026-04-24T12:00:00'), new Date('2026-04-24T12:12:00'))
    recordFlashcardFlip('spa', now)

    const snapshot = getStatsSnapshot(now)

    expect(snapshot.languages).toEqual([
      {
        languageCode: 'deu',
        minutesVideoWatched: 12,
        minutesAppInteracted: 30,
        flashcardsFlipped: 1,
      },
      {
        languageCode: 'spa',
        minutesVideoWatched: 0,
        minutesAppInteracted: 0,
        flashcardsFlipped: 1,
      },
    ])
    expect(snapshot.cardsFlippedByDay[snapshot.cardsFlippedByDay.length - 1]).toEqual({
      date: '2026-04-24',
      values: {
        deu: 1,
        spa: 1,
      },
    })
    expect(snapshot.minutesInteractedByDay[snapshot.minutesInteractedByDay.length - 1]).toEqual({
      date: '2026-04-24',
      values: {
        deu: 30,
        spa: 0,
      },
    })
    expect(snapshot.minutesVideoWatchedByDay[snapshot.minutesVideoWatchedByDay.length - 1]).toEqual({
      date: '2026-04-24',
      values: {
        deu: 12,
        spa: 0,
      },
    })
  })

  it('keeps only the last 14 days and zero-fills missing dates', () => {
    const referenceDate = new Date('2026-04-24T09:00:00')

    window.localStorage.setItem('video-vocab-device-stats', JSON.stringify({
      languages: {
        deu: {
          minutesVideoWatched: 0,
          minutesAppInteracted: 0,
          flashcardsFlipped: 0,
          cardsFlippedByDay: {
            '2026-04-01': 9,
            '2026-04-20': 3,
          },
          minutesVideoWatchedByDay: {
            '2026-04-19': 4.25,
          },
          minutesInteractedByDay: {
            '2026-04-18': 7.5,
          },
        },
      },
    }))

    const snapshot = getStatsSnapshot(referenceDate)
    const expectedKeys = deviceStatsStorageInternals.getLast14DayKeys(referenceDate)

    expect(snapshot.cardsFlippedByDay).toHaveLength(14)
    expect(snapshot.cardsFlippedByDay.map((point) => point.date)).toEqual(expectedKeys)
    expect(snapshot.cardsFlippedByDay[0]?.date).toBe('2026-04-11')
    expect(snapshot.cardsFlippedByDay[0]?.values.deu).toBe(0)
    expect(snapshot.cardsFlippedByDay[9]?.date).toBe('2026-04-20')
    expect(snapshot.cardsFlippedByDay[9]?.values.deu).toBe(3)
    expect(snapshot.minutesVideoWatchedByDay[8]?.date).toBe('2026-04-19')
    expect(snapshot.minutesVideoWatchedByDay[8]?.values.deu).toBe(4.25)
    expect(snapshot.minutesInteractedByDay[7]?.date).toBe('2026-04-18')
    expect(snapshot.minutesInteractedByDay[7]?.values.deu).toBe(7.5)
  })
})
