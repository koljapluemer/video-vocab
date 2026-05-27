<template>
  <section class="space-y-4">
    <h2 class="text-lg font-semibold">Watch the segment</h2>

    <div class="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div class="relative aspect-video bg-base-200">
        <div :id="playerHostId" class="h-full w-full"></div>
      </div>

      <div v-if="playerError" class="border-t border-base-300 p-4">
        <div class="alert alert-error">
          <span>{{ playerError }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { getVideoSegmentPlaybackWindow } from '@/dumb/getVideoSegmentPlaybackWindow'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'

const props = defineProps<{
  duration: number
  start: number
  videoId: string
}>()

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const playerError = ref('')
const isPlayerReady = ref(false)
const playerHostId = `comprehension-player-${Math.random().toString(36).slice(2)}`

let player: YT.Player | null = null
let playbackBoundaryMonitor: number | null = null
let playbackFinished = false

const playbackWindow = computed(() => getVideoSegmentPlaybackWindow(props.start, props.duration))

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
  player.seekTo(playbackWindow.value.startSeconds, true)
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

function replaySegment() {
  playSegment()
}

async function initializePlayer() {
  try {
    await loadYoutubeIframeApi()
    player = new window.YT!.Player(playerHostId, {
      playerVars: {
        autoplay: 1,
        controls: 1,
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
    console.error('Failed to initialize comprehension player:', error)
    playerError.value = 'Unable to load the segment player right now.'
  }
}

watch(
  () => [props.videoId, props.start, props.duration] as const,
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

defineExpose({
  replaySegment,
})
</script>
