export const VIDEO_PRACTICE_MODES = ['snippet', 'parallel', 'vocab'] as const

export type VideoPracticeMode = (typeof VIDEO_PRACTICE_MODES)[number]

export function isVideoPracticeMode(value: unknown): value is VideoPracticeMode {
  return typeof value === 'string' && VIDEO_PRACTICE_MODES.includes(value as VideoPracticeMode)
}

export function getVideoPracticeTabLabel(mode: VideoPracticeMode): string {
  if (mode === 'snippet') {
    return 'Snippet by Snippet'
  }

  if (mode === 'parallel') {
    return 'Parallel'
  }

  return 'Practice Vocab'
}
