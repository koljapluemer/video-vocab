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

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { getVideoSegmentPlaybackWindow } from '@/dumb/getVideoSegmentPlaybackWindow'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'

const props = defineProps<{
  durationSeconds: number
  startSeconds: number
  videoId: string
}>()

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const playerError = ref('')
const isPlayerReady = ref(false)
const playerHostId = `context-player-${Math.random().toString(36).slice(2)}`

let player: YT.Player | null = null
let playbackBoundaryMonitor: number | null = null
let playbackFinished = false

const playbackWindow = computed(() =>
  getVideoSegmentPlaybackWindow(props.startSeconds, props.durationSeconds),
)

function clearPlaybackBoundaryMonitor() {
  if (playbackBoundaryMonitor !== null) {
    window.clearInterval(playbackBoundaryMonitor)
    playbackBoundaryMonitor = null
  }
}

function finishPlayback() {
  if (!player || playbackFinished) {
    return
  }

  playbackFinished = true
  clearPlaybackBoundaryMonitor()
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
  player.loadVideoById({
    videoId: props.videoId,
    startSeconds: playbackWindow.value.startSeconds,
    endSeconds: playbackWindow.value.endSeconds,
  })
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
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          isPlayerReady.value = true
          playSegment()
        },
        onStateChange: (event) => {
          if (event.data === window.YT!.PlayerState.PLAYING) {
            startPlaybackBoundaryMonitor()
            return
          }

          clearPlaybackBoundaryMonitor()

          if (event.data === window.YT!.PlayerState.ENDED) {
            finishPlayback()
          }
        },
        onError: () => {
          clearPlaybackBoundaryMonitor()
          playerError.value = 'Unable to play this segment right now.'
        },
      },
    })
  } catch (error) {
    console.error('Failed to initialize context player:', error)
    playerError.value = 'Unable to load the player right now.'
  }
}

watch(
  () => [props.videoId, props.startSeconds, props.durationSeconds] as const,
  () => {
    playSegment()
  },
)

onMounted(() => {
  void initializePlayer()
})

onBeforeUnmount(() => {
  clearPlaybackBoundaryMonitor()
  player?.destroy()
  player = null
})
</script>
