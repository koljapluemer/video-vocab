export const VIDEO_PRACTICE_MODES = ['snippet', 'parallel'] as const

export type VideoPracticeMode = (typeof VIDEO_PRACTICE_MODES)[number]

export function isVideoPracticeMode(value: unknown): value is VideoPracticeMode {
  return typeof value === 'string' && VIDEO_PRACTICE_MODES.includes(value as VideoPracticeMode)
}

export function getVideoPracticeLabel(mode: VideoPracticeMode): string {
  if (mode === 'parallel') {
    return 'Switch to Parallel Practice'
  }

  return 'Switch to Snippet by Snippet Practice'
}
