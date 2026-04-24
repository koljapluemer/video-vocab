import { onBeforeUnmount, onMounted } from 'vue'

import { recordInteractionSlice } from './deviceStatsStorage'

const INTERACTION_IDLE_TIMEOUT_MS = 30_000
const INTERACTION_TICK_MS = 5_000

export function useAppInteractionTracking(getLanguageCode: () => string | null) {
  let lastActivityAt = Date.now()
  let lastTickAt = Date.now()
  let intervalId: number | null = null

  function markActivity() {
    lastActivityAt = Date.now()
  }

  function shouldCountInteraction(now: number) {
    return !document.hidden && now - lastActivityAt <= INTERACTION_IDLE_TIMEOUT_MS
  }

  function flushInteractionSlice(now: number) {
    if (!shouldCountInteraction(now)) {
      lastTickAt = now
      return
    }

    const languageCode = getLanguageCode()
    if (languageCode) {
      recordInteractionSlice(languageCode, new Date(lastTickAt), new Date(now))
    }
    lastTickAt = now
  }

  function startTracking() {
    lastActivityAt = Date.now()
    lastTickAt = lastActivityAt
    intervalId = window.setInterval(() => {
      flushInteractionSlice(Date.now())
    }, INTERACTION_TICK_MS)
  }

  function stopTracking() {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
  }

  function handleVisibilityChange() {
    flushInteractionSlice(Date.now())
  }

  const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll']

  onMounted(() => {
    for (const eventName of events) {
      window.addEventListener(eventName, markActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    startTracking()
  })

  onBeforeUnmount(() => {
    stopTracking()
    for (const eventName of events) {
      window.removeEventListener(eventName, markActivity)
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}
