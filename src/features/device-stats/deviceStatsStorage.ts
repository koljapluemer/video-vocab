const DEVICE_STATS_STORAGE_KEY = 'video-vocab-device-stats'
const DAYS_TO_KEEP = 14
const MINUTE_IN_MS = 60_000

interface StoredLanguageStats {
  minutesVideoWatched: number
  minutesAppInteracted: number
  flashcardsFlipped: number
  cardsFlippedByDay: Record<string, number>
  minutesInteractedByDay: Record<string, number>
}

interface StoredStats {
  languages: Record<string, StoredLanguageStats>
}

export interface DailyStatPoint {
  date: string
  values: Record<string, number>
}

export interface LanguageStatsSnapshot {
  languageCode: string
  minutesVideoWatched: number
  minutesAppInteracted: number
  flashcardsFlipped: number
}

export interface DeviceStatsSnapshot {
  languages: LanguageStatsSnapshot[]
  cardsFlippedByDay: DailyStatPoint[]
  minutesInteractedByDay: DailyStatPoint[]
}

function createEmptyStoredLanguageStats(): StoredLanguageStats {
  return {
    minutesVideoWatched: 0,
    minutesAppInteracted: 0,
    flashcardsFlipped: 0,
    cardsFlippedByDay: {},
    minutesInteractedByDay: {},
  }
}

function createEmptyStoredStats(): StoredStats {
  return {
    languages: {},
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

function normalizeLanguageStats(
  stats: Partial<StoredLanguageStats> | null | undefined,
  referenceDate: Date,
): StoredLanguageStats {
  return {
    minutesVideoWatched: roundMinutes(stats?.minutesVideoWatched ?? 0),
    minutesAppInteracted: roundMinutes(stats?.minutesAppInteracted ?? 0),
    flashcardsFlipped: stats?.flashcardsFlipped ?? 0,
    cardsFlippedByDay: normalizeDayMap(stats?.cardsFlippedByDay, referenceDate),
    minutesInteractedByDay: normalizeDayMap(stats?.minutesInteractedByDay, referenceDate),
  }
}

function normalizeStats(stats: Partial<StoredStats> | null | undefined, referenceDate: Date): StoredStats {
  const languages = Object.fromEntries(
    Object.entries(stats?.languages ?? {}).map(([languageCode, languageStats]) => [
      languageCode,
      normalizeLanguageStats(languageStats, referenceDate),
    ]),
  )

  return { languages }
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

function getStoredLanguageStats(stats: StoredStats, languageCode: string): StoredLanguageStats {
  return stats.languages[languageCode] ?? createEmptyStoredLanguageStats()
}

function buildSeries(
  dayKeys: string[],
  languages: Record<string, StoredLanguageStats>,
  selectDayMap: (languageStats: StoredLanguageStats) => Record<string, number>,
): DailyStatPoint[] {
  const languageEntries = Object.entries(languages)

  return dayKeys.map((date) => ({
    date,
    values: Object.fromEntries(
      languageEntries.map(([languageCode, languageStats]) => [
        languageCode,
        selectDayMap(languageStats)[date] ?? 0,
      ]),
    ),
  }))
}

export function recordFlashcardFlip(languageCode: string, at: Date) {
  updateStoredStats((stats) => {
    const dayKey = getLocalDateKey(at)
    const languageStats = getStoredLanguageStats(stats, languageCode)

    return {
      languages: {
        ...stats.languages,
        [languageCode]: {
          ...languageStats,
          flashcardsFlipped: languageStats.flashcardsFlipped + 1,
          cardsFlippedByDay: {
            ...languageStats.cardsFlippedByDay,
            [dayKey]: (languageStats.cardsFlippedByDay[dayKey] ?? 0) + 1,
          },
        },
      },
    }
  }, at)
}

export function recordInteractionSlice(languageCode: string, start: Date, end: Date) {
  const minutes = Math.max(0, end.getTime() - start.getTime()) / MINUTE_IN_MS
  if (minutes <= 0) {
    return
  }

  updateStoredStats((stats) => {
    const dayKey = getLocalDateKey(end)
    const languageStats = getStoredLanguageStats(stats, languageCode)

    return {
      languages: {
        ...stats.languages,
        [languageCode]: {
          ...languageStats,
          minutesAppInteracted: roundMinutes(languageStats.minutesAppInteracted + minutes),
          minutesInteractedByDay: {
            ...languageStats.minutesInteractedByDay,
            [dayKey]: roundMinutes((languageStats.minutesInteractedByDay[dayKey] ?? 0) + minutes),
          },
        },
      },
    }
  }, end)
}

export function recordVideoWatchSlice(languageCode: string, start: Date, end: Date) {
  const minutes = Math.max(0, end.getTime() - start.getTime()) / MINUTE_IN_MS
  if (minutes <= 0) {
    return
  }

  updateStoredStats((stats) => {
    const languageStats = getStoredLanguageStats(stats, languageCode)

    return {
      languages: {
        ...stats.languages,
        [languageCode]: {
          ...languageStats,
          minutesVideoWatched: roundMinutes(languageStats.minutesVideoWatched + minutes),
        },
      },
    }
  }, end)
}

export function getStatsSnapshot(referenceDate = new Date()): DeviceStatsSnapshot {
  const stats = readStoredStats(referenceDate)
  const languages = Object.entries(stats.languages)
    .sort(([leftLanguageCode], [rightLanguageCode]) => leftLanguageCode.localeCompare(rightLanguageCode))
    .map(([languageCode, languageStats]) => ({
      languageCode,
      minutesVideoWatched: languageStats.minutesVideoWatched,
      minutesAppInteracted: languageStats.minutesAppInteracted,
      flashcardsFlipped: languageStats.flashcardsFlipped,
    }))
  const dayKeys = getLast14DayKeys(referenceDate)

  return {
    languages,
    cardsFlippedByDay: buildSeries(dayKeys, stats.languages, (languageStats) => languageStats.cardsFlippedByDay),
    minutesInteractedByDay: buildSeries(
      dayKeys,
      stats.languages,
      (languageStats) => languageStats.minutesInteractedByDay,
    ),
  }
}

export const deviceStatsStorageInternals = {
  createEmptyStoredLanguageStats,
  createEmptyStoredStats,
  getLast14DayKeys,
  getLocalDateKey,
  normalizeLanguageStats,
  normalizeStats,
  readStoredStats,
  roundMinutes,
}
