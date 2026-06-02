<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { recordContextWatchSlice } from '@/features/context-stats/contextStatsStore'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'

import LazyVocabCard from './LazyVocabCard.vue'
import type { LazyVideo } from './loadRandomLazyVideo'

const props = defineProps<{
  video: LazyVideo
  languageCode: string
  aspectRatio: number
}>()

const emit = defineEmits<{
  (event: 'finished'): void
}>()

const playerError = ref('')
const currentTimeSeconds = ref(0)
const playerHostId = `lazy-player-${Math.random().toString(36).slice(2)}`
const orderedSegments = [...props.video.segments].sort((a, b) => a.startSeconds - b.startSeconds)

interface ActiveCard {
  id: number
  word: string
  translation: string
  timeoutId: number
}

const WATCH_TICK_MS = 5_000

let player: YT.Player | null = null
let pollInterval: number | null = null
let watchTimer: number | null = null
let isPlayerActivelyPlaying = false
let lastWatchTickAt = Date.now()
let nextCardAt = getNextCardAt(0)
const activeCards = ref<ActiveCard[]>([])
let nextCardId = 0

const canSkipSegment = computed(() => getNextSegmentStart(currentTimeSeconds.value) !== null)

function getNextCardAt(baseSeconds: number) {
  return baseSeconds + 1 + Math.random() * 2
}

function clearActiveCards() {
  activeCards.value.forEach((card) => window.clearTimeout(card.timeoutId))
  activeCards.value = []
}

function getNextSegmentStart(afterSeconds: number) {
  return orderedSegments.find((segment) => segment.startSeconds > afterSeconds + 0.01) ?? null
}

function flushWatchSlice(now: number) {
  if (!isPlayerActivelyPlaying || document.hidden) {
    lastWatchTickAt = now
    return
  }
  void recordContextWatchSlice(props.languageCode, new Date(lastWatchTickAt), new Date(now))
  lastWatchTickAt = now
}

function stopWatchTracking() {
  flushWatchSlice(Date.now())
  isPlayerActivelyPlaying = false
  if (watchTimer !== null) {
    window.clearInterval(watchTimer)
    watchTimer = null
  }
}

function startWatchTracking() {
  isPlayerActivelyPlaying = true
  lastWatchTickAt = Date.now()
  if (watchTimer !== null) return
  watchTimer = window.setInterval(() => flushWatchSlice(Date.now()), WATCH_TICK_MS)
}

function dismissCard(id: number) {
  const card = activeCards.value.find((c) => c.id === id)
  if (card) window.clearTimeout(card.timeoutId)
  activeCards.value = activeCards.value.filter((c) => c.id !== id)
}

function tickPoll() {
  const current = player?.getCurrentTime() ?? 0
  currentTimeSeconds.value = current
  if (current < nextCardAt) return

  nextCardAt = getNextCardAt(current)

  const seg = orderedSegments.find(
    (s) => s.startSeconds <= current && current < s.endSeconds,
  )
  if (!seg) return

  const visibleWords = new Set(activeCards.value.map((c) => c.word))
  const entries = Object.entries(seg.vocab).filter(
    ([w, t]) => w.trim() && t.trim() && !visibleWords.has(w),
  )
  if (!entries.length) return

  const [word, translation] = entries[Math.floor(Math.random() * entries.length)]

  if (activeCards.value.length >= 3) {
    const oldest = activeCards.value[0]
    dismissCard(oldest.id)
  }

  const id = nextCardId++
  const timeoutId = window.setTimeout(() => dismissCard(id), 4000)
  activeCards.value = [...activeCards.value, { id, word, translation, timeoutId }]
}

function skipToNextSegment() {
  const activePlayer = player
  if (!activePlayer) return

  const current = activePlayer.getCurrentTime()
  if (current == null) return

  const nextSegment = getNextSegmentStart(current)
  if (!nextSegment) return

  clearActiveCards()
  currentTimeSeconds.value = nextSegment.startSeconds
  nextCardAt = getNextCardAt(nextSegment.startSeconds)
  activePlayer.seekTo(nextSegment.startSeconds, true)
  activePlayer.playVideo()
}

function startPoll() {
  if (pollInterval !== null) return
  pollInterval = window.setInterval(tickPoll, 300)
}

function stopPoll() {
  if (pollInterval !== null) {
    window.clearInterval(pollInterval)
    pollInterval = null
  }
}

async function initializePlayer() {
  try {
    await loadYoutubeIframeApi()
    const YT = window.YT
    if (!YT) {
      playerError.value = 'Player unavailable.'
      return
    }

    player = new YT.Player(playerHostId, {
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        origin: window.location.origin,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          if (!player) return
          player.loadVideoById({ videoId: props.video.videoId })
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) {
            startPoll()
            startWatchTracking()
            return
          }

          stopPoll()
          stopWatchTracking()

          if (event.data === YT.PlayerState.ENDED) {
            emit('finished')
          }
        },
        onError: () => {
          stopPoll()
          stopWatchTracking()
          playerError.value = 'Player failed.'
        },
      },
    })
  } catch (error) {
    console.error('Failed to initialize lazy player:', error)
    playerError.value = 'Player unavailable.'
  }
}

function handleVisibilityChange() {
  flushWatchSlice(Date.now())
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void initializePlayer()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopPoll()
  stopWatchTracking()
  clearActiveCards()
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="w-screen">
    <div
      class="relative w-full overflow-hidden"
      :style="{
        aspectRatio: String(props.aspectRatio),
      }"
    >
      <div :id="playerHostId" class="h-full w-full"></div>
      <div class="pointer-events-none absolute left-3 top-3">
        <TransitionGroup tag="div" name="vocab-card" class="flex flex-col gap-2">
          <LazyVocabCard
            v-for="card in activeCards"
            :key="card.id"
            :word="card.word"
            :translation="card.translation"
            @dismiss="dismissCard(card.id)"
          />
        </TransitionGroup>
      </div>
      <div class="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          class="btn btn-sm bg-base-100/85 text-base-content shadow-lg backdrop-blur-sm hover:bg-base-100"
          @click="emit('finished')"
        >
          Next video
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost bg-base-100/70 text-base-content shadow-lg backdrop-blur-sm hover:bg-base-100"
          :disabled="!canSkipSegment"
          @click="skipToNextSegment"
        >
          Skip segment
        </button>
      </div>
    </div>
  </div>

  <div v-if="playerError" class="alert alert-error mx-4 mt-4">
    <span>{{ playerError }}</span>
  </div>
</template>
