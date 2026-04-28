export const MIN_SNIPPET_PLAYBACK_DURATION_SECONDS = 2

export function getSnippetPlaybackWindow(start: number, duration: number) {
  const normalizedStart = Math.max(0, start)
  const normalizedDuration = Math.max(0, duration)

  if (normalizedDuration >= MIN_SNIPPET_PLAYBACK_DURATION_SECONDS) {
    return {
      startSeconds: normalizedStart,
      endSeconds: normalizedStart + normalizedDuration,
    }
  }

  const missingDuration = MIN_SNIPPET_PLAYBACK_DURATION_SECONDS - normalizedDuration
  const desiredStartPadding = missingDuration / 2
  const availableStartPadding = Math.min(normalizedStart, desiredStartPadding)

  return {
    startSeconds: normalizedStart - availableStartPadding,
    endSeconds: normalizedStart + normalizedDuration + (missingDuration - availableStartPadding),
  }
}
