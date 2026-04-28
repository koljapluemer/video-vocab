<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title">Watch the Snippet</h2>
      <div class="max-w-full">
        <div class="mb-4 relative aspect-video">
          <div :id="playerHostId" class="h-full w-full"></div>
        </div>
        <div v-if="playerError" class="alert alert-error mb-4">
          <span>{{ playerError }}</span>
        </div>
      </div>
      <div class="flex flex-col items-center space-y-4">
        <button type="button" @click="replaySnippet" class="btn btn-primary">
          Replay Snippet
        </button>
        <div class="btn-group gap-2">
          <button type="button" @click="onStudyAgain" class="btn btn-warning">
            Study Again
          </button>
          <router-link
            v-if="hasNextSnippet"
            :to="{ name: 'video-snippet-practice', params: { videoId }, query: nextSnippetQuery }"
            class="btn btn-success"
          >
            Next Snippet
          </router-link>
          <button v-else type="button" class="btn btn-success" disabled>
            Next Snippet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'

import { getSnippetPlaybackWindow } from './getSnippetPlaybackWindow'

const props = defineProps<{
  videoId: string
  start: number
  duration: number
  hasNextSnippet: boolean
  nextSnippetQuery: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'study-again'): void
}>()

const playerError = ref('')
const isPlayerReady = ref(false)
const playerHostId = `watch-snippet-player-${Math.random().toString(36).slice(2)}`

let player: YT.Player | null = null
let snippetBoundaryMonitor: number | null = null

const snippetWindow = computed(() => getSnippetPlaybackWindow(props.start, props.duration))

function clearSnippetBoundaryMonitor() {
  if (snippetBoundaryMonitor !== null) {
    window.clearInterval(snippetBoundaryMonitor)
    snippetBoundaryMonitor = null
  }
}

function pauseAtSnippetEnd() {
  if (!player) {
    return
  }

  clearSnippetBoundaryMonitor()
  player.pauseVideo()
  player.seekTo(snippetWindow.value.endSeconds, true)
}

function startSnippetBoundaryMonitor() {
  if (!player) {
    return
  }

  clearSnippetBoundaryMonitor()
  snippetBoundaryMonitor = window.setInterval(() => {
    if (!player) {
      return
    }

    if (player.getCurrentTime() >= snippetWindow.value.endSeconds) {
      pauseAtSnippetEnd()
    }
  }, 200)
}

function loadActiveSnippet() {
  if (!player || !isPlayerReady.value) {
    return
  }

  clearSnippetBoundaryMonitor()
  playerError.value = ''
  player.loadVideoById({
    videoId: props.videoId,
    startSeconds: snippetWindow.value.startSeconds,
    endSeconds: snippetWindow.value.endSeconds,
  })
}

function replaySnippet() {
  loadActiveSnippet()
}

function onStudyAgain() {
  emit('study-again')
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
          loadActiveSnippet()
        },
        onStateChange: (event) => {
          if (event.data === window.YT!.PlayerState.PLAYING) {
            startSnippetBoundaryMonitor()
            return
          }

          clearSnippetBoundaryMonitor()

          if (event.data === window.YT!.PlayerState.ENDED) {
            pauseAtSnippetEnd()
          }
        },
        onError: () => {
          clearSnippetBoundaryMonitor()
          playerError.value = 'Unable to play this snippet right now.'
        },
      },
    })
  } catch (error) {
    console.error('Failed to initialize snippet player:', error)
    playerError.value = 'Unable to load the snippet player right now.'
  }
}

watch(
  () => [props.videoId, props.start, props.duration] as const,
  () => {
    loadActiveSnippet()
  },
)

onMounted(() => {
  void initializePlayer()
})

onBeforeUnmount(() => {
  clearSnippetBoundaryMonitor()
  player?.destroy()
  player = null
})
</script>
