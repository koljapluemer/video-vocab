const DEVICE_STATS_STORAGE_KEY = 'video-vocab-device-stats'
const DAYS_TO_KEEP = 14
const MINUTE_IN_MS = 60_000

interface StoredStats {
  minutesVideoWatched: number
  minutesAppInteracted: number
  flashcardsFlipped: number
  cardsFlippedByDay: Record<string, number>
  minutesInteractedByDay: Record<string, number>
}

export interface DailyStatPoint {
  date: string
  value: number
}

export interface DeviceStatsSnapshot {
  minutesVideoWatched: number
  minutesAppInteracted: number
  flashcardsFlipped: number
  cardsFlippedByDay: DailyStatPoint[]
  minutesInteractedByDay: DailyStatPoint[]
}

function createEmptyStoredStats(): StoredStats {
  return {
    minutesVideoWatched: 0,
    minutesAppInteracted: 0,
    flashcardsFlipped: 0,
    cardsFlippedByDay: {},
    minutesInteractedByDay: {},
  }
}

function roundMinutes(value: number): number {
  return Math.round(value * 100) / 100
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getLast14DayKeys(referenceDate: Date): string[] {
  return Array.from({ length: DAYS_TO_KEEP }, (_, index) => {
    const date = new Date(referenceDate)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (DAYS_TO_KEEP - 1 - index))
    return getLocalDateKey(date)
  })
}

function normalizeDayMap(
  dayMap: Record<string, number> | undefined,
  referenceDate: Date,
): Record<string, number> {
  const allowedKeys = getLast14DayKeys(referenceDate)
  const normalized: Record<string, number> = {}

  for (const key of allowedKeys) {
    const value = dayMap?.[key]
    normalized[key] = typeof value === 'number' ? value : 0
  }

  return normalized
}

function normalizeStats(stats: Partial<StoredStats> | null | undefined, referenceDate: Date): StoredStats {
  return {
    minutesVideoWatched: roundMinutes(stats?.minutesVideoWatched ?? 0),
    minutesAppInteracted: roundMinutes(stats?.minutesAppInteracted ?? 0),
    flashcardsFlipped: stats?.flashcardsFlipped ?? 0,
    cardsFlippedByDay: normalizeDayMap(stats?.cardsFlippedByDay, referenceDate),
    minutesInteractedByDay: normalizeDayMap(stats?.minutesInteractedByDay, referenceDate),
  }
}

function readStoredStats(referenceDate = new Date()): StoredStats {
  const rawValue = window.localStorage.getItem(DEVICE_STATS_STORAGE_KEY)
  if (!rawValue) {
    return normalizeStats(createEmptyStoredStats(), referenceDate)
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredStats>
    return normalizeStats(parsed, referenceDate)
  } catch {
    return normalizeStats(createEmptyStoredStats(), referenceDate)
  }
}

function writeStoredStats(stats: StoredStats) {
  window.localStorage.setItem(DEVICE_STATS_STORAGE_KEY, JSON.stringify(stats))
}

function updateStoredStats(
  updater: (stats: StoredStats) => StoredStats,
  referenceDate = new Date(),
) {
  const nextStats = normalizeStats(updater(readStoredStats(referenceDate)), referenceDate)
  writeStoredStats(nextStats)
}

function buildSeries(dayMap: Record<string, number>): DailyStatPoint[] {
  return Object.entries(dayMap).map(([date, value]) => ({ date, value }))
}

export function recordFlashcardFlip(at: Date) {
  updateStoredStats((stats) => {
    const dayKey = getLocalDateKey(at)

    return {
      ...stats,
      flashcardsFlipped: stats.flashcardsFlipped + 1,
      cardsFlippedByDay: {
        ...stats.cardsFlippedByDay,
        [dayKey]: (stats.cardsFlippedByDay[dayKey] ?? 0) + 1,
      },
    }
  }, at)
}

export function recordInteractionSlice(start: Date, end: Date) {
  const minutes = Math.max(0, end.getTime() - start.getTime()) / MINUTE_IN_MS
  if (minutes <= 0) {
    return
  }

  updateStoredStats((stats) => {
    const dayKey = getLocalDateKey(end)

    return {
      ...stats,
      minutesAppInteracted: roundMinutes(stats.minutesAppInteracted + minutes),
      minutesInteractedByDay: {
        ...stats.minutesInteractedByDay,
        [dayKey]: roundMinutes((stats.minutesInteractedByDay[dayKey] ?? 0) + minutes),
      },
    }
  }, end)
}

export function recordVideoWatchSlice(start: Date, end: Date) {
  const minutes = Math.max(0, end.getTime() - start.getTime()) / MINUTE_IN_MS
  if (minutes <= 0) {
    return
  }

  updateStoredStats((stats) => ({
    ...stats,
    minutesVideoWatched: roundMinutes(stats.minutesVideoWatched + minutes),
  }), end)
}

export function getStatsSnapshot(referenceDate = new Date()): DeviceStatsSnapshot {
  const stats = readStoredStats(referenceDate)

  return {
    minutesVideoWatched: stats.minutesVideoWatched,
    minutesAppInteracted: stats.minutesAppInteracted,
    flashcardsFlipped: stats.flashcardsFlipped,
    cardsFlippedByDay: buildSeries(stats.cardsFlippedByDay),
    minutesInteractedByDay: buildSeries(stats.minutesInteractedByDay),
  }
}

export const deviceStatsStorageInternals = {
  createEmptyStoredStats,
  getLast14DayKeys,
  getLocalDateKey,
  normalizeStats,
  readStoredStats,
  roundMinutes,
}
