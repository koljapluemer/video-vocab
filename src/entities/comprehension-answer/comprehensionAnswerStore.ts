import { learnerDb, type SavedComprehensionAnswerRecord } from '@/db/learnerDb'

export interface ComprehensionAnswer {
  answerId: string
  languageCode: string
  videoId: string
  segmentStartMs: number
  segmentEndMs: number
  answerText: string
  updatedAt: Date
}

interface ComprehensionAnswerSegment {
  end: number
  start: number
}

function toSegmentMillis(segment: ComprehensionAnswerSegment) {
  return {
    startMs: Math.round(segment.start * 1000),
    endMs: Math.round(segment.end * 1000),
  }
}

export function buildComprehensionAnswerId(
  languageCode: string,
  videoId: string,
  segment: ComprehensionAnswerSegment,
): string {
  const { startMs, endMs } = toSegmentMillis(segment)
  return `${languageCode}::${videoId}::${startMs}-${endMs}`
}

function toPlainRecord(
  languageCode: string,
  videoId: string,
  segment: ComprehensionAnswerSegment,
  answerText: string,
  updatedAt: Date,
): SavedComprehensionAnswerRecord {
  const { startMs, endMs } = toSegmentMillis(segment)

  return {
    answerId: buildComprehensionAnswerId(languageCode, videoId, segment),
    languageCode,
    videoId,
    segmentStartMs: startMs,
    segmentEndMs: endMs,
    answerText: `${answerText}`,
    updatedAt: updatedAt.getTime(),
  }
}

function toComprehensionAnswer(record: SavedComprehensionAnswerRecord): ComprehensionAnswer {
  return {
    answerId: record.answerId,
    languageCode: record.languageCode,
    videoId: record.videoId,
    segmentStartMs: record.segmentStartMs,
    segmentEndMs: record.segmentEndMs,
    answerText: record.answerText,
    updatedAt: new Date(record.updatedAt),
  }
}

export async function getComprehensionAnswer(
  languageCode: string,
  videoId: string,
  segment: ComprehensionAnswerSegment,
): Promise<ComprehensionAnswer | null> {
  const answerId = buildComprehensionAnswerId(languageCode, videoId, segment)
  const savedAnswer = await learnerDb.comprehensionAnswers.get(answerId)

  return savedAnswer ? toComprehensionAnswer(savedAnswer) : null
}

export async function saveComprehensionAnswer(
  languageCode: string,
  videoId: string,
  segment: ComprehensionAnswerSegment,
  answerText: string,
  updatedAt: Date,
): Promise<ComprehensionAnswer> {
  const record = toPlainRecord(languageCode, videoId, segment, answerText, updatedAt)
  await learnerDb.comprehensionAnswers.put(record)
  return toComprehensionAnswer(record)
}
