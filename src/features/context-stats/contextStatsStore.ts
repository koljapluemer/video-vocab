import type {
  ContextRoundRecord,
  DailyContextStatsRecord,
} from '@/db/contextPracticeDb'
import { contextPracticeDb } from '@/db/contextPracticeDb'

const DAYS_TO_KEEP = 14
const MINUTE_IN_MS = 60_000

export interface DailyStatPoint {
  date: string
  value: number
}

export interface ContextStatsSnapshot {
  minutesAppInteracted: number
  minutesVideoWatched: number
  roundsCompleted: number
  roundsPerDay: DailyStatPoint[]
  minutesVideoWatchedPerDay: DailyStatPoint[]
  minutesAppInteractedPerDay: DailyStatPoint[]
}

interface DailyContextStatsDelta {
  minutesAppInteracted?: number
  minutesVideoWatched?: number
  roundsCompleted?: number
}

interface CompletedContextRoundInput {
  completedAt: Date
  durationSeconds: number
  languageCode: string
  segmentIndex: number
  videoId: string
}

function roundMinutes(value: number) {
  return Math.round(value * 100) / 100
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getLastDayKeys(referenceDate: Date) {
  return Array.from({ length: DAYS_TO_KEEP }, (_, index) => {
    const date = new Date(referenceDate)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (DAYS_TO_KEEP - 1 - index))
    return getLocalDateKey(date)
  })
}

function buildEmptyDailyStatsRecord(languageCode: string, dayKey: string): DailyContextStatsRecord {
  return {
    statId: `${languageCode}::${dayKey}`,
    languageCode,
    dayKey,
    roundsCompleted: 0,
    minutesVideoWatched: 0,
    minutesAppInteracted: 0,
  }
}

function buildContextRoundRecord(input: CompletedContextRoundInput): ContextRoundRecord {
  const completedAt = input.completedAt.getTime()

  return {
    roundId: `${input.languageCode}::${input.videoId}::${input.segmentIndex}::${completedAt}`,
    languageCode: input.languageCode,
    videoId: input.videoId,
    segmentIndex: input.segmentIndex,
    durationSeconds: input.durationSeconds,
    completedAt,
  }
}

async function applyDailyStatsDeltaInCurrentTransaction(
  languageCode: string,
  dayKey: string,
  delta: DailyContextStatsDelta,
) {
  const statId = `${languageCode}::${dayKey}`
  const existingRecord =
    (await contextPracticeDb.dailyContextStats.get(statId)) ??
    buildEmptyDailyStatsRecord(languageCode, dayKey)

  await contextPracticeDb.dailyContextStats.put({
    ...existingRecord,
    roundsCompleted: existingRecord.roundsCompleted + (delta.roundsCompleted ?? 0),
    minutesVideoWatched: roundMinutes(
      existingRecord.minutesVideoWatched + (delta.minutesVideoWatched ?? 0),
    ),
    minutesAppInteracted: roundMinutes(
      existingRecord.minutesAppInteracted + (delta.minutesAppInteracted ?? 0),
    ),
  })
}

async function applyDailyStatsDelta(
  languageCode: string,
  dayKey: string,
  delta: DailyContextStatsDelta,
) {
  await contextPracticeDb.transaction('rw', contextPracticeDb.dailyContextStats, async () => {
    await applyDailyStatsDeltaInCurrentTransaction(languageCode, dayKey, delta)
  })
}

function buildDailyPoints(
  dayKeys: string[],
  records: DailyContextStatsRecord[],
  selectValue: (record: DailyContextStatsRecord) => number,
): DailyStatPoint[] {
  const recordsByDay = new Map(records.map((record) => [record.dayKey, record]))

  return dayKeys.map((dayKey) => ({
    date: dayKey,
    value: roundMinutes(selectValue(recordsByDay.get(dayKey) ?? buildEmptyDailyStatsRecord('', dayKey))),
  }))
}

export async function recordContextInteractionSlice(
  languageCode: string,
  start: Date,
  end: Date,
) {
  const minutes = Math.max(0, end.getTime() - start.getTime()) / MINUTE_IN_MS
  if (minutes <= 0) {
    return
  }

  await applyDailyStatsDelta(languageCode, getLocalDateKey(end), {
    minutesAppInteracted: minutes,
  })
}

export async function recordContextWatchSlice(languageCode: string, start: Date, end: Date) {
  const minutes = Math.max(0, end.getTime() - start.getTime()) / MINUTE_IN_MS
  if (minutes <= 0) {
    return
  }

  await applyDailyStatsDelta(languageCode, getLocalDateKey(end), {
    minutesVideoWatched: minutes,
  })
}

export async function recordCompletedContextRound(input: CompletedContextRoundInput) {
  const roundRecord = buildContextRoundRecord(input)
  const dayKey = getLocalDateKey(input.completedAt)

  await contextPracticeDb.transaction(
    'rw',
    contextPracticeDb.contextRounds,
    contextPracticeDb.dailyContextStats,
    async () => {
      await contextPracticeDb.contextRounds.put(roundRecord)
      await applyDailyStatsDeltaInCurrentTransaction(input.languageCode, dayKey, {
        roundsCompleted: 1,
      })
    },
  )
}

export async function getContextStatsSnapshot(
  languageCode: string,
  referenceDate = new Date(),
): Promise<ContextStatsSnapshot> {
  const dayKeys = getLastDayKeys(referenceDate)
  const startDayKey = dayKeys[0]
  const endDayKey = dayKeys[dayKeys.length - 1]
  const languageRecords = await contextPracticeDb.dailyContextStats
    .where('languageCode')
    .equals(languageCode)
    .toArray()
  const rangeRecords = await contextPracticeDb.dailyContextStats
    .where('[languageCode+dayKey]')
    .between([languageCode, startDayKey], [languageCode, endDayKey], true, true)
    .toArray()

  const summary = languageRecords.reduce(
    (accumulator, record) => ({
      roundsCompleted: accumulator.roundsCompleted + record.roundsCompleted,
      minutesVideoWatched: roundMinutes(accumulator.minutesVideoWatched + record.minutesVideoWatched),
      minutesAppInteracted: roundMinutes(
        accumulator.minutesAppInteracted + record.minutesAppInteracted,
      ),
    }),
    {
      roundsCompleted: 0,
      minutesVideoWatched: 0,
      minutesAppInteracted: 0,
    },
  )

  return {
    roundsCompleted: summary.roundsCompleted,
    minutesVideoWatched: summary.minutesVideoWatched,
    minutesAppInteracted: summary.minutesAppInteracted,
    roundsPerDay: buildDailyPoints(dayKeys, rangeRecords, (record) => record.roundsCompleted),
    minutesVideoWatchedPerDay: buildDailyPoints(
      dayKeys,
      rangeRecords,
      (record) => record.minutesVideoWatched,
    ),
    minutesAppInteractedPerDay: buildDailyPoints(
      dayKeys,
      rangeRecords,
      (record) => record.minutesAppInteracted,
    ),
  }
}
