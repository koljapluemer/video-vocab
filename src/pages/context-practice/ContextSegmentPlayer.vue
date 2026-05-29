<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { getVideoSegmentPlaybackWindow } from '@/dumb/getVideoSegmentPlaybackWindow'
import { recordContextWatchSlice } from '@/features/context-stats/contextStatsStore'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'

const WATCH_TICK_MS = 5_000

const props = defineProps<{
  durationSeconds: number
  languageCode: string
  startSeconds: number
  videoId: string
}>()

const emit = defineEmits<{
  (event: 'finished'): void
}>()

const playerError = ref('')
const isPlayerReady = ref(false)
const playerHostId = `context-player-${Math.random().toString(36).slice(2)}`

let player: YT.Player | null = null
let playbackBoundaryMonitor: number | null = null
let watchTimer: number | null = null
let playbackFinished = false
let isPlayerActivelyPlaying = false
let lastWatchTickAt = Date.now()

const playbackWindow = computed(() =>
  getVideoSegmentPlaybackWindow(props.startSeconds, props.durationSeconds),
)

function clearPlaybackBoundaryMonitor() {
  if (playbackBoundaryMonitor !== null) {
    window.clearInterval(playbackBoundaryMonitor)
    playbackBoundaryMonitor = null
  }
}

function clearWatchTimer() {
  if (watchTimer !== null) {
    window.clearInterval(watchTimer)
    watchTimer = null
  }
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
  clearWatchTimer()
}

function startWatchTracking() {
  isPlayerActivelyPlaying = true
  lastWatchTickAt = Date.now()

  if (watchTimer !== null) {
    return
  }

  watchTimer = window.setInterval(() => {
    flushWatchSlice(Date.now())
  }, WATCH_TICK_MS)
}

function finishPlayback() {
  if (!player || playbackFinished) {
    return
  }

  playbackFinished = true
  clearPlaybackBoundaryMonitor()
  stopWatchTracking()
  player.pauseVideo()
  emit('finished')
}

function startPlaybackBoundaryMonitor() {
  if (!player) {
    return
  }

  clearPlaybackBoundaryMonitor()
  playbackBoundaryMonitor = window.setInterval(() => {
    if (!player) {
      return
    }

    if (player.getCurrentTime() >= playbackWindow.value.endSeconds) {
      finishPlayback()
    }
  }, 200)
}

function playSegment() {
  if (!player || !isPlayerReady.value) {
    return
  }

  playbackFinished = false
  playerError.value = ''
  clearPlaybackBoundaryMonitor()
  stopWatchTracking()
  player.loadVideoById({
    videoId: props.videoId,
    startSeconds: playbackWindow.value.startSeconds,
    endSeconds: playbackWindow.value.endSeconds,
  })
}

function handleVisibilityChange() {
  flushWatchSlice(Date.now())
}

async function initializePlayer() {
  try {
    await loadYoutubeIframeApi()
    player = new window.YT!.Player(playerHostId, {
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
          isPlayerReady.value = true
          playSegment()
        },
        onStateChange: (event) => {
          if (event.data === window.YT!.PlayerState.PLAYING) {
            startPlaybackBoundaryMonitor()
            startWatchTracking()
            return
          }

          clearPlaybackBoundaryMonitor()
          stopWatchTracking()

          if (event.data === window.YT!.PlayerState.ENDED) {
            finishPlayback()
          }
        },
        onError: () => {
          clearPlaybackBoundaryMonitor()
          stopWatchTracking()
          playerError.value = 'Player failed.'
        },
      },
    })
  } catch (error) {
    console.error('Failed to initialize context player:', error)
    playerError.value = 'Player unavailable.'
  }
}

watch(
  () => [props.videoId, props.startSeconds, props.durationSeconds] as const,
  () => {
    playSegment()
  },
)

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void initializePlayer()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearPlaybackBoundaryMonitor()
  stopWatchTracking()
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="overflow-hidden rounded-box bg-black">
    <div class="relative aspect-video">
      <div :id="playerHostId" class="h-full w-full"></div>
    </div>
  </div>

  <div v-if="playerError" class="alert alert-error mt-4">
    <span>{{ playerError }}</span>
  </div>
</template>
