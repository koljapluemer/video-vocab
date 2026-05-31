<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { recordContextWatchSlice } from '@/features/context-stats/contextStatsStore'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'

import LazyVocabCard from './LazyVocabCard.vue'
import type { LazyVideo } from './loadRandomLazyVideo'

const props = defineProps<{
  video: LazyVideo
  languageCode: string
}>()

const emit = defineEmits<{
  (event: 'finished'): void
}>()

const playerError = ref('')
const playerHostId = `lazy-player-${Math.random().toString(36).slice(2)}`

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
let nextCardAt = 1 + Math.random() * 2
const activeCards = ref<ActiveCard[]>([])
let nextCardId = 0

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
  if (current < nextCardAt) return

  nextCardAt = current + 1 + Math.random() * 2

  const seg = props.video.segments.find(
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
  activeCards.value.forEach((c) => window.clearTimeout(c.timeoutId))
  player?.destroy()
  player = null
  activeCards.value = []
})
</script>

<template>
  <div class="overflow-hidden rounded-box bg-black">
    <div class="relative aspect-video">
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
    </div>
  </div>

  <div v-if="playerError" class="alert alert-error mt-4">
    <span>{{ playerError }}</span>
  </div>

  <div class="mt-4 flex justify-end">
    <button type="button" class="btn btn-ghost" @click="emit('finished')">
      Next video
    </button>
  </div>
</template>
