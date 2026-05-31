import Dexie, { type Table } from 'dexie'

export interface AppSettingRecord {
  key: string
  value: string
}

export interface ContextRoundRecord {
  roundId: string
  languageCode: string
  videoId: string
  segmentIndex: number
  durationSeconds: number
  completedAt: number
}

export interface DailyContextStatsRecord {
  statId: string
  languageCode: string
  dayKey: string
  roundsCompleted: number
  minutesVideoWatched: number
  minutesAppInteracted: number
}

class ContextPracticeDb extends Dexie {
  settings!: Table<AppSettingRecord, string>
  contextRounds!: Table<ContextRoundRecord, string>
  dailyContextStats!: Table<DailyContextStatsRecord, string>

  constructor() {
    super('videoVocabContextDb')

    this.version(1).stores({
      settings: '&key',
      contextRounds: '&roundId, languageCode, completedAt, [languageCode+completedAt]',
      dailyContextStats: '&statId, languageCode, dayKey, [languageCode+dayKey]',
    })
  }
}

export const contextPracticeDb = new ContextPracticeDb()
